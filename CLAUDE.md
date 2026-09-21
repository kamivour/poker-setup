# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A blind timer for home-game poker MTTs: a static site of four files (`index.html`, `style.css`, `app.js`, `fx.js`) served by GitHub Pages at `www.kamivour.id.vn`. The README (in Vietnamese) holds the design rationale and a detailed "not yet implemented" backlog — read it before proposing features, since several omissions are deliberate.

## Commands

There is no build step, package manager, test suite, or linter. Plain HTML, CSS and ES5; the GLSL lives inside `fx.js` as strings, so the page also runs from `file://`.

- Run locally: open `index.html` in a browser, or `npx --yes http-server . -p 8000 -c-1` from the repo root when you need a real origin (clipboard API, Wake Lock). `python` is not installed on the dev laptop. Add `-a 0.0.0.0` and open `http://<laptop-LAN-IP>:8000/` on an iPad on the same Wi-Fi to test the working tree there; that origin is plain HTTP, so Wake Lock and the clipboard API stay off on the iPad.
- Deploy: push to `main`. GitHub Pages serves `main` / `(root)`. The custom domain comes from the `CNAME` file at the repo root — deleting it drops the domain. The `github.io` URL 301s to `www.kamivour.id.vn`, so verify a deploy against the custom domain.
- **Bump the cache-buster whenever `style.css`, `app.js` or `fx.js` changes:** the three `?v=YYYYMMDD` query strings in `index.html` (the stylesheet link and the two script tags; add a letter for a second deploy on the same day). GitHub Pages caches assets for 10 minutes and Safari on the iPad keeps them longer, so without the bump a deploy ships the new markup with the old script.
- Verify a change: reload the page and exercise the affected control. Clock behavior over long runs is only observable in a real browser tab. For headless screenshots (Chrome `--headless=new --enable-unsafe-swiftshader`) append `?fx=force` to the URL so the backdrop accepts software rendering instead of falling back to the CSS gradient.

## Architecture

Four files. `index.html` loads `style.css` in `<head>` and then `fx.js` and `app.js` at the end of `<body>`, in that order. Keep edits inside the matching file and section rather than appending.

- `index.html` — markup only. `<head>` carries the iPad standalone meta (`apple-mobile-web-app-capable`, `viewport-fit=cover`), the Google Fonts link (the only external dependency) and the three versioned links. `<body>` starts with the `#fx` canvas (fixed, `z-index:-1`, `pointer-events:none`, so it can never add scroll or intercept a tap), then `.app` — a 3-row grid (topbar / stage / stats) — and the three overlays (`settingsOverlay`, `editorOverlay`, `ioOverlay`) outside `.app`.
- `style.css` — sections in order: base → theme tokens → layout (top bar, stage, stats) → decorated look → motion → modals → reduced motion. Colour tokens live on `:root` (Felt) and `:root[data-app-theme="<id>"]`. Each decorated theme also carries `--decor` (the CSS fallback backdrop), `--glass` / `--glass-line` / `--glass-hi` / `--glass-shadow` / `--sheen` (the buttons), and `--clock-ink` / `--clock-fx` / `--num-fx` (the material of the clock and of the blinds and ante: a per-theme `text-shadow` stack, not one stack with different numbers). Royal adds `--gild-a`..`--gild-e` (its gold gradient stops; `.clock.warn` / `.clock.crit` swap them), `--gild-x` / `--gild-y` (the bronze steps of its extrusion; Royal declares `--clock-fx` on `.clock` itself, because a `var()` inside a custom property is resolved where that property is declared and warn/crit swap the steps on the clock) and `--chips` (the two red chips as an inline SVG, the background of `.stage::after`, anchored bottom-right so they rest on the stats divider clear of the clock and the payouts). The decorated look is scoped to `html:not(.flat)`.
- `fx.js` — the animated backdrop: one WebGL1 fragment shader paints the viewport for each decorated theme (`SLOT = {felt, bone, cafe, royal}` picks the branch in `paint()`) and cross-fades two themes inside the shader (`u_prev` / `u_mix`, 900 ms). It exposes only `window.PKFX.setTheme(id, flat)`. Budget: 0.6× CSS pixels capped at 1.3 Mpx, at most 30 fps, paused while the tab is hidden, one still frame under `prefers-reduced-motion`. No WebGL, a software renderer, a shader that fails to compile or a lost context puts `nofx` on `<html>`, and `style.css` shows `--decor` on `body::before` instead.
- `app.js` — one IIFE, `"use strict"`, ES5 style throughout (`var`, `function`, no modules, no framework). Sections in order: `I18N` → `THEMES` → defaults → storage → tournament state → audio → wake lock → DOM helpers → `render()` → `applyLang()` / `applyTheme()` → clock engine → controls → overlays → profile menu → settings → profile editor → export/import → boot.

`applyTheme()` sets `data-app-theme` on `<html>`, toggles `.flat` for any `THEMES` entry with `flat: true` (Midnight, which therefore keeps the plain 2D look: no backdrop, no clock material, no glass, no digit motion), calls `PKFX.setTheme()` and updates the `theme-color` meta.

### State and rendering

Three module-level values hold everything: `settings`, `profiles` (+ `activeId`), and `state` (`{idx, remain, running, endsAt, entries, warned}`). `profile()` resolves the active profile.

`render()` redraws the whole UI from those values. There is no diffing or component model — after mutating state, call `render()` (or `loadLevel()`, which calls it). `applyLang()` and `applyTheme()` are the heavier variants, called when language or theme changes.

### Level list

`profile().levels` is a flat array mixing two row shapes: blind rows `{sb, bb, ante, min}` and break rows `{brk: true, min}`. A blind row may also carry `chipup: true`, which marks the level where small chips get coloured up; it renders as a chip glyph next to the level number and in the next-level preview, and is toggled per row in the editor. `state.idx` indexes this array directly, so breaks consume an index. Use `levelNumber(i)` for the displayed number (skips breaks) and `nextPlayableAfter(i)` for the blinds shown during a break.

### Storage

`localStorage` keys live in `K`: `pkclock2.profiles`, `pkclock2.settings`, `pkclock2.active`, `pkclock2.run`. All access goes through `lsGet` / `lsSet`, which swallow exceptions so private-mode browsers still run.

The `pkclock2` prefix is a schema version. If the default profile shape changes incompatibly, bump the whole namespace to `pkclock3` rather than migrating in place — that is how stale saved profiles are prevented from overwriting new defaults.

Export/import moves profiles between devices as `{v: 1, profiles: [...]}` JSON through a textarea. Import replaces the entire profile list and re-inserts a `default` profile if the payload lacks one.

### Motion

All motion is transforms and opacity, so nothing repaints text on a tick. `drawClock()` gives a changed digit the class `tk` (a 0.28 s roll in from above) and a listener on the clock removes it on `animationend`. `render()` puts `swap` on the eyebrow, the blinds and the next line when the profile-and-index key (`shownLevel`) changes, so a level change rises into place but restarting a level does not animate. Transport buttons are glass: hover lifts them and runs the `sheen` sweep, and a tap adds `shine` for the same sweep on touch screens. Modals `pop`, the profile menu `menupop`s, the toast and the resume bar `rise`. The reduced-motion block at the end of `style.css` switches all of it off, and the digit roll is also off on flat themes.

## Invariants — do not change without reading the reason

- **The clock is timestamp-based, never decremented.** `play()` stores `endsAt = Date.now() + remain*1000`; the 250 ms `setInterval` recomputes `endsAt - Date.now()`. Decrementing per tick drifts by minutes over a 3-hour tournament when Safari throttles a background tab.
- **Each clock glyph is its own fixed-width `<span>`** (`drawClock()` emits `.cd` / `.cs`, `.cd { width: .62em }`) and repeats its glyph in `data-d`. Do not replace this with `tabular-nums`; if the webfont has not loaded, system-font digit widths differ and the clock jitters every second. Royal paints its gold from `data-d`: the glyph itself is transparent and only casts the shadow, and `::after { content: attr(data-d) }` carries the gradient, because a `text-shadow` paints over a gradient clipped to the same text.
- **`drawClock()` only touches the spans that changed.** The decorated clock stacks several `text-shadow`s on the largest text on the page, so repainting it is the most expensive thing the page does. A 250 ms tick that changes no digit writes nothing; a tick that changes digits rewrites only those spans (and gives them `.tk` for the roll); `innerHTML` is rebuilt only when the string length changes. The Royal `gleam` runs on `::after`, not on the span, so a roll and a gleam never fight over one `animation` property.
- **The backdrop never touches the DOM and never blocks input.** `fx.js` paints only its own canvas (fixed, `z-index:-1`, `pointer-events:none`), renders at most 30 fps at 0.6× resolution, stops while the tab is hidden and draws one still frame under `prefers-reduced-motion`. Every motion in the shader is periodic in 600 s and `u_t` wraps at 3600 s, so float precision never drifts over a long tournament. Any failure (no WebGL, software renderer, shader compile error, lost context) degrades to `html.nofx` and the CSS `--decor` gradient — the clock must never depend on the canvas.
- **Payouts round with a remainder.** 1st = `round(pool * 0.7 / step) * step` (`step` is 1000 once the pool reaches 50,000, else 1), 2nd = `pool - first`. Rounding both places independently makes the two payouts fail to sum to the pool. The split is hard-coded 70/30.
- **`AudioContext` is created only inside `audioOn()`, after a user gesture.** iOS Safari blocks audio otherwise, so chimes stay silent until the first button press. `audioOn()` also pushes one silent sample through the context the first time (iOS keeps it mute until it has actually played something during a gesture) and resumes on any state other than `"running"` — iOS parks a context in the non-standard `"interrupted"` state after Siri or a call and never leaves it on its own. Document-level `touchend` / `pointerdown` / `visibilitychange` listeners call it, so any tap revives the alarm. What none of this can fix is iPad Silent Mode, which mutes Web Audio with no way to detect it from script; the volume slider chimes on release so the user can tell the two apart. Chimes peak near full scale (`vol()` tops out at 0.95) and every oscillator connects through the `master` DynamicsCompressor, which keeps the overlapping notes from clipping — route any new sound through `master` too.
- **The `default` profile is read-only in the UI.** `openEditor()` refuses it, `btnEdSave` refuses it, and the menu entry is dimmed; deletion was already blocked. Change the shipped structure by editing `defaultProfile()` / `defaultLevels()` and pushing, never by relaxing these guards. Users who want a different structure duplicate the profile.
- **A restored tournament always comes back paused.** `pkclock2.run` holds `{v, at, pid, idx, remain, running, endsAt, entries}`, written every 5 s while the clock runs, on every level or entries change, and on `visibilitychange` to hidden. `maybeResume()` offers it once at boot — same profile, under 6 hours old, and only if the run had actually started. `applyRun()` clamps `remain` to the level length and never sets `running`. Do not make it auto-resume: the tab usually reloads because iPadOS killed it, and the table is not necessarily ready to play the second the page comes back.
- **`saveRun()` is inert until `maybeResume()` sets `runReady`.** Boot calls `loadLevel(0, false)` before the restore prompt; without that gate the fresh state would overwrite the record being offered.

## Conventions when extending

- **New UI string:** add the key to both `I18N.en` and `I18N.vi`, then map the element id to that key in the `m` object inside `applyLang()`. English is the fallback for missing keys.
- **New theme:** append to the `THEMES` array *and* add a matching `:root[data-app-theme="<id>"]` token block in `style.css`, including the decorated-look tokens (`--decor`, `--glass*`, `--sheen`, `--clock-ink`, `--clock-fx`, `--num-fx`; copy a dark theme's block and adjust), *and* give it a shader branch in `fx.js`: a `<theme>(p, q, t, ...)` GLSL function, a case in `paint()` and an entry in `SLOT`. Or set `flat: true` on the `THEMES` entry to opt the theme out of the decorated rules, the clock material and the backdrop altogether. Swatches are generated from `THEMES`.
- **New keyboard shortcut:** extend the `document` `keydown` handler, which already returns early for form fields and routes `Escape` to `closeAll()` while an overlay is open.
- Money and blind values render through `nf()` / `money()`; currency is a per-profile string, not a locale.
- The level generator (`btnGenerate`) and `+ Level` both snap values through `roundChip()`, which picks a rounding step by magnitude.

## Deliberately rejected

Recorded so these are not proposed again. Reasons are in README section 4b.

- Players-left counter, average stack, average BB — nobody presses a minus button at the moment a player busts, so the number would be wrong almost immediately. The unused `left` / `avg` / `chips` keys in `I18N` are left over from this.
- A "back at HH:MM" line on the break screen — the countdown already covers it, and the extra line works against the minimal screen.
- Multi-place configurable payouts — the table is 6 to 9 players, so the hard-coded 70/30 split stays.
- An estimated finish time is wanted but unsolved: a home game nearly always ends before the last level, so summing the remaining level durations gives a confidently wrong number.

## Other agent configs

An OpenAI Codex config exists at `~/.codex/config.toml`. Reply `/import` to scan and list what is importable (MCP servers, slash commands, subagents, skills, instructions), then `/import --yes=<digest>` (the scan output names the digest) to apply the user-level items. If `/import` is unavailable on this surface, run `claude import` from a terminal instead.
