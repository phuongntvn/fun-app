# Thỏ Ngọc & Kỳ Lân vs Zombie – Đêm Trung Thu 🥮🐰🦄

Game thủ thành trên web, lối chơi mô phỏng **Plants vs. Zombies** nhưng mang chủ đề **Trung Thu**.

**Cốt truyện:** Ông chủ Phương mở tiệc Trung Thu tại nhà thì lũ zombie kéo tới đòi ăn bánh... và ăn não ông chủ!
Chú Cuội báo tin, Chị Hằng cử các bé Thỏ Ngọc và Kỳ Lân từ Cung Trăng xuống bảo vệ ông chủ Phương.
Ông chủ đứng ngay trước cửa nhà trong trận (run lẩy bẩy khi zombie tới gần), zombie lọt vào nhà là thua.

Viết bằng **Flask** (backend + dữ liệu màn chơi) và **HTML5 Canvas / JavaScript thuần** (không cần thư viện ngoài,
toàn bộ nhân vật được vẽ bằng code).

## Chạy game

```bash
pip install -r requirements.txt
python app.py
```

Mở trình duyệt tại <http://localhost:5000>.

## Đưa game lên mạng (chạy ngoài localhost)

### Cách 1: GitHub Pages (miễn phí, link cố định, không cần server)
Game chạy hoàn toàn trên trình duyệt, nên có thể đóng gói thành 1 file HTML tĩnh:

```bash
python build_static.py   # tạo dist/index.html, mở trực tiếp bằng trình duyệt cũng chơi được
```

Repo đã có sẵn workflow `.github/workflows/pages.yml` để tự đăng lên GitHub Pages:
1. Merge code vào nhánh `main`.
2. Vào repo trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Chờ tab **Actions** chạy xong. Game sẽ có ở `https://<tên-tài-khoản>.github.io/fun-app/`.

### Cách 2: Render.com (chạy đúng server Flask)
1. Đăng nhập https://render.com bằng GitHub.
2. **New → Blueprint**, chọn repo này. Render đọc file `render.yaml` và chạy `gunicorn app:app`.
3. Sau vài phút sẽ có link dạng `https://tho-ngoc-vs-zombie.onrender.com`.
   (Gói miễn phí sẽ "ngủ" khi không có ai truy cập, lần mở đầu tiên chờ khoảng 30–60 giây.)

### Cách 3: Chia sẻ tạm từ máy của bạn (ngrok / Cloudflare Tunnel)
Giữ `python app.py` đang chạy, mở Terminal khác và chạy một trong hai lệnh:

```bash
cloudflared tunnel --url http://localhost:5000   # không cần tài khoản
ngrok http 5000                                  # cần đăng ký ngrok miễn phí
```

Lệnh sẽ in ra một link `https://...` cho người khác vào chơi. Tắt máy hoặc tắt lệnh là link ngừng hoạt động.

> Không bật `FLASK_DEBUG=1` khi mở server ra Internet: chế độ debug cho phép người khác chạy code trên máy bạn.

## Cách chơi

- Bấm **Ánh Trăng** (tương đương Mặt Trời) để nhặt. Ánh Trăng rơi từ trời và do Thỏ Ngọc Giã Trăng tạo ra.
- Bấm vào **thẻ nhân vật** (hoặc phím `1`–`7`), rồi bấm vào ô trên sân để đặt.
- **Xẻng** (phím `S`) để dọn một ô. **Chuột phải / Esc** để huỷ chọn.
- **Bảo vật** ở thanh dưới cùng (phím `Q W E R`). Zombie bị hạ có thể làm rơi bảo vật, bấm để nhặt.
- Khi có nhiều hơn 9 đồng minh, trước trận sẽ có màn **chọn đội hình** giống game gốc.
- **Esc** để tạm dừng, nút **x2** để tăng tốc.
- Mỗi hàng có một **Xe Đèn Kéo Quân** (tương đương máy cắt cỏ) – cứu bạn một lần khi zombie chạm tới nhà.
- Zombie lọt vào nhà lần thứ hai ở cùng hàng → thua!

## Đồng minh (Plants)

| Nhân vật | Giá | Tương đương PvZ | Công dụng |
|---|---|---|---|
| Thỏ Ngọc Giã Trăng | 50 | Sunflower | Tạo Ánh Trăng |
| Thỏ Bắn Bánh | 100 | Peashooter | Bắn bánh nướng mini |
| Bánh Nướng Khổng Lồ | 50 | Wall-nut | Chắn zombie |
| Bánh Dẻo Mìn | 25 | Potato Mine | Ủ 14 giây rồi phát nổ |
| Thỏ Tuyết | 175 | Snow Pea | Bắn chè đông lạnh, làm chậm |
| Đèn Ông Sao Nổ | 150 | Cherry Bomb | Nổ vùng 3x3 |
| Kỳ Lân Cầu Vồng | 200 | Repeater | Bắn 2 ngôi sao mỗi lượt |
| Trống Lân | 50 | Squash | Nhảy lên nện bẹp zombie đứng sát bên |
| Hạt Dẻ Gai | 100 | Spikeweed | Đâm zombie đi qua, zombie không ăn được |
| Chó Bưởi Ngoạm | 150 | Chomper | Nuốt chửng zombie trước mặt rồi nhai |
| Lò Nướng Bánh | 175 | Torchwood | Bánh bay qua thành bánh lửa, sát thương x2 |
| Thỏ Ba Lồng Đèn | 325 | Threepeater | Bắn cùng lúc vào 3 hàng |

## Bảo vật

| Bảo vật | Công dụng |
|---|---|
| Bánh Trung Thu Thần | Bấm vào một đồng minh để kích hoạt sức mạnh cực đại (giống Plant Food) |
| Mưa Sao Băng | Sao băng rơi trúng mọi zombie, 300 sát thương |
| Gió Cung Trăng | Thổi toàn bộ zombie lùi lại và làm chậm |
| Trà Sen Hồi Phục | Hồi đầy máu cho mọi đồng minh |

## Zombie

| Zombie | Tương đương PvZ |
|---|---|
| Zombie Thường | Zombie |
| Zombie Cầm Đèn Cá Chép | Flag Zombie (dẫn đầu đợt lớn) |
| Zombie Nón Lá | Conehead |
| Zombie Đội Nồi Đồng | Buckethead |
| Zombie Múa Lân | Pole Vaulting Zombie (nhảy qua đồng minh đầu tiên) |
| Zombie Ông Địa Khổng Lồ | Gargantuar (đập nát đồng minh bằng quạt mo, ném Zombie Nhóc khi bị thương) |
| Zombie Nhóc Mặt Nạ | Imp |
| Quái Vật Thiên Cẩu | Quái vật riêng: chó trời ăn trăng, chạy nhanh, cắn rất mạnh |

## 3 màn chơi

1. **Chiều Rằm Tháng Tám** – ban ngày, làm quen; thắng nhận Thỏ Tuyết.
2. **Hoàng Hôn Rước Đèn** – xuất hiện Nồi Đồng, Múa Lân và Quái Vật Thiên Cẩu; thắng nhận Kỳ Lân Cầu Vồng.
3. **Đêm Trăng Tròn Quyết Chiến** – ban đêm, ít Ánh Trăng, Ông Địa Khổng Lồ ném Zombie Nhóc; chọn 9 trong 12 đồng minh.

Tiến độ mở khoá màn được lưu trong trình duyệt (localStorage).

## Cấu trúc

```
app.py               # Flask: trang chính + API /api/game-data
build_static.py      # Đóng gói game thành 1 file HTML tĩnh (dist/index.html)
render.yaml          # Cấu hình deploy lên Render.com
game_data.py         # Chỉ số nhân vật, zombie, đợt tấn công & cốt truyện 3 màn
templates/index.html # Giao diện (menu, hội thoại, thắng/thua)
static/css/style.css
static/js/game.js    # Engine game Canvas
```

Muốn chỉnh độ khó / thêm màn: sửa `game_data.py` – không cần đụng tới JavaScript.
