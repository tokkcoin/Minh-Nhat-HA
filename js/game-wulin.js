/* ============================================================
   Life Balance — game-wulin.js
   "Ngũ Hành Giang Hồ" — wuxia-flavored turn-based RPG (Connect tab).

   The whole point of this game: combat stats are DERIVED from the
   player's real Five Elements tracking data, using the same
   read-only readers as js/characterPanel.js and js/weaponPrototype.js
   (never writes to those keys, never invents a parallel data model —
   see js/elementStats.js, which all 3 files now read through). Unlike
   characterPanel.js's placeholder "no data yet" text, every formula
   here has a floor/base value so a brand-new user with zero tracked
   data can still fight — see WULIN_BASE below. Which stats are real
   vs. baseline is shown in the stats panel for honesty (see
   renderStatsPanel).

   2026-08-26: gear-tier system from weapon-prototype.html wired into
   real combat (backlog item #3) — the player can equip one real
   skill (from skills.html) as a "weapon". Its rarity tier (same
   ElementStats.tierFor()/STAR_TIERS thresholds weapon-prototype.html
   already visualizes) grants a real Công kích/Chiêu thức/Chí mạng
   bonus, applied inside computeWulinStats() below. Equip choice
   persists in its own localStorage key (lifebalance_wulin_equipped,
   just the chosen skill's id) — read-only against the skills array
   itself, same "never invent a parallel data model" rule as the rest
   of this file.

   2026-08-31 (GAME_MAP_ROADMAP.md Phase C1): the monster roster moved
   out to data/wulinMonsters.js (window.WULIN_MONSTERS_DATA) so
   js/game-map.js's Khu đánh quái nodes can read the same icon/name/
   reward data without loading this whole combat-screen script. This
   file can also now be entered mid-combat from the map: a
   ?mapMonster=<id>&mapNode=<nodeId> URL launches straight into
   startCombat() against that monster (see "Map entry" in §11), and a
   win credits real Linh Thạch via common.js's addLinhThach() — the
   existing "Nội lực" reward text elsewhere in this file is still pure
   flavor, unchanged, only the map-launched path also touches the real
   currency.
   ============================================================ */

'use strict';

// ── 1. Real-data readers ────────────────────────────────────
// Raw per-element data comes from js/elementStats.js (must be loaded
// before this file) — only the combat-specific formulas below (base
// floors, multipliers, "hasData" gates for the badge) live here.

// Baseline floors so a fresh user (all keys empty) still gets a fully
// playable character instead of getting stuck at 0.
const WULIN_BASE = { hp: 80, attack: 12, skillPower: 15, crit: 5, defense: 8, evasion: 5 };

// ── Equipped weapon (gear-tier system from weapon-prototype.html) ──
// Only stores the equipped skill's id — the skill itself, and its
// tier, are always re-derived live from ElementStats/skills.js, never
// duplicated here.
const WULIN_EQUIPPED_KEY = 'lifebalance_wulin_equipped';

// % bonus to attack/skillPower per tier, keyed to ElementStats.STAR_TIERS'
// `key` values (plus 'none' for ElementStats.STAR_TIER_NONE). Crit gets
// a flat +2% per star instead (see computeWulinStats below).
const WULIN_WEAPON_BONUS_PCT = { none: 0, bronze: .06, silver: .12, gold: .20, epic: .30, legendary: .45 };

function loadEquippedWeaponId() {
  try {
    return localStorage.getItem(WULIN_EQUIPPED_KEY) || null;
  } catch {
    return null;
  }
}

function equipWeapon(skillId) {
  safeSetItem(WULIN_EQUIPPED_KEY, skillId);
}

function unequipWeapon() {
  try { localStorage.removeItem(WULIN_EQUIPPED_KEY); } catch { /* storage unavailable — nothing to clean up */ }
}

// Resolves the stored id against the real, current skills array so a
// deleted/renamed skill never leaves a stale weapon equipped.
function getEquippedWeapon(skills) {
  const id = loadEquippedWeaponId();
  if (!id) return null;
  return skills.find(s => s.id === id) || null;
}

function wulinFormatHours(totalSeconds) {
  const hours = (totalSeconds || 0) / 3600;
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

// ── 2. Stat derivation — formulas documented per element ──
//
// Wood (health quests, XP)  -> Max HP: base 80 + 10 per level (level =
//   floor(totalXp/100)+1, same level formula as characterPanel.js's
//   computeWoodStat) + a small direct XP bonus, capped so grinding
//   XP can't runaway-inflate HP.
// Fire (mood quests, "Hoả Khí" XP) -> Attack: base 12 + totalXp/6.
// Water (skills, 0-5 star avg) -> Skill Power + Crit%: base 15 skill
//   power / 5% crit, +9 skill power and +4% crit per average star.
// Metal (finance pools, total allocated capital) -> Defense: base 8
//   + 5*log10(1+totalCapital) so a huge capital figure doesn't trivially
//   dominate combat (log-scaled per spec).
// Earth (situation units count) -> Evasion%: base 5% + 2% per unit,
//   capped at 30% so a dodge-everything build isn't possible.
function computeWulinStats() {
  const { totalXp: woodXp, level: woodLevel, doneCount: woodDone } = ElementStats.readWood();
  const woodHasData = woodDone > 0;
  const maxHp = WULIN_BASE.hp + woodLevel * 10 + Math.min(150, Math.floor(woodXp / 8));

  const { totalXp: fireXp, doneCount: fireDone } = ElementStats.readFire();
  const fireHasData = fireDone > 0;
  let attack = WULIN_BASE.attack + Math.floor(fireXp / 6);

  const { skills, avgStars } = ElementStats.readWater();
  const waterHasData = avgStars > 0;
  let skillPower = WULIN_BASE.skillPower + Math.round(avgStars * 9);
  let critChance = Math.round(WULIN_BASE.crit + avgStars * 4);

  const { total: totalCapital } = ElementStats.readMetal();
  const metalHasData = totalCapital > 0;
  const defense = WULIN_BASE.defense + Math.round(5 * Math.log10(1 + totalCapital));

  const { units } = ElementStats.readEarth();
  const earthHasData = units.length > 0;
  const evasion = Math.min(30, WULIN_BASE.evasion + units.length * 2);

  // Equipped weapon (gear-tier system, backlog item #3) — a real skill's
  // rarity tier boosts attack/skillPower by a % and adds flat crit.
  const equippedSkill = getEquippedWeapon(skills);
  const weaponTier = equippedSkill ? ElementStats.tierFor(equippedSkill.totalSeconds) : ElementStats.STAR_TIER_NONE;
  const weaponBonusPct = WULIN_WEAPON_BONUS_PCT[weaponTier.key] || 0;
  if (equippedSkill) {
    attack = Math.round(attack * (1 + weaponBonusPct));
    skillPower = Math.round(skillPower * (1 + weaponBonusPct));
    critChance += weaponTier.stars * 2;
  }

  return {
    maxHp, attack, skillPower, critChance, defense, evasion,
    weapon: equippedSkill
      ? { id: equippedSkill.id, icon: equippedSkill.icon, name: equippedSkill.name, tier: weaponTier, bonusPct: weaponBonusPct }
      : null,
    sources: {
      wood: { hasData: woodHasData, label: woodHasData ? `Cấp ${woodLevel} · ${woodXp} EXP` : 'Chưa có nhiệm vụ Mộc' },
      fire: { hasData: fireHasData, label: fireHasData ? `${fireXp} Hoả Khí` : 'Chưa luyện Hoả' },
      water: { hasData: waterHasData, label: waterHasData ? `${skills.length} kỹ năng · TB ${avgStars.toFixed(1)}★` : 'Chưa có kỹ năng Thuỷ' },
      metal: { hasData: metalHasData, label: metalHasData ? `${totalCapital.toLocaleString('vi-VN')}đ vốn` : 'Chưa phân bổ vốn Kim' },
      earth: { hasData: earthHasData, label: earthHasData ? `${units.length} mục tiêu Thổ` : 'Chưa có mục tiêu Thổ' },
    },
  };
}

// ── 3. Monster roster — original names/flavor, no real IP references ──
// Lives in data/wulinMonsters.js now (window.WULIN_MONSTERS_DATA) so
// js/game-map.js can read it too, per the 2026-08-31 header note above.

const WULIN_MONSTERS = window.WULIN_MONSTERS_DATA || [];

// ── 4. Combat state + math ──

const wulinState = {
  player: null,
  monster: null,
  playerStats: null,
  inCombat: false,
  actionLocked: false,
  // Set when this page was opened from a map monster node (Phase C1) —
  // see parseWulinMapContext()/§11. Non-null for the whole session once
  // set, so "Đấu tiếp" (re-fight the same monster without returning to
  // the map first) still counts as launched-from-map on every rematch.
  mapNodeId: null,
  lastResult: null,
};

// ── Map entry (GAME_MAP_ROADMAP.md Phase C1) ──────────────────
// game-map.js's Khu đánh quái nodes navigate here with
// ?mapMonster=<id>&mapNode=<nodeId> instead of opening the monster-
// select grid. Returns null (normal standalone flow) if either param
// is missing or the id doesn't match a real monster.
function parseWulinMapContext() {
  const params = new URLSearchParams(window.location.search);
  const monsterId = params.get('mapMonster');
  const nodeId = params.get('mapNode');
  if (!monsterId || !nodeId) return null;
  if (!WULIN_MONSTERS.some(m => m.id === monsterId)) return null;
  return { monsterId, nodeId };
}

// Navigates back to the map, optionally telling it which node to put
// on respawn cooldown (only meaningful on a win — see game-map.js's
// tryResumeFromCombat()). No-op-safe: if mapNodeId somehow isn't set,
// still just goes to the map with no query params.
function returnToMap(result) {
  const params = new URLSearchParams();
  if (wulinState.mapNodeId) params.set('resumeNode', wulinState.mapNodeId);
  if (result) params.set('resumeResult', result);
  const qs = params.toString();
  window.location.href = qs ? `game-map.html?${qs}` : 'game-map.html';
}

function wulinRandRange(min, max) {
  return min + Math.random() * (max - min);
}

function wulinDamage(atk, def, mult = 1) {
  const raw = (atk * mult) - def * 0.5;
  return Math.max(1, Math.round(raw * wulinRandRange(0.85, 1.15)));
}

// ── 5. Log helper ──

function wulinLog(message, kind = '') {
  const logEl = document.getElementById('wulin-log');
  if (!logEl) return;
  const entry = document.createElement('div');
  entry.className = `wulin-log__entry${kind ? ` wulin-log__entry--${kind}` : ''}`;
  entry.textContent = message;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

// ── 6. Render: stats panel ──

const WULIN_STAT_CARDS = [
  { key: 'metal', icon: '⛏️', element: 'metal', label: 'Phòng thủ (Kim)', valueKey: 'defense' },
  { key: 'wood', icon: '🌳', element: 'wood', label: 'Sinh lực (Mộc)', valueKey: 'maxHp' },
  { key: 'water', icon: '💧', element: 'water', label: 'Chiêu thức (Thuỷ)', valueKey: 'skillPower', suffixKey: 'critChance' },
  { key: 'fire', icon: '🔥', element: 'fire', label: 'Công kích (Hoả)', valueKey: 'attack' },
  { key: 'earth', icon: '⛰️', element: 'earth', label: 'Né tránh (Thổ)', valueKey: 'evasion', isPercent: true },
];

function renderStatsPanel(stats) {
  const grid = document.getElementById('wulin-stats-grid');
  const hint = document.getElementById('wulin-stats-hint');
  if (!grid) return;

  const anyReal = Object.values(stats.sources).some(s => s.hasData);
  if (hint) {
    hint.textContent = anyReal
      ? 'Chỉ số bên dưới lấy từ dữ liệu thật của bạn trên trang chủ — luyện tập càng nhiều, nhân vật càng mạnh. Ô "Mặc định" là chỉ số nền dùng khi chưa có dữ liệu.'
      : 'Bạn chưa có dữ liệu nào ở Kim/Mộc/Thuỷ/Hoả/Thổ — nhân vật đang dùng chỉ số nền để vẫn luyện công được. Hãy ghé các trang Ngũ Hành để chỉ số tăng lên thật.';
  }

  grid.innerHTML = WULIN_STAT_CARDS.map(card => {
    const src = stats.sources[card.element];
    const value = stats[card.valueKey];
    const valueText = card.isPercent ? `${value}%` : value;
    const suffixText = card.suffixKey ? ` · ${stats[card.suffixKey]}% chí mạng` : '';
    const badgeClass = src.hasData ? 'wulin-stat-card__badge--real' : 'wulin-stat-card__badge--baseline';
    const badgeText = src.hasData ? 'Dữ liệu thật' : 'Mặc định';
    return `
      <div class="wulin-stat-card wulin-stat-card--${card.element}">
        <div class="wulin-stat-card__head">${card.icon} ${card.label}</div>
        <div class="wulin-stat-card__value">${valueText}${suffixText}</div>
        <div class="wulin-stat-card__source">${src.label}</div>
        <span class="wulin-stat-card__badge ${badgeClass}">${badgeText}</span>
      </div>`;
  }).join('');
}

// ── 6b. Render: equipped weapon panel + picker modal ──

function renderWeaponPanel(stats) {
  const box = document.getElementById('wulin-weapon-current');
  if (!box) return;
  const w = stats.weapon;

  if (!w) {
    box.innerHTML = '<p class="wulin-weapon__empty">Chưa trang bị vũ khí — trang bị một kỹ năng thật từ trang Thuỷ (Kỹ năng) để cộng thêm sức mạnh khi giao đấu.</p>';
    return;
  }

  box.innerHTML = `
    <div class="wulin-weapon-card wulin-weapon-card--${w.tier.key}">
      <span class="wulin-weapon-card__icon">${w.icon || '❔'}</span>
      <div class="wulin-weapon-card__info">
        <div class="wulin-weapon-card__name">${escapeHtml(w.name)}</div>
        <div class="wulin-weapon-card__tier">${w.tier.label} · +${Math.round(w.bonusPct * 100)}% Công/Chiêu thức, +${w.tier.stars * 2}% chí mạng</div>
      </div>
      <button type="button" class="wulin-weapon-card__unequip" id="wulin-weapon-unequip-btn">Bỏ trang bị</button>
    </div>`;

  document.getElementById('wulin-weapon-unequip-btn')?.addEventListener('click', () => {
    unequipWeapon();
    refreshWulinCharacterPanels();
    showToast('Đã bỏ trang bị vũ khí');
  });
}

function buildWulinWeaponOption(skill, isEquipped) {
  const tier = ElementStats.tierFor(skill.totalSeconds);
  return `
    <button type="button" class="weapon-card weapon-card--${tier.key} wulin-weapon-option${isEquipped ? ' wulin-weapon-option--equipped' : ''}" data-weapon-id="${skill.id}">
      <div class="weapon-card__slot"><span class="weapon-card__icon">${skill.icon || '❔'}</span></div>
      <div class="weapon-card__name">${escapeHtml(skill.name)}</div>
      <div class="weapon-card__tier">${tier.label}</div>
      <div class="weapon-card__hours">${wulinFormatHours(skill.totalSeconds)} luyện tập</div>
      ${isEquipped ? '<div class="wulin-weapon-option__badge">✓ Đang trang bị</div>' : ''}
    </button>`;
}

function openWeaponModal() {
  const modal = document.getElementById('wulin-weapon-modal');
  const grid = document.getElementById('wulin-weapon-grid');
  const hint = document.getElementById('wulin-weapon-modal-hint');
  if (!modal || !grid) return;

  const { skills } = ElementStats.readWater();
  const equippedId = loadEquippedWeaponId();

  if (!skills.length) {
    if (hint) hint.textContent = 'Bạn chưa có kỹ năng nào ở trang Thuỷ (Kỹ năng) — hãy thêm và luyện tập ít nhất 1 kỹ năng để có vũ khí trang bị.';
    grid.innerHTML = '';
  } else {
    if (hint) hint.textContent = 'Chọn một kỹ năng để trang bị làm vũ khí — cấp bậc (theo giờ luyện tập thật) sẽ cộng thêm Công kích/Chiêu thức/Chí mạng khi giao đấu.';
    grid.innerHTML = skills.map(s => buildWulinWeaponOption(s, s.id === equippedId)).join('');
  }

  modal.hidden = false;
}

function closeWeaponModal() {
  const modal = document.getElementById('wulin-weapon-modal');
  if (modal) modal.hidden = true;
}

function refreshWulinCharacterPanels() {
  wulinState.playerStats = computeWulinStats();
  renderStatsPanel(wulinState.playerStats);
  renderWeaponPanel(wulinState.playerStats);
}

// ── 7. Render: monster select ──

function renderMonsterGrid() {
  const grid = document.getElementById('wulin-monster-grid');
  if (!grid) return;
  grid.innerHTML = WULIN_MONSTERS.map(m => `
    <button type="button" class="wulin-monster-card" data-monster-id="${m.id}">
      <div class="wulin-monster-card__icon">${m.icon}</div>
      <div class="wulin-monster-card__name">${m.name}</div>
      <span class="wulin-monster-card__tier">${m.tier}</span>
      <div class="wulin-monster-card__stats">
        <span>❤️ ${m.hp}</span><span>⚔️ ${m.attack}</span><span>🛡️ ${m.defense}</span>
      </div>
      <div class="wulin-monster-card__reward">Thắng: Nội lực +${m.reward}</div>
    </button>
  `).join('');

  grid.querySelectorAll('[data-monster-id]').forEach(btn => {
    btn.addEventListener('click', () => startCombat(btn.dataset.monsterId));
  });
}

// ── 8. Combat: start / bars / actions ──

function wulinShowScreen(screen) {
  const statsPanel = document.getElementById('wulin-stats-panel');
  const weaponPanel = document.getElementById('wulin-weapon-panel');
  const monsterSelect = document.getElementById('wulin-monster-select');
  const combat = document.getElementById('wulin-combat');
  if (!statsPanel || !weaponPanel || !monsterSelect || !combat) return;
  statsPanel.hidden = screen !== 'select';
  weaponPanel.hidden = screen !== 'select';
  monsterSelect.hidden = screen !== 'select';
  combat.hidden = screen !== 'combat';
}

function startCombat(monsterId) {
  const def = WULIN_MONSTERS.find(m => m.id === monsterId);
  if (!def || !wulinState.playerStats) return;

  const stats = wulinState.playerStats;
  wulinState.player = {
    hp: stats.maxHp, maxHp: stats.maxHp,
    attack: stats.attack, skillPower: stats.skillPower,
    critChance: stats.critChance, defense: stats.defense, evasion: stats.evasion,
    defending: false, skillCooldown: 0,
  };
  wulinState.monster = { ...def, maxHp: def.hp, skillCooldown: 0 };
  wulinState.inCombat = true;
  wulinState.actionLocked = false;

  const nameEl = document.getElementById('wulin-monster-name');
  const iconEl = document.getElementById('wulin-monster-icon');
  if (nameEl) nameEl.textContent = def.name;
  if (iconEl) iconEl.textContent = def.icon;

  const logEl = document.getElementById('wulin-log');
  if (logEl) logEl.innerHTML = '';
  wulinLog(`Trận đấu bắt đầu! Bạn chạm trán ${def.name}.`);

  wulinShowScreen('combat');
  updateCombatBars();
  updateActionButtons();
}

function updateCombatBars() {
  const p = wulinState.player;
  const m = wulinState.monster;
  if (!p || !m) return;

  const pFill = document.getElementById('wulin-player-hp-fill');
  const pText = document.getElementById('wulin-player-hp-text');
  const mFill = document.getElementById('wulin-monster-hp-fill');
  const mText = document.getElementById('wulin-monster-hp-text');

  const pPct = Math.max(0, Math.round((p.hp / p.maxHp) * 100));
  const mPct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
  if (pFill) pFill.style.width = `${pPct}%`;
  if (mFill) mFill.style.width = `${mPct}%`;
  if (pText) pText.textContent = `${Math.max(0, p.hp)} / ${p.maxHp} HP`;
  if (mText) mText.textContent = `${Math.max(0, m.hp)} / ${m.maxHp} HP`;
}

function updateActionButtons() {
  const p = wulinState.player;
  const skillBtn = document.getElementById('wulin-action-skill');
  const cdBadge = document.getElementById('wulin-skill-cd');
  const locked = wulinState.actionLocked || !wulinState.inCombat;

  document.querySelectorAll('.wulin-action-btn').forEach(btn => { btn.disabled = locked; });

  if (skillBtn && p) {
    const onCooldown = p.skillCooldown > 0;
    skillBtn.disabled = locked || onCooldown;
    if (cdBadge) {
      cdBadge.hidden = !onCooldown;
      cdBadge.textContent = p.skillCooldown;
    }
  }
}

// ── 9. Combat: turn resolution ──

function handlePlayerAction(action) {
  if (wulinState.actionLocked || !wulinState.inCombat) return;
  const p = wulinState.player;
  const m = wulinState.monster;
  if (!p || !m) return;

  p.defending = false;

  if (action === 'attack') {
    const crit = Math.random() * 100 < p.critChance;
    const dmg = wulinDamage(p.attack, m.defense, crit ? 1.5 : 1);
    m.hp -= dmg;
    wulinLog(crit ? `⚔️ Bạn tung đòn chí mạng, gây ${dmg} sát thương!` : `⚔️ Bạn tấn công, gây ${dmg} sát thương.`, crit ? 'crit' : 'hit');
  } else if (action === 'skill') {
    if (p.skillCooldown > 0) { wulinLog('Chiêu thức đang hồi khí, chưa thể dùng.'); return; }
    const crit = Math.random() * 100 < (p.critChance + 15);
    const dmg = wulinDamage(p.attack + p.skillPower, m.defense, (crit ? 1.5 : 1) * 1.3);
    m.hp -= dmg;
    p.skillCooldown = 3;
    wulinLog(crit ? `✨ Chiêu thức đả trúng yếu điểm, gây ${dmg} sát thương!` : `✨ Bạn thi triển chiêu thức, gây ${dmg} sát thương.`, crit ? 'crit' : 'hit');
  } else if (action === 'defend') {
    p.defending = true;
    wulinLog('🛡️ Bạn thủ thế, giảm sát thương lượt này.');
  }

  updateCombatBars();

  if (m.hp <= 0) {
    endCombat('win');
    return;
  }

  wulinState.actionLocked = true;
  updateActionButtons();
  window.setTimeout(resolveMonsterTurn, 550);
}

function resolveMonsterTurn() {
  const p = wulinState.player;
  const m = wulinState.monster;
  if (!p || !m || !wulinState.inCombat) return;

  const useSkill = m.skillCooldown <= 0 && Math.random() < m.skillChance;
  let dmg;
  if (useSkill) {
    dmg = wulinDamage(m.attack, p.defense, m.skillMult);
    m.skillCooldown = 2;
  } else {
    dmg = wulinDamage(m.attack, p.defense, 1);
  }
  if (m.skillCooldown > 0 && !useSkill) m.skillCooldown -= 1;

  const dodged = Math.random() * 100 < p.evasion;
  if (dodged) {
    wulinLog(`💨 Bạn né được đòn ${useSkill ? `chiêu "${m.skillName}"` : 'tấn công'} của ${m.name}!`, 'good');
  } else {
    let finalDmg = dmg;
    if (p.defending) finalDmg = Math.round(finalDmg * 0.5);
    p.hp -= finalDmg;
    wulinLog(
      useSkill
        ? `💥 ${m.name} thi triển "${m.skillName}", gây ${finalDmg} sát thương${p.defending ? ' (đã giảm nhờ phòng thủ)' : ''}!`
        : `👊 ${m.name} phản công, gây ${finalDmg} sát thương${p.defending ? ' (đã giảm nhờ phòng thủ)' : ''}.`,
      useSkill ? 'danger' : ''
    );
  }

  p.defending = false;
  if (p.skillCooldown > 0) p.skillCooldown -= 1;
  updateCombatBars();

  if (p.hp <= 0) {
    endCombat('lose');
    return;
  }

  wulinState.actionLocked = false;
  updateActionButtons();
}

// ── 10. Result overlay ──

function endCombat(result) {
  wulinState.inCombat = false;
  wulinState.actionLocked = true;
  wulinState.lastResult = result;
  updateActionButtons();

  const overlay = document.getElementById('wulin-result-overlay');
  const icon = document.getElementById('wulin-result-icon');
  const title = document.getElementById('wulin-result-title');
  const desc = document.getElementById('wulin-result-desc');
  const rewardBox = document.getElementById('wulin-result-reward');
  const rewardText = document.getElementById('wulin-result-reward-text');
  const retryBtn = document.getElementById('wulin-result-retry');
  if (!overlay) return;

  const m = wulinState.monster;

  if (result === 'win') {
    if (icon) icon.textContent = '🏆';
    if (title) title.textContent = 'Chiến thắng!';
    if (desc) desc.textContent = `Bạn đã đánh bại ${m?.name || 'đối thủ'}.`;
    if (rewardBox) rewardBox.hidden = false;
    let rewardMsg = `Nội lực +${m?.reward ?? 0}`;
    // Khu đánh quái nodes (Phase C1) also pay real Linh Thạch, reusing
    // the same monster.reward number as the "small amount" the roadmap
    // calls for — the standalone monster-select flow (no map node) is
    // untouched and stays flavor-only, same as it always was.
    if (wulinState.mapNodeId && m && typeof addLinhThach === 'function') {
      addLinhThach(m.reward);
      rewardMsg += ` · 💠 Linh Thạch +${m.reward}`;
    }
    if (rewardText) rewardText.textContent = rewardMsg;
    if (retryBtn) retryBtn.textContent = 'Đấu tiếp';
    wulinLog(`🎉 ${m?.name || 'Đối thủ'} đã gục ngã. Nội lực +${m?.reward ?? 0}!`, 'good');
  } else {
    if (icon) icon.textContent = '💀';
    if (title) title.textContent = 'Bạn đã gục ngã…';
    if (desc) desc.textContent = 'Không sao cả — luyện thêm ở các trang Ngũ Hành rồi quay lại thử sức.';
    if (rewardBox) rewardBox.hidden = true;
    if (retryBtn) retryBtn.textContent = 'Thử lại';
    wulinLog('☠️ Bạn đã kiệt sức trong trận đấu này.', 'danger');
  }

  overlay.hidden = false;
}

function hideResultOverlay() {
  const overlay = document.getElementById('wulin-result-overlay');
  if (overlay) overlay.hidden = true;
}

// ── 11. Boot / wiring ──

function initWulinGame() {
  refreshWulinCharacterPanels();
  renderMonsterGrid();

  const mapContext = parseWulinMapContext();
  if (mapContext) {
    wulinState.mapNodeId = mapContext.nodeId;
    const selectBtn = document.getElementById('wulin-result-select');
    if (selectBtn) selectBtn.textContent = '↩ Quay lại bản đồ';
    startCombat(mapContext.monsterId);
  } else {
    wulinShowScreen('select');
  }

  document.getElementById('wulin-weapon-choose-btn')?.addEventListener('click', openWeaponModal);
  document.getElementById('wulin-weapon-modal-close')?.addEventListener('click', closeWeaponModal);
  document.getElementById('wulin-weapon-modal')?.addEventListener('click', e => {
    if (e.target.id === 'wulin-weapon-modal') closeWeaponModal();
  });
  document.getElementById('wulin-weapon-grid')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-weapon-id]');
    if (!btn) return;
    equipWeapon(btn.dataset.weaponId);
    closeWeaponModal();
    refreshWulinCharacterPanels();
    showToast(`Đã trang bị ${wulinState.playerStats.weapon?.name || 'vũ khí'}`);
  });

  document.querySelectorAll('.wulin-action-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePlayerAction(btn.dataset.action));
  });

  document.getElementById('wulin-retreat-btn')?.addEventListener('click', () => {
    wulinState.inCombat = false;
    wulinState.actionLocked = false;
    if (wulinState.mapNodeId) {
      // Retreating mid-fight doesn't count as a win — the node stays
      // up, no cooldown applied (see game-map.js's tryResumeFromCombat).
      returnToMap(null);
    } else {
      wulinShowScreen('select');
    }
  });

  document.getElementById('wulin-result-retry')?.addEventListener('click', () => {
    hideResultOverlay();
    if (wulinState.monster) startCombat(wulinState.monster.id);
  });

  document.getElementById('wulin-result-select')?.addEventListener('click', () => {
    hideResultOverlay();
    if (wulinState.mapNodeId) {
      returnToMap(wulinState.lastResult);
    } else {
      wulinShowScreen('select');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initWulinGame);
});
