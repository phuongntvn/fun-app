# Thỏ Ngọc & Kỳ Lân vs Zombie – Đêm Trung Thu 🥮🐰🦄

Game thủ thành trên web, lối chơi mô phỏng **Plants vs. Zombies** nhưng mang chủ đề **Trung Thu**:
các bé Thỏ Ngọc và Kỳ Lân từ Cung Trăng xuống bảo vệ mâm cỗ Trung Thu của Chú Cuội trước lũ zombie.

Viết bằng **Flask** (backend + dữ liệu màn chơi) và **HTML5 Canvas / JavaScript thuần** (không cần thư viện ngoài,
toàn bộ nhân vật được vẽ bằng code).

## Chạy game

```bash
pip install -r requirements.txt
python app.py
```

Mở trình duyệt tại <http://localhost:5000>.

## Cách chơi

- Bấm **Ánh Trăng** (tương đương Mặt Trời) để nhặt. Ánh Trăng rơi từ trời và do Thỏ Ngọc Giã Trăng tạo ra.
- Bấm vào **thẻ nhân vật** (hoặc phím `1`–`7`), rồi bấm vào ô trên sân để đặt.
- **Xẻng** (phím `S`) để dọn một ô. **Chuột phải / Esc** để huỷ chọn.
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

## Zombie

| Zombie | Tương đương PvZ |
|---|---|
| Zombie Thường | Zombie |
| Zombie Cầm Đèn Cá Chép | Flag Zombie (dẫn đầu đợt lớn) |
| Zombie Nón Lá | Conehead |
| Zombie Đội Nồi Đồng | Buckethead |
| Zombie Múa Lân | Pole Vaulting Zombie (nhảy qua đồng minh đầu tiên) |
| Zombie Ông Địa Khổng Lồ | Gargantuar (đập nát đồng minh bằng quạt mo) |

## 3 màn chơi

1. **Chiều Rằm Tháng Tám** – ban ngày, làm quen; thắng nhận Thỏ Tuyết.
2. **Hoàng Hôn Rước Đèn** – xuất hiện Nồi Đồng & Múa Lân; thắng nhận Kỳ Lân Cầu Vồng.
3. **Đêm Trăng Tròn Quyết Chiến** – ban đêm, ít Ánh Trăng, Ông Địa Khổng Lồ xuất hiện.

Tiến độ mở khoá màn được lưu trong trình duyệt (localStorage).

## Cấu trúc

```
app.py               # Flask: trang chính + API /api/game-data
game_data.py         # Chỉ số nhân vật, zombie, đợt tấn công & cốt truyện 3 màn
templates/index.html # Giao diện (menu, hội thoại, thắng/thua)
static/css/style.css
static/js/game.js    # Engine game Canvas
```

Muốn chỉnh độ khó / thêm màn: sửa `game_data.py` – không cần đụng tới JavaScript.
