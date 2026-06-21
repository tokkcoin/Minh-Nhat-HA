/* ============================================================
   Life Balance — storyEditor.js
   The "+ Your Story" full-screen editor overlay (#story-editor).
   Phase 1: element tag (required) + caption + Post/Cancel.
   Phase 2 (this update): filter presets, video trim timeline,
   draggable text/sticker layers. Phase 3 will add a music picker.
   See .claude/memory.md for the phased build-order rationale —
   everything here is a "live composite at view time" metadata
   layer on top of the ORIGINAL unedited mediaData; nothing is
   re-encoded (no canvas/MediaRecorder), which is what keeps this
   safe to run on Pi Browser's mobile WebKit.
   Depends on common.js (ELEMENTS, uploadMediaToCloudinary, showToast)
   loaded before this file. main.js calls openStoryEditor() instead of
   saving a story immediately; this file never touches localStorage
   itself — it only hands a finished story object back via the onCommit
   callback main.js supplies. Editing previews the raw File via a plain
   blob: object URL; the file is only uploaded to Cloudinary at commit
   time (commitStoryFromEditor), so discarded edits never cost an upload.
   main.js's openStoryViewer() reuses FILTER_PRESETS, applyTrimLoop() and
   renderLayersReadOnly() from here so the editor and the viewer never
   duplicate this logic.
   ============================================================ */

'use strict';

// FILTER_PRESETS is a plain object, not a function — top-level `const` in a
// classic <script> does NOT attach to `window` automatically (see
// .claude/rules/tech-defaults.md's window.X_DATA note), so it's exported
// explicitly for main.js's openStoryViewer() to reuse.
const FILTER_PRESETS = {
  none: '',
  vivid: 'saturate(1.5) contrast(1.15)',
  mono: 'grayscale(1) contrast(1.05)',
  warm: 'sepia(.3) saturate(1.2)',
  cool: 'hue-rotate(180deg) saturate(1.1)',
  fade: 'contrast(.85) brightness(1.1) saturate(.7)',
};
window.FILTER_PRESETS = FILTER_PRESETS;

const STICKER_CHOICES = ['😀', '😂', '😍', '🔥', '💯', '❤️', '👍', '🎉', '😢', '😎', '🙌', '✨'];
const TRIM_MIN_GAP_SEC = 0.5;

let storyEditorState = null; // { mediaType, mediaData, onCommit, mediaEl, duration, trimStart, trimEnd, filterKey, layers }
let storyEditorObjectUrl = null; // revoked on close, mirrors closeStoryViewer's discipline
let layerIdCounter = 0;

// ── 1. Open / Close ─────────────────────────────────────────

async function openStoryEditor(file, onCommit) {
  const mediaType = file.type.startsWith('image/') ? 'image'
    : file.type.startsWith('video/') ? 'video'
    : null;
  if (!mediaType) {
    showToast('Stories need a photo or video');
    return;
  }

  storyEditorState = {
    mediaType, file, onCommit,
    mediaEl: null,
    duration: null,
    trimStart: null,
    trimEnd: null,
    filterKey: null,
    layers: [],
    musicTrackId: null,
    musicVolume: 0.8,
  };

  resetStoryEditorPanels();
  renderStoryEditorPreview();
  renderFilterStrip();
  renderStickerStrip();

  const captionEl = document.getElementById('story-editor-caption');
  const elementEl = document.getElementById('story-editor-element');
  if (captionEl) captionEl.value = '';
  if (elementEl) elementEl.value = '';

  const overlay = document.getElementById('story-editor');
  if (overlay) overlay.hidden = false;
}

function resetStoryEditorPanels() {
  document.getElementById('story-editor-trim')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-filter-strip')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-sticker-strip')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-music-panel')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-music-controls')?.toggleAttribute('hidden', true);
  stopMusicPreview();
  const layersEl = document.getElementById('story-editor-layers');
  if (layersEl) layersEl.innerHTML = '';
}

function closeStoryEditor() {
  const overlay = document.getElementById('story-editor');
  if (overlay) overlay.hidden = true;

  stopMusicPreview();
  const preview = document.getElementById('story-editor-preview');
  if (preview) preview.innerHTML = '<div id="story-editor-layers" class="story-editor__layers"></div>';

  if (storyEditorObjectUrl) {
    URL.revokeObjectURL(storyEditorObjectUrl);
    storyEditorObjectUrl = null;
  }
  storyEditorState = null;
}

// ── 2. Preview ───────────────────────────────────────────────

function renderStoryEditorPreview() {
  const preview = document.getElementById('story-editor-preview');
  if (!preview || !storyEditorState) return;
  preview.innerHTML = '<div id="story-editor-layers" class="story-editor__layers"></div>';

  // Edits happen on the original File before it's ever uploaded, so the
  // preview is a plain blob: object URL — no base64/data-URI round trip,
  // no Cloudinary upload yet (that only happens on commit, see below).
  const objectUrl = URL.createObjectURL(storyEditorState.file);
  storyEditorObjectUrl = objectUrl;

  if (storyEditorState.mediaType === 'image') {
    const img = document.createElement('img');
    img.src = objectUrl;
    img.alt = '';
    preview.appendChild(img);
    storyEditorState.mediaEl = img;
    return;
  }

  const video = document.createElement('video');
  video.src = objectUrl;
  video.controls = true;
  video.muted = true;
  video.playsInline = true;
  preview.appendChild(video);
  storyEditorState.mediaEl = video;

  video.addEventListener('loadedmetadata', () => {
    if (!storyEditorState) return;
    storyEditorState.duration = video.duration;
    storyEditorState.trimStart = 0;
    storyEditorState.trimEnd = video.duration;
    document.getElementById('story-editor-trim')?.toggleAttribute('hidden', false);
    initTrimTimeline(video);
  });
}

// ── 3. Filters ───────────────────────────────────────────────

function renderFilterStrip() {
  const strip = document.getElementById('story-editor-filter-strip');
  if (!strip) return;
  strip.innerHTML = '';

  Object.keys(FILTER_PRESETS).forEach(key => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `story-editor__filter-swatch${key === 'none' ? ' story-editor__filter-swatch--active' : ''}`;
    btn.dataset.filterKey = key;
    btn.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    btn.addEventListener('click', () => selectFilter(key));
    strip.appendChild(btn);
  });
}

function selectFilter(filterKey) {
  if (!storyEditorState) return;
  storyEditorState.filterKey = filterKey === 'none' ? null : filterKey;
  if (storyEditorState.mediaEl) storyEditorState.mediaEl.style.filter = FILTER_PRESETS[filterKey] || '';

  document.querySelectorAll('#story-editor-filter-strip .story-editor__filter-swatch').forEach(btn => {
    btn.classList.toggle('story-editor__filter-swatch--active', btn.dataset.filterKey === filterKey);
  });
}

function toggleFilterStrip() {
  const strip = document.getElementById('story-editor-filter-strip');
  if (!strip) return;
  strip.hidden = !strip.hidden;
  document.getElementById('story-editor-sticker-strip')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-music-panel')?.toggleAttribute('hidden', true);
}

// ── 4. Trim Timeline ─────────────────────────────────────────

function initTrimTimeline(videoEl) {
  const track = document.getElementById('story-editor-trim-track');
  const startHandle = document.getElementById('story-editor-trim-start');
  const endHandle = document.getElementById('story-editor-trim-end');
  const playhead = document.getElementById('story-editor-trim-playhead');
  if (!track || !startHandle || !endHandle) return;

  function timeToPct(t) {
    return storyEditorState.duration ? (t / storyEditorState.duration) * 100 : 0;
  }

  function pctFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }

  function updateHandlePositions() {
    startHandle.style.left = `${timeToPct(storyEditorState.trimStart)}%`;
    endHandle.style.left = `${timeToPct(storyEditorState.trimEnd)}%`;
  }

  function wireHandle(handleEl, isStart) {
    handleEl.addEventListener('pointerdown', evt => {
      handleEl.setPointerCapture(evt.pointerId);

      function onMove(moveEvt) {
        const pct = pctFromClientX(moveEvt.clientX);
        let t = (pct / 100) * storyEditorState.duration;
        if (isStart) {
          t = Math.max(0, Math.min(t, storyEditorState.trimEnd - TRIM_MIN_GAP_SEC));
          storyEditorState.trimStart = t;
        } else {
          t = Math.min(storyEditorState.duration, Math.max(t, storyEditorState.trimStart + TRIM_MIN_GAP_SEC));
          storyEditorState.trimEnd = t;
        }
        videoEl.currentTime = t;
        updateHandlePositions();
      }
      function onUp() {
        handleEl.releasePointerCapture(evt.pointerId);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  wireHandle(startHandle, true);
  wireHandle(endHandle, false);

  videoEl.addEventListener('timeupdate', () => {
    if (playhead) playhead.style.left = `${timeToPct(videoEl.currentTime)}%`;
  });

  applyTrimLoop(videoEl, storyEditorState);
  updateHandlePositions();
}

// Shared by the editor's own preview AND main.js's openStoryViewer — loops
// playback back to trimStart once it passes trimEnd. `trimState` just needs
// trimStart/trimEnd properties (works for storyEditorState or a story object).
function applyTrimLoop(videoEl, trimState) {
  videoEl.addEventListener('timeupdate', () => {
    if (trimState.trimEnd != null && videoEl.currentTime >= trimState.trimEnd) {
      videoEl.currentTime = trimState.trimStart || 0;
    }
  });
}

// ── 5. Layers (text + sticker) ────────────────────────────────

function addTextLayer() {
  const text = (prompt('Nhập nội dung text:', '') ?? '').trim();
  if (!text || !storyEditorState) return;
  const layer = { id: `layer-${++layerIdCounter}`, type: 'text', text, xPct: 50, yPct: 50, color: 'text-primary', fontSizePx: 22 };
  storyEditorState.layers.push(layer);
  renderLayer(layer);
}

function addStickerLayer(emoji) {
  if (!storyEditorState) return;
  const layer = { id: `layer-${++layerIdCounter}`, type: 'sticker', text: emoji, xPct: 50, yPct: 50, color: 'text-primary', fontSizePx: 36 };
  storyEditorState.layers.push(layer);
  renderLayer(layer);
}

function renderLayer(layerObj) {
  const container = document.getElementById('story-editor-layers');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `story-layer story-layer--${layerObj.type}`;
  el.dataset.layerId = layerObj.id;
  el.style.left = `${layerObj.xPct}%`;
  el.style.top = `${layerObj.yPct}%`;
  el.style.fontSize = `${layerObj.fontSizePx}px`;
  el.style.color = `var(--${layerObj.color})`;
  el.textContent = layerObj.text;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'story-layer__delete';
  del.setAttribute('aria-label', 'Delete layer');
  del.textContent = '✕';
  del.addEventListener('pointerdown', evt => evt.stopPropagation());
  del.addEventListener('click', evt => {
    evt.stopPropagation();
    deleteLayer(layerObj);
  });
  el.appendChild(del);

  makeLayerDraggable(el, layerObj);
  container.appendChild(el);
}

function makeLayerDraggable(layerEl, layerObj) {
  layerEl.addEventListener('pointerdown', evt => {
    if (evt.target !== layerEl) return; // ignore drags starting on the delete badge
    layerEl.setPointerCapture(evt.pointerId);
    layerEl.classList.add('dragging');
    const container = document.getElementById('story-editor-layers');

    function onMove(moveEvt) {
      const rect = container.getBoundingClientRect();
      const xPct = Math.min(100, Math.max(0, ((moveEvt.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.min(100, Math.max(0, ((moveEvt.clientY - rect.top) / rect.height) * 100));
      layerObj.xPct = xPct;
      layerObj.yPct = yPct;
      layerEl.style.left = `${xPct}%`;
      layerEl.style.top = `${yPct}%`;
    }
    function onUp() {
      layerEl.classList.remove('dragging');
      layerEl.releasePointerCapture(evt.pointerId);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function deleteLayer(layerObj) {
  if (!storyEditorState) return;
  storyEditorState.layers = storyEditorState.layers.filter(l => l.id !== layerObj.id);
  document.querySelector(`.story-layer[data-layer-id="${layerObj.id}"]`)?.remove();
}

// Read-only counterpart for main.js's openStoryViewer (no drag handlers).
function renderLayersReadOnly(container, layers) {
  if (!container) return;
  container.innerHTML = '';
  (layers || []).forEach(layerObj => {
    const el = document.createElement('div');
    el.className = `story-layer story-layer--${layerObj.type} story-layer--readonly`;
    el.style.left = `${layerObj.xPct}%`;
    el.style.top = `${layerObj.yPct}%`;
    el.style.fontSize = `${layerObj.fontSizePx}px`;
    el.style.color = `var(--${layerObj.color})`;
    el.textContent = layerObj.text;
    container.appendChild(el);
  });
}

// ── 6. Sticker picker (reuses the same strip styling as filters) ──

function renderStickerStrip() {
  const strip = document.getElementById('story-editor-sticker-strip');
  if (!strip) return;
  strip.innerHTML = '';
  STICKER_CHOICES.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'story-editor__sticker-btn';
    btn.textContent = emoji;
    btn.addEventListener('click', () => addStickerLayer(emoji));
    strip.appendChild(btn);
  });
}

function toggleStickerStrip() {
  const strip = document.getElementById('story-editor-sticker-strip');
  if (!strip) return;
  strip.hidden = !strip.hidden;
  document.getElementById('story-editor-filter-strip')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-music-panel')?.toggleAttribute('hidden', true);
}

// ── 7. Music Picker ────────────────────────────────────────────

let musicPreviewAudio = null;
let musicPreviewTrackId = null;

function toggleMusicPanel() {
  const panel = document.getElementById('story-editor-music-panel');
  if (!panel) return;
  panel.hidden = !panel.hidden;
  document.getElementById('story-editor-filter-strip')?.toggleAttribute('hidden', true);
  document.getElementById('story-editor-sticker-strip')?.toggleAttribute('hidden', true);
  if (!panel.hidden) renderMusicList();
}

function renderMusicList() {
  const list = document.getElementById('story-editor-music-list');
  if (!list) return;
  list.innerHTML = '';

  const tracks = window.STORY_MUSIC_TRACKS || [];
  if (tracks.length === 0) {
    list.innerHTML = '<p class="story-editor__music-empty">Chưa có nhạc — sẽ sớm có (xem data/storyMusic.js)</p>';
    return;
  }

  tracks.forEach(track => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'story-editor__music-track';
    if (storyEditorState?.musicTrackId === track.id) row.classList.add('story-editor__music-track--active');
    row.dataset.trackId = track.id;

    const previewBtn = document.createElement('span');
    previewBtn.className = 'story-editor__music-preview-btn';
    previewBtn.textContent = musicPreviewTrackId === track.id ? '⏸' : '▶';
    previewBtn.addEventListener('click', evt => {
      evt.stopPropagation();
      toggleMusicPreview(track);
    });

    const label = document.createElement('span');
    label.innerHTML = `<span class="story-editor__music-track-title">${escapeHtml(track.title)}</span> <span class="story-editor__music-track-artist">${escapeHtml(track.artist)}</span>`;

    row.append(previewBtn, label);
    row.addEventListener('click', () => selectMusicTrack(track.id));
    list.appendChild(row);
  });
}

function toggleMusicPreview(track) {
  if (musicPreviewTrackId === track.id) {
    stopMusicPreview();
    return;
  }
  stopMusicPreview();
  musicPreviewAudio = new Audio(track.url);
  musicPreviewAudio.volume = 0.8;
  musicPreviewAudio.play().catch(() => showToast("Couldn't preview this track"));
  musicPreviewTrackId = track.id;
  musicPreviewAudio.addEventListener('ended', stopMusicPreview);
  renderMusicList();
}

function stopMusicPreview() {
  if (musicPreviewAudio) {
    musicPreviewAudio.pause();
    musicPreviewAudio = null;
  }
  musicPreviewTrackId = null;
}

function selectMusicTrack(trackId) {
  if (!storyEditorState) return;
  storyEditorState.musicTrackId = trackId;
  renderMusicList();
  document.getElementById('story-editor-music-controls')?.toggleAttribute('hidden', false);
}

function clearMusicTrack() {
  if (!storyEditorState) return;
  storyEditorState.musicTrackId = null;
  stopMusicPreview();
  renderMusicList();
  document.getElementById('story-editor-music-controls')?.toggleAttribute('hidden', true);
}

function setMusicVolume(volume) {
  if (!storyEditorState) return;
  storyEditorState.musicVolume = volume;
}

// ── 8. Commit ────────────────────────────────────────────────

async function commitStoryFromEditor() {
  if (!storyEditorState) return;

  const elementEl = document.getElementById('story-editor-element');
  const captionEl = document.getElementById('story-editor-caption');
  const element = elementEl?.value;

  if (!element) {
    showToast('Choose an element first');
    return;
  }

  // Capture everything needed before the upload `await` — storyEditorState
  // is cleared by closeStoryEditor() and must not be read after a yield.
  const { file, mediaType, trimStart, trimEnd, filterKey, layers, musicTrackId, musicVolume, onCommit } = storyEditorState;
  const postBtn = document.getElementById('story-editor-post');
  if (postBtn) postBtn.disabled = true;
  showToast('Uploading...');

  let mediaData;
  try {
    mediaData = await uploadMediaToCloudinary(file);
  } catch {
    showToast('Upload failed — check your connection and try again');
    if (postBtn) postBtn.disabled = false;
    return;
  }
  if (postBtn) postBtn.disabled = false;

  const story = {
    id: `${Date.now()}`,
    mediaType,
    mediaData,
    caption: (captionEl?.value ?? '').trim(),
    createdAt: new Date().toISOString(),
    element,
    trimStart,
    trimEnd,
    filterKey,
    layers,
    musicTrackId,
    musicVolume,
  };

  const result = onCommit?.(story);
  if (result !== false) closeStoryEditor();
}

// ── 9. Wiring (called once at boot via runBootStep) ───────────

function initStoryEditor() {
  document.getElementById('story-editor-close')?.addEventListener('click', closeStoryEditor);
  document.getElementById('story-editor-cancel')?.addEventListener('click', closeStoryEditor);
  document.getElementById('story-editor-post')?.addEventListener('click', commitStoryFromEditor);
  document.getElementById('story-editor')?.addEventListener('click', evt => {
    if (evt.target.id === 'story-editor') closeStoryEditor();
  });
  document.getElementById('story-editor-add-text')?.addEventListener('click', addTextLayer);
  document.getElementById('story-editor-add-sticker')?.addEventListener('click', toggleStickerStrip);
  document.getElementById('story-editor-filters-toggle')?.addEventListener('click', toggleFilterStrip);
  document.getElementById('story-editor-music-toggle')?.addEventListener('click', toggleMusicPanel);
  document.getElementById('story-editor-music-clear')?.addEventListener('click', clearMusicTrack);
  document.getElementById('story-editor-music-volume')?.addEventListener('input', evt => {
    setMusicVolume(parseFloat(evt.target.value));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initStoryEditor);
});
