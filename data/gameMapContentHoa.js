/* ============================================================
   Life Balance — data/gameMapContentHoa.js
   Real Huyện content for Hoả Châu ("Xích Hoả Đại Lục") in
   game-wulin.html's world map system. See GAME_MAP_ROADMAP.md at
   the repo root for the full vision this data feeds — specifically
   the "Khu vực mechanics" section (what each of the 5 khu vực does),
   the "Economy & progression" section (Linh Thạch / Điểm Danh Vọng,
   and the hard rule that neither currency ever buys permanent stat
   power — only cosmetics/consumables/short buffs), and the
   per-Huyện difficulty-tier table (bronze/silver/gold/epic/legendary,
   same tier language js/elementStats.js's ELEMENT_STAR_TIERS and
   js/weaponPrototype.js's tier system already use). This file covers
   the roadmap's D9-D11 checklist items (Hoả Châu's 3 Huyện), applying
   the C1-C5 khu-vực template Bạc Kim Trấn is meant to establish first.

   Loaded as a plain global (window.GAME_MAP_CONTENT_HOA), same
   script-tag convention as every other data/*.js file (see
   tech-defaults.md's "Data File Convention") — no bundler, no ES
   modules. Data only: no rendering/combat/economy logic lives here,
   same separation game-wulin.js's WULIN_MONSTERS keeps from the
   combat engine that consumes it.

   Monster/boss field shape deliberately mirrors game-wulin.js's
   existing WULIN_MONSTERS array (id/icon/name/tier/hp/attack/defense/
   skillName/skillMult/skillChance/reward) so this data can be wired
   into the same combat screen with no reshaping — plus two additions
   specific to the map's needs: `flavor` (one-line Vietnamese lore
   tying the monster to Hoả/desert/volcanic wuxia theming, per the
   roadmap's "genuinely different flavor per Châu" instruction) and
   `linhThachReward` (the map's own Khu-đánh-quái currency payout,
   kept separate from `reward` which is game-wulin.js's existing
   internal-power reward so the two systems don't collide).

   Every `khuDanCu` item is cosmetic, a consumable, or a short-duration
   buff ONLY — never a permanent stat increase — per the roadmap's
   hard economic rule. Each item's `effect` string says so explicitly
   so this stays auditable at a glance.
   ============================================================ */

'use strict';

window.GAME_MAP_CONTENT_HOA = {
  chauKey: 'fire',
  chauName: 'Xích Hoả Đại Lục',

  huyen: [
    // ── 1. Viêm Dương Thành — 1st Huyện, bronze/silver ──────────
    // "Blazing Sun City": a desert trading city built around a Sun-
    // worship shrine that a fire cult has begun quietly radicalizing
    // from below. Bronze-tier monsters here are tuned to WULIN_BASE's
    // zero-real-data stats (hp 80/attack 12/defense 8), same target
    // game-wulin.js's own 'Dễ'-tier fox-mist entry already hits.
    {
      key: 'viem-duong-thanh',
      name: 'Viêm Dương Thành',
      tierRoadmap: 'bronze/silver',
      tierLabel: 'Sơ cấp · Rèn luyện',

      khuDanhQuai: {
        description: 'Vành đai lều trại và phế tích cháy xém quanh chân thành, nơi tín đồ Hoả Giáo mới nhập môn luyện phép dưới cái nắng thiêu đốt của sa mạc.',
        monsters: [
          {
            id: 'hoa-vdt-tin-do-cuong-tin', icon: '🕯️', name: 'Tín Đồ Cuồng Tín',
            tier: 'bronze', hp: 62, attack: 8, defense: 3,
            skillName: 'Kinh Văn Thiêu Đốt', skillMult: 1.3, skillChance: .2,
            linhThachReward: 8,
            flavor: 'Kẻ hành hương lạc lối giữa sa mạc, tay ôm cuộn kinh văn đã cháy sém, miệng lẩm bẩm lời nguyền của Thái Dương Thần.',
          },
          {
            id: 'hoa-vdt-cat-yeu-nhiet-sa', icon: '🏜️', name: 'Cát Yêu Nhiệt Sa',
            tier: 'bronze', hp: 74, attack: 9, defense: 4,
            skillName: 'Cát Bỏng Cuốn', skillMult: 1.35, skillChance: .22,
            linhThachReward: 10,
            flavor: 'Linh thể sinh ra từ cát nóng bị mặt trời nung suốt trăm năm, thân hình lởm chởm tinh thể thuỷ tinh cháy đen.',
          },
          {
            id: 'hoa-vdt-linh-canh-thieu-than', icon: '💂', name: 'Lính Canh Thiêu Thân',
            tier: 'silver', hp: 92, attack: 11, defense: 6,
            skillName: 'Giáo Lửa Trấn Thành', skillMult: 1.4, skillChance: .25,
            linhThachReward: 14,
            flavor: 'Cựu binh giữ thành đã âm thầm cải sang Hoả Giáo, giáp trụ ám khói, ánh mắt trống rỗng như đã quên mất mình canh gác vì điều gì.',
          },
          {
            id: 'hoa-vdt-tieu-ho-ly-hoa', icon: '🦊', name: 'Tiểu Hồ Ly Diễm Vĩ',
            tier: 'silver', hp: 100, attack: 12, defense: 6,
            skillName: 'Vĩ Diễm Phệ', skillMult: 1.45, skillChance: .27,
            linhThachReward: 15,
            flavor: 'Yêu hồ nhỏ sống trong hang cát, đuôi cháy âm ỉ không bao giờ tắt — dân du mục đồn rằng chạm vào đuôi nó là mang lời nguyền nóng sốt cả tháng.',
          },
          {
            id: 'hoa-vdt-viem-linh-nu-vu', icon: '🔥', name: 'Viêm Linh Nữ Vu',
            tier: 'silver', hp: 112, attack: 13, defense: 7,
            skillName: 'Múa Lửa Gọi Hồn', skillMult: 1.5, skillChance: .28,
            linhThachReward: 17,
            flavor: 'Pháp sư trẻ của đền Thái Dương, múa điệu lửa cổ để triệu hồi vong linh sa mạc — không biết mình đang bị Hoả Giáo lợi dụng làm quân cờ.',
          },
        ],
      },

      hangDong: {
        description: 'Hầm mộ dưới nền đền Thái Dương cũ, nơi Hoả Giáo cất giữ ngọn lửa "vĩnh cửu" đầu tiên họ đánh cắp được.',
        boss: {
          id: 'hoa-vdt-boss-chuc-long', icon: '🔱', name: 'Cuồng Diễm Giáo Chủ Chúc Long',
          tier: 'silver', hp: 165, attack: 18, defense: 10,
          skillName: 'Thiêu Thiên Diễm', skillMult: 1.65, skillChance: .3,
          linhThachReward: 60,
          backstory: 'Từng là tư tế giữ đền hiền lành nhất Viêm Dương Thành, Chúc Long phát điên sau khi cố "hợp nhất" với ngọn lửa thiêng để cứu thành khỏi hạn hán — giờ hắn tin ngọn lửa ấy là ý chí của chính mình.',
        },
      },

      thap: {
        description: 'Tháp Thiêu Thân — một cột tháp đá sa thạch nung đỏ mọc thẳng từ giữa sa mạc, mỗi tầng nóng hơn tầng dưới; người trong thành đồn rằng leo càng cao càng nghe rõ tiếng tụng kinh của những kẻ đã "hoá thân" thành tro trước đó.',
      },

      khuDanCu: {
        shopkeeper: {
          name: 'Lão Mãi Bình Nước',
          dialogues: [
            'Nước sa mạc quý hơn vàng, khách quan — nhưng ta chỉ lấy Linh Thạch thôi, không lấy máu hay nội lực của ai cả.',
            'Bùa hộ mệnh này chỉ ấm người ba mươi phút thôi, đừng mong nó biến ngươi thành cao thủ chỉ sau một đêm.',
          ],
        },
        caiTrangSu: {
          name: 'Cải Trang Sư Diễm Y',
          dialogues: [
            'Danh Vọng ngươi tích được ở Tháp Thiêu Thân, ta đổi thành thứ đẹp mắt cho ngươi mặc — chỉ đẹp thôi, không mạnh hơn đâu.',
            'Áo choàng cát vàng này từng thuộc về một lữ khách đã bỏ mạng giữa sa mạc... à không, ta bịa đấy, chỉ là vải nhuộm màu nắng thôi.',
          ],
        },
        items: [
          {
            id: 'hoa-vdt-item-binh-nuoc', name: 'Bình Nước Ốc Thị', cost: 40, currency: 'linh-thach',
            type: 'buff', effect: 'Buff tạm thời: +5% né tránh trong 10 phút thực — không cộng vĩnh viễn vào chỉ số gốc.',
          },
          {
            id: 'hoa-vdt-item-bua-napalm', name: 'Bùa Trấn Hoả Napalm', cost: 65, currency: 'linh-thach',
            type: 'consumable', effect: 'Tiêu hao một lần: hồi một phần nhỏ HP trước trận kế tiếp, không nâng chỉ số vĩnh viễn.',
          },
          {
            id: 'hoa-vdt-item-ao-cat-vang', name: 'Áo Choàng Cát Vàng', cost: 120, currency: 'danh-vong',
            type: 'cosmetic', effect: 'Trang phục thời trang thuần tuý — chỉ đổi hình dạng nhân vật, không tác động chiến đấu.',
          },
          {
            id: 'hoa-vdt-item-danh-hieu-lu-khach', name: 'Danh Hiệu "Lữ Khách Sa Mạc"', cost: 90, currency: 'danh-vong',
            type: 'cosmetic', effect: 'Danh hiệu hiển thị cạnh tên nhân vật — trang trí thuần tuý, không ảnh hưởng chỉ số.',
          },
        ],
      },

      khuLuyenCong: {
        description: 'Sân luyện dưới bóng tường thành, nơi đệ tử mới tập bước qua vòng lửa nghi lễ để lấy "khí thế" trước khi ra trận — một nghi thức khởi động, không phải hệ thống sức mạnh mới.',
      },
    },

    // ── 2. Hồng Liên Tự — 2nd Huyện, silver/gold ────────────────
    // "Crimson Lotus Temple": a mountain monastery whose monks turned
    // to demon-worship after a forbidden fire sutra was unearthed.
    {
      key: 'hong-lien-tu',
      name: 'Hồng Liên Tự',
      tierRoadmap: 'silver/gold',
      tierLabel: 'Rèn luyện · Thành thạo',

      khuDanhQuai: {
        description: 'Sân trong và hành lang cột đá của ngôi cổ tự, hương khói đỏ như máu bốc lên từ những lư hương không bao giờ tắt kể từ ngày sư trụ trì "tẩu hoả nhập ma".',
        monsters: [
          {
            id: 'hoa-hlt-tang-tau-hoa', icon: '🧘', name: 'Tăng Nhân Tẩu Hoả',
            tier: 'silver', hp: 118, attack: 14, defense: 8,
            skillName: 'Chân Khí Nghịch Hành', skillMult: 1.5, skillChance: .28,
            linhThachReward: 20,
            flavor: 'Đệ tử tu luyện sai đường trong lúc thiền định, chân khí đảo lộn hoá thành lửa trong kinh mạch — càng đau càng đánh mạnh hơn.',
          },
          {
            id: 'hoa-hlt-ho-phap-hong-lien', icon: '🗿', name: 'Hộ Pháp Hồng Liên',
            tier: 'silver', hp: 132, attack: 15, defense: 10,
            skillName: 'Kim Cang Diễm Chưởng', skillMult: 1.5, skillChance: .3,
            linhThachReward: 22,
            flavor: 'Tượng đá hộ pháp trước chính điện, được đánh thức bằng máu và lửa nghi lễ — nay canh giữ ngôi chùa đã không còn thờ Phật.',
          },
          {
            id: 'hoa-hlt-xich-diem-tang-binh', icon: '⚔️', name: 'Xích Diễm Tăng Binh',
            tier: 'gold', hp: 145, attack: 17, defense: 11,
            skillName: 'Bát Nhã Đao Diễm', skillMult: 1.55, skillChance: .3,
            linhThachReward: 26,
            flavor: 'Tăng binh vốn tu để hộ tự, nay khoác giáp đỏ như máu, múa đao tẩm lửa thay vì tụng kinh cứu độ.',
          },
          {
            id: 'hoa-hlt-hoa-phuong-so-sinh', icon: '🐦', name: 'Hoả Phượng Sơ Sinh',
            tier: 'gold', hp: 150, attack: 18, defense: 11,
            skillName: 'Trường Sinh Diễm Vũ', skillMult: 1.6, skillChance: .3,
            linhThachReward: 28,
            flavor: 'Linh điểu mới nở từ đống tro tàn nghi lễ luyện đan của tự viện, lông chưa mọc đủ nhưng lửa trong lồng ngực đã cháy như phượng hoàng trưởng thành.',
          },
          {
            id: 'hoa-hlt-ma-tang-thieu-kinh', icon: '📜', name: 'Ma Tăng Thiêu Kinh',
            tier: 'gold', hp: 168, attack: 20, defense: 13,
            skillName: 'Phần Kinh Chú Diễm', skillMult: 1.65, skillChance: .32,
            linhThachReward: 32,
            flavor: 'Trưởng lão đốt từng trang kinh Phật để đổi lấy sức mạnh ma pháp, tro kinh văn bay quanh người như một đám mây lửa đen.',
          },
        ],
      },

      hangDong: {
        description: 'Tháp chuông ngầm dưới lòng chùa, nơi cất giữ pho "Vô Tự Hoả Kinh" đã khiến cả tự viện hoá điên.',
        boss: {
          id: 'hoa-hlt-boss-lao-to', icon: '🪷', name: 'Hồng Liên Lão Tổ',
          tier: 'gold', hp: 225, attack: 24, defense: 15,
          skillName: 'Địa Ngục Liên Hoa Diễm', skillMult: 1.7, skillChance: .33,
          linhThachReward: 95,
          backstory: 'Vị trụ trì sáng lập Hồng Liên Tự hàng trăm năm trước, người từng nổi tiếng từ bi nhất vùng — cho đến ngày ông đọc trọn pho Vô Tự Hoả Kinh và nửa thân hoá thành phượng hoàng lửa, không còn phân biệt được cứu độ với thiêu huỷ.',
        },
      },

      thap: {
        description: 'Tháp Bát Nhã Diễm — ngọn bảo tháp xoắn ốc bảy tầng của cổ tự, mỗi tầng là một "cửa thiền" bị lửa ma đạo chiếm giữ; càng lên cao, tiếng chuông chùa nghe càng lẫn vào tiếng gào của lửa.',
      },

      khuDanCu: {
        shopkeeper: {
          name: 'Ni Cô Bán Trà',
          dialogues: [
            'Trà Thanh Hoả này chỉ giúp tâm ngươi dịu lại vài phút trước trận đánh thôi, đừng hỏi ta có cách nào tu luyện nhanh hơn — không có đâu.',
            'Linh Thạch ngươi đưa đây, ta không nhận công đức giả hay chân khí vay mượn.',
          ],
        },
        caiTrangSu: {
          name: 'Cải Trang Sư Liên Hoa',
          dialogues: [
            'Chuỗi hạt Hồng Liên này đẹp thật, nhưng đeo vào cũng chẳng giúp ngươi tụng kinh giỏi hơn đâu — thuần là trang sức.',
            'Danh hiệu "Thiền Sư Giả" ta bán đây là để đùa thôi, đừng mang đi doạ sư phụ thật của ngươi.',
          ],
        },
        items: [
          {
            id: 'hoa-hlt-item-tra-thanh-hoa', name: 'Trà Thanh Hoả', cost: 55, currency: 'linh-thach',
            type: 'buff', effect: 'Buff tạm thời: +6% tỉ lệ chí mạng trong 10 phút thực, hết hiệu lực không để lại chỉ số cộng thêm.',
          },
          {
            id: 'hoa-hlt-item-bua-trau-hoa', name: 'Bùa Tránh Tẩu Hoả', cost: 70, currency: 'linh-thach',
            type: 'consumable', effect: 'Tiêu hao một lần trước trận: hồi một phần HP, không phải chỉ số vĩnh viễn.',
          },
          {
            id: 'hoa-hlt-item-chuoi-hat', name: 'Chuỗi Hạt Hồng Liên', cost: 150, currency: 'danh-vong',
            type: 'cosmetic', effect: 'Phụ kiện trang trí đeo cùng nhân vật — không cộng chỉ số chiến đấu.',
          },
          {
            id: 'hoa-hlt-item-danh-hieu-thien-su', name: 'Danh Hiệu "Thiền Sư Giả"', cost: 110, currency: 'danh-vong',
            type: 'cosmetic', effect: 'Danh hiệu hiển thị hài hước — thuần trang trí, không ảnh hưởng lối chơi.',
          },
        ],
      },

      khuLuyenCong: {
        description: 'Sân thiền đá cuội sau chính điện, nơi đệ tử luyện nhịp thở "nhập định giả" để lấy lại bình tĩnh trước trận — chỉ là một nghi thức khởi động ngắn, không phải phép tu luyện thật.',
      },
    },

    // ── 3. Cuồng Phong Trại — 3rd Huyện, gold/epic/legendary ────
    // "Mad Wind Camp": a bandit-warlord stronghold in volcanic
    // badlands, combining Fire with the "cuồng phong" (wild wind)
    // theme literally in the Huyện's own name — war drums, cavalry,
    // and a fire-wind demon lord at the top.
    {
      key: 'cuong-phong-trai',
      name: 'Cuồng Phong Trại',
      tierRoadmap: 'gold/epic/legendary',
      tierLabel: 'Thành thạo · Tinh anh · Huyền thoại',

      khuDanhQuai: {
        description: 'Vùng đất nứt nẻ quanh miệng núi lửa, nơi trại binh của một trại chủ phản tướng đóng quân giữa gió cuốn tro bụi và dòng nham thạch chưa nguội.',
        monsters: [
          {
            id: 'hoa-cpt-linh-dao-lua', icon: '⚔️', name: 'Lính Trại Đao Lửa',
            tier: 'gold', hp: 182, attack: 22, defense: 13,
            skillName: 'Đao Diễm Trảm', skillMult: 1.6, skillChance: .3,
            linhThachReward: 38,
            flavor: 'Sơn tặc gia nhập trại vì miếng ăn, được phát đao tẩm dầu núi lửa — chưa kịp học binh pháp đã học được cách chém cho cháy đối thủ.',
          },
          {
            id: 'hoa-cpt-cuong-phong-ky-binh', icon: '🐎', name: 'Cuồng Phong Kỵ Binh',
            tier: 'gold', hp: 198, attack: 24, defense: 14,
            skillName: 'Toàn Phong Diễm Thương', skillMult: 1.65, skillChance: .32,
            linhThachReward: 42,
            flavor: 'Kỵ binh cưỡi ngựa lửa phi trên nền đất nứt, cuốn theo cả cột tro như một cơn lốc — tiếng vó ngựa nghe như sấm trước khi thấy bóng người.',
          },
          {
            id: 'hoa-cpt-ma-tuong-diem-phong', icon: '👹', name: 'Ma Tướng Diễm Phong',
            tier: 'epic', hp: 218, attack: 27, defense: 16,
            skillName: 'Cuồng Phong Phá Diễm', skillMult: 1.7, skillChance: .34,
            linhThachReward: 50,
            flavor: 'Tướng tiên phong của trại chủ, thân thể là sự hợp nhất kỳ dị giữa lửa và gió lốc — mỗi bước đi đều để lại vệt cháy xoáy trên mặt đất.',
          },
          {
            id: 'hoa-cpt-hoa-diem-cu-nhan', icon: '🗿', name: 'Hoả Diễm Cự Nhân',
            tier: 'epic', hp: 245, attack: 29, defense: 18,
            skillName: 'Nham Thạch Cự Quyền', skillMult: 1.75, skillChance: .35,
            linhThachReward: 55,
            flavor: 'Cự nhân đá nham thạch được trại chủ luyện thành bằng máu tù binh, mỗi cú đấm để lại miệng núi lửa nhỏ trên nền đất.',
          },
          {
            id: 'hoa-cpt-xa-vuong-nham-thach', icon: '🐍', name: 'Xà Vương Nham Thạch',
            tier: 'epic', hp: 268, attack: 31, defense: 19,
            skillName: 'Dung Nham Triền Thân', skillMult: 1.8, skillChance: .36,
            linhThachReward: 60,
            flavor: 'Rắn thần trú trong lòng núi lửa hàng ngàn năm, bị trại chủ dụ ra khỏi hang bằng lễ hiến tế — vảy nó nóng đến mức làm chảy cả đá xung quanh.',
          },
        ],
      },

      hangDong: {
        description: 'Hang nham thạch sâu dưới trại, nơi trại chủ cất giữ lò luyện binh khí bằng máu và lửa núi lửa — cũng là nơi hắn ẩn mình khi không dẫn quân ra trận.',
        boss: {
          id: 'hoa-cpt-boss-bao-diem', icon: '👺', name: 'Trại Chủ "Cuồng Phong" Bạo Diễm Ma Quân',
          tier: 'legendary', hp: 340, attack: 36, defense: 23,
          skillName: 'Tuyệt Thế Cuồng Phong Diễm Kiếp', skillMult: 1.9, skillChance: .38,
          linhThachReward: 160,
          backstory: 'Từng là đại tướng triều đình trấn giữ biên ải lửa, hắn đốt cháy chính đội quân của mình trong một trận thua để chiếm đoạt bí kíp Phong Diễm cấm truyền, rồi trốn vào núi lửa lập trại xưng vương — nay tự gọi mình là "Ma Quân", không còn ai dám gọi tên thật của hắn.',
        },
      },

      thap: {
        description: 'Tháp Cuồng Phong Diễm Ngục — một cột đá nham thạch mọc thẳng từ miệng núi lửa, gió lốc cuốn quanh thân tháp không ngừng; mỗi tầng cao hơn là một "cơn bão lửa" độc lập trại chủ dựng lên để thử thách kẻ dám tìm đến hang của hắn.',
      },

      khuDanCu: {
        shopkeeper: {
          name: 'Lão Rèn Trại',
          dialogues: [
            'Rượu Cuồng Phong này uống vào bốc lửa trong người thật, nhưng chỉ được một trận thôi — đừng mơ nó thay được năm tháng khổ luyện.',
            'Ngươi trả Linh Thạch, ta bán đồ tiêu hao. Sức mạnh thật sự thì phải tự đi mà luyện, ta không bán được thứ đó.',
          ],
        },
        caiTrangSu: {
          name: 'Cải Trang Sư Tro Tàn',
          dialogues: [
            'Áo Choàng Tro Tàn này ta lấy cảm hứng từ chính đám tro trại chủ để lại sau mỗi trận — chỉ để ngầu thôi, không giúp ngươi đánh mạnh hơn đâu.',
            'Cờ Lệnh Trại Chủ giả này treo lên cho oách vậy thôi, treo thật thì trại chủ thật chém đầu ngươi đấy.',
          ],
        },
        items: [
          {
            id: 'hoa-cpt-item-ruou-cuong-phong', name: 'Rượu Cuồng Phong', cost: 90, currency: 'linh-thach',
            type: 'buff', effect: 'Buff tạm thời: +8% sát thương trong 10 phút thực cho trận kế tiếp, không cộng chỉ số vĩnh viễn.',
          },
          {
            id: 'hoa-cpt-item-bua-khang-hoa', name: 'Bùa Kháng Hoả Tạm Thời', cost: 100, currency: 'linh-thach',
            type: 'consumable', effect: 'Tiêu hao một lần: hồi một phần HP trước trận, hiệu lực chỉ dùng được đúng một lần.',
          },
          {
            id: 'hoa-cpt-item-ao-tro-tan', name: 'Áo Choàng Tro Tàn', cost: 220, currency: 'danh-vong',
            type: 'cosmetic', effect: 'Trang phục hiếm chỉ đổi ngoại hình — không cộng bất kỳ chỉ số chiến đấu nào.',
          },
          {
            id: 'hoa-cpt-item-co-lenh', name: 'Cờ Lệnh Trại Chủ (Giả)', cost: 180, currency: 'danh-vong',
            type: 'cosmetic', effect: 'Phụ kiện trang trí cắm sau lưng nhân vật — thuần hình ảnh, không ảnh hưởng combat.',
          },
        ],
      },

      khuLuyenCong: {
        description: 'Bãi tập giữa gió lốc và hơi nóng núi lửa, nơi lính trại thử gan bằng cách đứng vững qua từng đợt gió lửa — một thử thách giữ nhịp ngắn, không phải một hệ thống luyện công thật.',
      },
    },
  ],
};
