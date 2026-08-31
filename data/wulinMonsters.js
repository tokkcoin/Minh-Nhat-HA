/* ============================================================
   Life Balance — data/wulinMonsters.js
   Shared monster roster for game-wulin.html's combat AND game-map.js's
   Khu đánh quái nodes (GAME_MAP_ROADMAP.md Phase C1) — extracted out
   of js/game-wulin.js (2026-08-31) so the map engine can look up a
   node's icon/name/reward without loading the whole combat page's
   script (which assumes combat-screen DOM elements exist). Follows
   this project's window.X_DATA data-file convention (tech-defaults.md)
   — loaded via <script src>, not fetch(), so it works from file://.
   ============================================================ */

window.WULIN_MONSTERS_DATA = [
  {
    id: 'fox-mist', icon: '🦊', name: 'Hồ Ly Sương Sớm', tier: 'Dễ',
    hp: 70, attack: 9, defense: 4, skillName: 'Miên Sương Trảo', skillMult: 1.4,
    skillChance: .25, reward: 20,
  },
  {
    id: 'wraith-valley', icon: '👻', name: 'Quỷ Ảnh Cốc Sâu', tier: 'Trung bình',
    hp: 110, attack: 13, defense: 9, skillName: 'Ám Ảnh Trảm', skillMult: 1.5,
    skillChance: .3, reward: 35,
  },
  {
    id: 'serpent-ancient', icon: '🐍', name: 'Xà Tinh Vạn Niên', tier: 'Trung bình',
    hp: 95, attack: 16, defense: 6, skillName: 'Độc Nha Phệ', skillMult: 1.6,
    skillChance: .3, reward: 35,
  },
  {
    id: 'demon-general', icon: '🛡️', name: 'Ma Tướng Thiết Giáp', tier: 'Khó',
    hp: 150, attack: 17, defense: 16, skillName: 'Cuồng Phong Trảm', skillMult: 1.5,
    skillChance: .32, reward: 55,
  },
  {
    id: 'dragonling-hidden', icon: '🐉', name: 'Hắc Long Ẩn Thế', tier: 'Khó',
    hp: 170, attack: 20, defense: 12, skillName: 'Long Diễm Khí', skillMult: 1.7,
    skillChance: .35, reward: 65,
  },
];
