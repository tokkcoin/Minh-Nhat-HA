/* ============================================================
   Life Balance — data/storyMusic.js
   Music pool for the Story Editor's "🎵 Music" picker (Phase 3).
   Shipped EMPTY on purpose — the real ~100 NCS-style royalty-free
   track URLs haven't been supplied yet (see .claude/memory.md,
   2026-06-21). When they are, paste entries here in this exact
   shape — nothing else needs to change, js/storyEditor.js already
   reads from window.STORY_MUSIC_TRACKS and shows a friendly
   "no music yet" empty state when this array is empty.

   Shape of each entry:
   {
     id: string,            // stable short id, e.g. 'ncs-001' — used as story.musicTrackId
     title: string,
     artist: string,
     url: string,           // a real hosted audio file (CDN/static path) — NOT a data URI;
                             // ~100 tracks would be far too large to embed as data URIs here
     durationSec: number,   // optional, used only for a duration label in the picker UI
   }

   Example (do not uncomment without a real, licensed-for-use URL):
   // { id: 'ncs-001', title: 'Example Track', artist: 'Example Artist',
   //   url: 'https://cdn.example.com/ncs-001.mp3', durationSec: 180 },
   ============================================================ */

window.STORY_MUSIC_TRACKS = [];
