# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A blind timer for home-game poker MTTs, served as a single static HTML file on GitHub Pages at `www.kamivour.id.vn`. The README (in Vietnamese) holds the design rationale and a detailed "not yet implemented" backlog — read it before proposing features, since several omissions are deliberate.

## Commands

There is no build step, package manager, test suite, or linter. The entire app is `index.html`.

- Run locally: open `index.html` in a browser, or `python -m http.server 8000` from the repo root when you need a real origin (clipboard API, Wake Lock).
- Deploy: push to `main`. GitHub Pages serves `main` / `(root)`. The custom domain comes from the `CNAME` file at the repo root — deleting it drops the domain. The `github.io` URL 301s to `www.kamivour.id.vn`, so verify a deploy against the custom domain.
- Verify a change: reload the page and exercise the affected control. Clock behavior over long runs is only observable in a real browser tab.

## Architecture

`index.html` is one file with a fixed section order — keep edits inside the matching section rather than appending:

1. `<head>` — iPad standalone meta (`apple-mobile-web-app-capable`, `viewport-fit=cover`, safe-area padding), Google Fonts link. The fonts link is the only external dependency.
2. `<style>` themes — color tokens on `:root` and `:root[data-app-theme="<id>"]`.
3. `<style>` layout — top bar, stage, stats, modals.
4. Markup — `.app` is a 3-row grid (topbar / stage / stats); the three overlays (`settingsOverlay`, `editorOverlay`, `ioOverlay`) sit outside `.app`.
5. `<script>` — one IIFE, `"use strict"`, ES5 style throughout (`var`, `function`, no modules, no framework).

Script sections in order: `I18N` → `THEMES` → defaults → storage → tournament state → audio → wake lock → DOM helpers → `render()` → `applyLang()` / `applyTheme()` → clock engine → controls → overlays → profile menu → settings → profile editor → export/import → boot.

### State and rendering

Three module-level values hold everything: `settings`, `profiles` (+ `activeId`), and `state` (`{idx, remain, running, endsAt, entries, warned}`). `profile()` resolves the active profile.

`render()` redraws the whole UI from those values. There is no diffing or component model — after mutating state, call `render()` (or `loadLevel()`, which calls it). `applyLang()` and `applyTheme()` are the heavier variants, called when language or theme changes.

### Level list

`profile().levels` is a flat array mixing two row shapes: blind rows `{sb, bb, ante, min}` and break rows `{brk: true, min}`. A blind row may also carry `chipup: true`, which marks the level where small chips get coloured up; it renders as a chip glyph next to the level number and in the next-level preview, and is toggled per row in the editor. `state.idx` indexes this array directly, so breaks consume an index. Use `levelNumber(i)` for the displayed number (skips breaks) and `nextPlayableAfter(i)` for the blinds shown during a break.

### Storage

`localStorage` keys live in `K`: `pkclock2.profiles`, `pkclock2.settings`, `pkclock2.active`, `pkclock2.run`. All access goes through `lsGet` / `lsSet`, which swallow exceptions so private-mode browsers still run.

The `pkclock2` prefix is a schema version. If the default profile shape changes incompatibly, bump the whole namespace to `pkclock3` rather than migrating in place — that is how stale saved profiles are prevented from overwriting new defaults.

Export/import moves profiles between devices as `{v: 1, profiles: [...]}` JSON through a textarea. Import replaces the entire profile list and re-inserts a `default` profile if the payload lacks one.

## Invariants — do not change without reading the reason

- **The clock is timestamp-based, never decremented.** `play()` stores `endsAt = Date.now() + remain*1000`; the 250 ms `setInterval` recomputes `endsAt - Date.now()`. Decrementing per tick drifts by minutes over a 3-hour tournament when Safari throttles a background tab.
- **Each clock digit is its own fixed-width `<span>`** (`drawClock()` emits `.cd` / `.cs`, `.cd { width: .62em }`). Do not replace this with `tabular-nums`; if the webfont has not loaded, system-font digit widths differ and the clock jitters every second.
- **Payouts round with a remainder.** 1st = `round(pool * 0.7 / step) * step` (`step` is 1000 once the pool reaches 50,000, else 1), 2nd = `pool - first`. Rounding both places independently makes the two payouts fail to sum to the pool. The split is hard-coded 70/30.
- **`AudioContext` is created only inside `audioOn()`, after a user gesture.** iOS Safari blocks audio otherwise, so chimes stay silent until the first button press. `audioOn()` also pushes one silent sample through the context the first time (iOS keeps it mute until it has actually played something during a gesture) and resumes on any state other than `"running"` — iOS parks a context in the non-standard `"interrupted"` state after Siri or a call and never leaves it on its own. Document-level `touchend` / `pointerdown` / `visibilitychange` listeners call it, so any tap revives the alarm. What none of this can fix is iPad Silent Mode, which mutes Web Audio with no way to detect it from script; the volume slider chimes on release so the user can tell the two apart. Chimes peak near full scale (`vol()` tops out at 0.95) and every oscillator connects through the `master` DynamicsCompressor, which keeps the overlapping notes from clipping — route any new sound through `master` too.
- **The `default` profile is read-only in the UI.** `openEditor()` refuses it, `btnEdSave` refuses it, and the menu entry is dimmed; deletion was already blocked. Change the shipped structure by editing `defaultProfile()` / `defaultLevels()` and pushing, never by relaxing these guards. Users who want a different structure duplicate the profile.
- **A restored tournament always comes back paused.** `pkclock2.run` holds `{v, at, pid, idx, remain, running, endsAt, entries}`, written every 5 s while the clock runs, on every level or entries change, and on `visibilitychange` to hidden. `maybeResume()` offers it once at boot — same profile, under 6 hours old, and only if the run had actually started. `applyRun()` clamps `remain` to the level length and never sets `running`. Do not make it auto-resume: the tab usually reloads because iPadOS killed it, and the table is not necessarily ready to play the second the page comes back.
- **`saveRun()` is inert until `maybeResume()` sets `runReady`.** Boot calls `loadLevel(0, false)` before the restore prompt; without that gate the fresh state would overwrite the record being offered.

## Conventions when extending

- **New UI string:** add the key to both `I18N.en` and `I18N.vi`, then map the element id to that key in the `m` object inside `applyLang()`. English is the fallback for missing keys.
- **New theme:** append to the `THEMES` array *and* add a matching `:root[data-app-theme="<id>"]` token block. Swatches are generated from `THEMES`.
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
