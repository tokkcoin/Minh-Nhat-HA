/* ============================================================
   Life Balance — common.js
   Shared helpers loaded on every page (toast, Pi SDK init)
   ============================================================ */

'use strict';

// ── 1. Toast ──────────────────────────────────────────────────

function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ── 2. Pi SDK Init ────────────────────────────────────────────
// Returns a Promise<boolean> (true once Pi.init() has resolved).
// Memoized so concurrent callers (e.g. main.js and piAuth.js on the
// same page) await the same init instead of calling Pi.init() twice.

let piInitPromise = null;

async function initPiSdk() {
  const statusEl = document.getElementById('pi-status');

  if (!window.Pi) {
    if (statusEl) statusEl.textContent = '⚠️ Not running in Pi Browser';
    return false;
  }

  if (!piInitPromise) {
    piInitPromise = Promise.resolve(Pi.init({ version: '2.0', sandbox: true }));
  }
  await piInitPromise;

  if (statusEl) statusEl.textContent = '✅ Pi Browser detected (sandbox)';
  return true;
}

// ── 3. Shared Element / Priority-Level Metadata ───────────────
// Used by journal.js (per-element pages) and main.js (unified feed)
// so both speak the same post shape: { element, level, ... }.

const ELEMENTS = {
  metal: { key: 'metal', name: 'Metal', dimension: 'Money',     icon: '⛏️' },
  wood:  { key: 'wood',  name: 'Wood',  dimension: 'Health',    icon: '🌳' },
  water: { key: 'water', name: 'Water', dimension: 'Talent',    icon: '💧' },
  fire:  { key: 'fire',  name: 'Fire',  dimension: 'Mood',      icon: '🔥' },
  earth: { key: 'earth', name: 'Earth', dimension: 'Situation', icon: '🪨' },
};

const PRIORITY_LEVELS = {
  'emergency-important':     { label: 'Emergency · Important',        color: 'var(--danger)' },
  'emergency-unimportant':   { label: 'Emergency · Unimportant',      color: 'var(--metal)' },
  'important-unemergency':   { label: 'Important · Not Emergency',    color: 'var(--water)' },
  'unimportant-unemergency': { label: 'Unimportant · Not Emergency',  color: 'var(--text-muted)' },
};

// Attachments now upload to Cloudinary (see uploadMediaToCloudinary below)
// instead of living in localStorage as base64, so the real ceiling is
// Cloudinary's own free-plan per-file cap, not localStorage's ~5-10MB quota.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // Cloudinary free plan: 10MB for images
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // Cloudinary free plan: 100MB for video/audio

function maxBytesForFile(file) {
  return file.type.startsWith('image/') ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
}

// ── 4. Shared Post Storage (per-element keys) ─────────────────

function journalStorageKey(elementKey) {
  return `lifebalance_journal_${elementKey}`;
}

function loadElementPosts(elementKey) {
  try {
    return JSON.parse(localStorage.getItem(journalStorageKey(elementKey))) || [];
  } catch {
    return [];
  }
}

// localStorage.setItem throws (QuotaExceededError) once the origin's shared
// ~5-10MB quota fills up — easy to hit once a few photo/video attachments
// accumulate. Every save in this app must go through this so a full quota
// fails loudly (a toast) instead of silently losing the user's post/story.
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    showToast('Storage full — delete an old post/story or use a smaller file');
    return false;
  }
}

function saveElementPosts(elementKey, posts) {
  return safeSetItem(journalStorageKey(elementKey), JSON.stringify(posts));
}

// Uploads a file straight from the browser to Cloudinary (the file itself
// never passes through our Vercel functions — only the tiny signature
// request does, see api/cloudinary-sign.js). Throws on failure; callers
// must catch and show a toast rather than assume this always succeeds.
async function uploadMediaToCloudinary(file) {
  const signRes = await fetch('/api/cloudinary-sign', { method: 'POST' });
  if (!signRes.ok) throw new Error('Could not get upload signature');
  const { cloudName, apiKey, timestamp, signature } = await signRes.json();

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
  const data = await uploadRes.json();
  return data.secure_url;
}

// ── Local On-Device Image Storage (IndexedDB) ─────────────────
// For attachments that should stay on the user's phone instead of
// going to Cloudinary (e.g. expense receipt photos). IndexedDB's
// quota is typically hundreds of MB to GBs (device free-space based),
// unlike localStorage's shared ~5-10MB ceiling — safe for several
// full-size camera photos. Each store is a flat key→Blob map.

let localImageDbPromise = null;

function openLocalImageDb(storeNames) {
  if (!localImageDbPromise) {
    localImageDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('lifebalance_images', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        storeNames.forEach(name => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return localImageDbPromise;
}

async function saveLocalImage(storeName, key, blob) {
  const db = await openLocalImageDb([storeName]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadLocalImage(storeName, key) {
  const db = await openLocalImageDb([storeName]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteLocalImage(storeName, key) {
  const db = await openLocalImageDb([storeName]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// iOS Safari / Pi Browser (WebKit) cannot play <video src="data:...">  at all
// (long-standing WebKit bug — images as data URIs are fine, video is not).
// Posts/stories still persist as data URI strings in localStorage; this just
// converts to a Blob object URL at render time so video actually plays there.
// Returns null (instead of throwing) if the stored data URI is malformed/
// corrupted — callers must handle null rather than assume this always works.
function dataUrlToObjectUrl(dataUrl) {
  if (!dataUrl) return null;
  // Cloudinary (or any other) real URL — not a data: URI, so the iOS
  // data-URI video bug doesn't apply; use it directly, no conversion.
  if (!dataUrl.startsWith('data:')) return dataUrl;
  try {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);base64/)?.[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

function timeAgo(iso) {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Runs a boot-time init/render function in isolation — a thrown error (e.g.
// one corrupted post's media) must not stop later boot steps (e.g. wiring a
// close button) from running. See .claude/memory.md, 2026-06-21.
function runBootStep(fn) {
  try {
    fn();
  } catch (err) {
    console.warn(`Boot step "${fn.name}" failed:`, err);
  }
}
