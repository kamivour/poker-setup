# Công nghệ và cách thực thi

Tài liệu này mô tả từng cơ chế của Homegame Blind Clock: dùng công nghệ gì, làm
bằng cách nào, và vì sao lại làm theo cách đó. README trả lời câu hỏi "cái này
là gì và còn thiếu gì"; tài liệu này trả lời câu hỏi "nó hoạt động ra sao".

Viết cho người sẽ sửa code — tôi của sáu tháng sau, hoặc một agent được thả vào
repo mà không có ngữ cảnh.

---

## Mục lục

1. [Nền tảng và ràng buộc](#1-nền-tảng-và-ràng-buộc)
2. [index.html](#2-indexhtml)
3. [style.css](#3-stylecss)
4. [fx.js — nền WebGL](#4-fxjs--nền-webgl)
5. [app.js — logic đồng hồ](#5-appjs--logic-đồng-hồ)
6. [Triển khai và vận hành](#6-triển-khai-và-vận-hành)
7. [Giới hạn đã biết](#7-giới-hạn-đã-biết)

---

## 1. Nền tảng và ràng buộc

### 1.1 Chọn stack

Toàn bộ site là bốn file tĩnh: `index.html`, `style.css`, `app.js`, `fx.js`.
Không build step, không package manager, không framework, không dependency
runtime nào ngoài một link Google Fonts.

Lý do không phải là tiết kiệm. Đây là một thiết bị đơn dụng đặt cạnh bàn poker,
phải mở lên là chạy trong nhiều năm, và người bảo trì duy nhất là tác giả. Mỗi
lớp công cụ thêm vào là một thứ có thể mục ra: một bundler cần cập nhật, một
lockfile cần vá, một transpiler đổi hành vi giữa hai phiên bản. Bốn file phẳng
thì mở bằng trình soạn thảo nào cũng sửa được, và mở được trực tiếp từ
`file://` khi không có server.

Hệ quả cụ thể của lựa chọn này:

- **`app.js` viết bằng ES5 thuần**: `var`, `function`, không module, không arrow
  function, không `const`/`let`, không template literal. Không phải vì trình
  duyệt đích thiếu tính năng — Safari trên iPad đã hỗ trợ ES6 từ lâu — mà để
  toàn file giữ một phong cách duy nhất, và để không bao giờ có cớ thêm bước
  biên dịch. Ngoại lệ đã dùng: `Object.assign`, `Array.prototype.forEach`,
  `NodeList.forEach`, `Element.closest`, `scrollTo({behavior})`, tất cả đều có
  sẵn trên Safari 14+.
- **GLSL nhúng dưới dạng mảng chuỗi JavaScript** trong `fx.js`, nối bằng
  `join("\n")`. Nếu để shader trong file `.glsl` riêng thì phải `fetch()` nó, mà
  `fetch()` từ `file://` bị CORS chặn — trang sẽ mất nền khi mở bằng cách kéo
  file vào trình duyệt.
- **SVG nhúng trực tiếp**, hoặc trong markup hoặc dưới dạng `data:` URI trong
  CSS custom property. Không có file ảnh nào trong repo. Một request ít đi là
  một thứ ít có thể hỏng khi wifi ở chỗ chơi chập chờn.

### 1.2 Thiết bị đích

Thiết bị chính là iPad chạy Safari, mở từ Home Screen ở chế độ standalone. Thứ
hai là laptop. Ràng buộc từ iPad chi phối nhiều quyết định trong tài liệu này:
Web Audio bị khoá tới khi có user gesture, tab nền bị throttle rồi bị huỷ khi
thiếu bộ nhớ, không có hover, Wake Lock chỉ chạy trên HTTPS, và chế độ im lặng
tắt tiếng mà JavaScript không phát hiện được.

---

## 2. index.html

Chỉ có markup. Không có logic, không có style inline, trừ một ngoại lệ được nói
ở 2.2.

### 2.1 `<head>`

| Thẻ | Vai trò |
|---|---|
| `viewport` với `viewport-fit=cover` | Cho trang tràn ra vùng safe area của iPad; `:root` bù lại bằng `env(safe-area-inset-*)` |
| `user-scalable=no` | Chặn double-tap zoom — mọi thao tác trên màn hình chính đều là tap, không có gì cần phóng to |
| `apple-mobile-web-app-capable`, `mobile-web-app-capable` | Mở từ Home Screen thì chạy standalone, không có thanh địa chỉ |
| `apple-mobile-web-app-status-bar-style=black-translucent` | Thanh trạng thái trong suốt, nền của trang chạy lên dưới nó |
| `theme-color` | Màu thanh hệ thống; `applyTheme()` ghi lại giá trị này mỗi lần đổi theme |

Font tải từ Google Fonts: **IBM Plex Sans** cho chữ giao diện và **Outfit** cho
mọi con số lớn (đồng hồ, blind, ante, tiền giải). Đây là thứ duy nhất tải từ
ngoài. Tự host font là việc đã ghi trong backlog của README, chưa làm.

### 2.2 Script first-paint

Ngoại lệ duy nhất về logic trong `index.html`, ba dòng đặt **trước** thẻ
`<link>` của `style.css`:

```html
<script>
try{var s=JSON.parse(localStorage.getItem("pkclock2.settings"));if(s&&s.theme){document.documentElement.setAttribute("data-app-theme",s.theme);if(s.theme==="minimal")document.documentElement.classList.add("flat");}}catch(e){}
</script>
```

`app.js` nạp ở cuối `<body>`, nên nếu chờ nó gọi `applyTheme()` thì khung hình
đầu tiên luôn là Felt — màn hình loé xanh rồi mới nhảy sang theme đã chọn. Đoạn
script này đọc thẳng `localStorage` và gắn `data-app-theme` cùng class `flat`
trước khi trình duyệt vẽ bất cứ thứ gì.

Nó **lặp lại** một phần logic của `applyTheme()`, nên khi thêm theme phẳng mới
phải sửa cả hai chỗ. Đây là sự lặp có chủ ý và đã ghi chú trong cả hai file.
`try/catch` bọc ngoài vì `localStorage` ném lỗi ở chế độ riêng tư của Safari.

### 2.3 `<body>`

```
<canvas id="fx">        nền WebGL, fixed, z-index:-1, pointer-events:none
<div class="app">       grid 3 hàng: header.topbar / main.stage / section.stats
<div id="settingsOverlay">
<div id="editorOverlay">
<div id="ioOverlay">
```

Canvas đứng đầu và nằm ngoài `.app`. Nó `position:fixed` nên không tham gia
layout, `z-index:-1` nên luôn ở sau, `pointer-events:none` nên không bao giờ
nuốt một cú chạm. Ba thuộc tính này là bất biến: nền không được phép sinh thanh
cuộn hay chặn nút.

Ba overlay nằm ngoài `.app` để không bị grid của `.app` ràng buộc và để
`backdrop-filter` của chúng phủ được cả topbar lẫn stats.

### 2.4 Icon

Mọi icon là SVG inline, `stroke:currentColor`, `fill:none`, nên đổi màu theo
theme mà không cần file riêng. Icon dựng lúc chạy (play, pause, chip, mũi tên,
grip kéo, dấu xoá) nằm trong `app.js` dưới dạng hằng chuỗi: `SVG_CHIP_PATH`,
`SVG_CHIP`, `SVG_PLAY`, `SVG_PAUSE`.

---

## 3. style.css

Một file, các section theo đúng thứ tự sau, và phải giữ thứ tự đó vì phần sau
ghi đè phần trước bằng cascade chứ không bằng specificity:

```
base → theme tokens → layout (top bar, stage, stats) → decorated look
     → motion → modals → reduced motion
```

### 3.1 Ba trạng thái của `<html>`

Toàn bộ diện mạo được điều khiển bằng thuộc tính và class trên `<html>`:

| Thứ | Ai gắn | Nghĩa |
|---|---|---|
| `data-app-theme="<id>"` | script first-paint, rồi `applyTheme()` | chọn khối token màu |
| `.flat` | như trên, khi `THEMES` có `flat:true` | bỏ qua toàn bộ khối decorated look |
| `.nofx` | `fx.js` | WebGL hỏng, hiện gradient `--decor` thay canvas |

Mọi rule trang trí đều mang tiền tố `html:not(.flat)`. Nhờ vậy một theme phẳng
không cần khai báo bất kỳ token trang trí nào — nó chỉ cần màu.

### 3.2 Token theme

Mỗi theme là một khối `:root[data-app-theme="<id>"]`; Felt là mặc định và nằm
thẳng trên `:root`.

**Cạm bẫy quan trọng:** token nào một theme không khai báo lại thì **rơi xuống
giá trị của Felt trên `:root`**. Đây là lý do Minimal, dù phẳng, vẫn phải đặt
`--clock-ink` — nếu không, màu ngà `#F8F3E6` của Felt sẽ lọt qua và đồng hồ
sáng trắng giữa nền đen xám.

Token màu cơ bản:

```
--bg --bg2 --surface --line           nền và đường kẻ
--ink --ink-dim --muted               ba cấp chữ
--accent --accent-ink                 màu nhấn và màu chữ đặt trên nó
--warn --crit                         đồng hồ khi còn 60 giây và 10 giây
--gold --silver                       cúp giải nhất và giải nhì
```

Token trang trí (chỉ theme không phẳng cần):

```
--decor                               nền gradient CSS, dùng khi không có WebGL
--glass --glass-line --glass-hi
--glass-shadow --sheen                nút kính mờ và vệt sáng của nó
--clock-ink                           màu chữ đồng hồ lúc bình thường
--clock-fx                            chất liệu đồng hồ: một stack text-shadow
--num-fx                              chất liệu tương tự cho blind và ante
--num-ink                             màu small blind và ante (mặc định --ink-dim)
```

`--clock-fx` và `--num-fx` là **stack `text-shadow` riêng của từng theme**, chứ
không phải một stack chung với các con số khác nhau. Felt là quầng mờ cộng bóng
đổ; Bone và Cafe là một bóng sát cộng một bóng mềm rộng; Royal là năm lớp màu
đồng xếp xuống làm mặt bên của thỏi vàng; Midnight là hairline sáng ở mép trên
trái cộng hai nấc bóng ở mép dưới phải.

Token riêng của hai theme có chất liệu cắt theo chữ:

```
Royal:    --gild-a … --gild-e   năm nấc gradient vàng
          --gild-x --gild-y     hai nấc đồng của mặt bên
          --chips               SVG hai viên chip đỏ
Midnight: --moon                SVG địa hình mặt trăng
          --moon-tint           màu nhuộm nhân lên địa hình
          --moon-x --moon-y     hai nấc bóng mặt bên
```

### 3.3 Layout

`.app` là grid ba hàng `auto minmax(0,1fr) auto`. `minmax(0,1fr)` chứ không
phải `1fr`: nếu không có `min` bằng 0 thì hàng giữa không co lại được dưới kích
thước nội dung và đồng hồ đẩy thanh stats ra khỏi màn hình.

Mọi cỡ chữ lớn dùng `clamp()` với đơn vị theo cả chiều ngang lẫn chiều dọc:

```css
.clock { font-size: clamp(3.5rem, min(28vw,36vh), 24rem) }
.bval  { font-size: clamp(1.9rem, min(11vw,12.5vh), 8.5rem) }
```

`min(vw, vh)` để đồng hồ vừa cả màn ngang lẫn màn dọc mà không cần media query.
Trần trên đặt rất cao (`24rem`) vì mục tiêu là đọc được từ cuối bàn: chữ được
phép to hết cỡ màn hình cho phép.

Thanh stats là grid ba cột `1fr 1.15fr 1.5fr`, tỉ lệ lệch vì cột tiền thưởng
chứa hai dòng tiền dài nhất. Dưới `720px` nó gập thành hai cột và ô payouts
chiếm trọn hàng dưới.

`--stats-gap: clamp(10px, 2.4vh, 26px)` khai báo trên `.app` vì hai chỗ cùng
dùng nó: khoảng cách trên thanh stats, và vị trí đáy của hai viên chip Royal —
chip phải nằm đúng trên vạch chia dù thanh stats cao bao nhiêu.

### 3.4 Chất liệu số

Nền tảng chung, áp cho mọi theme không phẳng:

```css
html:not(.flat) .clock                          { text-shadow: var(--clock-fx) }
html:not(.flat) .bval,
html:not(.flat) .bval .bb                       { text-shadow: var(--num-fx,none) }
html:not(.flat) .bval .sl                       { text-shadow: none }
```

`.bb` (big blind) khai báo lại `text-shadow` dù đã thừa kế, vì trong token có
`color-mix(... currentcolor ...)` — `currentcolor` phải được tính ở chính phần
tử big blind để bóng ăn theo màu accent của nó, chứ không phải màu của thẻ cha.
Dấu gạch chéo `.sl` gỡ bóng đi cho sạch.

#### Kỹ thuật `::after { content: attr(data-d) }`

Royal và Midnight cần **một gradient hoặc một ảnh cắt theo hình chữ**
(`background-clip:text`), đồng thời vẫn cần **một stack `text-shadow`** làm mặt
bên và bóng đổ. Không thể đặt cả hai lên cùng một phần tử: `text-shadow` vẽ
*dưới* chữ, nhưng khi chữ trong suốt để lộ gradient thì bóng lại hiện xuyên qua
và đè lên chính gradient đó.

Cách giải: nhân đôi ký tự.

1. `<span>` gốc giữ `color:transparent` và chỉ đổ bóng — nó là "thân" của chữ.
2. `::after` của nó đọc `content: attr(data-d)`, nằm `position:absolute;inset:0`,
   `text-shadow:none`, mang gradient hoặc ảnh và `background-clip:text` — nó là
   "mặt" của chữ.

`drawClock()` ghi ký tự vào cả `textContent` lẫn thuộc tính `data-d`, chính là
để phục vụ bản sao này.

#### Royal — vàng dập nổi

`::after` mang hai layer background chồng nhau:

```css
background-image:
  linear-gradient(180deg,transparent 38%,rgba(255,255,255,.55) 50%,transparent 62%),
  linear-gradient(180deg,var(--gild-a) 0%,var(--gild-b) 34%,var(--gild-c) 52%,
                         var(--gild-d) 66%,var(--gild-e) 100%);
background-size: 100% 300%, 100% 100%;
animation: gleam 9s cubic-bezier(.4,0,.2,1) infinite;
```

Layer dưới là vàng đánh bóng năm nấc. Layer trên là một dải sáng cao gấp ba
khung chữ; `@keyframes gleam` đứng yên 76% thời gian rồi trượt `background-position`
từ `0 100%` về `0 0%`, tức là vệt sáng lướt qua mặt vàng mỗi chín giây.

Gradient theo chiều dọc và **mỗi ký tự có gradient riêng**, nên các nấc màu
trùng nhau theo hàng ngang và cả dãy số đọc như một thỏi vàng liền.

Mặt bên là `--clock-fx`, năm bản sao ký tự lệch xuống dần bằng `--gild-x` và
`--gild-y`. Nó được khai báo **trên `.clock`, không phải trên `:root`**:

```css
:root[data-app-theme="royal"] .clock      { --clock-fx: … var(--gild-x) … }
:root[data-app-theme="royal"] .clock.warn { --gild-x:#8A4A0A; --gild-y:#553006 }
:root[data-app-theme="royal"] .clock.crit { --gild-x:#7E2A1B; --gild-y:#4A170D }
```

Lý do: `var()` bên trong một custom property được **giải ở nơi custom property
đó được khai báo**, không phải nơi nó được dùng. Nếu `--clock-fx` khai báo trên
`:root` thì `var(--gild-x)` khoá cứng vào giá trị của `:root`, và `.warn` /
`.crit` đổi `--gild-x` trên `.clock` sẽ không có tác dụng gì.

Animation `gleam` chạy trên `::after`, còn animation `roll` của chữ số chạy
trên `<span>`. Tách ra hai phần tử nên chúng không bao giờ tranh nhau thuộc
tính `animation`.

#### Midnight — mặt trăng

Cùng kỹ thuật `::after`, nhưng "mặt" của chữ là một ảnh:

```css
background-image: linear-gradient(var(--moon-tint),var(--moon-tint)), var(--moon);
background-blend-mode: multiply, normal;
background-size: 2em 2em;
```

`--moon` là SVG `data:` URI dựng địa hình ngay trong filter, không có file ảnh:

- `feTurbulence type="fractalNoise" baseFrequency=".032" numOctaves="5"` tạo bụi
  regolith, `stitchTiles="stitch"` để lát gạch không lộ mối nối;
- chín hình tròn tô bằng một `radialGradient` có vành sáng ở rìa đóng vai các hố
  thiên thạch, `feColorMatrix type="luminanceToAlpha"` biến chúng thành bản đồ
  độ cao, `feComposite` trộn với noise;
- `feDiffuseLighting surfaceScale="7"` cùng `feDistantLight azimuth="225"
  elevation="55"` chiếu sáng bản đồ độ cao thành ảnh nổi — ánh sáng từ trên
  trái, cùng hướng với `--clock-fx`.

`--moon-tint` nhân (`multiply`) lên ảnh xám đó: trắng lúc bình thường, hổ phách
khi `.warn`, đỏ khi `.crit`.

Tấm ảnh chỉ 2em nên nếu mọi ký tự dùng chung `background-position` thì năm chữ
số sẽ có hố thiên thạch giống hệt nhau. Bảy rule `:nth-child(2..8)::after` dịch
ảnh đi những lượng khác nhau, vừa để không ký tự nào trùng ký tự nào, vừa để
mối nối của tile không rơi vào giữa một chữ số.

Giống Royal, `--clock-fx` của Midnight khai báo trên `.clock` vì `.warn` và
`.crit` đổi `--moon-x` / `--moon-y`.

### 3.5 Nút kính mờ và vệt sáng

`.pill`, `.cbtn`, `.iconbtn` chỉ lấy màu kính và một đường sáng trong
(`inset 0 1px 0 var(--glass-hi)`) để cả màn hình đọc như một chất liệu. Chỉ
`.tbtn` (nút điều khiển) được nhấc lên và loé sáng:

- `backdrop-filter: blur(10px) saturate(140%)` — nền phía sau mờ đi và đậm màu
  lên, đây là thứ làm nút trông như kính chứ không như một ô màu;
- `background-image: linear-gradient(165deg, var(--glass-hi) -20%, transparent 45%)`
  — ánh sáng chéo trên mặt kính;
- `box-shadow` ba lớp: đường sáng trong ở mép trên, đường tối trong ở mép dưới,
  bóng đổ ra ngoài.

Nút chính (`.tbtn.primary`) tắt `backdrop-filter` và dùng màu accent đặc, vì
kính mờ chồng lên màu bão hoà cao làm màu accent xỉn đi.

Vệt sáng `sheen` là một `::after` hình dải nghiêng `skewX(-18deg)`, rộng 60%
nút, nằm ngoài mép trái, `opacity:0`. Keyframe `sheen` đẩy nó sang phải 320% và
cho hiện lên rồi tắt.

Hai đường kích hoạt:

- Trên thiết bị có chuột, `@media (hover:hover)` chạy animation khi `:hover`.
- Trên iPad không có hover, `app.js` gắn class `.shine` ở `pointerdown` và gỡ
  ở `animationend`. Giữa hai lần gắn có một lần đọc `offsetWidth` để ép reflow,
  nếu không thì chạm nhanh hai lần liên tiếp sẽ không chạy lại animation.

### 3.6 Chuyển động

Nguyên tắc: **mọi chuyển động chỉ dùng `transform` và `opacity`**, không có
animation nào đụng tới màu, cỡ chữ hay bóng. Chữ không bị vẽ lại khi có
animation chạy.

| Class / keyframe | Ở đâu | Khi nào |
|---|---|---|
| `roll` (.tk) | từng chữ số | chữ số đổi giá trị; 0,28s trượt từ trên xuống |
| `swap` | eyebrow, blinds, nextline | đổi level; 0,5s trồi lên |
| `sheen` | .tbtn::after | hover hoặc chạm |
| `gleam` | Royal .cd::after | lặp vô hạn, chu kỳ 9s |
| `pulse` | .clock.crit | còn dưới 10 giây, nhấp nháy opacity |
| `fade`, `pop`, `menupop`, `rise` | .app, modal, menu, toast và thanh khôi phục | lúc xuất hiện |

`.tk` được `drawClock()` gắn vào và một listener `animationend` trên `.clock`
gỡ ra. Listener đặt trên thẻ cha chứ không trên từng span — span bị thay
`innerHTML` khi chuỗi đổi độ dài, listener gắn trên span sẽ mất theo.

`swap` chỉ chạy khi khoá `shownLevel` (`activeId + ":" + state.idx`) đổi, nên
bấm "chạy lại level" không làm dòng blind nhảy.

Trên theme phẳng, `roll` bị tắt (rule có tiền tố `html:not(.flat)`), đồng hồ
đứng yên hoàn toàn.

### 3.7 Giảm chuyển động

Khối cuối file, `@media (prefers-reduced-motion:reduce)`:

- ép mọi `animation-duration` và `transition-duration` về `.001s` và
  `animation-iteration-count:1`;
- tắt hẳn `pulse` của `.clock.crit` và trả `opacity:1`, vì nhấp nháy là thứ khó
  chịu nhất trong danh sách;
- bỏ `transform` khi hover / active trên nút và đồng hồ;
- tắt `gleam` của Royal.

`fx.js` cũng đọc cùng media query đó và chỉ vẽ một khung hình tĩnh.

---

## 4. fx.js — nền WebGL

Một IIFE. API công khai đúng một hàm: `window.PKFX.setTheme(id, flat)`.

### 4.1 Khởi tạo context

```js
var opts = {alpha:false, antialias:false, depth:false, stencil:false,
            preserveDrawingBuffer:false, powerPreference:"low-power",
            failIfMajorPerformanceCaveat:!force};
gl = canvas.getContext("webgl",opts) || canvas.getContext("experimental-webgl",opts);
```

Mọi buffer không cần thiết đều tắt: không alpha (nền luôn đục), không depth,
không stencil, không antialias (đây là fullscreen quad, không có cạnh hình
học), không giữ drawing buffer. `powerPreference:"low-power"` để máy có hai GPU
không đánh thức GPU rời cho một cái nền.

`failIfMajorPerformanceCaveat:true` làm `getContext` trả về `null` khi trình
duyệt chỉ có thể render bằng phần mềm. Đây là lựa chọn có chủ ý: một shader
fullscreen chạy trên CPU sẽ làm giật cả trang, thà rơi về gradient CSS. Thêm
`?fx=force` vào URL sẽ tắt cờ này — đó là cách chụp ảnh màn hình bằng Chrome
headless với SwiftShader.

Không lấy được context thì gắn class `nofx` lên `<html>` và thoát ngay.

### 4.2 Hình học và uniform

Vertex shader vẽ **một tam giác duy nhất** phủ quá màn hình
(`[-1,-1, 3,-1, -1,3]`), không phải hai tam giác thành một hình chữ nhật. Cách
này tránh đường ghép ở giữa và ít vertex hơn.

| Uniform | Nội dung |
|---|---|
| `u_res` | kích thước canvas tính bằng pixel thật |
| `u_t` | thời gian, giây, **quay vòng ở 3600** |
| `u_theme` | slot theme đang hiện |
| `u_prev` | slot theme trước đó |
| `u_mix` | tiến độ crossfade 0…1 |

`SLOT = {felt:0, bone:1, cafe:2, royal:3, midnight:4}`. `paint()` trong GLSL là
một chuỗi `if` so sánh `u_theme`, vì WebGL1 GLSL không có `switch` trên biến
uniform và không cho index mảng hàm.

### 4.3 Hàm dựng hình trong GLSL

```glsl
hash(vec2)              nhiễu băm, nền của mọi thứ ngẫu nhiên
noise(vec2)             value noise, nội suy smoothstep
noiseT(vec2, per)       như trên nhưng lattice lặp lại sau `per` đơn vị
fbm(vec2)               3 octave noise
fbmT(vec2, per)         3 octave noiseT
soft(q, c, r, edge)     một vùng sáng hình ellipse, mép mềm
```

`noiseT` / `fbmT` tồn tại để một trường nhiễu có thể trôi mãi mà toạ độ không
lớn dần — lattice lặp lại nên `mod()` giữ chỉ số trong khoảng nhỏ, `float` 32
bit không mất độ chính xác sau vài giờ.

### 4.4 Từng theme

**`felt(p,q,t)`** — một ngọn đèn trên nỉ xanh. `soft()` tạo vũng sáng, bình
phương lên cho mép gắt hơn, rồi nhân với một dao động biên độ 3% chu kỳ 24 giây
(đèn "thở"). `fbm` trôi chậm làm lớp sương trong luồng sáng. Sợi nỉ là noise
dị hướng `noise(p*vec2(150.0,340.0))` cộng một lớp noise đều — tỉ lệ 150 ngang
và 340 dọc cho ra sợi kéo dài theo chiều ngang. Cuối cùng vignette theo
`length(q)`.

**`bone(p,q,t)`** — giấy ấm dưới ánh cửa sổ. Gần như đứng yên: nguồn sáng ở
trên trái dịch qua lại với chu kỳ 600 giây, vân giấy là `fbm`, hạt giấy là
`noise(p*280.0)` biên độ 4,5%. Vignette rất nhẹ (11%).

**`cafe(p,q,t)`** — tường vữa dưới đèn ấm. Phần khó nhất là vân vữa sắc nét
trên canvas chỉ 0,6× độ phân giải:

```glsl
vec2 g = p*56.0;
float e = 56.0/u_res.y;          // đúng một pixel canvas
float h0 = plaster(g);
float gx = plaster(g+vec2(e,0.0)) - h0;
float gy = plaster(g+vec2(0.0,e)) - h0;
float lit = dot(vec2(gx,gy)/e, vec2(-0.6,0.8));
col *= 1.0 + clamp(lit*0.1, -0.32, 0.22);
```

Thay vì đổ bóng bằng noise mờ, hàm lấy **gradient của bản đồ độ cao bằng sai
phân hữu hạn với bước đúng bằng một pixel canvas**, rồi chấm với hướng sáng.
Bước lấy mẫu bám theo `u_res` nên vân luôn sắc ở mọi độ phân giải. `clamp`
không đối xứng (`-0.32` tối, `+0.22` sáng) vì vữa thật có bóng sâu hơn phần
bắt sáng. `plaster()` là ba lớp: noise nền, một lớp `abs(noise*2-1)` tạo gờ
nhọn kiểu vết bay, và một lớp noise mịn.

**`royal(p,q,t,asp)`** — đen ngả rượu vang, viền vàng, bụi vàng bay lên. Bụi
dùng thủ thuật **một hạt trên mỗi ô lưới**: `floor(p/0.11)` cho chỉ số ô, băm
chỉ số đó ra vị trí, kích thước, tốc độ và pha nhấp nháy. 42% số ô có hạt. Mỗi
pixel chỉ xét đúng ô của nó, nên chi phí không đổi dù có bao nhiêu hạt. Hạt bay
lên bằng `fract(h.y + t*m/600.0)` — chu kỳ chia hết cho 600 giây. `keep =
smoothstep(0.42,1.0,r)` giữ vùng giữa tối để không có hạt nào lấp lánh sau
đồng hồ. Vệt đèn quét ngang có chu kỳ 60 giây.

**`midnight(p,q,t,asp)`** — bầu trời đêm.

- Nền: gradient dốc `clamp(0.5 - 0.5*q.y + 0.1*q.x, 0, 1)` — nghiêng nhẹ nên
  giống chân trời hơn là một dải ngang.
- Sao nền: lưới `p*36.0`, 30% số ô có sao, kích thước và độ sáng băm từ chỉ số
  ô, màu nội suy giữa trắng ấm và trắng xanh. Sao mờ đi ở phần sáng của gradient
  và ở giữa màn hình, nên không đọ với đồng hồ.
- Ba chòm sao vẽ bằng `link()` (đoạn thẳng có gaussian falloff) và `cst()` (một
  ngôi sao sáng cộng một quầng). Chòm Bắc Đẩu neo góc trên trái, Thiên Hậu góc
  trên phải, Lạp Hộ góc dưới phải — toạ độ tính từ `asp` (tỉ lệ khung hình) nên
  chúng luôn bám mép và không bao giờ chạy vào giữa, bất kể màn ngang hay dọc.
- Độ dày nét lấy theo `px = 1.0/u_res.y`, tức là theo pixel canvas, nên nét sao
  không dày lên khi màn hình nhỏ.
- Sao băng: `mod(t,120.0) < 1.4`. Mỗi 120 giây có một vệt kéo dài 1,4 giây;
  `floor(t/120.0)` băm ra điểm xuất phát nên năm lần liên tiếp không trùng nhau.
  Vệt là một `link()` từ đầu đến đuôi, độ sáng nhân với `along*along` (đuôi mờ
  dần) và `sin(u*3.14159)` (hiện lên rồi tắt).

### 4.5 Crossfade và dither

```glsl
vec3 col = paint(u_theme,p,q,u_t,asp);
if(u_mix<1.0){ col = mix(paint(u_prev,p,q,u_t,asp), col, u_mix); }
col += (hash(gl_FragCoord.xy)-0.5)*(2.0/255.0);
```

Đổi theme thì shader vẽ **cả hai** nền và trộn. `u_mix` chạy từ 0 đến 1 trong
900 ms, đi qua `smoothstep` ở phía JavaScript. Trong 900 ms đó chi phí gấp đôi;
đây là lần duy nhất trong cả phiên chơi nên chấp nhận được.

Dòng cuối cộng nhiễu biên độ một nấc 8-bit. Nếu không có nó, các gradient rất
thoải của Midnight và Royal sẽ lộ vành màu (banding) trên màn hình iPad.

### 4.6 Ngân sách vẽ

```js
SCALE = 0.6; MAX_PX = 1.3e6; FRAME_MS = 1000/30; MIX_MS = 900;
```

- **Độ phân giải**: canvas dựng ở 0,6× pixel CSS, và nếu vẫn vượt 1,3 triệu
  pixel thì hạ tiếp `s = sqrt(MAX_PX/(W*H))`. Nền chỉ là gradient và noise nên
  mắt không thấy khác biệt, còn số pixel phải tô giảm khoảng ba lần.
- **Nhịp khung hình**: `tick()` bỏ qua khung nếu chưa đủ `FRAME_MS - 1` ms kể
  từ khung trước. Tối đa 30 fps.
- **Tab ẩn**: `visibilitychange` gọi `stop()`, huỷ `requestAnimationFrame` đang
  chờ. Không vẽ một khung nào khi trang bị che.
- **Giảm chuyển động**: `tick()` không lên lịch khung tiếp theo, trừ khi đang
  giữa một crossfade. Nền thành một ảnh tĩnh.
- **Trôi số thực**: mọi chuyển động trong shader tuần hoàn theo 600 giây, và
  `u_t` lấy `% 3600`. Nhờ vậy sau ba tiếng chơi, `float` không mất độ chính xác
  và khoảnh khắc quay vòng không nhìn thấy được.

`resize()` chỉ gán lại `canvas.width/height` khi kích thước thực sự đổi — gán
lại kích thước canvas sẽ xoá và cấp phát lại framebuffer.

`fx.js` gắn class `.on` lên canvas sau khung hình đầu tiên; CSS cho nó
`transition: opacity .9s`, nên nền hiện dần lên từ màu nền phẳng thay vì bật ra
đột ngột.

### 4.7 Đường suy giảm

| Sự cố | Xử lý |
|---|---|
| Không có WebGL | `nofx` + `--decor` |
| Chỉ render được bằng phần mềm | `getContext` trả `null` vì `failIfMajorPerformanceCaveat` |
| Shader không biên dịch hoặc không link | `setup()` trả `false`, `nofx` |
| Mất context (`webglcontextlost`) | huỷ vòng lặp, `nofx`, canvas mờ đi |
| Khôi phục context | `setup()` lại, gỡ `nofx`, chạy tiếp |
| Theme phẳng | `setTheme(id, true)` dừng vòng lặp và gỡ `.on`; CSS ẩn hẳn canvas |

Bất biến: **đồng hồ không bao giờ phụ thuộc vào canvas.** Mọi nhánh hỏng đều
kết thúc ở một nền CSS tĩnh và một trang vẫn dùng được.

---

## 5. app.js — logic đồng hồ

Một IIFE, `"use strict"`, ES5. Thứ tự section trong file:

```
I18N → THEMES → defaults → storage → tournament state → audio → wake lock
     → DOM helpers → render() → applyLang()/applyTheme() → clock engine
     → controls → overlays → profile menu → settings → profile editor
     → export/import → boot
```

Sửa gì thì sửa đúng trong section của nó, đừng nối thêm vào cuối file.

### 5.1 i18n

`I18N` là object hai khoá `en` và `vi`, mỗi khoá là một bảng phẳng
`key -> chuỗi`. Hàm tra:

```js
function t(k){ return (I18N[settings.lang]||I18N.en)[k] || I18N.en[k] || k; }
```

Thiếu khoá thì rơi về tiếng Anh, thiếu cả tiếng Anh thì trả về chính tên khoá —
không bao giờ hiện `undefined` trên màn hình.

`applyLang()` chứa object `m` ánh xạ **id phần tử → khoá dịch** và gán
`textContent` cho từng cái. Thêm chuỗi mới nghĩa là thêm ba chỗ: `I18N.en`,
`I18N.vi`, và một dòng trong `m`. Các nhãn không phải text (aria-label, title
của nút transport) xử lý riêng ngay sau vòng lặp đó.

Ba khoá `left`, `avg`, `chips` còn nằm trong `I18N` nhưng không dùng ở đâu cả —
tàn dư của ý tưởng đếm người còn lại, đã quyết định không làm (README mục 4b).

### 5.2 THEMES

```js
{id, name, bg, ink, accent, flat?}
```

Mảng này là nguồn duy nhất cho: danh sách swatch trong Settings (dựng bằng
JavaScript, ba màu vẽ thành ô vuông có thanh và chấm), giá trị `theme-color`,
và quyết định theme có phẳng hay không.

Thêm theme = bốn việc: một mục trong `THEMES`, một khối token trong
`style.css`, một nhánh shader trong `fx.js` (hàm GLSL + case trong `paint()` +
mục trong `SLOT`), và — nếu là theme phẳng — thêm id vào script first-paint
trong `index.html`.

### 5.3 Giá trị mặc định

`defaultLevels()` trả về mười level, blind từ 100/200 đến 5000/10000, ante bằng
big blind, mỗi level 20 phút. `defaultProfile()` bọc chúng lại cùng buy-in
36.000, rake 6.000, stack 20.000, đơn vị `₫`, break mặc định 10 phút.

Đây là "cấu trúc xuất xưởng". Muốn đổi thì sửa hai hàm này rồi push — không
phải việc làm ở bàn chơi (xem 5.21).

### 5.4 Lưu trữ

```js
var K = {profiles:"pkclock2.profiles", settings:"pkclock2.settings",
         active:"pkclock2.active", run:"pkclock2.run"};
function lsGet(k,fb){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch(e){ return fb; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
```

Mọi truy cập đi qua hai hàm này và **nuốt lỗi**. Safari ở chế độ riêng tư ném
`QuotaExceededError` ngay khi ghi; nuốt lỗi nghĩa là trang vẫn chạy được trọn
một giải, chỉ là không nhớ gì sau khi đóng.

**Tiền tố `pkclock2` là số phiên bản schema.** Nếu cấu trúc profile mặc định
đổi theo kiểu không tương thích thì **bump cả namespace lên `pkclock3`**, đừng
viết migration tại chỗ. Đó là cách bảo đảm một profile cũ đã lưu không đè lên
mặc định mới.

Khi nạp, ba lớp phòng thủ chạy lần lượt: không có profile nào thì dựng lại mặc
định; không có profile `default` thì chèn nó vào đầu; `activeId` trỏ vào một
profile không tồn tại thì rơi về profile đầu tiên.

Có một migration nhỏ được giữ lại trong code, đánh số bằng `settings.sv`:

```js
if(settings.sv!==2){ settings.sv=2; settings.volume=100; lsSet(K.settings,settings); }
```

Bản cũ ghim âm lượng ở 70; đoạn này nâng nó lên 100 đúng một lần rồi trả quyền
cho người dùng.

### 5.5 Trạng thái giải và bảng level

```js
var state = {idx, remain, running, endsAt, entries, warned};
```

`profile().levels` là **một mảng phẳng trộn hai loại dòng**:

```js
{sb, bb, ante, min}            // dòng blind; có thể thêm chipup:true
{brk:true, min}                // dòng nghỉ
```

`state.idx` đánh chỉ số thẳng vào mảng này, nên **một dòng break cũng chiếm một
chỉ số**. Hai hàm phụ tồn tại vì lý do đó:

- `levelNumber(i)` — số level hiển thị, đếm bỏ qua các dòng break;
- `nextPlayableAfter(i)` — dòng blind đầu tiên sau `i`, dùng để trong giờ nghỉ
  màn hình hiện blind sẽ vào sau khi nghỉ.

`durSec(i)` trả về thời lượng tính bằng giây, tối thiểu 1 giây, để một dòng có
`min` bằng 0 không làm đồng hồ kẹt.

### 5.6 Khôi phục giải đang dở

iPadOS huỷ tab chạy nền khi thiếu bộ nhớ. Đang chơi mà iPad khoá màn hình một
lúc, mở lại là mất sạch level và thời gian. Bản ghi `pkclock2.run` để chống
việc đó:

```js
{v:1, at, pid, idx, remain, running, endsAt, entries}
```

**Khi nào ghi:** mỗi 5 giây trong lúc đồng hồ chạy (`lastRunSave` chặn nhịp),
mỗi lần đổi level, mỗi lần đổi số entries, và ở `visibilitychange` khi tab bị
ẩn — lần ghi cuối này là lần quan trọng nhất, vì nó xảy ra ngay trước khi hệ
điều hành có cơ hội giết tab.

**Cổng `runReady`:** `saveRun()` không làm gì cho tới khi `maybeResume()` bật
cờ này lên. Boot gọi `loadLevel(0,false)` **trước** khi hỏi khôi phục; không có
cổng đó thì trạng thái mới tinh sẽ đè lên chính bản ghi sắp được đề nghị.

**`maybeResume()`** chỉ đề nghị khi hội đủ: bản ghi có `v === 1`, chưa quá 6
giờ, `pid` trỏ tới một profile còn tồn tại, và giải **đã thực sự bắt đầu**
(`running`, hoặc `idx > 0`, hoặc `remain` nhỏ hơn độ dài level). Điều kiện cuối
tránh việc mở trang rồi đóng ngay cũng bị hỏi.

**`applyRun()`** khôi phục level, thời gian và entries, nhưng
**luôn đặt `running = false`**. Đây là bất biến, đừng đổi thành tự chạy tiếp:
tab thường reload vì iPadOS giết nó, và lúc trang quay lại thì bàn chưa chắc đã
sẵn sàng chơi. `remain` bị kẹp trong `[0, durSec(idx)]` nên một bản ghi cũ
không thể làm đồng hồ dài hơn level.

Lời đề nghị hiện bằng `.resumebar` dựng lúc chạy ở đáy màn hình, hai nút:
khôi phục, hoặc bỏ qua (bỏ qua thì xoá luôn bản ghi).

### 5.7 Âm thanh

Không có file âm thanh. Chuông sinh bằng oscillator của Web Audio API.

**Chuỗi mở khoá trên iOS** nằm trong `audioOn()` và có ba phần, thiếu một là
im tiếng cả buổi:

1. **Tạo context chỉ sau user gesture.** `AudioContext` không được tạo lúc nạp
   trang mà chỉ trong `audioOn()`, và `audioOn()` chỉ chạy từ một cú chạm.
2. **Đẩy một mẫu im lặng qua context lần đầu tiên.** iOS giữ context ở trạng
   thái câm cho tới khi nó thực sự phát ra cái gì đó trong lúc trình duyệt đang
   xử lý một cử chỉ. Một buffer 1 sample là đủ. Bắt đầu một nguồn trên context
   còn `suspended` là hợp lệ — nó phát ngay khi `resume()` thành công.
3. **Gọi `resume()` với mọi trạng thái khác `"running"`.** Không chỉ
   `"suspended"`: sau Siri, một cuộc gọi, hoặc màn hình tắt, iOS đỗ context ở
   trạng thái phi chuẩn `"interrupted"` và **không bao giờ tự thoát ra**.

Ba listener ở mức document gọi `audioOn()`: `touchend`, `pointerdown`, và
`visibilitychange` khi trang hiện lại. Nghĩa là **bất kỳ cú chạm nào cũng hồi
sinh chuông**, không riêng nút transport.

**Đường tín hiệu:** mọi oscillator đi qua một `DynamicsCompressor` tên `master`
(threshold −6 dB, knee 6, ratio 12, attack 3 ms, release 120 ms) rồi mới tới
`destination`. Nhờ limiter này chuông có thể chạm gần đỉnh thang mà hai nốt
chồng nhau không vỡ tiếng. **Âm thanh mới thêm sau này cũng phải đi qua
`master`.**

**Sóng triangle, không phải sine.** Triangle có thêm hài bậc lẻ nên cùng một
mức đỉnh lại xuyên qua tiếng ồn phòng tốt hơn — đó là thứ làm chuông nghe rõ từ
đầu bên kia bàn.

**Bao biên độ** dùng `exponentialRampToValueAtTime`, lên trong 20 ms, xuống hết
trong `dur`. Ramp mũ không nhận giá trị 0, nên điểm đầu và điểm cuối là
`0.0001`.

Hai tiếng chuông:

| Hàm | Khi nào | Nốt |
|---|---|---|
| `chimeWarn()` | còn 60 giây | 660 Hz, 0,18 s, 75% âm lượng |
| `chimeLevel()` | sang level | 784 Hz rồi 1047 Hz + 1568 Hz chồng lên |

`vol()` trả `0` nếu tắt chuông, còn lại là `volume/100 * 0.95`. Trần 0,95 chứ
không phải 1,0 để chừa một chút cho limiter.

**Chế độ im lặng của iPad tắt Web Audio và JavaScript không phát hiện được.**
Không có cách khắc phục. Bù lại, thả thanh âm lượng trong Settings sẽ kêu thử
một tiếng (`onchange`, tức là lúc thả tay chứ không phải lúc kéo), để người
dùng phân biệt được "âm lượng đang ở 0" với "iPad đang im lặng".

### 5.8 Wake Lock

`navigator.wakeLock.request("screen")` khi bấm play, nhả khi pause. Xin lại khi
tab quay lại foreground mà đồng hồ vẫn đang chạy — trình duyệt tự nhả lock khi
trang bị ẩn, không xin lại thì màn hình tắt giữa giải.

Toàn bộ bọc trong `try/catch` và `.catch()`: API này không có trên Safari cũ và
**chỉ chạy trên HTTPS hoặc localhost**. Test qua LAN bằng HTTP thuần thì Wake
Lock im lặng không hoạt động, đó là hành vi đúng chứ không phải lỗi.

### 5.9 Định dạng số

- `nf(n)` — `Intl.NumberFormat` với locale `vi-VN` hoặc `en-US` tuỳ ngôn ngữ,
  bọc `try/catch` rơi về `String()`.
- `money(n)` — `nf(n)` cộng đơn vị tiền của profile. **Đơn vị là một chuỗi
  trong profile, không phải mã tiền tệ theo locale**: bàn chơi muốn viết `₫`,
  `k`, `chip` hay gì cũng được.
- `mmss(sec)` — `Math.ceil` rồi `mm:ss`. Làm tròn lên nên đồng hồ hiện `20:00`
  ngay khi bấm play, không nhảy sang `19:59` sau vài mili giây.

### 5.10 `drawClock()`

Đây là chỗ tốn sức vẽ nhất trang, và là chỗ có nhiều ràng buộc nhất.

**Mỗi ký tự là một `<span>` riêng, rộng cố định:**

```html
<span class="cd" data-d="1">1</span>   <!-- .cd { width:.62em } -->
<span class="cs" data-d=":">:</span>   <!-- .cs { width:.3em  } -->
```

Không dùng `tabular-nums` thay cho cách này. Nếu webfont Outfit chưa tải xong
hoặc rớt về font hệ thống, bề rộng chữ số khác nhau và đồng hồ giật một nhịp
mỗi giây.

`data-d` lặp lại ký tự để bản sao `::after` của Royal và Midnight đọc (xem 3.4).

**Chỉ ghi vào những span thực sự đổi:**

```js
if(str === lastClockStr) return;                 // nhịp không đổi gì: không ghi
if(str.length !== lastClockStr.length){ …innerHTML… }   // chỉ khi đổi độ dài
else { chỉ span nào khác thì ghi textContent + data-d + class tk }
```

Nhịp đồng hồ là 250 ms, tức là ba trên bốn nhịp không đổi chữ số nào và không
chạm vào DOM. Dựng lại `innerHTML` chỉ xảy ra khi chuỗi đổi độ dài — trên thực
tế là rất hiếm.

Lý do phải tiết kiệm đến vậy: chất liệu số xếp nhiều lớp `text-shadow` lên chữ
lớn nhất trang, có theme còn thêm một gradient `background-clip:text`. Ghi lại
cả dòng mỗi nhịp là đủ để iPad rớt khung hình.

### 5.11 `render()`

Không có diffing, không có component. Một hàm vẽ lại toàn bộ UI từ `settings`,
`profiles` và `state`. Sau khi đổi trạng thái thì gọi `render()`, hoặc
`loadLevel()` (nó tự gọi `render()`).

Thứ tự trong hàm: tên profile → khoá `shownLevel` và animation `swap` → đồng hồ
→ eyebrow và blind (hai nhánh: dòng break hay dòng blind) → dòng preview level
kế → icon nút play → entries → prize pool → payouts.

Ba biến thể nặng hơn:

- `applyLang()` — dịch lại mọi nhãn, dựng lại các `<select>`, rồi gọi `render()`.
- `applyTheme()` — gắn `data-app-theme`, bật/tắt class `flat`, gọi
  `PKFX.setTheme()`, cập nhật `theme-color`, cập nhật trạng thái `aria-pressed`
  của swatch.

**Công thức prize** nằm cuối `render()`:

```js
var rake  = Math.max(0, Math.min(p.buyin||0, p.rake||0));
var net   = p.buyin - rake;
var pool  = state.entries * net;
var step  = pool >= 50000 ? 1000 : 1;
var first = Math.round(pool*0.7/step)*step;
var second= pool - first;
```

Hai điểm không được đổi: **giải nhì luôn là phần còn lại**, vì làm tròn độc lập
cả hai sẽ có lúc tổng không khớp pool; và **bước làm tròn phụ thuộc pool**, vì
làm tròn 1000 trên một pool nhỏ sẽ nuốt mất phần lớn tiền giải nhì. Tỉ lệ 70/30
cố định trong code, đã cân nhắc và quyết định không cho cấu hình (README 4b).

### 5.12 Hiệu ứng chuyển level

`render()` tính một khoá `shownLevel` gồm id profile và `state.idx`. Khi khoá
đổi, hàm gắn class `swap` lên eyebrow, dòng blind và dòng preview; chính `swapIn()` gỡ class ra trước khi gắn lại. Nhờ khoá này, đổi level thì chữ trôi lên vào chỗ,
còn bấm reset để chạy lại đúng level đó thì không có animation nào — đúng như
kỳ vọng, vì nội dung không đổi.

`swapIn()` là helper gắn class: nó xoá class, đọc `offsetWidth` để ép reflow,
rồi gắn lại. Không có bước reflow thì trình duyệt gộp hai thao tác trong cùng
một frame và animation không chạy lại. Cùng thủ thuật với `.shine` ở 3.5.

### 5.13 Bộ máy đồng hồ

```js
function play(){
  audioOn();
  state.running = true;
  state.endsAt  = Date.now() + Math.round(state.remain*1000);
  …
}
setInterval(function(){
  if(!state.running) return;
  var r = (state.endsAt - Date.now())/1000;
  …
}, 250);
```

**Đồng hồ dựa trên mốc thời gian, không bao giờ trừ dần.** Mỗi nhịp tính lại
`endsAt - Date.now()`. Nếu trừ `0.25` mỗi nhịp, Safari bóp nhịp `setInterval`
của tab nền xuống còn một lần mỗi giây hoặc chậm hơn, và sau một giải ba tiếng
đồng hồ sẽ lệch vài phút. Tính theo mốc thì tab bị bóp nhịp chỉ làm màn hình
cập nhật thưa hơn, không làm đồng hồ sai.

`pause()` chốt `state.remain` từ `endsAt` rồi bỏ cờ `running` và nhả Wake Lock.
`toggle()` gọi một trong hai.

Trong mỗi nhịp:

- `r <= 60` và `state.warned` chưa bật — đánh chuông cảnh báo rồi bật cờ. Cờ
  nằm trong `state` và `loadLevel()` xoá nó, nên mỗi level chuông cảnh báo kêu
  đúng một lần.
- `r <= 0` — đánh chuông hết giờ. Còn level sau thì tăng `state.idx`, nạp
  `durSec` mới, xoá `warned` và đặt lại `endsAt` **ngay trong nhịp đó**, không
  gọi `loadLevel()`. Hết level thì `remain = 0` rồi `pause()`.
- Còn lại — ghi `state.remain = r`.

Nhịp nào cũng gọi `render()`, và cứ quá 5 giây kể từ lần ghi trước thì
`saveRun()` (xem 5.6).

Class cảnh báo do `render()` đặt, không phải bộ đếm:

```js
clockEl.className = "clock" + (state.remain<=10 ? " crit"
                             : state.remain<=60 ? " warn" : "");
```

Hai mốc 60 s và 10 s là hằng số trong code, không có trong cài đặt.

### 5.14 Điều khiển và phím tắt

Nút: play/pause, level trước, level sau, chạy lại level, reset, entry ±,
fullscreen, cài đặt, menu profile. **Bấm vào chính đồng hồ cũng là play/pause**
— nó là mục tiêu lớn nhất màn hình, và trên bàn thì đó là cú chạm tự nhiên
nhất. Đồng hồ cũng nhận `Space` và `Enter` khi đang focus.

**Reset cần hai lần bấm.** Lần bấm đầu gắn class `armed` lên nút, hiện toast
hỏi lại và đặt hẹn giờ 3 giây. Bấm lần hai trong 3 giây đó mới thực sự
`pause()`, đặt `entries = 0`, về level 1 và `clearRun()`. Hết 3 giây thì nút
trở lại bình thường. Nút reset nằm cùng hàng với nút play trên một màn hình
cảm ứng, nên một lần chạm nhầm không được phép xoá cả giải.

Phím tắt gắn trên `document`:

| Phím | Việc |
|---|---|
| `Space` | play/pause |
| `→` `←` | level sau / trước |
| `Backspace` | chạy lại level hiện tại |
| `R` | reset (vẫn cần hai lần) |
| `Escape` | đóng bánh xe giá trị, nếu không thì đóng overlay |

Handler thoát sớm nếu `e.target.tagName` là `INPUT`, `TEXTAREA` hay `SELECT` —
nếu không thì gõ số vào ô editor sẽ nhảy level. Nếu đang mở overlay thì chỉ
`Escape` có tác dụng, các phím còn lại bị bỏ qua.

Nút entry ± đọc `data-d` trên chính nút (`+1` hoặc `-1`), kẹp `entries` tại 0,
rồi `render()` và `saveRun()`.

Fullscreen dùng `requestFullscreen()` với dự phòng `webkitRequestFullscreen`.
**Nếu không có API nào thì nút tự ẩn** — đó là trường hợp tab Safari trên
iPad. Cách chạy toàn màn hình ở đó là thêm vào Home Screen, nhờ meta
`apple-mobile-web-app-capable` (xem 2.1).

### 5.15 Overlay

Ba overlay — `settingsOverlay`, `editorOverlay`, `ioOverlay` — nằm ngoài
`.app`, mỗi cái là một `<div class="overlay" hidden>`. Mở và đóng chỉ là
bật/tắt thuộc tính `hidden`; không có router, không có stack.

Ba cách đóng, gắn một lần lúc boot:

- Nút có `data-close="<id>"` — handler đọc `this.dataset.close` và ẩn overlay
  đó. Thêm nút đóng mới chỉ cần thêm thuộc tính trong HTML.
- Bấm vào nền — handler trên chính `.overlay` chỉ đóng khi
  `e.target === this`, tức là cú bấm rơi vào nền chứ không phải vào thẻ bên
  trong.
- `Escape` — đóng bánh xe giá trị nếu nó đang mở, nếu không thì gọi
  `closeAll()`, hàm này đóng cả ba overlay và cả bánh xe.

### 5.16 Menu profile

`buildMenu()` dựng lại danh sách mỗi lần mở, nên không cần đồng bộ gì: mỗi
profile một nút với `aria-current`, một `.sep`, rồi ba mục sửa / nhân bản /
tạo mới.

Chọn một profile sẽ `pause()`, đặt `entries = 8` và `loadLevel(0, false)` —
đổi cấu trúc giải giữa chừng thì số cũ không còn nghĩa gì.

**Profile `default` chỉ đọc.** Mục "Sửa profile" mang class `lockrow` và
`aria-disabled="true"` khi profile đang chọn là `default`, `openEditor()` chặn
và hiện toast, `btnEdSave` chặn lần nữa, và xoá thì đã bị chặn từ trước. Ba
lớp chặn là cố ý: `default` là cấu trúc được ship theo code, là thứ duy nhất
chắc chắn hợp lệ khi mở đồng hồ từ máy trắng. Muốn đổi nó thì sửa
`defaultProfile()` / `defaultLevels()` rồi push, không phải nới lỏng guard.
Người dùng muốn cấu trúc khác thì nhân bản.

Menu đóng khi bấm ra ngoài nhờ một listener `click` trên `document`; listener
trên chính menu gọi `stopPropagation()` để bấm trong menu không tự đóng nó.

### 5.17 Cài đặt

Swatch theme sinh ra từ mảng `THEMES` — mỗi mục dựng một nút với `th.bg` làm
nền, một vạch `th.ink` và một chấm `th.accent`. Thêm theme vào `THEMES` là tự
có swatch, không phải sửa HTML.

Các điều khiển còn lại đều theo một khuôn: ghi vào `settings`, `lsSet` ngay,
rồi gọi hàm áp dụng.

- Âm lượng: `oninput` lưu giá trị, **`onchange` mới đánh chuông**. Chuông lúc
  thả tay chứ không phải lúc kéo, vừa không ồn vừa cho người dùng phân biệt
  "app tắt tiếng" với "iPad đang bật Silent Mode" (xem 5.7).
- Tắt chuông: bỏ tick thì đánh một tiếng để xác nhận đã bật lại.
- Giữ màn hình sáng: bật thì xin Wake Lock ngay nếu đồng hồ đang chạy, tắt thì
  nhả.

### 5.18 Select có sẵn cộng ô tự nhập

Buy-in, độ dài level và tốc độ tăng blind đều có một `<select>` các giá trị
hay dùng đặt cạnh một `<input>`. `fillSelects()` đổ các lựa chọn cộng một mục
"Tuỳ ý" giá trị rỗng. `linkPair(sel, inp)` nối hai chiều: chọn trong select
thì ghi vào input; gõ vào input thì select nhảy về đúng mục nếu số trùng, nếu
không thì rơi về "Tuỳ ý".

`fillSelects()` chạy lại trong `applyLang()` vì nhãn "Tuỳ ý" và tên tốc độ
(chậm / chuẩn / turbo / hyper) là chuỗi dịch.

### 5.19 Trình sửa profile

`openEditor(p, isNew)` sao chép sâu profile vào biến `edit` bằng
`JSON.parse(JSON.stringify(p))`. Mọi thao tác sửa chỉ chạm vào bản sao; bấm
lưu mới ghi đè vào `profiles`, bấm đóng thì bản sao bị vứt. Không cần undo.

**`roundChip(v)`** chọn bước làm tròn theo độ lớn:

| Giá trị | Bước |
|---|---|
| < 100 | 25 |
| < 1.000 | 50 |
| < 5.000 | 100 |
| < 20.000 | 500 |
| còn lại | 1.000 |

Blind thực tế luôn là số tròn, nên mọi giá trị sinh tự động đều đi qua hàm
này. Bước tăng theo độ lớn vì làm tròn 1.000 ở mức blind 50 là vô nghĩa.

**Bánh xe giá trị.** Gõ số trên iPad thì bàn phím ảo che mất nửa màn hình và
ô số rất nhỏ. Nên:

```js
var COARSE = matchMedia("(hover:none) and (pointer:coarse)").matches;
```

Trên thiết bị cảm ứng, mọi ô số thành `readOnly` và một cú chạm mở bánh xe.
Trên laptop thì ô gõ bình thường, còn bánh xe mở bằng nút mũi tên `.wchev`
cạnh ô. Bánh xe cũng có nút "Gõ số" để bỏ `readOnly` và focus vào ô, khi cần
một giá trị không có trong danh sách.

Cơ chế bánh xe: một danh sách `div.wi` cao đúng `WH = 40` px, kẹp giữa hai
`div.wpad` cao `WPAD = 80` px, cuộn trong một hộp có `scroll-snap`. Chỉ số
đang chọn là `Math.round(scrollTop / WH)`. Mỗi sự kiện `scroll` đánh dấu mục
đang ở giữa và hẹn `setTimeout(commit, 90)`, `clearTimeout` lần trước — nên
giá trị chỉ được ghi khi cuộn đã dừng, không phải mỗi khung hình cuộn.

Danh sách giá trị do `wheelSteps(field, cur)` sinh: `min` là 5..180 bước 5,
`bb` là 100..50.000 bước 100, còn `sb` và `ante` dùng chính thang bước của
`roundChip`. Giá trị hiện tại luôn được chèn vào nếu chưa có, nên mở bánh xe
không bao giờ nhảy mất số đang có.

Popup tự định vị dưới ô, lật lên trên nếu không đủ chỗ, và luôn cách mép ít
nhất 8 px. Nó đóng khi chạm ra ngoài — listener đăng ký trong `setTimeout(…,0)`
để chính cú chạm đang mở nó không đóng nó ngay.

**Kéo dòng break.** Chỉ dòng break kéo được, và chỉ kéo từ tay nắm ba chấm.

```js
/* Touch Events, not Pointer Events: iOS Safari cancels a captured pointer
   as soon as it decides the gesture might be a scroll. */
```

Đây là điểm quan trọng nhất của phần editor: Pointer Events từng được dùng và
không hoạt động trên iPad — Safari huỷ pointer đã capture ngay khi nó đoán cử
chỉ có thể là cuộn trang, nên dòng rơi ngay lúc bắt đầu kéo. Bản hiện tại
dùng `touchstart` / `touchmove` / `touchend` / `touchcancel` với
`{passive:false}` và `preventDefault()`, bám theo đúng `identifier` của ngón
đã bắt đầu kéo, và có nhánh `mousedown`/`mousemove`/`mouseup` riêng cho chuột.

Khi kéo, `move()` tìm dòng nào chứa toạ độ y hiện tại rồi `insertBefore` trực
tiếp trong DOM. Khi thả, mảng `edit.levels` được dựng lại từ thứ tự DOM qua
`row.dataset.idx`, rồi `drawRows()` vẽ lại để đánh số level chạy đúng.

**`drawRows()`** dựng lại toàn bộ bảng mỗi lần có thay đổi cấu trúc. Dòng
break chiếm `colspan="3"` và chỉ có ô phút; dòng blind có SB, BB, ante, phút,
một nút bật/tắt chip-up và một nút xoá.

**Bộ sinh level** (`btnGenerate`) nhận BB đầu, số level, số phút và hệ số
tăng, rồi lặp `bb = roundChip(bb * g)`. Mặc định `sb = bb/2` và `ante = bb`.
Nó thay toàn bộ danh sách, kể cả break — sinh xong thì thêm break lại bằng
tay. `+ Level` thì nối thêm một level dựa trên level cuối cùng với hệ số 1,4.

### 5.20 Xuất và nhập

Không có tài khoản, không có đồng bộ. Chuyển profile giữa hai máy bằng JSON
qua một `<textarea>`:

```json
{ "v": 1, "profiles": [ … ] }
```

Nút chép dùng `navigator.clipboard.writeText()` trong `try/catch`, rơi về
`document.execCommand("copy")`. Clipboard API cần origin bảo mật, nên nó im
lặng trên `file://` và trên HTTP LAN — đó là lý do vẫn giữ nhánh dự phòng và
vẫn `select()` sẵn nội dung để người dùng tự chép.

Nhập **thay toàn bộ** danh sách profile, không gộp. Nếu payload không có
profile `default` thì một bản mặc định được chèn lên đầu, để cấu trúc được
ship theo code không bao giờ biến mất khỏi máy. JSON hỏng thì toast báo lỗi và
không đụng gì tới dữ liệu đang có.

### 5.21 Thứ tự boot

```js
applyTheme();        // gắn data-app-theme, .flat, gọi PKFX, đặt theme-color
applyLang();         // dịch nhãn, dựng select, gọi render()
loadLevel(0,false);  // trạng thái sạch, đồng hồ dừng ở level 1
maybeResume();       // hỏi khôi phục, và mở khoá runReady
```

Thứ tự này không đổi được. `loadLevel(0,false)` phải chạy trước
`maybeResume()` để màn hình có trạng thái hợp lệ ngay cả khi người dùng từ
chối khôi phục; và `saveRun()` bị khoá cho tới khi `maybeResume()` bật
`runReady`, nếu không thì chính `loadLevel(0,false)` sẽ ghi đè bản ghi đang
định mời khôi phục.

## 6. Triển khai và vận hành

### 6.1 GitHub Pages

Nhánh `main`, thư mục gốc. File `CNAME` ở gốc repo giữ tên miền
`www.kamivour.id.vn`; xoá file là mất tên miền. `kamivour.github.io` trả 301
về tên miền riêng, nên kiểm tra bản deploy trên tên miền riêng.

Deploy = `git push` lên `main`. Không có bước build, không có action.

### 6.2 Quy tắc cache-buster

`index.html` có ba chuỗi `?v=YYYYMMDD` — một ở thẻ `<link>` stylesheet và hai
ở hai thẻ `<script>`.

**Sửa `style.css`, `app.js` hay `fx.js` thì phải tăng cả ba.** Deploy lần hai
trong cùng một ngày thì thêm một chữ cái (`?v=20260922b`). GitHub Pages cache
tài sản 10 phút và Safari trên iPad giữ lâu hơn nữa; quên tăng thì bản deploy
ship markup mới với script cũ, và lỗi sinh ra rất khó đoán.

### 6.3 Chạy thử tại chỗ

Mở thẳng `index.html` là đủ cho phần lớn việc. Cần một origin thật (Clipboard
API, Wake Lock) thì chạy:

```
npx --yes http-server . -p 8000 -c-1
```

`python` không có trên máy này.

Thử trên iPad: thêm `-a 0.0.0.0`, rồi mở `http://<LAN-IP-của-laptop>:8000/`
trên iPad cùng Wi-Fi. Origin đó là HTTP trần nên Wake Lock và Clipboard API
vẫn tắt trên iPad — chỉ dùng để xem giao diện và cử chỉ chạm.

### 6.4 Chụp ảnh không cần màn hình

```
chrome --headless=new --enable-unsafe-swiftshader --virtual-time-budget=4000 \
       --screenshot=out.png "file:///…/index.html?fx=force"
```

`?fx=force` bắt `fx.js` chấp nhận renderer phần mềm thay vì rơi về gradient
CSS. Hai cái bẫy đã gặp:

- **Virtual time đóng băng CSS transition.** Trang chụp phải tiêm
  `transition:none !important` nếu không ảnh sẽ dính trạng thái giữa chừng.
- **Theme phải đặt trước khi vẽ.** Trang chụp cần chính đoạn script nội tuyến
  trong `<head>` (2.2), nếu không ảnh ra màu Felt dù đã chọn theme khác.

## 7. Giới hạn đã biết

Những thứ dưới đây là hệ quả đã biết của các lựa chọn ở trên, không phải lỗi
chờ sửa.

- **iPad Silent Mode tắt Web Audio và không có cách nào phát hiện từ script.**
  Chuông im mà không có lỗi nào. Giảm nhẹ bằng cách cho thanh âm lượng đánh
  chuông lúc thả tay, để người dùng tự phân biệt.
- **Wake Lock chỉ chạy trên HTTPS hoặc localhost.** Mở từ `file://` hay từ
  server LAN dùng HTTP thì màn hình vẫn tự tắt.
- **Fullscreen API không có trong tab Safari trên iPad.** Cách chạy toàn màn
  hình là thêm vào Home Screen, nhờ meta `apple-mobile-web-app-capable`.
- **Clipboard API im lặng ngoài origin bảo mật.** Nút chép rơi về
  `execCommand`, và nội dung luôn được `select()` sẵn.
- **`localStorage` là toàn bộ nơi lưu trữ.** Xoá dữ liệu trang là mất hết
  profile. Bản sao lưu duy nhất là JSON xuất ra bằng tay.
- **Không có bước build nên không có minify, không có bundle, không có kiểm
  tra kiểu.** Đổi lại là sửa một file rồi tải lại trang là xong.
- **Hiệu ứng nền tốn pin.** Ngân sách đã bóp xuống 30 fps và 0.6× độ phân
  giải, nhưng máy tính bảng yếu thì nên chọn theme Minimal.
- **Không có test.** Cách kiểm chứng duy nhất là mở trang và bấm thử; riêng
  hành vi đồng hồ qua nhiều giờ thì chỉ quan sát được trên một tab thật.

Những thứ **cố ý không làm** — đếm người còn lại, stack trung bình, dòng "quay
lại lúc HH:MM", bảng giải thưởng nhiều bậc, giờ kết thúc dự kiến — có lý do
ghi trong README mục 4b. Đọc mục đó trước khi đề xuất lại.
