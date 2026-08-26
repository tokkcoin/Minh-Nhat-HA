/* ============================================================
   Life Balance — elementStats.js
   Single shared source for reading the 5 elements' raw localStorage
   data plus the skill star/rarity tier thresholds.

   Added 2026-08-25: this formula/data used to be independently
   copy-pasted in 4 places — skills.js's STAR_THRESHOLDS,
   characterPanel.js's compute*Stat functions + its own
   CHARACTER_STAR_THRESHOLDS copy, game-wulin.js's computeWulinStats +
   its own WULIN_STAR_THRESHOLDS copy, and weaponPrototype.js's
   WEAPON_TIERS/weaponTierFor. A threshold or formula change had to be
   made by hand in all 4 (each file's own comment even said "mirrors
   X, keep in sync manually") and could silently drift if one copy
   was missed. This module is now the one place that changes.

   Loaded as a plain global (window.ElementStats), same script-tag
   convention as data/*.js (see tech-defaults.md's "Data File
   Convention") — no bundler, no ES modules, so every page that needs
   it must add its own <script src="js/elementStats.js"> tag before
   the script that uses it.

   Read-only: never writes to any of the keys below. Each element's
   own page (finance.html/health.js/skills.js/mood.js/situation.js)
   still owns writing its data — this module only reads and derives.
   ============================================================ */

'use strict';

const ELEMENT_STATS_KEYS = {
  finance: 'lifebalance_finance_state',
  health: 'lifebalance_health_quests',
  skills: 'lifebalance_skills',
  mood: 'lifebalance_mood_quests',
  situation: 'lifebalance_situation_units',
};

// Star/rarity tier thresholds — shared by skills.js's star badges,
// characterPanel.js's Water stat, game-wulin.js's skill-power/crit
// derivation, and weaponPrototype.js's gear tiers. Also documented in
// .claude/rules/design.md's "Weapon Rarity Tiers" table — keep both
// in sync if thresholds ever change. Ordered highest-first so
// elementStatsTierFor() can just take the first match.
const ELEMENT_STAR_TIERS = [
  { hours: 500, stars: 5, key: 'legendary', label: 'Huyền thoại' },
  { hours: 365, stars: 4, key: 'epic',      label: 'Tinh anh' },
  { hours: 150, stars: 3, key: 'gold',      label: 'Thành thạo' },
  { hours: 35,  stars: 2, key: 'silver',    label: 'Rèn luyện' },
  { hours: 5,   stars: 1, key: 'bronze',    label: 'Sơ cấp' },
];
const ELEMENT_STAR_TIER_NONE = { hours: 0, stars: 0, key: 'none', label: 'Chưa rèn luyện' };

function elementStatsReadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function elementStatsComputeStars(totalSeconds) {
  const hours = (totalSeconds || 0) / 3600;
  for (const t of ELEMENT_STAR_TIERS) if (hours >= t.hours) return t.stars;
  return 0;
}

function elementStatsTierFor(totalSeconds) {
  const hours = (totalSeconds || 0) / 3600;
  return ELEMENT_STAR_TIERS.find(t => hours >= t.hours) || ELEMENT_STAR_TIER_NONE;
}

function elementStatsSumQuestXp(quests) {
  return quests.reduce((sum, q) => sum + ((q.completedPeriods?.length || 0) * (q.xp || 0)), 0);
}

function elementStatsQuestLevel(totalXp) {
  return Math.floor(totalXp / 100) + 1;
}

// ── Per-element raw readers ──────────────────────────────────
// Return only the underlying numbers/lists — each caller keeps
// deciding its own "hasData" gate and presentation. (characterPanel.js
// gates on "has any entries at all", game-wulin.js gates on "has
// actually completed something" — those are legitimately different
// per-consumer judgment calls, not duplicated data, so left to callers
// rather than baked in here.)

function elementStatsReadMetal() {
  const state = elementStatsReadJson(ELEMENT_STATS_KEYS.finance, null);
  const pools = state?.pools || null;
  const total = pools ? Object.values(pools).reduce((sum, p) => sum + (p.principal || 0), 0) : 0;
  return { pools, total };
}

function elementStatsReadWood() {
  const quests = elementStatsReadJson(ELEMENT_STATS_KEYS.health, []);
  const totalXp = elementStatsSumQuestXp(quests);
  const level = elementStatsQuestLevel(totalXp);
  const doneCount = quests.filter(q => (q.completedPeriods?.length || 0) > 0).length;
  return { quests, totalXp, level, doneCount };
}

function elementStatsReadWater() {
  const skills = elementStatsReadJson(ELEMENT_STATS_KEYS.skills, []);
  const starList = skills.map(s => elementStatsComputeStars(s.totalSeconds || 0));
  const avgStars = starList.length ? starList.reduce((a, b) => a + b, 0) / starList.length : 0;
  return { skills, starList, avgStars };
}

function elementStatsReadFire() {
  const quests = elementStatsReadJson(ELEMENT_STATS_KEYS.mood, []);
  const totalXp = elementStatsSumQuestXp(quests);
  const doneCount = quests.filter(q => (q.completedPeriods?.length || 0) > 0).length;
  return { quests, totalXp, doneCount };
}

function elementStatsReadEarth() {
  const units = elementStatsReadJson(ELEMENT_STATS_KEYS.situation, []);
  const counts = { frontline: 0, middle: 0, rear: 0 };
  units.forEach(u => { if (counts[u.zone] != null) counts[u.zone] += 1; });
  return { units, counts };
}

window.ElementStats = {
  KEYS: ELEMENT_STATS_KEYS,
  STAR_TIERS: ELEMENT_STAR_TIERS,
  STAR_TIER_NONE: ELEMENT_STAR_TIER_NONE,
  readJson: elementStatsReadJson,
  computeStars: elementStatsComputeStars,
  tierFor: elementStatsTierFor,
  sumQuestXp: elementStatsSumQuestXp,
  questLevel: elementStatsQuestLevel,
  readMetal: elementStatsReadMetal,
  readWood: elementStatsReadWood,
  readWater: elementStatsReadWater,
  readFire: elementStatsReadFire,
  readEarth: elementStatsReadEarth,
};
