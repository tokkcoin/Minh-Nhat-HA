/* ============================================================
   Life Balance — data/gameMapContentMoc.js
   Game content data for Mộc Châu ("Thanh Mộc Đại Lục", the Wood
   element continent) and its 3 Huyện, for game-wulin.html's world
   map system. See GAME_MAP_ROADMAP.md at the repo root for the full
   vision this feeds:
     - "Naming" section — Châu/Huyện names used below match exactly.
     - "Economy & progression" section — the two currencies
       (Linh Thạch / Điểm Danh Vọng) and the hard rule that neither
       ever buys permanent stat power, only cosmetics/consumables/
       short buffs. Every shop item below is one of those three kinds
       and says so in its own `effectVi` text.
     - "Difficulty tiers per Huyện" table — Lục Trúc Trang is
       bronze/silver, Bách Thảo Cốc is silver/gold, Sơn Lâm Trấn is
       gold/epic/legendary, same tier keys/labels js/elementStats.js's
       ELEMENT_STAR_TIERS and js/weaponPrototype.js already use
       (bronze="Sơ cấp", silver="Rèn luyện", gold="Thành thạo",
       epic="Tinh anh", legendary="Huyền thoại").
     - "Khu vực mechanics" section — one entry below per khu vực
       (Khu đánh quái / Hang động / Tháp / Khu dân cư / Khu luyện
       công) for each of the 3 Huyện.

   Monster/boss field shape intentionally mirrors js/game-wulin.js's
   existing `WULIN_MONSTERS` entries (id/icon/name/hp/attack/defense/
   skillName/skillMult/skillChance) so this data can be wired into
   the same combat screen later without a reshape — plus extra fields
   this roadmap phase needs that WULIN_MONSTERS didn't (tierKey/
   tierLabel, linhThachReward, buffDropChance/cosmeticDropChance,
   flavorVi/backstoryVi) that a future Phase C/D session can read
   when building Mộc Châu's real per-Huyện maps.

   Loaded as a plain global per tech-defaults.md's "Data File
   Convention" (window.X, NOT a top-level const/let — a classic
   script's top-level const does not attach to `window`, so any code
   checking `window.GAME_MAP_CONTENT_MOC` elsewhere would silently see
   `undefined` even though this file loaded with no error) — add
   <script src="data/gameMapContentMoc.js"></script> before any script
   that reads window.GAME_MAP_CONTENT_MOC.
   ============================================================ */

window.GAME_MAP_CONTENT_MOC = {
  chauKey: 'wood',
  chauName: 'Thanh Mộc Đại Lục',

  huyen: {

    // ── Huyện 1/3 — bronze/silver (1st Huyện: beatable with baseline,
    // no-real-data player stats per the roadmap's difficulty table) ──
    'luc-truc-trang': {
      name: 'Lục Trúc Trang',
      tierKey: ['bronze', 'silver'],
      tierLabel: 'Sơ cấp · Rèn luyện',

      khuDanhQuai: {
        monsters: [
          {
            id: 'truc-nhi-dao', icon: '🥷', name: 'Trúc Nhị Đạo',
            tierKey: 'bronze', tierLabel: 'Sơ cấp',
            hp: 55, attack: 7, defense: 3,
            skillName: 'Song Đao Phá Trúc', skillMult: 1.3, skillChance: .2,
            linhThachReward: 8, buffDropChance: .05,
            flavorVi: 'Tên trộm vặt ẩn mình sau rặng trúc, chuyên rạch túi khách qua đường rồi biến mất như gió thổi qua lá.',
          },
          {
            id: 'truc-meo-tinh', icon: '🐈‍⬛', name: 'Trúc Miêu Tinh',
            tierKey: 'bronze', tierLabel: 'Sơ cấp',
            hp: 50, attack: 6, defense: 4,
            skillName: 'Trảo Ảnh Ly Ba', skillMult: 1.25, skillChance: .22,
            linhThachReward: 7, buffDropChance: .06,
            flavorVi: 'Linh miêu sinh ra từ khóm trúc ngàn năm, thích đùa giỡn với ánh trăng hơn là gây hại — nhưng móng vuốt của nó vẫn rất đau.',
          },
          {
            id: 'da-tru-truc-lam', icon: '🐗', name: 'Dã Trư Rừng Trúc',
            tierKey: 'silver', tierLabel: 'Rèn luyện',
            hp: 95, attack: 12, defense: 7,
            skillName: 'Cuồng Húc Phá Trận', skillMult: 1.5, skillChance: .28,
            linhThachReward: 18, buffDropChance: .08,
            flavorVi: 'Heo rừng khổng lồ nhiễm linh khí Mộc, húc đổ cả bụi trúc dày đặc để bảo vệ lãnh địa của mình.',
          },
          {
            id: 'lac-thao-dao-nhan', icon: '🧙', name: 'Lạc Thảo Đạo Nhân',
            tierKey: 'silver', tierLabel: 'Rèn luyện',
            hp: 100, attack: 13, defense: 6,
            skillName: 'Độc Thảo Phấn Vũ', skillMult: 1.5, skillChance: .3,
            linhThachReward: 20, buffDropChance: .09,
            flavorVi: 'Đạo sĩ hái thuốc bị tẩu hỏa nhập ma sau khi luyện sai công pháp Mộc hệ, nay lang thang rải phấn cỏ dại gây hại khắp trang viện.',
          },
        ],
      },

      hangDong: {
        dungeonName: 'Trúc Ẩn Động',
        boss: {
          id: 'boss-diep-thanh-phong', icon: '🗡️', name: 'Diệp Thanh Phong',
          tierKey: 'silver', tierLabel: 'Rèn luyện · Thành thạo',
          hp: 220, attack: 18, defense: 12,
          skillName: 'Trúc Kiếm Thất Sát', skillMult: 1.65, skillChance: .32,
          linhThachReward: 70, cosmeticDropChance: .15,
          backstoryVi: 'Từng là đệ tử ưu tú của Thanh Trúc phái, Diệp Thanh Phong trộm bí kíp trấn phái rồi trốn vào rừng trúc sâu; nay cát cứ Trúc Ẩn Động, chiêu mộ đám lâu la canh giữ bí kíp mình đã đánh cắp.',
        },
      },

      thap: {
        themeVi: 'Tháp Trúc Ảnh dựng giữa rừng trúc rậm rạp, mỗi tầng là một khoảng sân nhỏ bao quanh bởi trúc dày đan xen thành mê cung; càng lên cao, trúc càng già và linh khí Mộc càng đậm đặc, sản sinh ra những bóng ma trúc và đệ tử phản bội canh giữ từng bậc thang, thử thách người leo tháp bằng tốc độ và sự kiên nhẫn thay vì sức mạnh thô.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'item-non-la-truc', name: 'Nón Lá Trúc Thanh Nhã',
            cost: 40, currency: 'linh-thach', kind: 'cosmetic',
            effectVi: 'Trang bị ngoại hình nón lá đan từ trúc xanh — thuần cosmetic, không cộng bất kỳ chỉ số nào.',
          },
          {
            id: 'item-thuoc-hoi-khi-truc', name: 'Thuốc Hồi Khí Trúc Diệp',
            cost: 15, currency: 'linh-thach', kind: 'consumable',
            effectVi: 'Hồi 20% HP ngay khi dùng trong trận — vật phẩm tiêu hao dùng một lần, không tăng chỉ số vĩnh viễn.',
          },
          {
            id: 'item-bua-truc-anh', name: 'Bùa Trúc Ảnh Thân Pháp',
            cost: 25, currency: 'linh-thach', kind: 'buff',
            effectVi: '+5% né tránh trong 10 phút thực kể từ khi dùng (buff ngắn hạn), tự động hết hiệu lực sau đó.',
          },
          {
            id: 'item-danh-hieu-truc-khach', name: 'Danh Hiệu "Trúc Khách"',
            cost: 30, currency: 'danh-vong', kind: 'cosmetic',
            effectVi: 'Danh hiệu hiển thị cạnh tên nhân vật, đổi bằng Điểm Danh Vọng — thuần trang trí, không ảnh hưởng chỉ số.',
          },
        ],
        shopkeeper: {
          name: 'Lão Trúc',
          dialogueVi: [
            'Ghé vào đi, khách quan! Trúc Trang tuy nhỏ nhưng thứ gì cũng có, toàn đồ trang trí với thuốc bổ thôi, không có thứ gì làm khách quan mạnh lên đâu — muốn mạnh thì phải tự luyện.',
            'Linh Thạch để dành làm gì, mua vài viên thuốc hồi khí phòng thân khi vào hang động ấy!',
          ],
        },
        caiTrangSu: {
          name: 'Tô Y Nương',
          dialogueVi: [
            'Điểm Danh Vọng của công tử/cô nương chắc là leo Tháp Trúc Ảnh mà có đúng không? Ta chỉ đổi được áo đẹp với danh hiệu thôi, sức mạnh thật thì phải tự mình rèn luyện.',
            'Bộ trang phục trúc xanh này may từ tơ trúc hiếm, chỉ để ngắm cho đẹp mắt giang hồ thôi nhé, đừng mong nó giúp đỡ chiêu thức của ngươi.',
          ],
        },
      },

      khuLuyenCong: {
        flavorVi: 'Sân luyện công giữa rừng trúc, nơi đệ tử mới tập né tránh những đốt trúc rơi từ trên cao — hoàn thành bài tập sẽ nhận một luồng khí Mộc nhẹ, tiếp thêm sự nhanh nhẹn trong ít phút.',
      },
    },

    // ── Huyện 2/3 — silver/gold (2nd Huyện: expects some real Five
    // Elements progress per the roadmap's difficulty table) ──
    'bach-thao-coc': {
      name: 'Bách Thảo Cốc',
      tierKey: ['silver', 'gold'],
      tierLabel: 'Rèn luyện · Thành thạo',

      khuDanhQuai: {
        monsters: [
          {
            id: 'doc-thao-trung', icon: '🐛', name: 'Độc Thảo Trùng',
            tierKey: 'silver', tierLabel: 'Rèn luyện',
            hp: 110, attack: 14, defense: 8,
            skillName: 'Phun Nọc Thảo Độc', skillMult: 1.55, skillChance: .3,
            linhThachReward: 25, buffDropChance: .08,
            flavorVi: 'Loài sâu khổng lồ ăn lá độc trong thung lũng, nọc của nó khiến người trúng phải hoa mắt chóng mặt trong chốc lát.',
          },
          {
            id: 'xa-linh-bach-thao', icon: '🐍', name: 'Xà Linh Bách Thảo',
            tierKey: 'silver', tierLabel: 'Rèn luyện',
            hp: 115, attack: 15, defense: 7,
            skillName: 'Miên Độc Nha Phệ', skillMult: 1.55, skillChance: .3,
            linhThachReward: 27, buffDropChance: .09,
            flavorVi: 'Rắn linh sống hàng trăm năm giữa vườn thuốc, hút linh khí Mộc từ hoa cỏ quý để mong một ngày hóa thành hình người.',
          },
          {
            id: 'y-su-loan-tam', icon: '⚕️', name: 'Y Sư Loạn Tâm',
            tierKey: 'gold', tierLabel: 'Thành thạo',
            hp: 165, attack: 19, defense: 14,
            skillName: 'Đoạn Trường Dược Vũ', skillMult: 1.65, skillChance: .32,
            linhThachReward: 45, buffDropChance: .1,
            flavorVi: 'Từng là thần y nổi danh cả vùng; sau khi thân nhân chết vì độc dược không hóa giải nổi, ông ta hóa điên, chuyên dùng độc trút giận lên người qua đường.',
          },
          {
            id: 'ho-diep-doc-vuong', icon: '🦋', name: 'Hồ Điệp Độc Vương',
            tierKey: 'gold', tierLabel: 'Thành thạo',
            hp: 175, attack: 20, defense: 13,
            skillName: 'Thiên Hồ Phấn Vũ', skillMult: 1.7, skillChance: .33,
            linhThachReward: 48, buffDropChance: .11,
            flavorVi: 'Đàn bướm độc khổng lồ hợp thành một thể duy nhất, cánh của chúng rắc ra thứ phấn hoa khiến đối phương tê liệt thần trí trong giây lát.',
          },
        ],
      },

      hangDong: {
        dungeonName: 'Bách Độc Cốc Thâm Xứ',
        boss: {
          id: 'boss-doc-y-tien-sinh', icon: '🌿', name: 'Độc Y Tiên Sinh Cố Bách Thảo',
          tierKey: 'gold', tierLabel: 'Thành thạo · Tinh anh',
          hp: 300, attack: 24, defense: 18,
          skillName: 'Vạn Độc Quy Tông', skillMult: 1.75, skillChance: .35,
          linhThachReward: 110, cosmeticDropChance: .18,
          backstoryVi: 'Người sáng lập Bách Thảo Cốc, từng thề dùng y thuật cứu người; nhưng sau biến cố mất hết đệ tử vì một trận dịch, ông quay sang luyện độc cực đoan, tự giam mình trong hang sâu nhất thung lũng để hoàn thiện "Vạn Độc Quy Tông" — môn độc công có thể khắc chế cả linh khí Mộc.',
        },
      },

      thap: {
        themeVi: 'Tháp Bách Dược mọc lên giữa vườn thuốc cổ, từng tầng phảng phất mùi thảo dược nồng nặc pha lẫn hương độc dịu nhẹ; các bậc thang trồng đầy hoa cỏ lạ, càng lên cao không khí càng ngột ngạt vì linh khí Mộc bị cô đặc thành độc tố, buộc người leo tháp phải cân bằng giữa hít thở linh khí bổ dưỡng và né tránh độc khí ẩn trong từng khóm hoa.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'item-mat-na-thao-duoc', name: 'Mặt Nạ Thảo Dược Bách Thảo',
            cost: 60, currency: 'linh-thach', kind: 'cosmetic',
            effectVi: 'Mặt nạ trang trí hình lá cây phủ sương — thuần ngoại hình, không cộng chỉ số.',
          },
          {
            id: 'item-giai-doc-hoan', name: 'Giải Độc Hoàn Bách Thảo',
            cost: 22, currency: 'linh-thach', kind: 'consumable',
            effectVi: 'Hồi 30% HP và xóa một hiệu ứng bất lợi ngay lập tức — dùng một lần trong trận, không phải chỉ số vĩnh viễn.',
          },
          {
            id: 'item-huong-thao-moc', name: 'Hương Thảo Mộc Tức Thời',
            cost: 35, currency: 'linh-thach', kind: 'buff',
            effectVi: '+8% sát thương chiêu thức cho 3 trận kế tiếp hoặc tối đa 15 phút thực (buff ngắn hạn), hết hiệu lực tự động.',
          },
          {
            id: 'item-danh-hieu-doc-y', name: 'Danh Hiệu "Truyền Nhân Bách Thảo"',
            cost: 50, currency: 'danh-vong', kind: 'cosmetic',
            effectVi: 'Danh hiệu hiếm đổi bằng Điểm Danh Vọng từ Tháp Bách Dược — chỉ để khoe, không tăng sức mạnh thật.',
          },
        ],
        shopkeeper: {
          name: 'Bà Tư Dược',
          dialogueVi: [
            'Cẩn thận nha, ở đây thứ gì cũng có chút độc tính, nhưng ta đảm bảo chỉ trị thương chứ không hại người mua!',
            'Danh hiệu, mặt nạ, hay thuốc bổ — ta bán đủ cả, còn muốn mạnh thật sự thì về luyện ngũ hành cho chăm vào.',
          ],
        },
        caiTrangSu: {
          name: 'Diệp Cô Nương',
          dialogueVi: [
            'Ái chà, Điểm Danh Vọng dồi dào nhỉ, chắc leo Tháp Bách Dược không ít lần rồi. Đổi ngay vài món trang sức thảo mộc nhé?',
            'Ta chỉ khéo tay may áo đẹp thôi, chứ không có phép thuật gì biến người yếu thành mạnh đâu.',
          ],
        },
      },

      khuLuyenCong: {
        flavorVi: 'Bãi luyện công nằm giữa vườn thuốc, đệ tử phải giữ nhịp thở đều khi băng qua luống hoa độc để không hít nhầm phấn hoa — vượt qua thử thách sẽ nhận một hơi thở thanh lọc, tăng nhẹ khả năng né tránh trong ít phút.',
      },
    },

    // ── Huyện 3/3 — gold/epic/legendary (3rd Huyện: expects
    // meaningful real progress across multiple elements) ──
    'son-lam-tran': {
      name: 'Sơn Lâm Trấn',
      tierKey: ['gold', 'epic', 'legendary'],
      tierLabel: 'Thành thạo · Tinh anh · Huyền thoại',

      khuDanhQuai: {
        monsters: [
          {
            id: 'ho-tinh-son-lam', icon: '🐅', name: 'Hổ Tinh Sơn Lâm',
            tierKey: 'gold', tierLabel: 'Thành thạo',
            hp: 190, attack: 22, defense: 16,
            skillName: 'Trảm Phong Trảo Ảnh', skillMult: 1.7, skillChance: .32,
            linhThachReward: 55, buffDropChance: .1,
            flavorVi: 'Chúa sơn lâm hấp thụ linh khí Mộc ngàn năm của núi rừng, gầm lên một tiếng khiến cả cánh rừng rung chuyển.',
          },
          {
            id: 'moc-tinh-co-thu', icon: '🌳', name: 'Mộc Tinh Cổ Thụ',
            tierKey: 'epic', tierLabel: 'Tinh anh',
            hp: 250, attack: 25, defense: 22,
            skillName: 'Căn Miên Phong Tỏa', skillMult: 1.8, skillChance: .35,
            linhThachReward: 80, buffDropChance: .12,
            flavorVi: 'Linh hồn của một cây cổ thụ ngàn năm tuổi hóa thành hình chiến binh gỗ, rễ cây vươn dài trói chặt kẻ dám xâm phạm lãnh địa rừng thiêng.',
          },
          {
            id: 'son-tac-lanh-dien', icon: '🏹', name: 'Sơn Tặc Yêu Đao "Lãnh Diện"',
            tierKey: 'epic', tierLabel: 'Tinh anh',
            hp: 230, attack: 27, defense: 18,
            skillName: 'Loạn Đao Phá Lâm', skillMult: 1.75, skillChance: .34,
            linhThachReward: 78, buffDropChance: .11,
            flavorVi: 'Đầu lĩnh toán cướp khét tiếng vùng Sơn Lâm, lợi dụng địa hình rừng rậm để phục kích cả những cao thủ giang hồ tự phụ nhất.',
          },
          {
            id: 'thanh-long-moc-linh', icon: '🐉', name: 'Thanh Long Mộc Linh',
            tierKey: 'legendary', tierLabel: 'Huyền thoại',
            hp: 320, attack: 32, defense: 26,
            skillName: 'Long Diễm Thanh Mộc', skillMult: 1.9, skillChance: .38,
            linhThachReward: 130, buffDropChance: .15,
            flavorVi: 'Truyền thuyết kể một con rồng nhỏ lạc vào rừng sâu, uống linh khí Mộc suốt trăm năm mà hóa thành nửa rồng nửa cây, thân phủ vảy tựa vỏ cây cổ thụ.',
          },
        ],
      },

      hangDong: {
        dungeonName: 'Vạn Mộc U Cốc',
        boss: {
          id: 'boss-moc-de-quan', icon: '👑', name: 'Mộc Đế Quân Cổ Sơn',
          tierKey: 'legendary', tierLabel: 'Huyền thoại',
          hp: 420, attack: 36, defense: 30,
          skillName: 'Thiên Mộc Quy Nguyên', skillMult: 2.0, skillChance: .4,
          linhThachReward: 200, cosmeticDropChance: .2,
          backstoryVi: 'Tương truyền đây là vị "vua rừng" đầu tiên của Thanh Mộc Đại Lục, tu luyện đến mức hòa làm một với cả cánh rừng nguyên sinh; khi thấy con cháu Ngũ Hành ngày càng xa rời gốc rễ thiên nhiên, ông ẩn mình trong hang sâu nhất Sơn Lâm Trấn, chỉ xuất hiện thử thách những ai đủ can đảm bước vào.',
        },
      },

      thap: {
        themeVi: 'Tháp Vạn Mộc sừng sững giữa rừng nguyên sinh Sơn Lâm Trấn, mỗi tầng tháp bị bao bọc bởi một lớp rễ cây và dây leo cổ xưa siết chặt dần theo độ cao; càng lên cao, ánh mặt trời càng bị tán lá che khuất, buộc người leo tháp đối mặt với những sinh vật rừng sâu chưa từng thấy ánh sáng ban ngày — đỉnh tháp được đồn là nơi Mộc Đế Quân từng tọa thiền hàng trăm năm trước khi biến mất.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'item-ao-choang-la-rung', name: 'Áo Choàng Lá Rừng Nguyên Sinh',
            cost: 90, currency: 'linh-thach', kind: 'cosmetic',
            effectVi: 'Áo choàng dệt từ lá rừng cổ thụ, ngoại hình huyền ảo — không cộng bất kỳ chỉ số nào.',
          },
          {
            id: 'item-dan-duoc-son-lam', name: 'Đan Dược Sơn Lâm Thượng Hạng',
            cost: 30, currency: 'linh-thach', kind: 'consumable',
            effectVi: 'Hồi đầy 100% HP ngay lập tức — vật phẩm tiêu hao dùng một lần cho một trận đấu, không cộng dồn vĩnh viễn.',
          },
          {
            id: 'item-linh-phu-moc-de', name: 'Linh Phù Mộc Đế Ban Phúc',
            cost: 55, currency: 'linh-thach', kind: 'buff',
            effectVi: '+10% công kích trong 15 phút thực kể từ khi dùng (buff ngắn hạn), hết hiệu lực tự động, không phải sức mạnh vĩnh viễn.',
          },
          {
            id: 'item-danh-hieu-chua-te-son-lam', name: 'Danh Hiệu "Chúa Tể Sơn Lâm"',
            cost: 100, currency: 'danh-vong', kind: 'cosmetic',
            effectVi: 'Danh hiệu Điểm Danh Vọng cao cấp nhất Mộc Châu — thuần khoe mẽ trên bảng tên, tuyệt đối không ảnh hưởng chỉ số chiến đấu.',
          },
        ],
        shopkeeper: {
          name: 'Lâm Đại Ca',
          dialogueVi: [
            'Muốn sống sót ở Sơn Lâm Trấn này thì phải có vài món phòng thân, nhưng đừng hòng ta bán cho ngươi sức mạnh thật — thứ đó phải tự mình rèn ở ngoài đời.',
            'Đan dược ta bào chế từ linh dược núi sâu, quý lắm đấy, đừng dùng phí.',
          ],
        },
        caiTrangSu: {
          name: 'Vân Du Khách',
          dialogueVi: [
            'Nghe nói ngươi đã lên đến tầng cao của Tháp Vạn Mộc? Đáng nể đấy, đổi ngay danh hiệu "Chúa Tể Sơn Lâm" để cả giang hồ biết tiếng!',
            'Trang phục lá rừng này chỉ đẹp ngoài da thôi, còn muốn mạnh thật thì phải tự lực cánh sinh.',
          ],
        },
      },

      khuLuyenCong: {
        flavorVi: 'Bãi luyện công nằm sâu trong rừng nguyên sinh, nơi các cao thủ tập giữ thăng bằng trên rễ cây cổ thụ trơn trượt — hoàn thành thử thách sẽ được ban một luồng linh khí Mộc nguyên sơ, tăng nhẹ né tránh trong thời gian ngắn trước trận đấu.',
      },
    },

  },
};
