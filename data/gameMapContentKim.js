/* ============================================================
   Life Balance — data/gameMapContentKim.js
   Game content data for Kim Châu ("Kim Xà Đại Lục", the Metal-element
   continent) in game-wulin.html's world map system. See
   GAME_MAP_ROADMAP.md at the repo root for the full vision — this
   file supplies the real per-Huyện content for that roadmap's Phase
   C (Bạc Kim Trấn) and Phase D1-D2 (Hoàng Kim Cốc, Thiết Huyết
   Thành), i.e. the "khu vực mechanics" section's 5 zones for all 3
   of Kim Châu's Huyện:
     1. Khu đánh quái — wild monster field (this file: `monsters`)
     2. Hang động     — dungeon + one named boss (`hangDong`)
     3. Tháp          — climb tower flavor (`thap`)
     4. Khu dân cư    — shop + 2 NPCs (`khuDanCu`)
     5. Khu luyện công — training-grounds flavor (`khuLuyenCong`)

   Difficulty follows the roadmap's per-Huyện tier table (same
   bronze→legendary language js/elementStats.js's ELEMENT_STAR_TIERS
   and js/weaponPrototype.js already use):
     - Bạc Kim Trấn   (1st Huyện) — bronze/silver — beatable with
       zero real Five Elements data (baseline WULIN_BASE stats from
       js/game-wulin.js: hp 80 / attack 12 / defense 8).
     - Hoàng Kim Cốc  (2nd Huyện) — silver/gold — expects some real
       progress.
     - Thiết Huyết Thành (3rd Huyện) — gold/epic/legendary — expects
       meaningful real progress across multiple elements.
   Monster/boss stat shape (icon/hp/attack/defense/skillName/
   skillMult/skillChance/reward/tier) matches `WULIN_MONSTERS` in
   js/game-wulin.js field-for-field, so this data can be wired
   straight into the existing combat screen (startCombat/
   resolveMonsterTurn/renderMonsterSelect all read those exact field
   names) without a reshape.

   Economy note (see roadmap's "Economy & progression"): every
   `khuDanCu` shop item below is COSMETIC, a CONSUMABLE, or a SHORT
   (minutes-scale) BUFF — never a permanent stat increase. This is a
   hard rule, not a style choice: Linh Thạch/Điểm Danh Vọng must never
   let a player buy their way around real Five Elements progress.

   Loaded as a plain global (window.GAME_MAP_CONTENT_KIM), same
   script-tag convention as every other data/*.js file (see
   tech-defaults.md's "Data File Convention" / data/storyMusic.js) —
   no bundler, no ES modules. Any page that needs it must add its own
   <script src="data/gameMapContentKim.js"> tag.

   Read-only reference data: this file defines content, it does not
   read or write any localStorage key itself.
   ============================================================ */

'use strict';

window.GAME_MAP_CONTENT_KIM = {
  chauKey: 'kim',
  chauName: 'Kim Xà Đại Lục',

  huyen: {

    // ── 1. Bạc Kim Trấn — bronze/silver (Phase C) ──────────────
    bacKimTran: {
      key: 'bac-kim-tran',
      name: 'Bạc Kim Trấn',
      tierKeys: ['bronze', 'silver'],
      tierLabel: 'Sơ cấp / Rèn luyện',

      khuDanhQuai: {
        description:
          'Trấn biên giới của các thợ bạc và lò rèn nhỏ, nơi toán cướp ' +
          'vặt và thú hoang nhiễm khí kim thường quấy nhiễu khách buôn ' +
          'trên quan đạo — độ nguy hiểm thấp, thích hợp cho người mới ' +
          'nhập giang hồ.',
        monsters: [
          {
            id: 'bac-kim-dao-tac-bac-nhan',
            icon: '🗡️',
            name: 'Đạo Tặc Bạc Nhận',
            tier: 'Dễ',
            hp: 50, attack: 8, defense: 3,
            skillName: 'Bạc Nhận Loạn Trảm', skillMult: 1.3, skillChance: .2, reward: 15,
            flavor: 'Toán cướp vặt chuyên rình khách buôn bạc trên quan đạo, đao pháp non nớt nhưng ra tay liều lĩnh.',
          },
          {
            id: 'bac-kim-thiet-giap-khuyen',
            icon: '🐕‍🦺',
            name: 'Thiết Giáp Khuyển',
            tier: 'Dễ',
            hp: 60, attack: 9, defense: 5,
            skillName: 'Cắn Xé Cuồng Nộ', skillMult: 1.3, skillChance: .22, reward: 18,
            flavor: 'Bầy chó canh mỏ bạc bị đám cướp khoác thêm giáp sắt vụn, lao vào cắn xé bất kỳ ai lạ mặt.',
          },
          {
            id: 'bac-kim-tho-ren-tau-hoa',
            icon: '🔨',
            name: 'Thợ Rèn Tẩu Hoả',
            tier: 'Dễ',
            hp: 65, attack: 10, defense: 6,
            skillName: 'Búa Rèn Cuồng Loạn', skillMult: 1.4, skillChance: .25, reward: 20,
            flavor: 'Người thợ rèn tẩu hoả nhập ma vì luyện búa quá độ, nay chỉ còn biết vung búa đập phá mọi thứ trước mặt.',
          },
          {
            id: 'bac-kim-bac-ho-yeu',
            icon: '🦊',
            name: 'Bạc Hồ Yêu',
            tier: 'Dễ',
            hp: 55, attack: 9, defense: 4,
            skillName: 'Ngân Trảo Ảo Ảnh', skillMult: 1.3, skillChance: .22, reward: 17,
            flavor: 'Hồ ly nhiễm khí bạc trong hầm mỏ cổ, lông ánh kim mỗi khi trăng lên, thích trêu ghẹo lữ khách lạc đường.',
          },
          {
            id: 'bac-kim-kim-ti-trung',
            icon: '🪲',
            name: 'Kim Ti Trùng',
            tier: 'Dễ',
            hp: 40, attack: 6, defense: 2,
            skillName: 'Tơ Kim Vướng Chân', skillMult: 1.2, skillChance: .18, reward: 12,
            flavor: 'Loài trùng nhỏ ăn quặng bạc, thân cứng như kim loại, thường bò thành đàn dưới các phiến đá lát đường.',
          },
        ],
      },

      hangDong: {
        name: 'Hầm Mỏ Bạc Bỏ Hoang',
        rewardNote: 'Linh Thạch (khá) + cơ hội rơi skin vũ khí trang trí.',
        boss: {
          id: 'bac-kim-ngan-nha-lao-tac',
          icon: '🦹',
          name: 'Ngân Nha Lão Tặc',
          tier: 'Khó',
          hp: 160, attack: 15, defense: 9,
          skillName: 'Bạc Nhận Toàn Phong', skillMult: 1.5, skillChance: .35, reward: 90,
          backstory:
            'Từng là một kiếm khách bạc kiếm lừng danh trước khi bị trục ' +
            'xuất khỏi môn phái vì trộm bí kíp; nay ẩn thân trong hầm mỏ ' +
            'bỏ hoang, cầm đầu đám đạo tặc và tự xưng "vua không ngai" của Bạc Kim Trấn.',
        },
      },

      thap: {
        name: 'Ngân Kiếm Tháp',
        description:
          'Một ngọn tháp đá cổ dựng ngay rìa trấn, tương truyền mỗi tầng ' +
          'từng là nơi thử thách của một kiếm khách bạc kiếm đã khuất — ' +
          'leo càng cao, hồn kiếm khách gác tầng càng sắc bén, thử thách ' +
          'người mới vào nghề xem có đủ gan để tiến xa hơn hầm mỏ và bãi thú hoang.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'bac-kim-item-ao-choang-bac-anh',
            name: 'Áo Choàng Bạc Ánh',
            cost: 150, currency: 'linh-thach',
            effect: 'Trang phục thời trang (cosmetic) — chỉ đổi giao diện nhân vật, không đổi chỉ số.',
          },
          {
            id: 'bac-kim-item-dan-cuong-kinh-nho',
            name: 'Đan Cường Kình (Nhỏ)',
            cost: 80, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao — tăng 5% công kích trong 3 trận đấu tiếp theo, hết hạn không hoàn lại.',
          },
          {
            id: 'bac-kim-item-binh-hoi-luc',
            name: 'Bình Nội Lực Tốc Hồi',
            cost: 60, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao — hồi một phần sinh lực giữa các trận đấu tại Khu đánh quái.',
          },
          {
            id: 'bac-kim-item-danh-hieu-lu-khach',
            name: 'Danh Hiệu: "Lữ Khách Bạc Kim"',
            cost: 40, currency: 'danh-vong',
            effect: 'Danh hiệu hiển thị (cosmetic) mua bằng Điểm Danh Vọng — không tăng chỉ số chiến đấu.',
          },
        ],
        shopkeeper: {
          name: 'Bà Tư Tạp Hoá',
          dialogue: [
            'Vào xem đi khách quan, hàng của bà Tư toàn đồ tốt, giá mềm mà!',
            'Đan cường kình bà mới luyện đợt trước, dùng thử một trận là biết ngay.',
            'Linh Thạch để dành làm gì, mua ít đồ bồi sức mà đi đánh quái tiếp chứ!',
          ],
        },
        caiTrangSu: {
          name: 'Cải Trang Sư Nhị Lang',
          dialogue: [
            'Danh hiệu này ta chỉ nhận Điểm Danh Vọng thôi, khách quan tích luỹ đủ chưa?',
            'Muốn nổi bật giữa giang hồ, phải có thứ tiền bạc không mua nổi — như danh hiệu này chẳng hạn.',
            'Ta không bán sức mạnh, chỉ bán phong thái. Sức mạnh thật, khách quan phải tự luyện lấy.',
          ],
        },
      },

      khuLuyenCong: {
        description:
          'Bãi luyện công lát đá bạc cũ kỹ sau lò rèn của trấn, nơi các ' +
          'đệ tử mới thường tập vài chiêu khởi động trước khi ra bãi thú hoang.',
      },
    },

    // ── 2. Hoàng Kim Cốc — silver/gold (Phase D1) ──────────────
    hoangKimCoc: {
      key: 'hoang-kim-coc',
      name: 'Hoàng Kim Cốc',
      tierKeys: ['silver', 'gold'],
      tierLabel: 'Rèn luyện / Thành thạo',

      khuDanhQuai: {
        description:
          'Thung lũng mỏ vàng trù phú nhưng đầy tham vọng — nơi thợ luyện ' +
          'kim tha hoá, băng đảng tranh vàng và yêu vật nhiễm kim khí ' +
          'hoàng kim rình rập bất cứ ai bén mảng tới gần các mạch vàng lộ thiên.',
        monsters: [
          {
            id: 'hoang-kim-trao-yeu-miu',
            icon: '🐱',
            name: 'Kim Trảo Yêu Miêu',
            tier: 'Trung bình',
            hp: 100, attack: 14, defense: 8,
            skillName: 'Hoàng Trảo Liên Kích', skillMult: 1.5, skillChance: .28, reward: 40,
            flavor: 'Linh miêu hoá yêu vì nuốt phải bụi vàng trong hang, móng vuốt cứng như kim loại tôi luyện.',
          },
          {
            id: 'hoang-kim-phap-su-luyen-kim',
            icon: '🧙',
            name: 'Pháp Sư Luyện Kim Đoạ Lạc',
            tier: 'Trung bình',
            hp: 115, attack: 16, defense: 9,
            skillName: 'Hoàng Kim Cấm Chú', skillMult: 1.6, skillChance: .3, reward: 45,
            flavor: 'Từng là thuật sĩ luyện kim danh tiếng, sa vào lòng tham vàng bạc đến mức thân xác bắt đầu ánh kim, tâm trí hoá điên.',
          },
          {
            id: 'hoang-kim-dao-tac-bang',
            icon: '💰',
            name: 'Đạo Tặc Hoàng Kim Bang',
            tier: 'Trung bình',
            hp: 105, attack: 15, defense: 8,
            skillName: 'Song Đao Đoạt Kim', skillMult: 1.5, skillChance: .28, reward: 42,
            flavor: 'Băng đảng có tổ chức chuyên cướp đoàn xe chở vàng, mặc giáp mỏng nhẹ để tiện đào tẩu sau mỗi vụ cướp.',
          },
          {
            id: 'hoang-kim-ti-thu-yeu',
            icon: '🕷️',
            name: 'Kim Ti Thù Yêu',
            tier: 'Trung bình',
            hp: 95, attack: 17, defense: 7,
            skillName: 'Lưới Tơ Kim Trói', skillMult: 1.5, skillChance: .3, reward: 40,
            flavor: 'Nhện khổng lồ nhả tơ pha lẫn bụi vàng, giăng lưới óng ánh khắp các đường hầm mỏ để bẫy con mồi.',
          },
          {
            id: 'hoang-kim-cu-yeu-nho',
            icon: '🗿',
            name: 'Hoàng Kim Cự Yêu (nhỏ)',
            tier: 'Khó',
            hp: 130, attack: 18, defense: 12,
            skillName: 'Quyền Kim Cương', skillMult: 1.5, skillChance: .32, reward: 55,
            flavor: 'Tượng canh mỏ bằng hợp kim vàng được thuật sĩ cổ đại yểm linh, nay lang thang phá phách vì mất chủ.',
          },
        ],
      },

      hangDong: {
        name: 'Mạch Vàng Trấn Yêu',
        rewardNote: 'Linh Thạch (lớn) + cơ hội rơi skin vũ khí hiếm.',
        boss: {
          id: 'hoang-kim-ma-ton',
          icon: '👑',
          name: 'Hoàng Kim Ma Tôn',
          tier: 'Khó',
          hp: 300, attack: 27, defense: 17,
          skillName: 'Thôn Kim Đại Pháp', skillMult: 1.6, skillChance: .38, reward: 160,
          backstory:
            'Từng là đốc công khai thác giỏi nhất thung lũng, chết tham ' +
            'lam trong chính mạch vàng mình khai phá và hoá thành oán linh ' +
            'bất tử, nay trấn giữ mạch vàng sâu nhất, nuốt chửng bất kỳ kẻ ' +
            'nào dám bén mảng tới gần kho báu của hắn.',
        },
      },

      thap: {
        name: 'Hoàng Kim Bảo Tháp',
        description:
          'Toà bảo tháp dát vàng nằm giữa thung lũng, mỗi tầng chất đầy ' +
          'thủ vệ hoàng kim được dựng lên để thử lòng tham và ý chí của kẻ ' +
          'leo tháp — càng lên cao, thủ vệ càng hung hãn, như thể chính ' +
          'ngọn tháp cũng bị nhiễm thói tham lam của thung lũng bên dưới.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'hoang-kim-item-giap-tru-trang-tri',
            name: 'Giáp Trụ Hoàng Kim (Trang trí)',
            cost: 320, currency: 'linh-thach',
            effect: 'Bộ giáp trang trí (cosmetic) dát vàng — chỉ đổi giao diện, không cộng chỉ số thật.',
          },
          {
            id: 'hoang-kim-item-dan-bao-kich',
            name: 'Đan Bạo Kích',
            cost: 140, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao — tăng 8% tỉ lệ bạo kích trong 3 trận đấu tiếp theo.',
          },
          {
            id: 'hoang-kim-item-bua-ho-menh',
            name: 'Bùa Hộ Mệnh Ngắn Hạn',
            cost: 130, currency: 'linh-thach',
            effect: 'Buff ngắn hạn — giảm 10% sát thương nhận vào trong 10 phút thực tế kể từ lúc dùng.',
          },
          {
            id: 'hoang-kim-item-danh-hieu-tho-san-vang',
            name: 'Danh Hiệu: "Thợ Săn Vàng"',
            cost: 90, currency: 'danh-vong',
            effect: 'Danh hiệu hiển thị (cosmetic) mua bằng Điểm Danh Vọng — không tăng chỉ số chiến đấu.',
          },
        ],
        shopkeeper: {
          name: 'Lão Kim — Chủ Tiệm Cầm Đồ',
          dialogue: [
            'Cốc này vàng nhiều nhưng người tốt ít, khách quan cẩn thận kẻo bị dòm ngó túi Linh Thạch.',
            'Bùa hộ mệnh này ta yểm kỹ lắm, sát thương giảm hẳn nhưng chỉ có tác dụng chốc lát thôi nhé.',
            'Ta chỉ bán đồ hộ thân với đồ chơi cho vui, chứ sức mạnh thật thì khách quan phải tự luyện.',
          ],
        },
        caiTrangSu: {
          name: 'Cải Trang Sư Kim Nương',
          dialogue: [
            'Danh hiệu "Thợ Săn Vàng" này chỉ dành cho ai thật sự lăn lộn ở Hoàng Kim Cốc, không phải ai cũng có.',
            'Điểm Danh Vọng khó kiếm hơn Linh Thạch, nên thứ đổi được cũng phải xứng đáng hơn.',
            'Ta chỉ khoác lên người khách quan vẻ ngoài lộng lẫy thôi — bản lĩnh thật vẫn phải tự mình rèn giũa.',
          ],
        },
      },

      khuLuyenCong: {
        description:
          'Sân luyện công dựng cạnh miệng mỏ, cát vàng lẫn trong không khí khiến mỗi nhịp thở luyện công đều nặng mùi kim loại.',
      },
    },

    // ── 3. Thiết Huyết Thành — gold/epic/legendary (Phase D2) ──
    thietHuyetThanh: {
      key: 'thiet-huyet-thanh',
      name: 'Thiết Huyết Thành',
      tierKeys: ['gold', 'epic', 'legendary'],
      tierLabel: 'Thành thạo / Tinh anh / Huyền thoại',

      khuDanhQuai: {
        description:
          'Toà thành chiến loạn dựng từ sắt và máu, nơi đội quân của một ' +
          'lãnh chúa phản tặc từng đóng giữ — tường thành lẫn binh khí đều ' +
          'nhuốm khí huyết, đòi hỏi công phu và ý chí thực sự mới dám bước vào.',
        monsters: [
          {
            id: 'thiet-huyet-huyet-giap-binh',
            icon: '🛡️',
            name: 'Huyết Giáp Binh',
            tier: 'Rất khó',
            hp: 190, attack: 24, defense: 15,
            skillName: 'Huyết Giáp Trọng Kích', skillMult: 1.6, skillChance: .32, reward: 90,
            flavor: 'Binh lính khoác giáp nhuộm máu chiến trận cũ, thề trung thành với vị lãnh chúa đã chết từ lâu.',
          },
          {
            id: 'thiet-huyet-thiet-ve-cam-quan',
            icon: '⚔️',
            name: 'Thiết Vệ Cấm Quân',
            tier: 'Rất khó',
            hp: 220, attack: 27, defense: 18,
            skillName: 'Trường Thương Phá Giáp', skillMult: 1.6, skillChance: .34, reward: 100,
            flavor: 'Cấm vệ tinh nhuệ canh giữ nội thành, giáp trụ rèn từ thép đen tuyền, đội hình khép kín không kẽ hở.',
          },
          {
            id: 'thiet-huyet-sat-than-dao-khach',
            icon: '🗡️',
            name: 'Sát Thần Đao Khách',
            tier: 'Rất khó',
            hp: 200, attack: 32, defense: 13,
            skillName: 'Đoạn Hồn Nhất Đao', skillMult: 1.8, skillChance: .36, reward: 95,
            flavor: 'Đao khách lang thang khét tiếng tàn sát không gớm tay, mỗi nhát đao đều mang theo khí sát nồng nặc.',
          },
          {
            id: 'thiet-huyet-thiet-dien-ma-tuong',
            icon: '👹',
            name: 'Thiết Diện Ma Tướng',
            tier: 'Tử chiến',
            hp: 230, attack: 29, defense: 19,
            skillName: 'Thiết Diện Cuồng Chiến', skillMult: 1.7, skillChance: .35, reward: 105,
            flavor: 'Tướng trinh sát đeo mặt nạ sắt để giấu vết sẹo chiến trận, xuất quỷ nhập thần trong sương mù thành trì.',
          },
          {
            id: 'thiet-huyet-huyet-sac-cu-yeu',
            icon: '🐗',
            name: 'Huyết Sắc Cự Yêu',
            tier: 'Tử chiến',
            hp: 250, attack: 33, defense: 21,
            skillName: 'Cuồng Sát Húc Phá', skillMult: 1.7, skillChance: .36, reward: 115,
            flavor: 'Dã thú khổng lồ nhiễm khí huyết chiến trường lâu năm, da thịt cứng như thiết giáp, lao thẳng bất chấp sát thương.',
          },
        ],
      },

      hangDong: {
        name: 'Ngục Tối Thiết Huyết',
        rewardNote: 'Linh Thạch (rất lớn) + cơ hội rơi skin vũ khí huyền thoại.',
        boss: {
          id: 'thiet-huyet-ma-vuong',
          icon: '💀',
          name: 'Thiết Huyết Ma Vương',
          tier: 'Huyền thoại',
          hp: 500, attack: 55, defense: 33,
          skillName: 'Huyết Thiết Cuồng Đao', skillMult: 1.8, skillChance: .4, reward: 400,
          backstory:
            'Từng là đại tướng quân lẫy lừng bị chính triều đình phản bội ' +
            'ngay trên chiến trường; uất hận thấu xương, hắn luyện thân xác ' +
            'hoà cùng thiết khí và máu tươi thành một dạng tồn tại bất tử, ' +
            'chiếm cứ toà thành đổ nát và tự phong làm ma vương thống lĩnh Thiết Huyết Thành.',
        },
      },

      thap: {
        name: 'Huyết Thiết Chiến Tháp',
        description:
          'Ngọn chiến tháp dựng trên nền thành cũ, mỗi tầng tái hiện một ' +
          'đợt tấn công của đội quân ma vương năm xưa — người leo tháp ' +
          'phải đối mặt với hết lớp binh này đến lớp tướng khác, một biểu ' +
          'tượng thử thách dành riêng cho những ai đã dày dạn khắp Kim Xà Đại Lục.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'thiet-huyet-item-chien-bao',
            name: 'Chiến Bào Thiết Huyết (Trang trí)',
            cost: 500, currency: 'linh-thach',
            effect: 'Trang phục chiến bào cosmetic nhuốm sắc thiết huyết — chỉ đổi giao diện, không cộng chỉ số thật.',
          },
          {
            id: 'thiet-huyet-item-dan-cuong-chien',
            name: 'Đan Cuồng Chiến',
            cost: 220, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao — tăng 10% công kích trong 3 trận đấu tiếp theo.',
          },
          {
            id: 'thiet-huyet-item-linh-dan-hoi-huyet',
            name: 'Linh Đan Hồi Huyết',
            cost: 150, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao — hồi phần lớn sinh lực ngay trước một trận đấu ở Hang động/Tháp.',
          },
          {
            id: 'thiet-huyet-item-danh-hieu-chien-than',
            name: 'Danh Hiệu: "Chiến Thần Thiết Huyết"',
            cost: 200, currency: 'danh-vong',
            effect: 'Danh hiệu hiển thị bậc cao (cosmetic) mua bằng Điểm Danh Vọng — không tăng chỉ số chiến đấu.',
          },
        ],
        shopkeeper: {
          name: 'Quản Sự Thành Vệ',
          dialogue: [
            'Thành này từng đổ máu không biết bao lần, khách quan mua đồ hộ thân đi cho chắc.',
            'Đan cuồng chiến chỉ dùng được vài trận thôi, đừng ham mà quên là nó không vĩnh viễn đâu.',
            'Ta chỉ giữ kho hàng, còn sống chết ngoài kia vẫn là do bản lĩnh thật của khách quan.',
          ],
        },
        caiTrangSu: {
          name: 'Cải Trang Sư Thiết Ảnh',
          dialogue: [
            'Danh hiệu "Chiến Thần" này không rẻ, nhưng ai đứng vững được ở Thiết Huyết Thành đều xứng đáng.',
            'Điểm Danh Vọng tích từ Tháp càng cao càng chứng minh bản lĩnh — ta chỉ tưởng thưởng cho đúng người.',
            'Vẻ ngoài oai phong ta có thể cho khách quan ngay, còn sức mạnh thật sự vẫn phải tự chinh chiến mà có.',
          ],
        },
      },

      khuLuyenCong: {
        description:
          'Bãi luyện công nằm giữa quảng trường đổ nát của thành, tiếng binh khí va chạm vọng lại từ những bức tường loang lổ máu cũ.',
      },
    },
  },
};
