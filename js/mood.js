/* ============================================================
   Life Balance — mood.js
   Fire (Mood) element page — daily "tu tâm" (cultivation) checklist,
   using the shared dailyTasks.js widget. Framed as practices that
   temper the mind rather than a generic mood tracker: each completed
   task feeds the Hoả Khí total shown here and, via DAILY_SOURCES in
   main.js, the home screen's "Nhiệm vụ hôm nay" panel.
   ============================================================ */

'use strict';

const MOOD_SEED_TASKS = [
  { title: 'Thiền 10 phút', xp: 10 },
  { title: 'Ghi nhật ký cảm xúc', xp: 8 },
  { title: 'Hít thở chính niệm 3 phút', xp: 5 },
  { title: 'Buông bỏ 1 điều lo âu', xp: 15 },
  { title: 'Nói lời cảm ơn với ai đó', xp: 10 },
];

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(() => initDailyChecklist({
    storageKey: 'lifebalance_mood_quests',
    defaultXp: 10,
    seedTasks: MOOD_SEED_TASKS,
  }));
});
