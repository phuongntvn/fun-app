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


# ---------------------------------------------------------------------------
# Lời cổ vũ của ông chủ Phương trong trận, khi thắng/thua, và mẹo chơi.
# {left} được thay bằng số màn còn lại.
# ---------------------------------------------------------------------------
CHEERS = {
    "start": [
        "Cố lên! Hộp quà bí mật đang chờ ở cuối đêm nay!",
        "Ta tin các bạn! Giữ vững từng hàng nhé!",
        "Nhặt thật nhiều Ánh Trăng vào, trận này ta thắng chắc!",
    ],
    "flag": [
        "Đợt lớn tới rồi! Bình tĩnh, giữ vững hàng!",
        "Chúng đông quá... nhưng các bạn làm được mà!",
        "Dùng bảo vật đi! Lúc này là lúc cần nhất đấy!",
    ],
    "half": [
        "Đã qua nửa trận rồi! Cố thêm chút nữa thôi!",
        "Giỏi lắm! Hộp quà bí mật lại gần thêm một bước!",
    ],
    "mower": [
        "Ối! Suýt nữa thì toang! Gia cố hàng đó ngay!",
        "Xe đèn đã cứu một lần, lần sau không còn đâu, cẩn thận nhé!",
    ],
    "final": [
        "ĐỢT CUỐI RỒI! Thắng đợt này là xong màn!",
        "Chỉ còn đợt này thôi! Dốc hết sức nào!",
    ],
    "win_level": [
        "Tuyệt vời! Còn {left} màn nữa là được mở HỘP QUÀ BÍ MẬT!",
        "Quá đỉnh! Chỉ còn {left} màn nữa thôi, hộp quà bí mật đang chờ bạn!",
    ],
    "lose": [
        "Đừng bỏ cuộc! Hộp quà bí mật của ông chủ Phương vẫn đang chờ bạn!",
        "Thua keo này ta bày keo khác! Thử lại nào, lần này chắc chắn thắng!",
        "Suýt nữa thôi! Chỉnh lại đội hình một chút là qua được ngay!",
    ],
}

TIPS = [
    "Mẹo: trồng 2 cột Thỏ Ngọc Giã Trăng thật sớm để có nhiều Ánh Trăng.",
    "Mẹo: đặt Bánh Nướng Khổng Lồ phía trước để Zombie Múa Lân nhảy qua nó thay vì thỏ bắn.",
    "Mẹo: để dành Bánh Trung Thu Thần cho lúc đợt zombie lớn tới.",
    "Mẹo: Chó Bưởi Ngoạm nuốt chửng được cả Quái Vật Thiên Cẩu.",
    "Mẹo: đặt Lò Nướng Bánh ngay trước hàng thỏ bắn để nhân đôi sát thương.",
    "Mẹo: Đèn Ông Sao Nổ hạ được Ông Địa khi kết hợp thêm vài phát bắn.",
    "Mẹo: Gió Cung Trăng đẩy lùi zombie đang sắp vào nhà, dùng khi nguy cấp.",
]


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
            {"who": "phuong", "text": "À còn nữa: ai bảo vệ được nhà ta qua trọn 3 màn đêm nay sẽ được mở HỘP QUÀ BÍ MẬT của ta. Quà xịn lắm đấy!"},
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
            {"who": "phuong", "text": "Các bạn đã đi được 1/3 chặng đường rồi! Hộp quà bí mật đang được ta cất kỹ trong nhà, chỉ còn 2 màn nữa thôi. Cố lên!"},
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
        "reward": "quan_ran_ri",
        "story": [
            {"who": "cuoi", "text": "Nguy to rồi ông chủ ơi! Trăng đã tròn, Zombie ÔNG ĐỊA KHỔNG LỒ đang dẫn cả đoàn tới!"},
            {"who": "cuoi", "text": "Hắn đập nát mọi thứ bằng quạt mo, và khi bị thương sẽ NÉM Zombie Nhóc Mặt Nạ vào sâu trong sân!"},
            {"who": "hang", "text": "Kỳ Lân Cầu Vồng, Lò Nướng Bánh và Thỏ Ba Lồng Đèn đã tới giúp. Hãy chọn đội hình thật khéo!"},
            {"who": "tho", "text": "Đêm tối nên Ánh Trăng rơi ít hơn. Trồng nhiều Thỏ Ngọc Giã Trăng nhé!"},
            {"who": "phuong", "text": "Đêm nay là đêm trăng đẹp nhất năm. Ta tin các bạn, bảo vệ nhà ta đến cùng nhé!"},
            {"who": "phuong", "text": "Đây là màn cuối cùng! Thắng màn này là được mở HỘP QUÀ BÍ MẬT, bên trong là bảo vật quý nhất của ta. Không được bỏ cuộc nhé!"},
        ],
        "ending": [
            {"who": "hang", "text": "Tuyệt vời! Lũ zombie và Thiên Cẩu đã chạy mất dép. Trăng rằm vẫn sáng vằng vặc!"},
            {"who": "phuong", "text": "Cảm ơn các bạn đã bảo vệ ta và cả mâm cỗ! Giờ là lúc ta giữ lời hứa..."},
            {"who": "phuong", "text": "Đây là HỘP QUÀ BÍ MẬT. Bên trong là bảo vật quý nhất của ta. Hãy tự tay mở nó nào!"},
        ],
        "ending_after": [
            {"who": "phuong", "show": "quan_ran_ri", "text": "Tada! Chiếc QUẦN TÚI HỘP RẰN RI ống rộng huyền thoại! Túi hộp to đến mức đựng vừa cả chục cái bánh nướng!"},
            {"who": "phuong", "show": "quan_ran_ri", "text": "Người giữ được nhà ta đêm nay mới xứng đáng mặc nó. Từ giờ chiếc quần này là của bạn!"},
            {"who": "tho", "text": "Oaaa! Mặc quần này đi rước đèn thì ngầu nhất xóm luôn!"},
            {"who": "cuoi", "text": "Hừm... quần thì nhường người chiến thắng, ta chỉ xin một miếng bánh nướng thập cẩm thôi!"},
        ],
    },
]


def get_game_data():
    return {
        "plants": PLANTS,
        "zombies": ZOMBIES,
        "items": ITEMS,
        "levels": LEVELS,
        "cheers": CHEERS,
        "tips": TIPS,
        "config": {
            "item_drop_chance": ITEM_DROP_CHANCE,
            "max_item_stock": MAX_ITEM_STOCK,
            "max_slots": MAX_SLOTS,
        },
    }
