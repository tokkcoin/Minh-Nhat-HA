/* ============================================================
   Life Balance — journal.js
   Per-element journal: composer, feed, like, delete.
   Storage: localStorage only (demo/testnet stage — see
   .claude/rules/tech-defaults.md and .claude/memory.md, 2026-06-18).
   ============================================================ */

'use strict';

// ── 1. Element Theme Lookup ─────────────────────────────────────

const ELEMENTS = {
  metal: { key: 'metal', name: 'Metal', dimension: 'Money',     icon: '⛏️' },
  wood:  { key: 'wood',  name: 'Wood',  dimension: 'Health',    icon: '🌳' },
  water: { key: 'water', name: 'Water', dimension: 'Talent',    icon: '💧' },
  fire:  { key: 'fire',  name: 'Fire',  dimension: 'Mood',      icon: '🔥' },
  earth: { key: 'earth', name: 'Earth', dimension: 'Situation', icon: '🪨' },
};

// localStorage has ~5-10MB total quota shared by the whole origin;
// this keeps a single attachment from blowing through it.
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

function getElementFromUrl() {
  const param = new URLSearchParams(window.location.search).get('el');
  return ELEMENTS[param] || null;
}

// ── 2. Storage ───────────────────────────────────────────────

function storageKey(elementKey) {
  return `lifebalance_journal_${elementKey}`;
}

function loadPosts(elementKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(elementKey))) || [];
  } catch {
    return [];
  }
}

function savePosts(elementKey, posts) {
  localStorage.setItem(storageKey(elementKey), JSON.stringify(posts));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

// ── 3. Theme the Page ───────────────────────────────────────────

function applyTheme(element) {
  document.title = `${element.name} Journal — Life Balance`;
  document.querySelectorAll('[data-el-name]').forEach(el => { el.textContent = element.name; });
  document.querySelectorAll('[data-el-dimension]').forEach(el => { el.textContent = element.dimension; });
  document.querySelectorAll('[data-el-icon]').forEach(el => { el.textContent = element.icon; });
  document.body.style.setProperty('--current-element', `var(--${element.key})`);
  document.body.style.setProperty('--current-element-tint', `var(--${element.key}-tint)`);
}

// ── 4. Render Feed ───────────────────────────────────────────

function renderFeed(element) {
  const feed = document.getElementById('feed');
  if (!feed) return;

  const posts = loadPosts(element.key);
  feed.innerHTML = '';

  if (posts.length === 0) {
    feed.innerHTML = `<p class="feed-empty">No posts yet — share how your ${element.name} day went.</p>`;
    return;
  }

  posts.forEach(post => feed.appendChild(buildPostCard(post, element)));
}

function buildPostCard(post, element) {
  const card = document.createElement('article');
  card.className = 'post-card';

  const media = post.mediaType === 'image'
    ? `<img class="post-card__media" src="${post.mediaData}" alt="">`
    : post.mediaType === 'video'
      ? `<video class="post-card__media" src="${post.mediaData}" controls></video>`
      : post.mediaType === 'audio'
        ? `<audio class="post-card__media post-card__media--audio" src="${post.mediaData}" controls></audio>`
        : '';

  card.innerHTML = `
    <div class="post-card__head">
      <span class="post-card__avatar">${element.icon}</span>
      <div>
        <strong class="post-card__author">You</strong>
        <span class="post-card__time">${timeAgo(post.createdAt)}</span>
      </div>
      <button class="post-card__delete" type="button" aria-label="Delete post">✕</button>
    </div>
    ${post.text ? `<p class="post-card__text">${escapeHtml(post.text)}</p>` : ''}
    ${media}
    <div class="post-card__actions">
      <button class="post-card__like ${post.liked ? 'liked' : ''}" type="button">
        <span aria-hidden="true">${post.liked ? '❤️' : '🤍'}</span>
        <span class="post-card__like-count">${post.likes}</span>
      </button>
    </div>
  `;

  card.querySelector('.post-card__like')?.addEventListener('click', () => toggleLike(element, post.id));
  card.querySelector('.post-card__delete')?.addEventListener('click', () => deletePost(element, post.id));

  return card;
}

// ── 5. Like / Delete ─────────────────────────────────────────

function toggleLike(element, postId) {
  const posts = loadPosts(element.key);
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  savePosts(element.key, posts);
  renderFeed(element);
}

function deletePost(element, postId) {
  const posts = loadPosts(element.key).filter(p => p.id !== postId);
  savePosts(element.key, posts);
  renderFeed(element);
}

// ── 6. Composer ──────────────────────────────────────────────

function initComposer(element) {
  const textInput = document.getElementById('composer-text');
  const fileInput = document.getElementById('composer-file');
  const attachBtn = document.getElementById('composer-attach');
  const preview = document.getElementById('composer-preview');
  const postBtn = document.getElementById('composer-post');
  if (!textInput || !fileInput || !attachBtn || !preview || !postBtn) return;

  let pendingFile = null;

  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) {
      showToast('File too large for local demo storage (max 4MB)');
      fileInput.value = '';
      return;
    }
    pendingFile = file;
    preview.textContent = `📎 ${file.name}`;
    preview.hidden = false;
  });

  postBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text && !pendingFile) {
      showToast('Write something or attach a file first');
      return;
    }

    let mediaType = null;
    let mediaData = null;
    if (pendingFile) {
      mediaType = pendingFile.type.startsWith('image/') ? 'image'
        : pendingFile.type.startsWith('video/') ? 'video'
        : pendingFile.type.startsWith('audio/') ? 'audio'
        : null;
      mediaData = await readFileAsDataUrl(pendingFile);
    }

    const posts = loadPosts(element.key);
    posts.unshift({
      id: `${Date.now()}`,
      text,
      mediaType,
      mediaData,
      liked: false,
      likes: 0,
      createdAt: new Date().toISOString(),
    });
    savePosts(element.key, posts);

    textInput.value = '';
    pendingFile = null;
    fileInput.value = '';
    preview.hidden = true;

    renderFeed(element);
    showToast('Posted!');
  });
}

// ── 7. Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initPiSdk();

  const element = getElementFromUrl();
  const notFound = document.getElementById('not-found');
  const journal = document.getElementById('journal');

  if (!element) {
    if (notFound) notFound.hidden = false;
    if (journal) journal.hidden = true;
    return;
  }

  applyTheme(element);
  renderFeed(element);
  initComposer(element);
});
