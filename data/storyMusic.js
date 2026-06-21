/* ============================================================
   Life Balance — data/storyMusic.js
   Music pool for the Story Editor's "🎵 Music" picker (Phase 3).
   Shipped EMPTY on purpose. Originally scoped for ~100 NCS tracks,
   but NCS's usage policy only covers crediting them in a video/
   livestream description — it doesn't clearly cover rehosting their
   files as a built-in music-library feature inside another app, and
   unofficial "NCS MP3 download" sites are explicitly flagged by NCS
   as a malware/legal risk (see .claude/memory.md, 2026-06-21). Using
   Pixabay Music instead — its license allows commercial use, no
   attribution, redistribution — see audio/README.md for the exact
   download → add-entry workflow.

   Shape of each entry:
   {
     id: string,            // stable short id, e.g. 'pixabay-001' — used as story.musicTrackId
     title: string,
     artist: string,
     url: string,           // a real hosted audio file — a relative path to a self-hosted file
                             // in audio/ (preferred, see audio/README.md) or a CDN URL you've
                             // verified the license for. NOT a data URI — too large to embed here.
     durationSec: number,   // optional, used only for a duration label in the picker UI
   }

   Example (do not uncomment without a real file actually present in audio/):
   // { id: 'pixabay-001', title: 'Example Track', artist: 'Example Artist',
   //   url: 'audio/example-track.mp3', durationSec: 120 },
   ============================================================ */

window.STORY_MUSIC_TRACKS = [];
