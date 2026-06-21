/* ============================================================
   Life Balance — data/storyMusic.js
   Music pool for the Story Editor's "🎵 Music" picker (Phase 3).
   NCS was originally planned but ruled out — their usage policy only
   covers crediting them in a video/livestream description, not
   rehosting files as a built-in music-library feature inside another
   app, and unofficial "NCS MP3 download" sites are explicitly flagged
   by NCS as a malware/legal risk (see .claude/memory.md, 2026-06-21).
   Tracks below are user-downloaded "no copyright music" MP3s (Pixabay-
   style royalty-free license — commercial use + redistribution
   allowed, no attribution required), self-hosted in audio/NCS/ rather
   than hotlinked anywhere. See audio/README.md for the add-a-track
   workflow.

   Shape of each entry:
   {
     id: string,            // stable short id — used as story.musicTrackId
     title: string,
     artist: string,
     url: string,           // relative path to a self-hosted file in audio/
     durationSec: number,   // optional, used only for a duration label in the picker UI —
                             // omitted below since the real duration wasn't measured
   }
   ============================================================ */

window.STORY_MUSIC_TRACKS = [
  { id: 'alexgrohl-184234', title: 'Bounce On It', artist: 'Alexgrohl', url: 'audio/NCS/alexgrohl-no-copyright-music-bounce-on-it-184234.mp3' },
  { id: 'bombinsound-499473', title: 'Vlog', artist: 'BomBinSound', url: 'audio/NCS/bombinsound-no-copyright-vlog-499473.mp3' },
  { id: 'joyinsound-398375', title: 'No Copyright Music #398375', artist: 'JoyInSound', url: 'audio/NCS/joyinsound-no-copyright-music-398375.mp3' },
  { id: 'joyinsound-403358', title: 'No Copyright Music #403358', artist: 'JoyInSound', url: 'audio/NCS/joyinsound-no-copyright-music-403358.mp3' },
  { id: 'mirostar-531490', title: 'No Copyright Music #531490', artist: 'Mirostar', url: 'audio/NCS/mirostar-no-copyright-music-531490.mp3' },
  { id: 'nastelbom-473269', title: 'No Copyright Music #473269', artist: 'Nastelbom', url: 'audio/NCS/nastelbom-no-copyright-music-473269.mp3' },
  { id: 'prettyjohn1-498106', title: 'No Copyright Music #498106', artist: 'PrettyJohn1', url: 'audio/NCS/prettyjohn1-no-copyright-music-498106.mp3' },
  { id: 'sigmamusicart-537751', title: 'No Copyright Music #537751', artist: 'SigmaMusicArt', url: 'audio/NCS/sigmamusicart-no-copyright-music-537751.mp3' },
  { id: 'tatamusic-423648', title: 'No Copyright Music #423648', artist: 'TataMusic', url: 'audio/NCS/tatamusic-no-copyright-music-423648.mp3' },
];
