"""Dữ liệu game "Thỏ Ngọc & Kỳ Lân vs Zombie - Đêm Trung Thu".

Toàn bộ chỉ số nhân vật, zombie và thiết kế 3 màn chơi nằm ở đây,
Flask trả về cho trình duyệt qua /api/game-data.
"""

# ---------------------------------------------------------------------------
# Đồng minh (tương đương "Plants")
#   kind: producer | shooter | wall | mine | bomb
#   cooldown / start_cooldown tính bằng giây
# ---------------------------------------------------------------------------
PLANTS = {
    "tho_ngoc": {
        "name": "Thỏ Ngọc Giã Trăng",
        "kind": "producer",
        "cost": 50,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "interval": 20,
        "first": 5,
        "value": 25,
        "desc": "Giã cối thuốc tiên, tạo ra Ánh Trăng (25) để gọi thêm đồng đội.",
    },
    "tho_ban": {
        "name": "Thỏ Bắn Bánh",
        "kind": "shooter",
        "cost": 100,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "rate": 1.4,
        "damage": 20,
        "shots": 1,
        "bullet": "cake",
        "desc": "Bắn bánh nướng mini vào zombie đi cùng hàng.",
    },
    "banh_nuong": {
        "name": "Bánh Nướng Khổng Lồ",
        "kind": "wall",
        "cost": 50,
        "cooldown": 30,
        "start_cooldown": 20,
        "hp": 4000,
        "desc": "Chiếc bánh cứng như đá, chặn zombie gặm rất lâu.",
    },
    "banh_deo": {
        "name": "Bánh Dẻo Mìn",
        "kind": "mine",
        "cost": 25,
        "cooldown": 30,
        "start_cooldown": 20,
        "hp": 300,
        "arm": 14,
        "damage": 1800,
        "desc": "Cần 14 giây để ủ dẻo. Sau đó phát nổ khi zombie chạm vào.",
    },
    "tho_bang": {
        "name": "Thỏ Tuyết",
        "kind": "shooter",
        "cost": 175,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "rate": 1.4,
        "damage": 20,
        "shots": 1,
        "bullet": "ice",
        "slow": 10,
        "desc": "Bắn viên chè khúc bạch đông lạnh, làm zombie chậm lại một nửa.",
    },
    "den_ong_sao": {
        "name": "Đèn Ông Sao Nổ",
        "kind": "bomb",
        "cost": 150,
        "cooldown": 50,
        "start_cooldown": 35,
        "hp": 9999,
        "fuse": 1.0,
        "damage": 1800,
        "desc": "BÙM! Nổ tung toàn bộ zombie trong vùng 3x3 ô.",
    },
    "ky_lan": {
        "name": "Kỳ Lân Cầu Vồng",
        "kind": "shooter",
        "cost": 200,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "rate": 1.4,
        "damage": 20,
        "shots": 2,
        "bullet": "star",
        "desc": "Mỗi lượt bắn ra HAI ngôi sao cầu vồng.",
    },
}

# ---------------------------------------------------------------------------
# Zombie. speed tính bằng pixel/giây, bite = sát thương/giây khi gặm.
# ---------------------------------------------------------------------------
ZOMBIES = {
    "thuong": {"name": "Zombie Thường", "hp": 270, "armor": 0, "speed": 15, "bite": 100},
    "co": {"name": "Zombie Cầm Đèn Cá Chép", "hp": 270, "armor": 0, "speed": 24, "bite": 100},
    "non_la": {"name": "Zombie Nón Lá", "hp": 270, "armor": 370, "speed": 15, "bite": 100},
    "noi_dong": {"name": "Zombie Đội Nồi Đồng", "hp": 270, "armor": 1100, "speed": 15, "bite": 100},
    "mua_lan": {
        "name": "Zombie Múa Lân", "hp": 400, "armor": 0, "speed": 32,
        "speed_after": 15, "bite": 100,
    },
    "ong_dia": {"name": "Zombie Ông Địa Khổng Lồ", "hp": 2400, "armor": 0, "speed": 11, "bite": 0},
}


def _w(*groups):
    """Tiện ích: _w((3, 'thuong'), (1, 'non_la')) -> ['thuong', 'thuong', 'thuong', 'non_la']."""
    out = []
    for count, ztype in groups:
        out.extend([ztype] * count)
    return out


LEVELS = [
    {
        "id": 1,
        "name": "Màn 1: Chiều Rằm Tháng Tám",
        "time": "day",
        "plants": ["tho_ngoc", "tho_ban", "banh_nuong", "banh_deo"],
        "start_sun": 100,
        "sky_sun": 6.5,
        "first_delay": 30,
        "wave_interval": 26,
        "flags": [4, 9],
        "waves": [
            _w((1, "thuong")),
            _w((1, "thuong")),
            _w((2, "thuong")),
            _w((1, "thuong"), (1, "non_la")),
            _w((1, "co"), (3, "thuong"), (1, "non_la")),
            _w((2, "thuong"), (1, "non_la")),
            _w((2, "non_la")),
            _w((3, "thuong"), (1, "non_la")),
            _w((2, "thuong"), (2, "non_la")),
            _w((1, "co"), (4, "thuong"), (3, "non_la")),
        ],
        "reward": "tho_bang",
        "story": [
            {"who": "cuoi", "text": "Ối trời ơi! Đêm Trung Thu năm nay có biến lớn rồi!"},
            {"who": "cuoi", "text": "Lũ Zombie ngửi thấy mùi bánh trung thu trong nhà ta. Chúng đang kéo tới đòi ăn... BÁNH và NÃÃÃO!"},
            {"who": "hang", "text": "Đừng sợ Cuội ơi! Ta đã gửi các bé Thỏ Ngọc từ Cung Trăng xuống giúp."},
            {"who": "tho", "text": "Thỏ Ngọc Giã Trăng sẽ tạo ra ÁNH TRĂNG. Hãy bấm để nhặt Ánh Trăng, rồi dùng nó gọi thêm đồng đội nhé!"},
            {"who": "cuoi", "text": "Đặt Thỏ Bắn Bánh chặn từng hàng. Zombie mà lọt vào nhà thì... hết cỗ Trung Thu!"},
        ],
    },
    {
        "id": 2,
        "name": "Màn 2: Hoàng Hôn Rước Đèn",
        "time": "dusk",
        "plants": ["tho_ngoc", "tho_ban", "banh_nuong", "banh_deo", "tho_bang", "den_ong_sao"],
        "start_sun": 100,
        "sky_sun": 7,
        "first_delay": 26,
        "wave_interval": 25,
        "flags": [5, 11],
        "waves": [
            _w((1, "thuong")),
            _w((2, "thuong")),
            _w((1, "non_la"), (1, "thuong")),
            _w((1, "mua_lan"), (1, "thuong")),
            _w((2, "non_la"), (1, "thuong")),
            _w((1, "co"), (3, "thuong"), (2, "non_la"), (1, "noi_dong")),
            _w((1, "mua_lan"), (2, "thuong")),
            _w((1, "noi_dong"), (2, "non_la")),
            _w((2, "mua_lan"), (2, "thuong")),
            _w((1, "noi_dong"), (2, "non_la"), (2, "thuong")),
            _w((2, "noi_dong"), (1, "mua_lan")),
            _w((1, "co"), (4, "thuong"), (3, "non_la"), (2, "noi_dong"), (2, "mua_lan")),
        ],
        "reward": "ky_lan",
        "story": [
            {"who": "cuoi", "text": "Hoàng hôn buông xuống, lũ trẻ chuẩn bị rước đèn... mà Zombie lại kéo tới đông hơn!"},
            {"who": "cuoi", "text": "Cẩn thận Zombie ĐỘI NỒI ĐỒNG, cứng lắm! Còn Zombie MÚA LÂN thì nhảy qua được đồng minh đầu tiên nó gặp!"},
            {"who": "hang", "text": "Thỏ Tuyết bắn chè khúc bạch đông lạnh, làm zombie đi chậm hẳn lại."},
            {"who": "tho", "text": "Còn Đèn Ông Sao Nổ thì... BÙMMM! Dành cho lúc nguy cấp nhất nhé!"},
        ],
    },
    {
        "id": 3,
        "name": "Màn 3: Đêm Trăng Tròn Quyết Chiến",
        "time": "night",
        "plants": ["tho_ngoc", "tho_ban", "banh_nuong", "banh_deo", "tho_bang", "den_ong_sao", "ky_lan"],
        "start_sun": 200,
        "sky_sun": 8,
        "first_delay": 24,
        "wave_interval": 28,
        "flags": [5, 10, 15],
        "waves": [
            _w((1, "thuong")),
            _w((2, "thuong")),
            _w((1, "non_la"), (1, "thuong")),
            _w((1, "mua_lan"), (1, "thuong")),
            _w((2, "non_la"), (1, "thuong")),
            _w((1, "co"), (3, "thuong"), (2, "non_la"), (1, "mua_lan"), (1, "noi_dong")),
            _w((1, "noi_dong"), (1, "thuong")),
            _w((2, "mua_lan"), (1, "non_la")),
            _w((1, "ong_dia"), (2, "thuong")),
            _w((2, "noi_dong"), (2, "non_la")),
            _w((1, "co"), (4, "thuong"), (2, "noi_dong"), (2, "mua_lan"), (1, "ong_dia")),
            _w((2, "non_la"), (2, "thuong")),
            _w((1, "noi_dong"), (2, "mua_lan")),
            _w((1, "ong_dia"), (2, "non_la")),
            _w((2, "noi_dong"), (3, "thuong")),
            _w((1, "co"), (4, "thuong"), (3, "non_la"), (2, "noi_dong"), (2, "mua_lan"), (2, "ong_dia")),
        ],
        "reward": "trophy",
        "story": [
            {"who": "cuoi", "text": "Nguy to rồi! Trăng đã tròn, và Zombie ÔNG ĐỊA KHỔNG LỒ đang dẫn cả đoàn tới!"},
            {"who": "cuoi", "text": "Hắn cầm quạt mo đập nát mọi thứ chỉ bằng một cú. Phải hạ hắn trước khi hắn tới gần!"},
            {"who": "hang", "text": "Kỳ Lân Cầu Vồng từ trời cao đã tới giúp. Mỗi lần bắn ra hẳn HAI ngôi sao!"},
            {"who": "tho", "text": "Đêm tối nên Ánh Trăng rơi xuống ít hơn. Hãy trồng thật nhiều Thỏ Ngọc Giã Trăng nhé!"},
        ],
        "ending": [
            {"who": "hang", "text": "Tuyệt vời! Các bạn đã bảo vệ trọn vẹn đêm Trung Thu!"},
            {"who": "tho", "text": "Zombie chạy hết rồi! Mình cùng rước đèn đi chơi thôi!"},
            {"who": "cuoi", "text": "Còn ta... phá cỗ thôi! Bánh nướng, bánh dẻo ơi, ta tới đây!"},
        ],
    },
]


def get_game_data():
    return {"plants": PLANTS, "zombies": ZOMBIES, "levels": LEVELS}
