// Dữ liệu tĩnh của game: bản đồ, quái, nhiệm vụ, lời thoại.

const WORLD = {
  width: 3400,
  groundY: 470,
  chiefX: 430,
  spawnX: 340,
  platforms: [
    { x: 1150, y: 370, w: 160 },
    { x: 1420, y: 300, w: 140 },
    { x: 1650, y: 380, w: 150 },
    { x: 1950, y: 360, w: 170 },
    { x: 2220, y: 280, w: 140 },
    { x: 2450, y: 370, w: 160 },
  ],
};

const MONSTER_TYPES = {
  snail: { name: 'Ốc Sên Lười', hp: 30, speed: 18, exp: 6, rose: 0.3, dmg: 4, w: 40, h: 30, respawn: 4000 },
  mushroom: { name: 'Nấm Lùn Cáu Kỉnh', hp: 55, speed: 40, exp: 10, rose: 0.4, dmg: 7, w: 40, h: 42, respawn: 5000 },
  boar: { name: 'Heo Rừng Đại Ca', hp: 420, speed: 55, exp: 80, rose: 1, roseCount: 3, dmg: 14, w: 90, h: 70, respawn: 25000, boss: true },
};

// Vị trí sinh quái: [loại, minX, maxX]
const MONSTER_SPAWNS = [
  ['snail', 1000, 1300], ['snail', 1100, 1450], ['snail', 1250, 1600], ['snail', 1400, 1750], ['snail', 1000, 1750],
  ['mushroom', 1850, 2150], ['mushroom', 1950, 2300], ['mushroom', 2100, 2500], ['mushroom', 2250, 2600],
  ['boar', 2800, 3300],
];

// Bánh bao thất lạc cho nhiệm vụ 3 (nằm trên các bục, phải nhảy lên lấy)
const BUNS = [
  { id: 'bun1', x: 1230, y: 340 },
  { id: 'bun2', x: 1490, y: 270 },
  { id: 'bun3', x: 2290, y: 250 },
];

const QUESTS = [
  {
    id: 'q1', type: 'kill', target: 'snail', count: 5,
    title: 'Dẹp loạn Ốc Sên',
    desc: 'Bọn Ốc Sên Lười bò vào vườn rau của ta, ăn sạch cả cải. Con diệt giúp ta 5 con nhé! (Đi về phía phải làng)',
    done: 'Giỏi lắm! Vườn rau của ta được cứu rồi. Tặng con 1 bó hoa hồng, đừng đem tặng crush làng bên nha!',
  },
  {
    id: 'q2', type: 'kill', target: 'mushroom', count: 4,
    title: 'Nấm Lùn nổi loạn',
    desc: 'Lũ Nấm Lùn Cáu Kỉnh dạo này hay chửi bậy với dân làng. Con đi dạy dỗ 4 đứa giúp ta!',
    done: 'Tuyệt vời! Giờ tụi nó hiền như... nấm rơm. Bó hoa hồng này là của con!',
  },
  {
    id: 'q3', type: 'collect', target: 'bun', count: 3,
    title: 'Bánh bao thất lạc',
    desc: 'Hôm qua ta tập phi thân, làm rơi 3 cái bánh bao lên mấy cái bục cao. Con nhảy lên nhặt giúp ta nha, đói quá!',
    done: 'Bánh bao còn ấm nè! Cảm ơn con. Thêm 1 bó hoa hồng cho con, ăn bánh không được chia đâu nhé.',
  },
  {
    id: 'q4', type: 'kill', target: 'boar', count: 1,
    title: 'Hạ gục Heo Rừng Đại Ca',
    desc: 'Heo Rừng Đại Ca tự xưng là "trùm cuối" ở cuối bản đồ. Ta thấy nó chảnh quá. Con đi hạ nó giúp ta!',
    done: 'Trời ơi, con là thiên tài ninja! Bó hoa hồng này ta dành dụm 3 năm đó!',
  },
];

const ROSES_PER_BOUQUET = 5;
const BOUQUETS_PER_CHEST = 3;

const LINES = {
  greet: [
    'Ồ, {name} đó hả? Ta là Trưởng Làng, đẹp lão nhất vùng này!',
    'Chào mừng {name} đến Làng Hoa Hồng! Ở đây không có wifi nhưng có ta, mạnh hơn wifi!',
    'Ủa {name}, con đến đúng lúc lắm! Ta vừa đánh rơi cái dép... à không, ta có nhiệm vụ cho con!',
    'A lô a lô, {name} vào làng rồi bà con ơi! Mau cất bánh kẹo đi!',
  ],
  idle: [
    'Hồi trẻ ta đẹp trai lắm, giờ thì... vẫn đẹp trai.',
    'Ai thấy bộ răng giả của ta đâu không?',
    'Ninja giỏi là ninja biết ăn sáng đầy đủ.',
    'Ta 99 tuổi nhưng tâm hồn mới 18 nha.',
    'Lại đây nói chuyện với ta đi, ta buồn quá à~',
    'Hôm nay trời đẹp, thích hợp để... ngủ trưa.',
    'Ta có tuyệt chiêu "Ngủ Trưa Thần Chưởng", luyện 70 năm rồi đó!',
  ],
  jokes: [
    'Ninja tàng hình giỏi nhất làng là ai? Ta cũng không biết, vì chưa ai thấy hắn cả!',
    'Hôm qua ta tập phân thân, kết quả là... phân vân không biết trưa nay ăn gì.',
    'Con ốc sên hỏi: "Sao anh chạy nhanh thế?". Con rùa đáp: "Tại em chậm thôi". Hết. Cười đi con!',
    'Ta từng phi tiêu trúng hồng tâm 100 lần. Lần nào tâm ta cũng hồng vì... trúng crush.',
    'Tại sao nấm lùn cáu kỉnh? Vì nó lùn. Ta cũng lùn, nhưng ta hiền. Hehe.',
  ],
  cries: ['Bá khí!', 'Thiệt là bá khí!', 'Đẳng cấp!', 'Haha!', 'Hihi!', 'Bá khí!', 'Đẳng cấp!', 'Ăn chưởng nè!'],
  noQuest: 'Hết nhiệm vụ rồi con ơi! Đi đánh quái nhặt hoa hồng, đủ {roses} bông thì ta gói thành bó cho.',
  needMore: 'Con mới có {roses} bông hoa hồng thôi, cần {need} bông mới gói được 1 bó nha!',
  exchanged: 'Ta gói xong rồi nè! {n} bông hoa hồng thành 1 bó hoa hồng thơm phức!',
  chestOk: 'Wow, {n} bó hoa hồng! Đây, rương báu của con. Mở ra xem đi, hồi hộp chưa?',
  chestNeed: 'Muốn rương báu thì cần {need} bó hoa hồng nha con, giờ con mới có {have} bó.',
  vip: 'Chúc mừng con đã nhận được món quà VIP nhất của ta, hub này có thể dùng để xuất hình qua HDMI, USB, Type-C, mà đặc biệt có cổng thẻ nhớ giúp con cắm thẻ nhớ vào để lấy ảnh tiện hơn!',
  bye: ['Đi đường cẩn thận nha con!', 'Nhớ ăn uống đầy đủ đó!', 'Bye bye, nhớ ghé thăm ta nha~'],
  inProgress: 'Nhiệm vụ "{title}" con làm được {p}/{c} rồi. Cố lên, ta tin con!',
};

function fill(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  WORLD, MONSTER_TYPES, MONSTER_SPAWNS, BUNS, QUESTS, LINES,
  ROSES_PER_BOUQUET, BOUQUETS_PER_CHEST, fill, pick,
};
