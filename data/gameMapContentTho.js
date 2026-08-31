/* ============================================================
   Life Balance — data/gameMapContentTho.js
   Game-content data for Thổ Châu ("Hoàng Thổ Đại Lục", the Earth-
   element continent) and its 3 Huyện, for game-wulin.html's world
   map system. See GAME_MAP_ROADMAP.md at the repo root for the full
   vision this feeds: the 5-Châu/3-Huyện/5-khu-vực structure, the
   Linh Thạch / Điểm Danh Vọng economy (hard rule: neither currency
   ever buys permanent stat power — cosmetics/consumables/short buffs
   only), and the per-Huyện bronze→legendary difficulty tiers also
   used by js/elementStats.js's ELEMENT_STAR_TIERS and
   js/weaponPrototype.js's gear tiers. This file is Phase D12-D14's
   content ("Thổ Châu's 3 Huyện. Completes the full 5-Châu, 15-Huyện
   world.") — data only, no engine/wiring changes.

   Monster field shape intentionally mirrors js/game-wulin.js's
   WULIN_MONSTERS array (id/icon/name/tier/hp/attack/defense/
   skillName/skillMult/skillChance/reward) so this data can be reused
   by the same combat screen with no reshaping. Two fields are added
   on top, additive only:
     rarityTier  — this file's own bronze/silver/gold/epic/legendary
                   key, matching ELEMENT_STAR_TIERS' `key` values, for
                   the map layer's difficulty-tier UI.
     flavor      — one-line Vietnamese flavor text tying the monster
                   to Thổ Châu's earth/mountain/plains theme, shown in
                   the Khu đánh quái node UI (not used by combat math).

   Shape of each Huyện entry:
   {
     name: string,
     tierRange: [rarityTier keys, per the roadmap's difficulty table],
     tierLabel: string,             // Vietnamese label for the map UI
     khuDanhQuai: {                 // Khu đánh quái — wild field
       monsters: [ ...monster shape above... ],
     },
     hangDong: {                    // Hang động — instanced cave/dungeon
       boss: { ...monster shape above..., backstory: string },
     },
     thap: {                        // Tháp — tower
       theme: string,               // one-paragraph flavor description
     },
     khuDanCu: {                    // Khu dân cư — town/shop
       shopkeeper: { name, icon, lines: [string, string] },
       caiTrangSu: { name, icon, lines: [string, string] },
       items: [
         { id, name, icon, cost, currency: 'linh-thach' | 'danh-vong', effect },
       ],
     },
     khuLuyenCong: {                // Khu luyện công — training grounds
       theme: string,               // one-line flavor description
     },
   }
   ============================================================ */

const GAME_MAP_CONTENT_THO = {
  chau: {
    key: 'tho',
    name: 'Hoàng Thổ Đại Lục',
    element: 'earth',
    colorToken: '--earth',
  },

  huyen: {

    // ── 1. Bàn Sơn Thành — bronze/silver, first Huyện of Thổ Châu ──
    'ban-son-thanh': {
      name: 'Bàn Sơn Thành',
      tierRange: ['bronze', 'silver'],
      tierLabel: 'Sơ cấp / Rèn luyện',

      khuDanhQuai: {
        monsters: [
          {
            id: 'tho-bst-luc-bi-tac', icon: '🗡️', name: 'Lục Bì Sơn Tặc', tier: 'Dễ', rarityTier: 'bronze',
            hp: 65, attack: 9, defense: 5, skillName: 'Đao Chém Liều Mạng', skillMult: 1.3,
            skillChance: .22, reward: 15,
            flavor: 'Toán cướp mặc giáp da thô lẩn trong hẻm núi, chuyên chặn đường thương đoàn qua đèo Bàn Sơn.',
          },
          {
            id: 'tho-bst-nham-thach-khuyen', icon: '🐺', name: 'Nham Thạch Khuyển', tier: 'Dễ', rarityTier: 'bronze',
            hp: 85, attack: 11, defense: 6, skillName: 'Cắn Xé Đá Vụn', skillMult: 1.35,
            skillChance: .25, reward: 20,
            flavor: 'Bầy chó đá hoang được luyện từ bụi quặng, da cứng như sỏi, săn theo đàn quanh chân núi.',
          },
          {
            id: 'tho-bst-quang-tinh-so-sinh', icon: '💎', name: 'Quặng Tinh Sơ Sinh', tier: 'Trung bình', rarityTier: 'bronze',
            hp: 100, attack: 13, defense: 8, skillName: 'Đấm Quặng Thô', skillMult: 1.45,
            skillChance: .28, reward: 24,
            flavor: 'Linh khí tụ trong một mạch quặng non vừa hóa hình người, tay chân còn lởm chởm tinh thể chưa mài.',
          },
          {
            id: 'tho-bst-mieu-yeu', icon: '🗿', name: 'Thổ Địa Miếu Yêu', tier: 'Trung bình', rarityTier: 'silver',
            hp: 120, attack: 15, defense: 10, skillName: 'Ấn Quyết Trấn Thổ', skillMult: 1.5,
            skillChance: .3, reward: 28,
            flavor: 'Tượng đá canh miếu Thổ Địa bỏ hoang lâu năm, hấp thụ hương khói tà môn mà cựa mình sống dậy.',
          },
        ],
      },

      hangDong: {
        boss: {
          id: 'tho-bst-boss-hac-nham-ba', icon: '🪨', name: '"Hắc Nham Bá" Sầm Thiết Ngưu', tier: 'Khó', rarityTier: 'silver',
          hp: 220, attack: 21, defense: 15, skillName: 'Bàn Sơn Trấn Địa Chưởng', skillMult: 1.65,
          skillChance: .35, reward: 180,
          backstory: 'Từng là đội trưởng phu mỏ ở Bàn Sơn Thành, Sầm Thiết Ngưu dấy loạn sau khi quan phủ tăng sưu thuế đá quý gấp ba, chiếm hẳn hang đá sâu nhất làm sào huyệt và tự phong "Hắc Nham Bá" — kẻ cai trị mọi tảng đá đen trong dãy núi.',
        },
      },

      thap: {
        theme: 'Tháp Bàn Sơn xoáy quanh một cột đá tự nhiên nhô giữa thành, mỗi tầng là một khoảng sân đá hẹp dần lên đỉnh — càng lên cao, những kẻ trấn giữ càng đậm chất thổ phỉ vùng biên: từ lính gác quèn tay cầm côn gỗ đến các đầu lĩnh nhỏ mang giáp da ghép mảnh đá, thử thách người chơi bằng số đông và đòn bồi liên tục hơn là sức mạnh đơn lẻ.',
      },

      khuDanCu: {
        shopkeeper: {
          name: 'Lão Thạch — Chưởng Quầy Bàn Sơn',
          icon: '🧓',
          lines: [
            'Khách quan mới đến Bàn Sơn Thành à? Đá ở đây rắn nhưng người còn rắn hơn, cẩn thận kẻo lạc vào hang bọn sơn tặc đấy.',
            'Đan dược lão tự luyện từ khoáng tuyền dưới núi, uống vào là hồi ngay sinh lực, không có tác dụng phụ lâu dài đâu mà lo.',
          ],
        },
        caiTrangSu: {
          name: 'Nương Tử Vân — Cải Trang Sư',
          icon: '💃',
          lines: [
            'Danh Vọng của huynh đài đổi được vài món hiếm đấy, tuy chỉ để khoác lên người cho oai thôi, không giúp đánh mạnh hơn đâu nhé.',
            'Khăn trấn sơn này ta thêu tay từ vải Bàn Sơn, đeo vào trông ra dáng hảo hán trấn núi lắm.',
          ],
        },
        items: [
          {
            id: 'tho-bst-item-linh-dan', name: 'Bình Thổ Linh Đan', icon: '🧪', cost: 50, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao: hồi đầy sinh lực trước trận đấu tiếp theo trong Khu đánh quái/Hang động (không cộng chỉ số vĩnh viễn).',
          },
          {
            id: 'tho-bst-item-khan-tran-son', name: 'Khăn Trấn Sơn', icon: '🧣', cost: 80, currency: 'linh-thach',
            effect: 'Trang sức thời trang cho nhân vật — thuần cosmetic, không thay đổi HP/công/thủ.',
          },
          {
            id: 'tho-bst-item-bua-tang-luc', name: 'Bùa Tăng Lực Bàn Sơn', icon: '📜', cost: 120, currency: 'linh-thach',
            effect: 'Buff ngắn hạn: +5% công kích trong 10 phút thực (tự hết hạn, không phải chỉ số vĩnh viễn).',
          },
          {
            id: 'tho-bst-item-danh-hieu', name: 'Danh Hiệu: "Người Trấn Núi"', icon: '🏷️', cost: 30, currency: 'danh-vong',
            effect: 'Danh hiệu hiển thị cạnh tên nhân vật — thuần cosmetic, không ảnh hưởng chiến đấu.',
          },
        ],
      },

      khuLuyenCong: {
        theme: 'Một bãi đất nện cạnh cổng thành nơi các đệ tử tập tấn công bao cát nhồi đá vụn — canh đúng nhịp búa rơi để được một luồng khí thế ngắn ngủi trước khi vào trận.',
      },
    },

    // ── 2. Tuyệt Bích Trấn — silver/gold, 2nd Huyện of Thổ Châu ──
    'tuyet-bich-tran': {
      name: 'Tuyệt Bích Trấn',
      tierRange: ['silver', 'gold'],
      tierLabel: 'Rèn luyện / Thành thạo',

      khuDanhQuai: {
        monsters: [
          {
            id: 'tho-tbt-khoang-no', icon: '⛏️', name: 'Khoáng Nô Biến Dị', tier: 'Trung bình', rarityTier: 'silver',
            hp: 160, attack: 20, defense: 14, skillName: 'Cuốc Xẻng Cuồng Loạn', skillMult: 1.5,
            skillChance: .3, reward: 38,
            flavor: 'Phu mỏ bị bụi quặng hắc thạch ăn mòn tâm trí nhiều năm dưới hầm sâu, nay da thịt hóa đá nham nhở, chỉ còn bản năng đập phá.',
          },
          {
            id: 'tho-tbt-nham-ung-tinh', icon: '🦅', name: 'Nham Ưng Tinh', tier: 'Trung bình', rarityTier: 'silver',
            hp: 190, attack: 24, defense: 16, skillName: 'Trảo Xé Vách Đá', skillMult: 1.55,
            skillChance: .32, reward: 44,
            flavor: 'Ưng đá khổng lồ làm tổ trên đỉnh Tuyệt Bích, đôi cánh phủ vảy khoáng cứng như thép, lượn vòng rình khách qua đường.',
          },
          {
            id: 'tho-tbt-thach-giap-tuong-quan', icon: '🗿', name: 'Thạch Giáp Tướng Quân', tier: 'Khó', rarityTier: 'gold',
            hp: 230, attack: 26, defense: 22, skillName: 'Trấn Thành Nhất Kích', skillMult: 1.6,
            skillChance: .34, reward: 52,
            flavor: 'Pho tượng tướng canh cổng trấn cổ, tạc từ đá vách nguyên khối, bị tà thuật của bọn khai thác mỏ trái phép đánh thức để canh giữ kho báu bị cướp.',
          },
          {
            id: 'tho-tbt-bich-nham-cu-yeu', icon: '🪨', name: 'Bích Nham Cự Yêu', tier: 'Khó', rarityTier: 'gold',
            hp: 260, attack: 30, defense: 24, skillName: 'Lở Đá Tuyệt Bích', skillMult: 1.7,
            skillChance: .35, reward: 58,
            flavor: 'Cả một mảng vách đá tự bong ra thành hình yêu quái khổng lồ, mỗi bước đi làm rung chuyển cả sườn núi Tuyệt Bích.',
          },
        ],
      },

      hangDong: {
        boss: {
          id: 'tho-tbt-boss-thach-vo-tam', icon: '🖤', name: '"Tuyệt Bích Ma Quân" Thạch Vô Tâm', tier: 'Rất khó', rarityTier: 'gold',
          hp: 420, attack: 38, defense: 30, skillName: 'Hắc Ngọc Toái Tâm Chưởng', skillMult: 1.8,
          skillChance: .38, reward: 320,
          backstory: 'Từng là khoáng chủ giàu nhất Tuyệt Bích Trấn, Thạch Vô Tâm tham lam đào trúng một mạch hắc ngọc bị nguyền, để nó ăn vào lồng ngực thay cho trái tim. Từ đó lão không còn biết đau, chỉ còn biết chiếm đoạt — nay ẩn sâu trong hang động dưới vách đá, biến cả một quân đoàn phu mỏ cũ thành tay sai đá hóa.',
        },
      },

      thap: {
        theme: 'Tháp Tuyệt Bích dựng ngay trên rìa vách núi dựng đứng, cầu thang đá xoắn ốc ăn sâu vào lòng vách — gió lùa qua từng tầng khiến bước chân người leo tháp luôn phải giữ thăng bằng, trong khi lính gác và yêu thú trấn giữ mỗi tầng ngày càng mang dáng dấp của chính vách đá: cứng cáp, nặng nề, và không ngại lao thẳng vào đối phương.',
      },

      khuDanCu: {
        shopkeeper: {
          name: 'Bà Cả Nhâm — Chưởng Quầy Tuyệt Bích',
          icon: '👵',
          lines: [
            'Trấn này sống nhờ nghề khai khoáng, nhưng từ ngày khoáng nô biến dị xuất hiện, ta chỉ bán đồ hộ thân thôi, không dám bán thêm vũ khí sát thương thật đâu.',
            'Đan dược Bích Nham này quý lắm, luyện từ đá vôi ngâm suối khoáng ba năm ròng — uống vào là khỏe re, nhưng công lực vẫn phải tự mình mà luyện.',
          ],
        },
        caiTrangSu: {
          name: 'Công Tử Nghê — Cải Trang Sư',
          icon: '🎭',
          lines: [
            'Áo choàng Vân Vũ này ta lấy cảm hứng từ mây vờn quanh đỉnh Tuyệt Bích, khoác lên là có khí chất hiệp khách ngay, chỉ tiếc không đỡ được đòn nào cả.',
            'Danh Vọng ở Tuyệt Bích khó kiếm hơn Bàn Sơn nhiều, nên món ta bán cũng xứng đáng hiếm hơn — toàn hàng độc bản để làm đẹp thôi.',
          ],
        },
        items: [
          {
            id: 'tho-tbt-item-dan-duoc', name: 'Đan Dược Bích Nham', icon: '🧪', cost: 90, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao: hồi đầy sinh lực trước trận đấu tiếp theo (không cộng chỉ số vĩnh viễn).',
          },
          {
            id: 'tho-tbt-item-ao-choang', name: 'Áo Choàng Vân Vũ', icon: '🧥', cost: 150, currency: 'linh-thach',
            effect: 'Trang phục thời trang cho nhân vật — thuần cosmetic, không thay đổi chỉ số chiến đấu.',
          },
          {
            id: 'tho-tbt-item-phu-tang-thu', name: 'Phù Tăng Thủ Tuyệt Bích', icon: '📜', cost: 200, currency: 'linh-thach',
            effect: 'Buff ngắn hạn: +8% phòng thủ trong 10 phút thực (tự hết hạn, không phải chỉ số vĩnh viễn).',
          },
          {
            id: 'tho-tbt-item-danh-hieu', name: 'Danh Hiệu: "Kẻ Chinh Phục Vách Đá"', icon: '🏷️', cost: 60, currency: 'danh-vong',
            effect: 'Danh hiệu hiển thị cạnh tên nhân vật — thuần cosmetic, không ảnh hưởng chiến đấu.',
          },
        ],
      },

      khuLuyenCong: {
        theme: 'Một sân tập chênh vênh nhô ra khỏi vách đá, nơi đệ tử phải giữ thăng bằng trên xà đá hẹp đúng nhịp thở để nhận một luồng khí thế phòng thủ ngắn ngủi trước khi lâm trận.',
      },
    },

    // ── 3. Vạn Lý Bình Nguyên — gold/epic/legendary, 3rd Huyện of Thổ Châu ──
    'van-ly-binh-nguyen': {
      name: 'Vạn Lý Bình Nguyên',
      tierRange: ['gold', 'epic', 'legendary'],
      tierLabel: 'Thành thạo / Tinh anh / Huyền thoại',

      khuDanhQuai: {
        monsters: [
          {
            id: 'tho-vlbn-hoang-sa-cu-tuong', icon: '🐘', name: 'Hoàng Sa Cự Tượng', tier: 'Khó', rarityTier: 'gold',
            hp: 320, attack: 34, defense: 26, skillName: 'Giẫm Nát Bình Nguyên', skillMult: 1.7,
            skillChance: .34, reward: 65,
            flavor: 'Linh thú đất vàng cao lớn như ngọn đồi nhỏ, mỗi bước chân làm cát bụi cuộn lên thành bão giữa đồng bằng vô tận.',
          },
          {
            id: 'tho-vlbn-tho-long-au-trung', icon: '🐉', name: 'Thổ Long Ấu Trùng', tier: 'Rất khó', rarityTier: 'epic',
            hp: 380, attack: 40, defense: 30, skillName: 'Xuyên Thổ Phá Giáp', skillMult: 1.8,
            skillChance: .36, reward: 78,
            flavor: 'Rồng đất còn non nớt, chưa mọc đủ vảy, chuyên đào hầm dưới lòng bình nguyên rồi bất ngờ trồi lên húc văng đối thủ.',
          },
          {
            id: 'tho-vlbn-co-mo-thach-ve', icon: '🗿', name: 'Cổ Mộ Thạch Vệ', tier: 'Rất khó', rarityTier: 'epic',
            hp: 440, attack: 46, defense: 36, skillName: 'Phong Ấn Thiên Cổ', skillMult: 1.85,
            skillChance: .38, reward: 88,
            flavor: 'Thần vệ đá canh giữ một ngôi cổ mộ chôn vùi dưới lớp đất hàng nghìn năm, thức tỉnh mỗi khi có kẻ dám quấy nhiễu giấc ngủ của người xưa.',
          },
          {
            id: 'tho-vlbn-binh-nguyen-ma-tuong', icon: '💀', name: 'Bình Nguyên Ma Tướng', tier: 'Cực khó', rarityTier: 'legendary',
            hp: 500, attack: 52, defense: 40, skillName: 'Vạn Cốt Quy Điền', skillMult: 1.9,
            skillChance: .4, reward: 100,
            flavor: 'Oán khí của một vị tướng cổ tử trận nơi đây ngấm vào đất, hóa thành bóng ma giáp trụ, vẫn còn chỉ huy đội quân xương cốt vô hình dưới lòng bình nguyên.',
          },
        ],
      },

      hangDong: {
        boss: {
          id: 'tho-vlbn-boss-hau-tho-ma-de', icon: '👑', name: '"Hậu Thổ Ma Đế" Câu Trần', tier: 'Cực khó', rarityTier: 'legendary',
          hp: 800, attack: 65, defense: 55, skillName: 'Hoàng Thổ Diệt Thế Ấn', skillMult: 2.0,
          skillChance: .42, reward: 500,
          backstory: 'Ngàn năm trước, đạo sĩ Câu Trần tu luyện Độn Thổ Chân Kinh mong hóa thành "Địa Tiên", nhưng tham vọng thôn phệ linh khí cả một vùng bình nguyên đã khiến tâm ma nuốt chửng chân thân, biến ông ta thành Ma Đế ngủ vùi dưới lòng đất. Gần đây có nhóm đạo tặc đào mộ cổ đánh thức lão dậy, và cả Vạn Lý Bình Nguyên giờ rung chuyển mỗi khi lão trở mình.',
        },
      },

      thap: {
        theme: 'Tháp Vạn Lý không xây bằng gạch đá mà đùn lên từ chính lòng đất bình nguyên, mỗi tầng là một phiến đất nện khổng lồ trồi cao dần theo bước chân người thách đấu — càng lên cao, không khí càng đặc quánh linh khí cổ xưa, và những kẻ trấn giữ không còn là thổ phỉ hay thú hoang nữa mà là dư ảnh của các đạo binh, tướng lĩnh từng vùi thây nơi chiến trường ngàn năm trước, thử thách cả sức bền lẫn bản lĩnh thực sự của người luyện Ngũ Hành.',
      },

      khuDanCu: {
        shopkeeper: {
          name: 'Trưởng Lão Điền — Chưởng Quầy Vạn Lý',
          icon: '👴',
          lines: [
            'Bình nguyên này rộng vô tận, nhưng dưới lớp đất vàng kia toàn là chiến trường cũ — hàng hóa ta bán đều là để giữ mạng, không phải để luyện thành cao thủ đâu, chuyện đó phải tự thân vận động.',
            'Tiên đan Hoàng Thổ là thứ quý nhất quầy ta có, hồi đầy sinh lực lại còn giải được chút tà khí vương trên người sau khi đụng độ Ma Tướng — nhưng công lực thật sự vẫn nằm ở đôi tay ngươi.',
          ],
        },
        caiTrangSu: {
          name: 'Tiên Cô Hoàng Thổ — Cải Trang Sư',
          icon: '🧝',
          lines: [
            'Giáp bào cổ chiến trường này ta phục chế lại từ tranh vẽ cổ, mặc vào như khoác cả ngàn năm lịch sử lên người — đẹp thì đẹp thật, nhưng đừng tưởng nó cứng như giáp thật ngoài chiến trận nhé.',
            'Danh Vọng tích ở Vạn Lý Bình Nguyên khó gấp bội hai Huyện kia, nên hàng ta để dành riêng cho các vị đều là loại không đâu có được — kể cả con chiến mã cát vàng kia.',
          ],
        },
        items: [
          {
            id: 'tho-vlbn-item-tien-dan', name: 'Tiên Đan Hoàng Thổ', icon: '🧪', cost: 160, currency: 'linh-thach',
            effect: 'Vật phẩm tiêu hao: hồi đầy sinh lực trước trận đấu tiếp theo (không cộng chỉ số vĩnh viễn).',
          },
          {
            id: 'tho-vlbn-item-giap-bao', name: 'Giáp Bào Cổ Chiến Trường', icon: '🥋', cost: 260, currency: 'linh-thach',
            effect: 'Trang phục thời trang cho nhân vật — thuần cosmetic, không thay đổi chỉ số chiến đấu.',
          },
          {
            id: 'tho-vlbn-item-phu-cuong-bao', name: 'Phù Cuồng Bạo Bình Nguyên', icon: '📜', cost: 300, currency: 'linh-thach',
            effect: 'Buff ngắn hạn: +10% chí mạng trong 10 phút thực (tự hết hạn, không phải chỉ số vĩnh viễn).',
          },
          {
            id: 'tho-vlbn-item-chien-ma', name: 'Chiến Mã Hoàng Sa (skin)', icon: '🐎', cost: 150, currency: 'danh-vong',
            effect: 'Giao diện ngựa cưỡi cho ô trang bị "horse" — thuần cosmetic, không ảnh hưởng chỉ số.',
          },
          {
            id: 'tho-vlbn-item-danh-hieu', name: 'Danh Hiệu: "Bá Chủ Vạn Lý"', icon: '🏷️', cost: 100, currency: 'danh-vong',
            effect: 'Danh hiệu hiển thị cạnh tên nhân vật — thuần cosmetic, không ảnh hưởng chiến đấu.',
          },
        ],
      },

      khuLuyenCong: {
        theme: 'Một khoảng đất nện rộng giữa đồng hoang nơi các cao thủ luyện tấn pháp bằng cách giữ thế đứng đúng nhịp trống trận vọng lại từ xa xưa, đổi lấy một luồng sát khí ngắn ngủi trước khi bước vào Hang động hay Tháp.',
      },
    },

  },
};
