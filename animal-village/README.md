# 🐹 Làng Thú Ngộ Nghĩnh 🌹

Game web nhiều người chơi, lấy cảm hứng từ Ninja School. Chơi trên trình duyệt bằng cách truy cập địa chỉ IP của máy chạy server.

## Chạy game

```bash
cd animal-village
npm install
npm start            # mặc định cổng 3000, đổi bằng PORT=8080 npm start
```

Server in ra địa chỉ LAN, ví dụ `http://192.168.1.10:3000`. Mở địa chỉ đó trên các máy cùng mạng để chơi chung, chat với nhau.

## Nhân vật

| Loài | J (đánh) | K (tuyệt chiêu) |
| --- | --- | --- |
| Chuột Béo Bụng Phệ | Huých Bụng | Bắn Hạt Hướng Dương (tầm xa) |
| Vịt Trẻ Trâu | Chém Dao Phay | Quạ Quạ Chấn Động (đánh 2 bên) |
| Thú Mỏ Vịt Hiền Lành | Đập Mỏ | Quật Đuôi Bẹt (đánh phía sau) |
| Gà Con Cáu Kỉnh | Mổ Liên Hoàn (nhanh) | Nổi Khùng Xì Khói (đánh 2 bên) |
| Tiểu Thư Cá Sấu | Cắn Một Phát | Quật Đuôi (đánh phía sau) |

Mỗi loài có 3 skin riêng, mỗi skin có hiệu ứng riêng chạy mượt (lấp lánh, tim bay, hào quang, lửa, khói, bong bóng, lá rơi, cánh hoa).

## Hành trình

1. Gặp **Trưởng làng** (cụ rùa đội nón), nhận nhiệm vụ săn hoa hồng.
2. Đánh quái ở phía phải làng, quái rơi **🌹 hoa hồng đỏ**, đi ngang qua là tự nhặt vào hành trang.
3. Đủ **10 🌹** thì đổi lấy **🎁 rương báu**. Rương bị khóa, chìa khóa nằm ở lòng sông.
4. Ra **bờ sông** phía trái làng gặp **Thần Sông** (chú hà mã đội vương miện). Ngài muốn **10 🐟 cá** để cống nạp. Phải nhận nhiệm vụ này rồi mới câu cá được.
5. Đứng trên bến gỗ, nhấn **C** để thả câu, thấy dấu ❗ thì nhấn **C** để giật (có khi câu trúng dép 🩴).
6. Cống nạp cá, Thần Sông mò được **🗝️ chìa khóa**.
7. Mang rương và chìa về cho Trưởng làng mở, nhận **quà VIP**.
8. Nhiệm vụ cuối **Khóa Học Trưởng Thành**: thắng một trận **tỷ thí PK với người chơi khác**. Đứng gần bạn ấy, nhấn **P** để mời; bạn ấy nhấn **Y** để nhận lời (**N** để từ chối). Muốn luyện tay trước thì nhờ Trưởng làng gọi **Sư Phụ Gấu Trúc**, nhưng thắng gấu trúc không được tính nhiệm vụ.
9. Thắng là tốt nghiệp, mở ra câu chuyện dẫn sang phần 2: *Hành Trình Đảo Mây Bay*.

### Luật tỷ thí PK

- Mỗi bên 100 máu, đếm ngược 3 giây rồi mới được đánh, trận dài tối đa 90 giây.
- Đánh bằng đúng chiêu J/K của loài mình, trúng đòn bị đẩy lùi. Hết giờ thì ai còn nhiều máu hơn thắng, bằng nhau là hòa.
- Chạy xa đối thủ quá 700px là bị xử thua.
- Tỷ thí được với bất kỳ ai, bất kỳ lúc nào; chỉ trận thắng **người chơi khác** ở bước 8 mới tính tốt nghiệp.

| Phím | Tác dụng |
| --- | --- |
| ← → / A D | Di chuyển |
| ↑ / W / Space | Nhảy (nhảy 2 lần trên không) |
| ↓ / S | Xuống khỏi bục |
| J | Đánh |
| K | Tuyệt chiêu |
| E | Nói chuyện với Trưởng làng / Thần Sông |
| C | Câu cá |
| P | Mời tỷ thí người đứng gần |
| Y / N | Nhận / từ chối lời mời tỷ thí |
| Enter | Chat (hiện bong bóng trên đầu nhân vật) |

Game có **nhạc nền** (vui tươi ban ngày, êm dịu ban đêm) và **hiệu ứng âm thanh**: tiếng chiêu riêng của từng loài, nhảy, trúng đòn, quái chết, nhặt hoa, câu cá, lên cấp, mở quà, đếm ngược và thắng/thua PK, mưa rơi và sấm. Tiếng của người chơi khác nhỏ dần theo khoảng cách. Âm thanh tự bật sau lần bấm đầu tiên (luật của trình duyệt). Nút **🔊** cạnh nút Trời để tắt/bật nhanh; trong bảng Trời có bật/tắt riêng nhạc nền, hiệu ứng và thanh âm lượng. Toàn bộ âm thanh được tạo bằng Web Audio API nên không cần file âm thanh.

Nút **🌤️ Trời** ở giữa phía trên màn hình để đổi trời sáng / chiều / tối / tự động và thời tiết nắng / mưa / tuyết (mỗi người chơi tự chọn trên máy mình). Trên điện thoại sẽ có nút cảm ứng. Tiến độ được lưu trong `data/players.json` theo từng trình duyệt.

## Kiểm thử

```bash
npm test
```

Bài test cho 2 người chơi đi hết hành trình qua WebSocket: chat, săn và tự nhặt hoa hồng, đổi rương, nhận nhiệm vụ Thần Sông, câu cá (giật sớm, để cá chạy, câu được), nhận chìa khóa, mở rương nhận quà VIP, tỷ thí PK giữa 2 người (mời, từ chối, đếm ngược, thắng thua, tốt nghiệp, câu chuyện), tỷ thí luyện tập với Sư Phụ Gấu Trúc (không được tốt nghiệp), và kiểm tra tầm đánh riêng của từng chiêu.
