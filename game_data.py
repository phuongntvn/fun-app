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
    "trong_lan": {
        "name": "Trống Lân",
        "kind": "squash",
        "cost": 50,
        "cooldown": 30,
        "start_cooldown": 20,
        "hp": 300,
        "damage": 1800,
        "desc": "Nhảy lên rồi nện TÙNG một cú, đè bẹp zombie đứng sát bên.",
    },
    "hat_de_gai": {
        "name": "Hạt Dẻ Gai",
        "kind": "spike",
        "cost": 100,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "rate": 1.0,
        "damage": 20,
        "desc": "Vỏ gai đâm vào chân zombie đi qua. Zombie không ăn được nó (trừ Ông Địa).",
    },
    "cho_buoi": {
        "name": "Chó Bưởi Ngoạm",
        "kind": "chomper",
        "cost": 150,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "chew": 25,
        "boss_damage": 400,
        "desc": "Chó bưởi nuốt chửng zombie trước mặt, rồi nhai khá lâu.",
    },
    "lo_nuong": {
        "name": "Lò Nướng Bánh",
        "kind": "torch",
        "cost": 175,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 600,
        "desc": "Bánh bay qua lò thành bánh nóng rực, sát thương gấp đôi.",
    },
    "tho_ba_den": {
        "name": "Thỏ Ba Lồng Đèn",
        "kind": "shooter",
        "cost": 325,
        "cooldown": 7.5,
        "start_cooldown": 0,
        "hp": 300,
        "rate": 1.4,
        "damage": 20,
        "shots": 1,
        "lanes": 3,
        "bullet": "cake",
        "desc": "Ba chiếc lồng đèn bắn cùng lúc vào 3 hàng.",
    },
}

# ---------------------------------------------------------------------------
# Bảo vật dùng trong trận. target: "plant" = bấm vào một đồng minh, None = dùng ngay.
# ---------------------------------------------------------------------------
ITEMS = {
    "banh_than": {
        "name": "Bánh Trung Thu Thần",
        "target": "plant",
        "desc": "Bấm vào một đồng minh để kích hoạt sức mạnh cực đại.",
    },
    "mua_sao": {
        "name": "Mưa Sao Băng",
        "target": None,
        "damage": 300,
        "desc": "Sao băng rơi trúng mọi zombie, gây 300 sát thương.",
    },
    "gio_hang": {
        "name": "Gió Cung Trăng",
        "target": None,
        "push": 110,
        "slow": 6,
        "desc": "Thổi toàn bộ zombie lùi lại và làm chậm 6 giây.",
    },
    "tra_sen": {
        "name": "Trà Sen Hồi Phục",
        "target": None,
        "desc": "Hồi đầy máu cho mọi đồng minh.",
    },
}

ITEM_DROP_CHANCE = 0.07
MAX_ITEM_STOCK = 5
MAX_SLOTS = 9

# ---------------------------------------------------------------------------
# Zombie & quái vật. speed tính bằng pixel/giây, bite = sát thương/giây khi gặm.
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
    "nhoc": {"name": "Zombie Nhóc Mặt Nạ", "hp": 150, "armor": 0, "speed": 22, "bite": 100},
    "thien_cau": {"name": "Quái Vật Thiên Cẩu", "hp": 700, "armor": 0, "speed": 20, "bite": 180},
    "ong_dia": {
        "name": "Zombie Ông Địa Khổng Lồ", "hp": 2400, "armor": 0, "speed": 11, "bite": 0,
        "throws": "nhoc",
    },
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
        "plants": ["tho_ngoc", "tho_ban", "banh_nuong", "banh_deo", "trong_lan"],
        "items": {"banh_than": 1, "tra_sen": 1},
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
            {"who": "phuong", "text": "Tối nay nhà ta mở tiệc Trung Thu! Bánh nướng, bánh dẻo, mâm ngũ quả bày đầy cả sân rồi."},
            {"who": "cuoi", "text": "Ông chủ Phương ơi, nguy to! Lũ Zombie ngửi thấy mùi bánh... và cả mùi NÃÃÃO của ông chủ nữa!"},
            {"who": "hang", "text": "Đừng sợ! Ta đã cử các bé Thỏ Ngọc từ Cung Trăng xuống bảo vệ ông chủ Phương."},
            {"who": "tho", "text": "Thỏ Ngọc Giã Trăng tạo ra ÁNH TRĂNG. Hãy bấm để nhặt, rồi dùng nó gọi thêm đồng đội nhé!"},
            {"who": "cuoi", "text": "Zombie gục xuống đôi khi làm rơi BẢO VẬT. Nhặt về, rồi dùng ở thanh dưới cùng! Bánh Trung Thu Thần làm đồng minh mạnh gấp bội."},
            {"who": "phuong", "text": "Trăm sự nhờ các bạn! Đừng để con zombie nào bước vào nhà ta!"},
        ],
    },
    {
        "id": 2,
        "name": "Màn 2: Hoàng Hôn Rước Đèn",
        "time": "dusk",
        "plants": ["tho_ngoc", "tho_ban", "banh_nuong", "banh_deo", "trong_lan",
                   "tho_bang", "den_ong_sao", "hat_de_gai", "cho_buoi"],
        "items": {"banh_than": 1, "mua_sao": 1, "tra_sen": 1},
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
            _w((1, "thien_cau"), (1, "thuong")),
            _w((1, "noi_dong"), (2, "non_la")),
            _w((2, "mua_lan"), (2, "thuong")),
            _w((1, "noi_dong"), (1, "thien_cau"), (2, "thuong")),
            _w((2, "noi_dong"), (1, "mua_lan")),
            _w((1, "co"), (4, "thuong"), (3, "non_la"), (2, "noi_dong"), (1, "mua_lan"), (1, "thien_cau")),
        ],
        "reward": "ky_lan",
        "story": [
            {"who": "phuong", "text": "Trời chập choạng tối, lũ trẻ trong xóm sắp rước đèn qua nhà ta. Phải giữ sân thật an toàn!"},
            {"who": "cuoi", "text": "Lần này có Zombie ĐỘI NỒI ĐỒNG cứng như thép, Zombie MÚA LÂN nhảy qua đầu đồng minh..."},
            {"who": "cuoi", "text": "...và cả QUÁI VẬT THIÊN CẨU, con chó trời chuyên ăn trăng! Nó cắn một phát là đồng minh tiêu luôn!"},
            {"who": "hang", "text": "Chó Bưởi Ngoạm nuốt chửng được cả Thiên Cẩu. Hạt Dẻ Gai thì đâm chân zombie đi ngang qua."},
            {"who": "tho", "text": "Thỏ Tuyết bắn chè đông lạnh làm chậm kẻ địch, còn Đèn Ông Sao Nổ thì... BÙMMM!"},
        ],
    },
    {
        "id": 3,
        "name": "Màn 3: Đêm Trăng Tròn Quyết Chiến",
        "time": "night",
        "plants": ["tho_ngoc", "tho_ban", "banh_nuong", "banh_deo", "trong_lan",
                   "tho_bang", "den_ong_sao", "hat_de_gai", "cho_buoi",
                   "ky_lan", "lo_nuong", "tho_ba_den"],
        "items": {"banh_than": 2, "mua_sao": 1, "gio_hang": 1, "tra_sen": 1},
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
            _w((1, "noi_dong"), (1, "thien_cau")),
            _w((2, "mua_lan"), (1, "non_la")),
            _w((1, "ong_dia"), (2, "thuong")),
            _w((2, "noi_dong"), (2, "non_la")),
            _w((1, "co"), (4, "thuong"), (2, "noi_dong"), (2, "mua_lan"), (1, "ong_dia"), (1, "thien_cau")),
            _w((2, "non_la"), (2, "thuong")),
            _w((1, "noi_dong"), (2, "mua_lan")),
            _w((1, "ong_dia"), (2, "non_la")),
            _w((2, "noi_dong"), (3, "thuong")),
            _w((1, "co"), (4, "thuong"), (3, "non_la"), (2, "noi_dong"), (2, "mua_lan"),
               (2, "ong_dia"), (1, "thien_cau")),
        ],
        "reward": "trophy",
        "story": [
            {"who": "cuoi", "text": "Nguy to rồi ông chủ ơi! Trăng đã tròn, Zombie ÔNG ĐỊA KHỔNG LỒ đang dẫn cả đoàn tới!"},
            {"who": "cuoi", "text": "Hắn đập nát mọi thứ bằng quạt mo, và khi bị thương sẽ NÉM Zombie Nhóc Mặt Nạ vào sâu trong sân!"},
            {"who": "hang", "text": "Kỳ Lân Cầu Vồng, Lò Nướng Bánh và Thỏ Ba Lồng Đèn đã tới giúp. Hãy chọn đội hình thật khéo!"},
            {"who": "tho", "text": "Đêm tối nên Ánh Trăng rơi ít hơn. Trồng nhiều Thỏ Ngọc Giã Trăng nhé!"},
            {"who": "phuong", "text": "Đêm nay là đêm trăng đẹp nhất năm. Ta tin các bạn, bảo vệ nhà ta đến cùng nhé!"},
        ],
        "ending": [
            {"who": "hang", "text": "Tuyệt vời! Lũ zombie và Thiên Cẩu đã chạy mất dép. Trăng rằm vẫn sáng vằng vặc!"},
            {"who": "phuong", "text": "Cảm ơn các bạn đã bảo vệ ta và cả mâm cỗ! Mời cả xóm vào nhà phá cỗ nào!"},
            {"who": "tho", "text": "Yeah! Rước đèn đi chơi thôi!"},
            {"who": "cuoi", "text": "Còn ta xin một miếng bánh nướng thập cẩm to nhất nhé, ông chủ Phương!"},
        ],
    },
]


def get_game_data():
    return {
        "plants": PLANTS,
        "zombies": ZOMBIES,
        "items": ITEMS,
        "levels": LEVELS,
        "config": {
            "item_drop_chance": ITEM_DROP_CHANCE,
            "max_item_stock": MAX_ITEM_STOCK,
            "max_slots": MAX_SLOTS,
        },
    }
