# audio/

Self-hosted music files for the Story Editor's music picker (`data/storyMusic.js`).

## Why local files instead of hotlinking

NCS's usage policy only covers crediting them inside a video/livestream
description — it does not clearly grant rehosting their files as a
built-in music-library feature inside someone else's app, and unofficial
"NCS MP3 download" sites are explicitly flagged by NCS as a malware/legal
risk. Pixabay Music's license (free for commercial use, no attribution
required, redistribution allowed) is a safe fit for this feature instead.

## Workflow to add a track

1. Go to https://pixabay.com/music/ and pick a track under the Pixabay License.
2. Download the MP3 and save it here, e.g. `audio/upbeat-loop.mp3`
   (kebab-case filename, per `.claude/rules/tech-defaults.md`).
3. Add one entry to `data/storyMusic.js`:
   ```js
   { id: 'pixabay-001', title: 'Upbeat Loop', artist: 'Artist Name', url: 'audio/upbeat-loop.mp3', durationSec: 120 },
   ```
4. Keep individual files reasonably small (this is a static site with no
   CDN/backend — every file here is served straight from Vercel, no
   transcoding/compression step exists).
