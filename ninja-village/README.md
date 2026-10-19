# 🥷 Làng Ninja Hoa Hồng 🌹

Game web nhiều người chơi, lấy cảm hứng từ Ninja School. Chơi trên trình duyệt bằng cách truy cập địa chỉ IP của máy chạy server.

## Chạy game

```bash
cd ninja-village
npm install
npm start            # mặc định cổng 3000, đổi bằng PORT=8080 npm start
```

Server in ra địa chỉ LAN, ví dụ `http://192.168.1.10:3000`. Mở địa chỉ đó trên 2 máy (cùng mạng) để chơi cùng nhau.

## Cách chơi

1. Tạo nhân vật: đặt tên, chọn kiểu tóc, màu tóc, trang phục, màu áo, băng đô, màu da.
2. Vào làng, Trưởng làng sẽ chào bằng bong bóng chat trên đầu.
3. Lại gần Trưởng làng, nhấn **E** (hoặc bấm vào ông) để nhận nhiệm vụ. Mỗi nhiệm vụ xong được **1 bó hoa hồng 💐**.
4. Đánh quái có thể rơi **bông hoa hồng 🌹**. Đổi **5 🌹 lấy 1 💐** ở Trưởng làng.
5. Đổi **3 💐 lấy 1 rương báu 🎁**, rồi mở rương để nhận **quà VIP**.

| Phím | Tác dụng |
| --- | --- |
| ← → / A D | Di chuyển |
| ↑ / W / Space | Nhảy (nhảy 2 lần trên không) |
| ↓ / S | Xuống khỏi bục |
| J / Z | Đánh |
| E / F | Nói chuyện với Trưởng làng |
| Enter | Chat (hiện bong bóng trên đầu nhân vật) |

Trên điện thoại sẽ có nút cảm ứng.

Tiến độ được lưu trong `data/players.json` theo từng trình duyệt.

## Kiểm thử

```bash
npm test
```

Bài test mở 2 người chơi qua WebSocket và đi hết luồng: chat, 4 nhiệm vụ, nhặt hoa hồng, đổi bó hoa, đổi và mở rương nhận quà VIP, lưu tiến độ.
