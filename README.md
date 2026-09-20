# Homegame Blind Clock

Đồng hồ blind cho giải poker MTT chơi ở homegame. Một file HTML tĩnh, deploy bằng GitHub Pages lên `www.kamivour.id.vn`.

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
- Profile: tạo mới, nhân bản, sửa, xoá; sinh cấu trúc blind tự động từ 4 tham số
- 5 theme màu, 2 ngôn ngữ (EN / Tiếng Việt)
- Wake Lock giữ màn hình sáng khi đồng hồ chạy
- Đánh dấu level cần đổi chip (chip-up); icon chip hiện cạnh số level và ở dòng preview level kế tiếp
- Lưu giải đang chạy; mở lại trang trong vòng 6 tiếng sẽ hỏi có khôi phục không
- Export/import profile dạng JSON

---

## 3. Project structure

```
.
├── index.html     # toàn bộ ứng dụng — markup + CSS + JS trong một file
└── README.md      # file này
```

Cố ý để một file. Không có build step, không có dependency ngoài Google Fonts. Muốn sửa gì thì mở `index.html` ra sửa rồi push, GitHub Pages tự deploy.

### Bố cục bên trong `index.html`

| Phần | Nội dung |
|---|---|
| `<head>` | meta cho iPad (`apple-mobile-web-app-capable`, safe-area), link Google Fonts |
| `<style>` — themes | Token màu cho 5 theme, đặt trên `:root` và `:root[data-app-theme="..."]` |
| `<style>` — top bar / stage / stats / modals | CSS theo từng khu vực màn hình |
| markup | `.app` là grid 3 hàng: topbar / stage / stats. Ba modal nằm ngoài `.app` |
| `<script>` — i18n | Object `I18N` với 2 khoá `en` và `vi` |
| — defaults | `defaultLevels()` và `defaultProfile()` |
| — storage | Đọc/ghi `localStorage`, tất cả bọc trong try/catch |
| — audio | Web Audio API, sinh tiếng chuông bằng oscillator, không tải file |
| — wake lock | Xin và nhả Wake Lock, xin lại khi tab quay lại foreground |
| — render | Một hàm `render()` vẽ lại toàn bộ UI từ state |
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

**Namespace `pkclock2`.** Đổi từ `pkclock` khi thay cấu trúc default, để profile cũ đã lưu không đè lên cái mới. Nếu sau này lại đổi default profile theo kiểu không tương thích thì bump lên `pkclock3`.

**Khôi phục giải luôn ở trạng thái tạm dừng.** Khi mở lại trang, bản ghi `pkclock2.run` được đề nghị đúng một lần bằng thanh hỏi ở đáy màn hình. Bấm khôi phục thì level, thời gian còn lại và số entries quay về đúng chỗ cũ, nhưng đồng hồ không tự chạy tiếp — người tổ chức bấm play khi bàn đã sẵn sàng. Thời gian còn lại bị kẹp trong khoảng từ 0 đến độ dài của level, nên một bản ghi cũ không làm đồng hồ dài hơn level.

**AudioContext chỉ mở sau cú chạm đầu tiên.** iOS Safari chặn phát âm thanh nếu không có user gesture. Vì vậy chuông báo chỉ kêu nếu người dùng đã bấm ít nhất một nút.

**Chuông trên iPad cần ba thứ, thiếu một là im.** Một, lần chạm đầu tiên phải đẩy được một mẫu âm thanh im lặng qua context — iOS giữ context ở trạng thái câm cho tới khi nó thực sự phát ra cái gì đó trong lúc xử lý cử chỉ. Hai, context phải được gọi `resume()` lại khi rơi vào trạng thái `"interrupted"` (Siri, cuộc gọi, màn hình tắt); iOS không tự thoát khỏi trạng thái này, nên mọi cú chạm trên trang đều gọi `audioOn()`. Ba, iPad phải tắt chế độ im lặng: Web Audio đi qua audio session kiểu ambient, bị công tắc im lặng tắt luôn, và không có cách nào phát hiện điều đó từ JavaScript. Thả thanh âm lượng trong Cài đặt ra sẽ kêu thử một tiếng để kiểm tra cả ba.

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
