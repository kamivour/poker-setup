# Homegame Blind Clock

Đồng hồ blind cho giải poker MTT chơi ở homegame. Site tĩnh gồm bốn file (HTML, CSS, JS và một shader nền), không có build step, deploy bằng GitHub Pages lên `www.kamivour.id.vn`.

---

## 1. Context & objective

Tôi tổ chức MTT ở homegame và cần một cái clock chiếu lên iPad hoặc laptop đặt cạnh bàn. Mọi thứ có sẵn trên mạng hoặc là quảng cáo chèn giữa giải, hoặc bắt đăng nhập, hoặc phải cấu hình lại từ đầu mỗi lần mở. Tôi muốn thứ mở lên là dùng được ngay.

**Mục tiêu thiết kế, theo thứ tự ưu tiên:**

1. **Một click là chạy.** Mở web, bấm play. Không đăng nhập, không setup, profile mặc định đã đúng với cách tôi hay chơi.
2. **Đọc được từ xa.** Người ngồi cuối bàn phải nhìn rõ đồng hồ và blind mà không cần nhoài người. Chữ scale theo kích thước màn hình chứ không bị chặn bởi trần cố định.
3. **Chỉnh sâu khi cần.** Ai muốn đổi cấu trúc blind, buy-in, rake, giờ nghỉ thì vào profile editor làm được hết — nhưng phần đó giấu sau một lớp, không bày ra màn chính.
4. **Không có backend.** Site tĩnh, không thuê host, không database. Dữ liệu nằm ở `localStorage` của máy, chuyển máy bằng export/import JSON.

**Không nằm trong mục tiêu:** quản lý người chơi, xếp bàn, chia chip, lưu lịch sử giải, nhiều người cùng xem một giải qua mạng.

---

## 2. Trạng thái hiện tại

Đã chạy được:

- Đồng hồ đếm ngược với play/pause, level trước/sau, chạy lại level, reset giải (bấm 2 lần xác nhận)
- Tự nhảy level khi hết giờ, có chuông báo lúc chuyển level và lúc còn 1 phút
- Hiển thị blind hiện tại (SB/BB/ante) và preview level kế tiếp
- Break là một dòng trong bảng level; khi đang break màn hình đổi sang hiện blind sẽ vào sau khi nghỉ
- Đếm entries (+/−), tính prize pool đã trừ rake, chia Nhất 70% / Nhì 30%
- Profile: tạo mới, nhân bản, sửa, xoá; sinh cấu trúc blind tự động từ 4 tham số. Hồ sơ `default` chỉ đọc — muốn khác thì nhân bản ra rồi sửa bản sao
- 6 theme màu, 2 ngôn ngữ (EN / Tiếng Việt). Năm theme có nền chuyển động vẽ bằng WebGL và mỗi theme một chất liệu số riêng, dùng chung cho đồng hồ, blind và ante: Felt chữ ngà đổ bóng xuống nỉ, Bone chữ in nổi trên giấy với bóng mềm bao quanh, Cafe chữ nâu espresso trên bức tường vữa be sữa dưới ánh đèn ấm, Royal chữ mạ vàng dập nổi thành thỏi có vệt sáng lướt qua, Midnight chữ cắt từ bề mặt mặt trăng nổi trên bầu trời đêm có chòm sao. Số đổi thì lăn xuống, sang level thì dòng blind trồi lên, nút điều khiển kiểu kính mờ nhấc lên và loé sáng khi rê chuột hoặc chạm. Minimal là theme phẳng 2D đen trắng, tương phản thấp cho đỡ mỏi mắt, blind và ante vẫn có màu riêng
- Wake Lock giữ màn hình sáng khi đồng hồ chạy
- Đánh dấu level cần đổi chip (chip-up); icon chip hiện cạnh số level và ở dòng preview level kế tiếp
- Lưu giải đang chạy; mở lại trang trong vòng 6 tiếng sẽ hỏi có khôi phục không
- Export/import profile dạng JSON

---

## 3. Project structure

```
.
├── index.html     # markup; nạp style.css, rồi fx.js và app.js
├── style.css      # toàn bộ CSS: token theme, layout, chất liệu đồng hồ, chuyển động
├── app.js         # toàn bộ logic của clock — một IIFE ES5, không module, không framework
├── fx.js          # nền chuyển động: một fragment shader WebGL, GLSL nhúng dạng chuỗi
└── README.md      # file này
```

Không có build step, không package manager, không dependency ngoài Google Fonts. Sửa xong thì push, GitHub Pages tự deploy. Một quy tắc duy nhất: **mỗi lần sửa `style.css`, `app.js` hay `fx.js` phải đổi số `?v=` ở ba link trong `index.html`** — GitHub Pages cache tài nguyên 10 phút và Safari trên iPad giữ lâu hơn, không đổi thì markup mới lên nhưng iPad vẫn chạy script cũ.

### Bố cục các file

| File / phần | Nội dung |
|---|---|
| `index.html` — `<head>` | meta cho iPad (`apple-mobile-web-app-capable`, safe-area), link Google Fonts, ba link có `?v=` |
| `index.html` — markup | canvas `#fx` (nền, cố định sau mọi thứ, không nhận chạm) rồi `.app` là grid 3 hàng: topbar / stage / stats. Ba modal nằm ngoài `.app` |
| `style.css` — theme tokens | Token màu cho 6 theme trên `:root` và `:root[data-app-theme="..."]`, kèm token trang trí: `--decor` (nền dự phòng khi không có WebGL), `--glass*` / `--sheen` (nút kính), `--clock-ink` / `--clock-fx` (chất liệu đồng hồ), `--num-fx` (blind và ante), `--num-ink` (màu small blind và ante, mặc định `--ink-dim`). Riêng Royal thêm `--gild-*` (các nấc màu vàng) và `--chips` (hai viên chip SVG); Midnight thêm `--moon` (SVG địa hình mặt trăng), `--moon-tint` (màu nhuộm) và `--moon-x` / `--moon-y` (hai nấc bóng mặt bên) |
| `style.css` — layout | CSS theo từng khu vực: top bar / stage / stats / modals |
| `style.css` — decorated look | Khối `html:not(.flat)`: chất liệu số từng theme cho đồng hồ (`--clock-fx`) và cho blind, ante (`--num-fx`), chữ mạ vàng dập nổi của Royal, chữ mặt trăng của Midnight, nút kính mờ, khung và chip của Royal |
| `style.css` — motion | Số lăn khi đổi, dòng level trồi lên khi sang level, modal / menu / toast hiện ra. Tắt hết khi hệ thống bật giảm chuyển động |
| `fx.js` | Một fragment shader vẽ cả màn hình theo theme (`SLOT` chọn nhánh: felt / bone / cafe / royal / midnight), crossfade 0,9 giây khi đổi theme. Chỉ lộ ra `PKFX.setTheme(id, flat)`. Không có WebGL thì gắn class `nofx` lên `<html>` và CSS hiện `--decor` thay thế |
| `app.js` — i18n | Object `I18N` với 2 khoá `en` và `vi` |
| — defaults | `defaultLevels()` và `defaultProfile()` |
| — storage | Đọc/ghi `localStorage`, tất cả bọc trong try/catch |
| — audio | Web Audio API, sinh tiếng chuông bằng oscillator, không tải file |
| — wake lock | Xin và nhả Wake Lock, xin lại khi tab quay lại foreground |
| — render | Một hàm `render()` vẽ lại toàn bộ UI từ state. `applyTheme()` gắn `data-app-theme` và class `flat` lên `<html>` rồi gọi `PKFX.setTheme()` |
| — clock engine | `setInterval` 250ms, tính thời gian còn lại từ timestamp |
| — controls / overlays / profile menu / settings | Gắn event handler |
| — profile editor | Bảng level, generator, lưu/xoá |
| — export / import | Textarea JSON |

### Data model

Profile lưu ở `localStorage["pkclock2.profiles"]`:

```js
{
  id: "default",
  name: "Default",
  buyin: 36000,      // tổng tiền người chơi bỏ ra
  rake: 6000,        // phần bị trừ, KHÔNG vào prize pool
  currency: "₫",
  stack: 20000,      // starting stack
  breakMin: 10,      // thời lượng break mặc định khi thêm dòng break
  levels: [
    { sb: 100, bb: 200, ante: 200, min: 20 },
    { sb: 200, bb: 400, ante: 400, min: 20, chipup: true },  // level cần đổi chip
    { brk: true, min: 10 }            // dòng break
  ]
}
```

Settings ở `localStorage["pkclock2.settings"]`, profile đang chọn ở `localStorage["pkclock2.active"]`.

Giải đang chạy lưu ở `localStorage["pkclock2.run"]` dạng `{v:1, at, pid, idx, remain, running, endsAt, entries}`. Ghi lại mỗi 5 giây khi đồng hồ chạy, mỗi lần đổi level hoặc đổi số entries, và lúc tab bị ẩn đi.

### Vài quyết định kỹ thuật, đừng sửa mà không đọc lý do

**Đồng hồ tính theo timestamp, không trừ dần.** Khi bấm play, code lưu `endsAt = Date.now() + remain*1000` rồi mỗi nhịp tính lại `endsAt - Date.now()`. Nếu trừ dần mỗi giây thì Safari throttle tab sẽ làm đồng hồ chạy chậm dần, sai vài phút sau 3 tiếng.

**Mỗi chữ số của đồng hồ nằm trong một `<span>` rộng cố định** (`.cd { width: .62em }`). Không tin vào `tabular-nums` của font — nếu font chưa load xong hoặc fallback sang font hệ thống, số 1 hẹp hơn số 0 và đồng hồ sẽ giật mỗi giây.

**Prize làm tròn có bù.** Bước làm tròn tuỳ theo pool: `step = pool >= 50000 ? 1000 : 1`. Nhất = `round(pool × 0.7 / step) × step`, Nhì = `pool − Nhất`. Pool nhỏ thì làm tròn 1000 sẽ nuốt mất phần lớn tiền giải nhì, nên chỉ làm tròn khi pool đủ lớn. Nhì luôn tính bằng phần còn lại: tính riêng từng giải rồi làm tròn cả hai sẽ có lúc tổng không khớp pool.

**Hồ sơ `default` khoá cứng, không sửa được từ giao diện.** Đó là thứ duy nhất chắc chắn còn đúng khi mở clock lên lạnh, nên không để ai chỉnh nhầm giữa buổi chơi. Nút Sửa hồ sơ bị mờ đi khi đang ở hồ sơ mặc định, `openEditor()` từ chối mở nó, và `btnEdSave` chặn thêm một lớp nữa. Muốn đổi mặc định thì sửa `defaultProfile()` và `defaultLevels()` trong code rồi push — việc của người viết code, không phải việc làm ở bàn.

**Namespace `pkclock2`.** Đổi từ `pkclock` khi thay cấu trúc default, để profile cũ đã lưu không đè lên cái mới. Nếu sau này lại đổi default profile theo kiểu không tương thích thì bump lên `pkclock3`.

**Khôi phục giải luôn ở trạng thái tạm dừng.** Khi mở lại trang, bản ghi `pkclock2.run` được đề nghị đúng một lần bằng thanh hỏi ở đáy màn hình. Bấm khôi phục thì level, thời gian còn lại và số entries quay về đúng chỗ cũ, nhưng đồng hồ không tự chạy tiếp — người tổ chức bấm play khi bàn đã sẵn sàng. Thời gian còn lại bị kẹp trong khoảng từ 0 đến độ dài của level, nên một bản ghi cũ không làm đồng hồ dài hơn level.

**AudioContext chỉ mở sau cú chạm đầu tiên.** iOS Safari chặn phát âm thanh nếu không có user gesture. Vì vậy chuông báo chỉ kêu nếu người dùng đã bấm ít nhất một nút.

**Chuông trên iPad cần ba thứ, thiếu một là im.** Một, lần chạm đầu tiên phải đẩy được một mẫu âm thanh im lặng qua context — iOS giữ context ở trạng thái câm cho tới khi nó thực sự phát ra cái gì đó trong lúc xử lý cử chỉ. Hai, context phải được gọi `resume()` lại khi rơi vào trạng thái `"interrupted"` (Siri, cuộc gọi, màn hình tắt); iOS không tự thoát khỏi trạng thái này, nên mọi cú chạm trên trang đều gọi `audioOn()`. Ba, iPad phải tắt chế độ im lặng: Web Audio đi qua audio session kiểu ambient, bị công tắc im lặng tắt luôn, và không có cách nào phát hiện điều đó từ JavaScript. Thả thanh âm lượng trong Cài đặt ra sẽ kêu thử một tiếng để kiểm tra cả ba.

**Nền chuyển động vẽ bằng WebGL, và tắt hẳn ở theme phẳng.** `fx.js` là một fragment shader vẽ cả màn hình lên canvas `#fx` nằm cố định sau mọi thứ và không nhận chạm: Felt là vệt đèn trên nỉ xanh, Cafe là bức tường vữa be sữa dưới một ngọn đèn ấm — vân vữa lấy mẫu cách nhau đúng một pixel canvas nên sắc nét chứ không nhoè — Royal là bụi vàng với viền sáng quanh mép, Bone là giấy dưới ánh cửa sổ, Midnight là bầu trời đêm dốc nhẹ từ chân trời lên với sao lấp lánh, ba chòm sao (Bắc Đẩu, Thiên Hậu, Lạp Hộ) neo vào góc để không đè lên đồng hồ, và một sao băng mỗi 120 giây. Đổi theme thì hai nền crossfade ngay trong shader. Ngân sách vẽ giữ chặt để không ăn pin iPad giữa giải: canvas vẽ ở 0,6 lần độ phân giải CSS (trần 1,3 Mpx), tối đa 30 khung hình mỗi giây, dừng hẳn khi tab ẩn, và chỉ vẽ một khung tĩnh khi hệ thống bật giảm chuyển động. Mọi chuyển động trong shader tuần hoàn theo chu kỳ 600 giây và biến thời gian quay vòng ở 3600 giây, nên số thực không trôi sau ba tiếng chạy. Không có WebGL, máy phải render bằng phần mềm, shader không biên dịch được hay context bị mất thì `<html>` nhận class `nofx` và CSS hiện gradient tĩnh trong `--decor` thay thế — đồng hồ không bao giờ phụ thuộc vào canvas. Hai viên chip đỏ của Royal là SVG nhúng làm nền của `.stage::after`, neo vào góc dưới phải sân khấu nên nằm gọn trên vạch chia của thanh thống kê, cách xa đồng hồ và các con số tiền thưởng. Không có file ảnh, link Google Fonts vẫn là thứ duy nhất tải từ ngoài.

**Mỗi theme một chất liệu số, không dùng chung một kiểu bóng.** Mỗi theme đặt `--clock-ink` và `--clock-fx` cho đồng hồ, và `--num-fx` cho blind và ante để ba con số nổi cùng một kiểu: Felt là chữ ngà có quầng mờ và bóng đổ xuống nỉ; Bone là chữ in nổi trên giấy, một bóng sát và một bóng mềm rộng bao quanh; Cafe là chữ nâu espresso nổi trên tường be sữa, cùng kiểu bóng nhưng ấm hơn; Midnight là chữ cắt từ bề mặt mặt trăng — một SVG nhúng dựng địa hình hố thiên thạch và bụi bằng `feTurbulence` rồi chiếu sáng bằng `feDiffuseLighting`, nhuộm màu qua `--moon-tint` (bạc, sang hổ phách rồi đỏ khi cảnh báo) và dập nổi hai nấc `--moon-x` / `--moon-y`, mỗi ký tự lấy một vùng khác của tấm địa hình 2em nên không ký tự nào giống nhau; Royal là chữ mạ vàng năm nấc màu (đổi sang hổ phách rồi đỏ khi cảnh báo) dập nổi thành thỏi — năm lớp bóng màu đồng xếp xuống dưới làm mặt bên của thỏi, còn blind và ante dập nổi bằng chính màu của chúng — với vệt sáng lướt qua mỗi 9 giây. Vàng của Royal và mặt trăng của Midnight vẽ bằng `::after` đọc từ `data-d` của từng ký tự, vì `text-shadow` sẽ đè lên gradient cắt theo chữ nếu đặt cùng một phần tử; `--clock-fx` của Royal và Midnight khai báo ngay trên `.clock` chứ không trên `:root`, vì `var()` bên trong một custom property được tính ở chỗ khai báo, và `.clock.warn` / `.clock.crit` đổi màu mặt bên ngay trên đồng hồ. Số đổi thì lăn từ trên xuống — `drawClock()` gắn class `tk` cho đúng ký tự đổi rồi gỡ khi hết hiệu ứng — và sang level thì dòng level, blind và preview trồi lên. Nút điều khiển kính mờ: rê chuột thì nhấc lên và có vệt sáng lướt qua; chạm trên iPad thì vệt sáng chạy bằng class `shine` vì iPad không có hover. Theme Minimal đặt `flat: true` trong `THEMES`, `applyTheme()` gắn class `flat` lên `<html>`, canvas tắt và toàn bộ khối CSS trang trí bị bỏ qua — đó là lựa chọn 2D đen trắng cho ai thích đơn giản, màu chọn tương phản thấp cho đỡ mỏi mắt; chỉ small blind và ante (`--num-ink`, màu cát) với big blind (`--accent`, xanh xám) giữ màu riêng để đọc tách nhau. Một đoạn script ngắn trong `<head>` đọc theme đã lưu và gắn `data-app-theme` cùng class `flat` trước khi vẽ khung hình đầu tiên, nên tải chậm cũng không loé màu Felt rồi mới chuyển sang theme đã chọn. Vì bóng đổ trên chữ cỡ lớn tốn sức vẽ lại, `drawClock()` chỉ ghi vào đúng những ký tự đổi, không phải mỗi nhịp 250 ms.

### Phím tắt (laptop)

| Phím | Tác dụng |
|---|---|
| `Space` | Play / pause |
| `←` `→` | Level trước / sau |
| `Backspace` | Chạy lại level hiện tại |
| `R` | Reset giải (bấm 2 lần trong 3 giây) |
| `Esc` | Đóng modal đang mở |

---

## 4. Not yet implemented

Xếp theo mức độ tôi thấy cần.

**Nhạc nền.** UI đã có sẵn dòng "Danh sách nhạc" để mờ trong Settings. Chưa làm gì cả. Cần nghĩ nguồn nhạc lấy từ đâu — file tự host sẽ làm repo phình to, nhúng YouTube/Spotify thì vướng autoplay policy và cần network. Thanh volume hiện tại chỉ điều khiển tiếng chuông báo.

**Chạy offline hoàn toàn.** Lần mở đầu tiên vẫn cần mạng để tải Google Fonts. Mất mạng giữa giải thì trang đã cache vẫn chạy, nhưng máy mới toanh mà không có mạng thì font rớt về font hệ thống. Khắc phục bằng cách tự host font (base64 nhúng thẳng vào file) và thêm service worker. Đáng làm nếu wifi ở chỗ chơi hay chập chờn.

**Payout cấu hình được.** Hiện cứng 70/30. Giải đông hơn sẽ cần trả 3 hoặc 4 giải, và tỉ lệ nên nằm trong profile chứ không phải hard-code.

**Tách rebuy khỏi buy-in.** Hiện `entries` là một con số duy nhất. Nếu muốn biết "12 người, 18 lượt mua" thì cần hai bộ đếm riêng, và rake có thể tính khác nhau giữa buy-in và rebuy.

**Đồng bộ qua mạng.** Không định làm. Export/import JSON là cách chuyển profile giữa máy. Nếu có ngày cần thật thì Cloudflare Workers + KV là phương án free hợp lý nhất, nhưng đổi lại phải quản key trong code client.

**Toàn màn hình trên iPad.** Nút fullscreen dùng Fullscreen API, iPadOS Safari hỗ trợ không ổn định. Cách chắc ăn hiện tại là Share → Add to Home Screen, mở từ icon sẽ chạy đúng chuẩn standalone (meta đã khai báo sẵn).

**Ước lượng giờ kết thúc.** Cộng thời lượng các level còn lại để hiện "dự kiến xong lúc 23:40". Ý tưởng hay nhưng chưa có cách làm cho nó đúng: homegame gần như luôn kết thúc trước level cuối, nên con số cộng thuần từ bảng level sẽ sai thường xuyên và làm người ta tin nhầm. Chỉ làm khi nghĩ ra cách ước lượng bám theo thực tế.

---

## 4b. Đã cân nhắc và quyết định không làm

Ghi lại để lần sau khỏi đề xuất lại.

**Đếm số người còn lại, stack trung bình, BB trung bình.** Không có ai bấm nút trừ đúng lúc một người bị loại, nên con số sẽ sai gần như ngay lập tức. Sai còn tệ hơn không có. Ba chuỗi dịch `left`, `avg`, `chips` trong `I18N` là tàn dư của ý tưởng này.

**Hiện giờ vào lại sau giờ nghỉ (kiểu "vào lại lúc 22:10").** Đồng hồ đếm ngược đã đủ. Thêm dòng nữa chỉ làm rối màn hình, đi ngược mục tiêu tối giản.

**Payout cấu hình nhiều mức giải.** Bàn nhà chỉ 6 đến 9 người, trả hai giải là hợp lý. 70/30 cứng vẫn đúng với cách chơi hiện tại.

---

## 5. Deploy

Site chạy trên GitHub Pages, tên miền `www.kamivour.id.vn`.

Tên miền do file `CNAME` ở gốc repo giữ, nội dung đúng một dòng `www.kamivour.id.vn`. Xoá file đó đi là GitHub bỏ luôn custom domain, nên đừng xoá.

Bản ghi DNS ở Tenten: `www` là CNAME trỏ về `kamivour.github.io`, apex là bốn bản ghi A của GitHub Pages. GitHub định tuyến domain theo repo ở tầng hạ tầng chứ không phải ở tầng DNS, nên khi đổi repo phục vụ tên miền thì không cần đụng gì đến DNS — chỉ cần repo cũ nhả tên miền ra (xoá `CNAME` của nó và bỏ custom domain trong Settings → Pages của nó), rồi repo mới nhận.

`kamivour.github.io/poker-setup` giờ trả 301 về `www.kamivour.id.vn`.
