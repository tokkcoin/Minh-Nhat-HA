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
2. Download the MP3 and save it under `audio/NCS/` (the existing
   subfolder for the first batch of tracks — keep using it, or a new
   subfolder if you want to group tracks differently).
3. Add one entry to `data/storyMusic.js`:
   ```js
   { id: 'pixabay-001', title: 'Upbeat Loop', artist: 'Artist Name', url: 'audio/NCS/upbeat-loop.mp3' },
   ```
4. Keep individual files reasonably small (this is a static site with no
   CDN/backend — every file here is served straight from Vercel, no
   transcoding/compression step exists).

## Current tracks (`audio/NCS/`)

9 user-downloaded royalty-free tracks already wired into `data/storyMusic.js`.
Note: `nastelbom-no-copyright-music-473269 (1).mp3` is a duplicate of
`nastelbom-no-copyright-music-473269.mp3` (same file, accidental double
download) — only the non-`(1)` one is referenced; the duplicate can be
deleted whenever convenient.
