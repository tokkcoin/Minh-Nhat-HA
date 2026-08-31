/* ============================================================
   Life Balance — data/gameMapContentThuy.js
   Game content data for Thuỷ Châu ("Huyền Thuỷ Đại Lục", the Water
   element continent) and its 3 Huyện, for the game-wulin.html world
   map system. See GAME_MAP_ROADMAP.md at the repo root for the full
   vision (5-Châu/3-Huyện/5-khu-vực structure, the Linh Thạch/Điểm
   Danh Vọng economy, and the bronze->legendary per-Huyện difficulty
   tiers) — this file is content only, built to that spec's Phase
   C/D naming (D6-D8 in the roadmap's phase checklist covers this
   Châu's 3 Huyện: Vân Thuỷ Trấn, Đông Hải Cảng, Bích Ba Cốc).

   Loaded as a plain global (no ES modules/build step), same
   script-tag convention as this repo's other data/*.js files (see
   .claude/rules/tech-defaults.md) — any page that needs it must add
   its own <script src="data/gameMapContentThuy.js"> tag.

   Monster/boss field shape mirrors js/game-wulin.js's existing
   WULIN_MONSTERS array (icon/hp/attack/defense/skillName/skillMult/
   skillChance/reward) so this data can be merged straight into that
   combat system per-Huyện without reshaping it. Baseline player
   stats with zero real Five Elements data are WULIN_BASE in
   js/game-wulin.js: hp 80, attack 12, defense 8, skillPower 15,
   crit 5%, evasion 5% — Vân Thuỷ Trấn's monsters are tuned to be
   beatable at that exact baseline, per the roadmap's difficulty
   table ("1st Huyện: beatable with baseline (no-real-data) stats").

   Difficulty tiers reuse the game's existing bronze/silver/gold/
   epic/legendary rarity language (js/elementStats.js's
   ELEMENT_STAR_TIERS, also used by js/weaponPrototype.js) —
   `tierLabels` on each Huyện below gives the matching in-world
   Vietnamese label (Sơ cấp/Rèn luyện/Thành thạo/Tinh anh/Huyền
   thoại) that Phase B's map menu already displays elsewhere.

   HARD ECONOMY RULE (see roadmap "Economy & progression"): every
   shopItems entry below is cosmetic, a consumable, or a short
   (minutes-scale) buff — NEVER a permanent stat increase. Each
   entry's `effect` field states in plain language which of those
   three buckets it is, specifically so a future reviewer can grep
   this file and confirm the rule was never violated.
   ============================================================ */

'use strict';

const GAME_MAP_CONTENT_THUY = {
  chau: {
    key: 'thuy',
    name: 'Huyền Thuỷ Đại Lục',
    element: 'thuy',
    tagline: 'Đại lục sông ngòi, hải cảng và vực sâu bí ẩn — nơi Thuỷ khí uốn lượn khắp ba huyện, từ bến sông sương mù tới đáy vực rồng ngủ.',
  },

  huyen: {
    // ── 1st Huyện — bronze/silver — beatable at zero-real-data baseline ──
    vanThuyTran: {
      key: 'van-thuy-tran',
      name: 'Vân Thuỷ Trấn',
      order: 1,
      tier: ['bronze', 'silver'],
      tierLabels: ['Sơ cấp', 'Rèn luyện'],
      description: 'Trấn nhỏ ven sông quanh năm phủ sương, nơi thuyền buôn và dân chài sống chung với những oan hồn dưới nước.',

      khuDanhQuai: {
        monsters: [
          {
            id: 'vtt-river-pirate', icon: '🏴‍☠️', name: 'Ngư Tặc Sông Vân',
            hp: 55, attack: 8, defense: 3,
            skillName: 'Móc Câu Phá Giáp', skillMult: 1.3, skillChance: .2, reward: 15,
            flavor: 'Toán cướp sông chuyên phục kích thuyền buôn trong màn sương dày, dùng móc câu kéo người ngã xuống nước rồi lột sạch hành lý.',
          },
          {
            id: 'vtt-moss-beast', icon: '🐊', name: 'Thuỷ Quái Rêu Xanh',
            hp: 65, attack: 7, defense: 5,
            skillName: 'Quấn Rêu Trầm Thuỷ', skillMult: 1.4, skillChance: .22, reward: 18,
            flavor: 'Sinh vật da phủ đầy rêu ẩn dưới các cột bến thuyền, im lìm hàng giờ trước khi bất ngờ quật đuôi kéo khách bộ hành xuống dòng nước đục.',
          },
          {
            id: 'vtt-cursed-fisherman', icon: '🎣', name: 'Ngư Phu Trúng Tà',
            hp: 60, attack: 10, defense: 4,
            skillName: 'Lưới Âm Hàn', skillMult: 1.4, skillChance: .25, reward: 20,
            flavor: 'Người đánh cá năm xưa chết đuối trong một cơn lũ, oán khí nhập vào tấm lưới cũ, nay vẫn lang thang quăng lưới bắt cả người sống lẫn kẻ qua đường.',
          },
          {
            id: 'vtt-white-fish-spirit', icon: '🐟', name: 'Bạch Ngư Tinh',
            hp: 70, attack: 9, defense: 5,
            skillName: 'Vòng Xoáy Dụ Hồn', skillMult: 1.5, skillChance: .25, reward: 22,
            flavor: 'Linh hồn cá trắng tu luyện trăm năm dưới đáy sông, thích trêu ghẹo lữ khách bằng ánh sáng lấp lánh rồi dẫn dụ họ lạc vào vùng nước xoáy.',
          },
          {
            id: 'vtt-dock-wraith', icon: '👻', name: 'Sương Hồn Bến Đò',
            hp: 75, attack: 11, defense: 5,
            skillName: 'Sương Lạnh Nhập Cốt', skillMult: 1.5, skillChance: .28, reward: 25,
            flavor: 'Bóng người mờ ảo hiện ra mỗi lúc sương dày đặc nhất trên bến đò cũ, được đồn là hồn của những hành khách chưa kịp lên chuyến thuyền cuối.',
          },
        ],
      },

      hangDong: {
        boss: {
          id: 'vtt-boss-bach-lang-dao', icon: '🗡️', name: 'Thuỷ Tặc Vương — Bạch Lãng Đao',
          hp: 200, attack: 17, defense: 10,
          skillName: 'Bạch Lãng Trảm', skillMult: 1.6, skillChance: .3,
          rewardLinhThach: 90, cosmeticSkinChance: .15,
          backstory: 'Từng là tiêu sư hộ tống hàng hoá danh tiếng khắp Vân Thuỷ Trấn, bị chính đồng môn phản bội cướp hết lộ phí giữa dòng sông. Ôm hận sống lại giữa xác thuyền đắm, nay cầm đầu đám cướp sông trấn giữ khúc sông sương mù, không tha bất kỳ ai đi ngang qua lãnh địa cũ của mình.',
        },
        clearLimitNote: 'Once-per-real-day clear (localStorage last-clear timestamp, same pattern as js/dailyTasks.js) per roadmap spec.',
      },

      thap: {
        theme: 'Tháp Vọng Thuỷ dựng ngay bên bến sông chính của Vân Thuỷ Trấn, mỗi tầng là một lớp sương dày hơn tầng trước — càng lên cao, oan hồn sông nước càng đậm đặc và dữ tợn, như thể người leo tháp đang lội ngược dòng thời gian về đêm lũ đã sinh ra chúng.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'vtt-cloak-skin', name: 'Áo Choàng Sương Sông', cost: 150, currency: 'linh-thach',
            effect: 'Cosmetic — chỉ đổi hình dạng áo choàng nhân vật, không cộng chỉ số.',
          },
          {
            id: 'vtt-ginger-tea', name: 'Bình Trà Gừng Ấm', cost: 40, currency: 'linh-thach',
            effect: 'Consumable — hồi một phần máu trước trận kế tiếp, dùng một lần rồi hết.',
          },
          {
            id: 'vtt-evasion-talisman', name: 'Phù Né Sương Mỏng', cost: 60, currency: 'linh-thach',
            effect: 'Short buff — +5% né tránh trong 10 phút thực, không phải chỉ số vĩnh viễn.',
          },
          {
            id: 'vtt-title-hermit', name: 'Danh Hiệu "Ẩn Sĩ Sông Vân"', cost: 80, currency: 'danh-vong',
            effect: 'Cosmetic — danh hiệu hiển thị cạnh tên nhân vật, không cộng chỉ số.',
          },
        ],
        shopkeeperDialogue: [
          'Khách quan ghé bến, có cần chút gì hong bụng trước khi ra sông không? Trà gừng của lão pha đặc lắm đấy.',
          'Sông Vân đêm nay sương dày hơn mọi khi, mua thêm cái áo choàng che mắt bọn thuỷ quái cho chắc.',
        ],
        caiTrangSuDialogue: [
          'Ta là Cải Trang Sư đây, chuyên đổi diện mạo cho những ai muốn giấu mình khỏi tà khí trên sông — nhưng chỉ đổi vẻ ngoài thôi, võ công của ngươi vẫn phải tự luyện.',
          'Danh Vọng ngươi tích được từ trên Tháp, đổi lấy một danh hiệu ở đây cũng xứng đáng lắm chứ.',
        ],
      },

      khuLuyenCong: {
        flavor: 'Bến tập ven sông nơi đệ tử tập chèo thuyền ngược dòng nước xiết và vung quyền theo nhịp sóng vỗ mạn thuyền để rèn phản xạ trước khi ra trận.',
      },
    },

    // ── 2nd Huyện — silver/gold — expects some real progress ──
    dongHaiCang: {
      key: 'dong-hai-cang',
      name: 'Đông Hải Cảng',
      order: 2,
      tier: ['silver', 'gold'],
      tierLabels: ['Rèn luyện', 'Thành thạo'],
      description: 'Hải cảng sầm uất nơi Thuỷ khí giao thoa với biển cả, thương thuyền tấp nập ban ngày nhưng đêm về là địa bàn của hải tặc và yêu quái biển sâu.',

      khuDanhQuai: {
        monsters: [
          {
            id: 'dhc-sea-pirate', icon: '⚓', name: 'Hải Tặc Cảng Đông',
            hp: 100, attack: 15, defense: 8,
            skillName: 'Neo Sắt Trấn Áp', skillMult: 1.5, skillChance: .28, reward: 38,
            flavor: 'Băng cướp biển khét tiếng dọc bờ Đông Hải, dùng neo sắt nặng như búa tạ đập tan thuyền nhỏ trước khi tràn lên cướp hàng.',
          },
          {
            id: 'dhc-crab-demon', icon: '🦀', name: 'Cự Giải Yêu',
            hp: 130, attack: 16, defense: 12,
            skillName: 'Song Kẹp Nghiền Xương', skillMult: 1.5, skillChance: .3, reward: 42,
            flavor: 'Loài cua khổng lồ nhiễm yêu khí từ đáy cảng, vỏ cứng như thành đá, chỉ chờ thương thuyền neo đậu ban đêm để bò lên phá hoại.',
          },
          {
            id: 'dhc-dark-siren', icon: '🧜', name: 'Nhân Ngư Hắc Ám',
            hp: 110, attack: 18, defense: 9,
            skillName: 'Tiếng Hát Mê Hoặc', skillMult: 1.6, skillChance: .32, reward: 45,
            flavor: 'Từng là nàng tiên cá hiền lành sống gần rạn san hô, sau một trận bão dữ nhiễm hắc khí biển sâu, tiếng hát mê hoặc nay chỉ để dẫn thuỷ thủ vào chỗ chết.',
          },
          {
            id: 'dhc-orca-spirit', icon: '🐋', name: 'Kình Ngư Tinh',
            hp: 150, attack: 20, defense: 11,
            skillName: 'Sóng Thần Áp Đảo', skillMult: 1.6, skillChance: .32, reward: 50,
            flavor: 'Linh hồn cá kình khổng lồ trấn giữ luồng lạch chính ra vào cảng, chỉ cần một cú quẫy đuôi cũng đủ lật úp thuyền đánh cá.',
          },
          {
            id: 'dhc-ghost-sailor', icon: '💀', name: 'Thuỷ Thủ Ma Đông Hải',
            hp: 120, attack: 17, defense: 10,
            skillName: 'Đao Rỉ Sét', skillMult: 1.5, skillChance: .3, reward: 40,
            flavor: 'Đoàn thuỷ thủ chết chìm trong trận hải chiến năm xưa, nay vẫn lặng lẽ tuần tra bến cảng cũ, tấn công bất kỳ ai bén mảng vào xác tàu đắm của họ.',
          },
        ],
      },

      hangDong: {
        boss: {
          id: 'dhc-boss-ngao-ba', icon: '🐲', name: 'Hắc Giáp Long Vương — Ngao Bá',
          hp: 320, attack: 26, defense: 18,
          skillName: 'Hắc Triều Cuồng Nộ', skillMult: 1.7, skillChance: .32,
          rewardLinhThach: 160, cosmeticSkinChance: .2,
          backstory: 'Nguyên là thuỷ sư trấn giữ Đông Hải Cảng, bị hạm đội của chính mình phản bội nhấn chìm giữa cơn bão lớn. Oán khí hoà cùng long khí biển sâu hồi sinh thành hắc long, nay cai quản toàn bộ đường dây buôn lậu ngầm dưới đáy cảng, trừng trị bất cứ ai dám dò xét lãnh địa của hắn.',
        },
        clearLimitNote: 'Once-per-real-day clear (localStorage last-clear timestamp, same pattern as js/dailyTasks.js) per roadmap spec.',
      },

      thap: {
        theme: 'Tháp Phong Ba mọc thẳng từ mép cầu cảng, thân tháp lắc lư theo từng đợt sóng — mỗi tầng mô phỏng một cấp độ bão biển, từ gió nhẹ ngoài khơi cho tới cuồng phong nơi những linh vật biển sâu dữ tợn nhất trú ngụ.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'dhc-sailor-cloak-skin', name: 'Áo Choàng Thuỷ Thủ Viễn Dương', cost: 220, currency: 'linh-thach',
            effect: 'Cosmetic — bộ trang phục ngoại hình mới, không cộng chỉ số.',
          },
          {
            id: 'dhc-lighthouse-liquor', name: 'Rượu Hải Đăng Ấm Bụng', cost: 55, currency: 'linh-thach',
            effect: 'Consumable — hồi máu trước trận kế tiếp, dùng một lần rồi hết.',
          },
          {
            id: 'dhc-crit-talisman', name: 'Phù Chí Mạng Sóng Ngầm', cost: 90, currency: 'linh-thach',
            effect: 'Short buff — +8% chí mạng cho 5 trận kế tiếp hoặc 15 phút thực (tuỳ điều kiện đến trước), không phải chỉ số vĩnh viễn.',
          },
          {
            id: 'dhc-title-captain', name: 'Danh Hiệu "Thuyền Trưởng Đông Hải"', cost: 150, currency: 'danh-vong',
            effect: 'Cosmetic — danh hiệu hiển thị cạnh tên nhân vật, không cộng chỉ số.',
          },
        ],
        shopkeeperDialogue: [
          'Cảng Đông này không thiếu hàng lạ đâu, khách cứ xem thoải mái — rượu hải đăng ta ủ ba năm, uống vào ấm bụng cả đêm bão.',
          'Đi săn Cự Giải Yêu về chắc rủng rỉnh Linh Thạch rồi, đổi ngay bộ áo thuỷ thủ này cho ra dáng dân biển thực thụ.',
        ],
        caiTrangSuDialogue: [
          'Ngươi từ Vân Thuỷ Trấn xuôi xuống đây à? Diện mạo cũ không hợp với gió biển Đông Hải đâu, để ta chỉnh lại cho.',
          'Danh Hiệu Thuyền Trưởng chỉ dành cho ai thật sự leo Tháp Phong Ba mà kiếm được Danh Vọng, không phải hàng rẻ tiền.',
        ],
      },

      khuLuyenCong: {
        flavor: 'Sân tập trên cầu tàu gỗ nơi đệ tử phải giữ thăng bằng trên ván trơn giữa sóng vỗ trong lúc luyện quyền, một bài rèn phản xạ quen thuộc của thuỷ thủ Đông Hải Cảng.',
      },
    },

    // ── 3rd Huyện — gold/epic/legendary — meaningful multi-element progress ──
    bichBaCoc: {
      key: 'bich-ba-coc',
      name: 'Bích Ba Cốc',
      order: 3,
      tier: ['gold', 'epic', 'legendary'],
      tierLabels: ['Thành thạo', 'Tinh anh', 'Huyền thoại'],
      description: 'Vực sâu bích ngọc nằm khuất sau Đông Hải Cảng, nơi ánh sáng mặt trời gần như không chạm tới đáy nước và những sinh vật cổ xưa nhất của Thuỷ khí vẫn còn ngủ yên.',

      khuDanhQuai: {
        monsters: [
          {
            id: 'bbc-abyss-shrimp', icon: '🦐', name: 'Hắc Thuỷ Ma Tôm',
            hp: 160, attack: 22, defense: 14,
            skillName: 'Càng Tách Áp Lực Sâu', skillMult: 1.7, skillChance: .32, reward: 62,
            flavor: 'Sinh vật giáp xác khổng lồ quen sống dưới áp lực nước cực sâu, lớp vỏ đen tuyền hấp thụ mọi ánh sáng còn sót lại trong vực Bích Ba.',
          },
          {
            id: 'bbc-jade-serpent', icon: '🐍', name: 'Yêu Xà Cửu Vĩ Bích Ba',
            hp: 210, attack: 28, defense: 18,
            skillName: 'Cửu Vĩ Triền Long', skillMult: 1.8, skillChance: .34, reward: 70,
            flavor: 'Rắn yêu chín đuôi tu luyện ngàn năm trong hang ngọc bích dưới đáy vực, mỗi chiếc đuôi mang một luồng Thuỷ khí riêng, quấn chặt con mồi tới ngạt thở.',
          },
          {
            id: 'bbc-turtle-guardian', icon: '🐢', name: 'Cự Ngao Trấn Cốc',
            hp: 260, attack: 24, defense: 28,
            skillName: 'Mai Rùa Bất Phá', skillMult: 1.6, skillChance: .3, reward: 68,
            flavor: 'Thần thú trấn giữ cửa vào Bích Ba Cốc từ thời khai thiên, mai rùa phủ đầy san hô cổ, được đồn là đã đứng canh nơi này lâu hơn cả những triều đại Ngũ Hành đầu tiên.',
          },
          {
            id: 'bbc-deep-sea-royal', icon: '🐙', name: 'U Linh Hải Vương Tôn',
            hp: 240, attack: 34, defense: 20,
            skillName: 'Xúc Tu Vực Thẳm', skillMult: 1.9, skillChance: .36, reward: 78,
            flavor: 'Hậu duệ hoàng tộc biển sâu bị lưu đày xuống vực tối sau một cuộc tranh quyền, tám xúc tu của nó vươn dài như muốn kéo cả ánh sáng còn sót lại xuống bóng tối.',
          },
          {
            id: 'bbc-frozen-elemental', icon: '❄️', name: 'Băng Thuỷ Tinh Linh',
            hp: 220, attack: 30, defense: 16,
            skillName: 'Đóng Băng Vực Sâu', skillMult: 1.8, skillChance: .34, reward: 74,
            flavor: 'Nguyên tố nước đóng băng vĩnh cửu hình thành nơi dòng hải lưu lạnh nhất hội tụ, chạm vào lớp băng của nó là cảm nhận ngay cái lạnh của đáy vực ngàn năm.',
          },
        ],
      },

      hangDong: {
        boss: {
          id: 'bbc-boss-ngao-thien-cuu', icon: '🐉', name: 'Bích Hải Thần Long — Ngao Thiên Cửu',
          hp: 500, attack: 45, defense: 30,
          skillName: 'Cửu Thiên Hải Triều Quyết', skillMult: 2.0, skillChance: .35,
          rewardLinhThach: 260, cosmeticSkinChance: .25,
          backstory: 'Thần long cổ xưa từng thống trị toàn bộ vùng biển phía đông, bị liên minh các kiếm phái Kim Châu phong ấn dưới đáy Bích Ba Cốc sau một trận đại chiến long trời lở đất cách đây ngàn năm. Linh khí Thuỷ nguyên tố tích tụ suốt bao thế kỷ nay đã đủ để phong ấn rạn nứt — thần long dần tỉnh giấc, và mỗi trận rung chuyển đáy vực là một lời cảnh báo cho những ai dám bước vào lãnh địa của nó.',
        },
        clearLimitNote: 'Once-per-real-day clear (localStorage last-clear timestamp, same pattern as js/dailyTasks.js) per roadmap spec.',
      },

      thap: {
        theme: 'Tháp Trấn Hải xuyên thẳng xuống lòng vực Bích Ba, tầng thấp còn le lói ánh bích ngọc phản chiếu từ vách đá nhưng càng xuống sâu càng chìm trong bóng tối tuyệt đối — nơi trú ngụ của những linh thể Thuỷ nguyên tố mạnh nhất toàn cõi Ngũ Hành Giang Hồ, thử thách bậc cao thủ đã tôi luyện đủ cả năm hành.',
      },

      khuDanCu: {
        shopItems: [
          {
            id: 'bbc-dragon-armor-skin', name: 'Bộ Giáp Rồng Biếc', cost: 400, currency: 'linh-thach',
            effect: 'Cosmetic — bộ giáp ngoại hình cao cấp, không cộng chỉ số.',
          },
          {
            id: 'bbc-deep-sea-pill', name: 'Đan Dược Hồi Phục Thâm Hải', cost: 80, currency: 'linh-thach',
            effect: 'Consumable — hồi phần lớn máu trước trận kế tiếp, dùng một lần rồi hết.',
          },
          {
            id: 'bbc-attack-talisman', name: 'Phù Cường Hoá "Long Khí"', cost: 130, currency: 'linh-thach',
            effect: 'Short buff — +10% công kích cho 3 trận kế tiếp hoặc 10 phút thực (tuỳ điều kiện đến trước), không phải chỉ số vĩnh viễn.',
          },
          {
            id: 'bbc-title-lord', name: 'Danh Hiệu "Chúa Tể Bích Ba"', cost: 300, currency: 'danh-vong',
            effect: 'Cosmetic — danh hiệu hiếm hiển thị cạnh tên nhân vật, không cộng chỉ số.',
          },
        ],
        shopkeeperDialogue: [
          'Xuống tới tận Bích Ba Cốc rồi à? Hàng ta bán ở đây toàn thứ quý hiếm, không phải ai cũng đủ Linh Thạch mà đổi đâu.',
          'Đan dược thâm hải này chiết xuất từ rong biển mọc sát vách phong ấn thần long — mạnh, nhưng cũng chỉ để dùng một lần thôi đấy.',
        ],
        caiTrangSuDialogue: [
          'Đến được đây nghĩa là ngũ hành trong người ngươi đã tôi luyện không ít — xứng đáng khoác lên mình bộ giáp biếc này.',
          'Danh Hiệu Chúa Tể Bích Ba ta chỉ trao cho ai thật sự đứng vững trước Ngao Thiên Cửu ở Tháp Trấn Hải, không có đường tắt nào cả.',
        ],
      },

      khuLuyenCong: {
        flavor: 'Vòng luyện công dựng ngay bên miệng vực, nơi đệ tử phải giữ tư thế đứng tấn giữa luồng khí lạnh phả ra từ đáy sâu để hun đúc tâm cảnh trước khi đối mặt với những linh thể mạnh nhất Bích Ba Cốc.',
      },
    },
  },
};
