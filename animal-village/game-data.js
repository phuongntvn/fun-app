// Dữ liệu tĩnh của game: bản đồ, loài vật, quái, nhiệm vụ, lời thoại.
// Dùng chung cho server (require) và trình duyệt (window.GAME_DATA, phục vụ ở /game-data.js).

const WORLD = {
  width: 4200,
  groundY: 470,
  minX: 440, // bên trái là dòng sông, không đi xuống nước được
  waterEnd: 430,
  riverGodX: 220,
  dock: { x1: 380, x2: 600 },
  chiefX: 1200,
  spawnX: 1060,
  platforms: [
    { x: 1900, y: 370, w: 160 },
    { x: 2170, y: 300, w: 140 },
    { x: 2400, y: 380, w: 150 },
    { x: 2700, y: 360, w: 170 },
    { x: 2970, y: 280, w: 140 },
    { x: 3200, y: 370, w: 160 },
  ],
};

// Mỗi loài có skin riêng và 2 chiêu: J (đánh thường) và K (tuyệt chiêu).
// front/back: tầm đánh phía trước/phía sau (px); nearest: chỉ trúng con gần nhất; mul: hệ số sát thương; cd: hồi chiêu (ms)
const SPECIES = {
  hamster: {
    name: 'Chuột Béo Bụng Phệ',
    intro: 'Ăn khỏe, ngủ khỏe, huých bụng còn khỏe hơn!',
    skins: [
      { name: 'Cam sữa', fx: 'sparkle', body: '#f0a04b', belly: '#fde6c4', accent: '#f4a3a8' },
      { name: 'Trắng bông', fx: 'hearts', body: '#f4efe8', belly: '#ffffff', accent: '#f7b6c2' },
      { name: 'Xám khói', fx: 'aura', body: '#9a94a0', belly: '#e9e4ec', accent: '#f4a3a8' },
    ],
    attacks: [
      { name: 'Huých Bụng', front: 70, back: 0, mul: 1.0, cd: 350, push: 20 },
      { name: 'Bắn Hạt Hướng Dương', front: 300, back: 0, mul: 0.8, cd: 600, nearest: true },
    ],
    cries: ['Bụng bự cũng biết đánh nha!', 'Ăn hạt hướng dương nè!', 'Huých cho bay luôn!'],
  },
  duck: {
    name: 'Vịt Trẻ Trâu',
    intro: 'Đeo kính đen, cầm dao phay, đi đứng nghênh ngang.',
    skins: [
      { name: 'Trắng ngầu', fx: 'sparkle', body: '#fbfbf7', belly: '#ffffff', accent: '#f39a1e' },
      { name: 'Vàng nổi loạn', fx: 'flame', body: '#ffe066', belly: '#fff3b0', accent: '#f39a1e' },
      { name: 'Đen bụi đời', fx: 'smoke', body: '#4a4a55', belly: '#6b6b78', accent: '#f39a1e' },
    ],
    attacks: [
      { name: 'Chém Dao Phay', front: 85, back: 0, mul: 1.1, cd: 380 },
      { name: 'Quạ Quạ Chấn Động', front: 130, back: 130, mul: 1.3, cd: 1500 },
    ],
    cries: ['Đừng có đụng vào anh!', 'Anh đây trẻ trâu có tiếng!', 'Quạ quạ! Né ra!'],
  },
  platypus: {
    name: 'Thú Mỏ Vịt Hiền Lành',
    intro: 'Hiền khô, hay xin lỗi, nhưng quật đuôi thì đau lắm.',
    skins: [
      { name: 'Nâu hạt dẻ', fx: 'leaves', body: '#8a5a3a', belly: '#d9a46c', accent: '#f2a93b' },
      { name: 'Socola sữa', fx: 'hearts', body: '#6b4630', belly: '#c8956a', accent: '#f2a93b' },
      { name: 'Xanh rêu', fx: 'bubbles', body: '#5f7f5a', belly: '#c9d9a8', accent: '#f2a93b' },
    ],
    attacks: [
      { name: 'Đập Mỏ', front: 75, back: 0, mul: 1.0, cd: 350 },
      { name: 'Quật Đuôi Bẹt', front: 50, back: 100, mul: 1.5, cd: 1200 },
    ],
    cries: ['Xin lỗi nha, mình phải đánh bạn...', 'Mình hiền lắm, thiệt đó!', 'Ui, mình lỡ tay rồi!'],
  },
  chick: {
    name: 'Gà Con Cáu Kỉnh',
    intro: 'Nhỏ xíu mà nóng tính, động vào là xì khói.',
    skins: [
      { name: 'Vàng chanh', fx: 'sparkle', body: '#ffe46b', belly: '#fff1a6', accent: '#f39a1e' },
      { name: 'Cam cháy', fx: 'flame', body: '#ffb35c', belly: '#ffd8a3', accent: '#e8761a' },
      { name: 'Hồng giận dỗi', fx: 'hearts', body: '#ffb3c7', belly: '#ffd6e2', accent: '#f39a1e' },
    ],
    attacks: [
      { name: 'Mổ Liên Hoàn', front: 60, back: 0, mul: 0.6, cd: 180 },
      { name: 'Nổi Khùng Xì Khói', front: 135, back: 135, mul: 1.4, cd: 1600 },
    ],
    cries: ['Bực mình quá nha!', 'Đã bảo đừng chọc tui!', 'Tức xì khói luôn á!'],
  },
  croc: {
    name: 'Tiểu Thư Cá Sấu',
    intro: 'Đeo nơ hồng, nói chuyện nhỏ nhẹ, cắn thì không nhẹ chút nào.',
    skins: [
      { name: 'Xanh lá nơ hồng', fx: 'petals', body: '#6fa35a', belly: '#efe6c4', accent: '#ff7aa8' },
      { name: 'Ngọc bích vương miện', fx: 'aura', body: '#3fa38f', belly: '#e3f2df', accent: '#ffc93c' },
      { name: 'Hồng tiểu thư', fx: 'hearts', body: '#e58fb0', belly: '#fde3ec', accent: '#9b5de5' },
    ],
    attacks: [
      { name: 'Cắn Một Phát', front: 80, back: 0, mul: 1.2, cd: 420 },
      { name: 'Quật Đuôi', front: 40, back: 115, mul: 1.4, cd: 1100 },
    ],
    cries: ['Tiểu thư cũng biết cắn đó nha!', 'Ơ kìa, láo quá!', 'Đuôi này không phải để làm cảnh đâu!'],
  },
};

const MONSTER_TYPES = {
  snail: { name: 'Ốc Sên Lười', hp: 30, speed: 18, exp: 6, rose: 0.4, dmg: 4, w: 40, h: 30, respawn: 4000 },
  mushroom: { name: 'Nấm Lùn Cáu Kỉnh', hp: 55, speed: 40, exp: 10, rose: 0.55, dmg: 7, w: 40, h: 42, respawn: 5000 },
  boar: { name: 'Heo Rừng Đại Ca', hp: 420, speed: 55, exp: 80, rose: 1, roseCount: 3, dmg: 14, w: 90, h: 70, respawn: 25000, boss: true },
};

// Vị trí sinh quái: [loại, minX, maxX]
const MONSTER_SPAWNS = [
  ['snail', 1750, 2100], ['snail', 1850, 2250], ['snail', 1950, 2400], ['snail', 2050, 2500], ['snail', 1750, 2500],
  ['mushroom', 2650, 2950], ['mushroom', 2750, 3100], ['mushroom', 2850, 3250], ['mushroom', 2950, 3350],
  ['boar', 3600, 4100],
];

const ROSES_FOR_CHEST = 10;
const FISH_FOR_KEY = 10;

// Các bước của hành trình (stage)
const STAGES = [
  { title: 'Gặp Trưởng làng', hint: 'Đến nói chuyện với Trưởng làng (phím E)' },
  { title: 'Săn hoa hồng đỏ', hint: `Đánh quái để rơi 🌹, đi ngang qua là tự nhặt. Đủ ${ROSES_FOR_CHEST} bông thì về đổi rương báu` },
  { title: 'Tìm chìa khóa ở lòng sông', hint: 'Đi về phía TRÁI làng, ra bờ sông gặp Thần Sông' },
  { title: 'Câu cá cống nạp Thần Sông', hint: `Đứng ở bến sông, nhấn C để câu. Câu đủ ${FISH_FOR_KEY} con cá rồi nói chuyện với Thần Sông` },
  { title: 'Mang rương và chìa về làng', hint: 'Về gặp Trưởng làng để mở rương báu' },
  { title: 'Nhận nhiệm vụ cuối cùng', hint: 'Con đã nhận quà VIP! Gặp Trưởng làng để nhận nhiệm vụ cuối: Khóa Học Trưởng Thành' },
  { title: 'Tỷ thí PK', hint: 'Đến gần một người chơi khác, nhấn P để mời tỷ thí. Thắng 1 trận với người chơi khác là tốt nghiệp! (Đấu với Sư Phụ Gấu Trúc chỉ để luyện tập)' },
  { title: 'Tốt nghiệp Khóa Học Trưởng Thành', hint: 'Con đã trưởng thành! Hẹn gặp ở phần tiếp theo: Hành Trình Đảo Mây Bay...' },
];

// Tỷ thí PK
const PK = {
  hp: 100,
  countdown: 3000, // ms đếm ngược trước khi đánh
  duration: 90000, // trận dài tối đa 90 giây, hết giờ ai nhiều máu hơn thắng
  inviteRange: 160,
  leaveRange: 700, // chạy xa đối thủ quá mức này là bỏ cuộc
  inviteTimeout: 15000,
};

// Sư Phụ Gấu Trúc: đối thủ luyện tập, thắng ông không được tính nhiệm vụ tỷ thí
const SENSEI = { name: 'Sư Phụ Gấu Trúc', hp: 100, speed: 95, range: 70, dmgMin: 6, dmgMax: 10, atkEvery: 1100 };

const FISH = [
  { name: 'Cá Rô Mập', w: 30 }, { name: 'Cá Chép Ngố', w: 25 }, { name: 'Cá Trê Râu Dài', w: 18 },
  { name: 'Cá Vàng Tiểu Thư', w: 12 }, { name: 'Chiếc Dép Tổ Ong', w: 15, trash: true },
];

const LINES = {
  greet: [
    'Ồ, {name} đó hả? Ta là Trưởng làng, rùa già nhất mà cũng đẹp lão nhất vùng này!',
    'Chào mừng {name} đến Làng Thú Ngộ Nghĩnh! Ở đây không có wifi nhưng có ta, mạnh hơn wifi!',
    'Ủa {name}, con đến đúng lúc lắm! Ta có một rương báu bí mật muốn kể cho con nghe...',
    'A lô a lô, {name} vào làng rồi bà con ơi! Mau cất bánh kẹo đi!',
  ],
  idle: [
    'Hồi trẻ ta bò nhanh lắm, giờ thì... vẫn chậm như xưa.',
    'Ai thấy cái mai dự phòng của ta đâu không?',
    'Ăn sáng đầy đủ thì mới đánh quái có sức nha!',
    'Ta 199 tuổi nhưng tâm hồn mới 18 nha.',
    'Lại đây nói chuyện với ta đi, ta buồn quá à~',
    'Hôm nay trời đẹp, thích hợp để... rụt cổ vào mai ngủ trưa.',
  ],
  riverIdle: [
    'Ùm ùm... ta là Thần Sông, ai gọi ta đó?',
    'Cá trong sông ta nuôi béo lắm, câu thử đi!',
    'Đừng xả rác xuống sông nha, ta mò được cả đống dép rồi!',
    'Bọt bọt bọt... ta đang tắm, đừng nhìn!',
  ],
  jokes: [
    'Tại sao Gà Con lúc nào cũng cáu? Vì nó còn nhỏ mà ai cũng gọi là "gà". Hehe.',
    'Vịt Trẻ Trâu đeo kính đen cả ban đêm, hỏi ra mới biết là để... che quầng thâm.',
    'Chuột Béo bảo đang ăn kiêng: chỉ ăn những gì vừa miệng. Mà miệng nó to lắm!',
    'Thú Mỏ Vịt hỏi ta: "Con là vịt hay là thú?". Ta bảo: "Con là bạn của ta". Cảm động chưa?',
    'Tiểu Thư Cá Sấu khóc nước mắt cá sấu vì... xem phim Hàn.',
  ],
  cries: ['Bá khí!', 'Thiệt là bá khí!', 'Đẳng cấp!', 'Haha!', 'Hihi!'],
  vip: 'Chúc mừng con đã nhận được món quà VIP nhất của ta! Con là bạn thú giỏi nhất làng, ta tự hào về con lắm!',
  bye: ['Đi đường cẩn thận nha con!', 'Nhớ ăn uống đầy đủ đó!', 'Bye bye, nhớ ghé thăm ta nha~'],
  pkWin: ['Thắng rồi! Thiệt là bá khí!', 'Đẳng cấp là đây chứ đâu!', 'Haha, tỷ thí vui ghê!'],
  pkLose: ['Thua rồi huhu... lần sau gặp lại nha!', 'Hông chịu đâu, đấu lại điii!', 'Thua keo này ta bày keo khác!'],
  senseiTaunt: ['Hô hô, con đỡ được chiêu này không?', 'Tre già măng mọc, đánh mạnh lên con!', 'Ta ăn tre cả đời chỉ để chờ ngày này!', 'Chậm quá! Nhanh lên nào!'],
  senseiLose: 'Hô hô, giỏi lắm! Nhưng muốn tốt nghiệp thì phải thắng một người chơi thật đó con!',
  senseiWin: 'Hô hô, chưa đủ trình đâu con. Ăn thêm vài bữa rồi quay lại nhé!',
  // Câu chuyện sau khi tốt nghiệp, mở đường cho phần sau
  story: [
    { scene: 'graduate', title: 'Lễ tốt nghiệp', text: 'Cả Làng Thú Ngộ Nghĩnh tụ tập dưới gốc anh đào. Trưởng làng trao cho {name} tấm bằng "Khóa Học Trưởng Thành", cười móm mém: "Con giờ đã là bạn thú trưởng thành rồi đó!"' },
    { scene: 'river', title: 'Đêm hôm ấy...', text: 'Thần Sông hà mã bỗng nổi lên giữa dòng, mặt rất nghiêm trọng: "Lúc mò chìa khóa cho con, ta còn thấy thứ này dưới đáy sông..." Ngài giơ lên một tấm bản đồ cổ ướt sũng.' },
    { scene: 'map', title: 'Tấm bản đồ cổ', text: 'Bản đồ vẽ một hòn đảo lơ lửng trên mây: Đảo Mây Bay. Ở giữa đảo là một tòa lâu đài, bên cạnh có dòng chữ nguệch ngoạc: "Kho báu nắng mặt trời".' },
    { scene: 'cat', title: 'Kẻ đứng sau tất cả', text: 'Hóa ra Heo Rừng Đại Ca chỉ là đàn em của Vua Mèo Mun Bóng Tối. Hắn đang lén hút hết nắng của các ngôi làng để... phơi cá khô cho riêng mình!' },
    { scene: 'next', title: 'Còn tiếp...', text: 'Trưởng làng đặt tay lên vai {name}: "Hành trình mới sắp bắt đầu rồi con ạ." Hẹn gặp lại trong phần 2: LÀNG THÚ NGỘ NGHĨNH: HÀNH TRÌNH ĐẢO MÂY BAY!' },
  ],
  riverBye: ['Bọt bọt, đi đi con!', 'Nhớ quay lại thăm ta nha, ta ở dưới nước buồn lắm.'],
};

function fill(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

const GAME_DATA = {
  WORLD, SPECIES, MONSTER_TYPES, MONSTER_SPAWNS, STAGES, FISH, LINES, PK, SENSEI,
  ROSES_FOR_CHEST, FISH_FOR_KEY, fill,
};
if (typeof module !== 'undefined' && module.exports) module.exports = GAME_DATA;
else window.GAME_DATA = GAME_DATA;
