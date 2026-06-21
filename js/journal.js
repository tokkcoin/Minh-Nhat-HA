/* ============================================================
   Life Balance — journal.js
   Per-element journal: composer, feed, like, delete.
   Shared post storage / metadata (ELEMENTS, PRIORITY_LEVELS,
   loadElementPosts, saveElementPosts, timeAgo, escapeHtml,
   readFileAsDataUrl, MAX_MEDIA_BYTES) lives in common.js — both
   this page and the unified feed on index.html use the same shapes.
   ============================================================ */

'use strict';

function getElementFromUrl() {
  const param = new URLSearchParams(window.location.search).get('el');
  return ELEMENTS[param] || null;
}

// ── 1. Theme the Page ───────────────────────────────────────────

function applyTheme(element) {
  document.title = `${element.name} Journal — Life Balance`;
  document.querySelectorAll('[data-el-name]').forEach(el => { el.textContent = element.name; });
  document.querySelectorAll('[data-el-dimension]').forEach(el => { el.textContent = element.dimension; });
  document.querySelectorAll('[data-el-icon]').forEach(el => { el.textContent = element.icon; });
  document.body.style.setProperty('--current-element', `var(--${element.key})`);
  document.body.style.setProperty('--current-element-tint', `var(--${element.key}-tint)`);
}

// ── 2. Render Feed ───────────────────────────────────────────

function renderFeed(element) {
  const feed = document.getElementById('feed');
  if (!feed) return;

  const posts = loadElementPosts(element.key);
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
      ? `<video class="post-card__media" controls></video>`
      : post.mediaType === 'audio'
        ? `<audio class="post-card__media post-card__media--audio" src="${post.mediaData}" controls></audio>`
        : '';

  const levelInfo = PRIORITY_LEVELS[post.level];

  card.innerHTML = `
    <div class="post-card__head">
      <span class="post-card__avatar">${element.icon}</span>
      <div>
        <strong class="post-card__author">You</strong>
        <span class="post-card__time">${timeAgo(post.createdAt)}</span>
      </div>
      <button class="post-card__delete" type="button" aria-label="Delete post">✕</button>
    </div>
    ${levelInfo ? `<div class="post-card__tags"><span class="post-card__level" style="color:${levelInfo.color}">${levelInfo.label}</span></div>` : ''}
    ${post.text ? `<p class="post-card__text">${escapeHtml(post.text)}</p>` : ''}
    ${media}
    <div class="post-card__actions">
      <button class="post-card__like ${post.liked ? 'liked' : ''}" type="button">
        <span aria-hidden="true">${post.liked ? '❤️' : '🤍'}</span>
        <span class="post-card__like-count">${post.likes}</span>
      </button>
    </div>
  `;

  if (post.mediaType === 'video') {
    const videoEl = card.querySelector('.post-card__media');
    if (videoEl) videoEl.src = dataUrlToObjectUrl(post.mediaData);
  }

  card.querySelector('.post-card__like')?.addEventListener('click', () => toggleLike(element, post.id));
  card.querySelector('.post-card__delete')?.addEventListener('click', () => deletePost(element, post.id));

  return card;
}

// ── 3. Like / Delete ─────────────────────────────────────────

function toggleLike(element, postId) {
  const posts = loadElementPosts(element.key);
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
  saveElementPosts(element.key, posts);
  renderFeed(element);
}

function deletePost(element, postId) {
  const posts = loadElementPosts(element.key).filter(p => p.id !== postId);
  saveElementPosts(element.key, posts);
  renderFeed(element);
}

// ── 4. Composer ──────────────────────────────────────────────

function initComposer(element) {
  const textInput = document.getElementById('composer-text');
  const fileInput = document.getElementById('composer-file');
  const attachBtn = document.getElementById('composer-attach');
  const preview = document.getElementById('composer-preview');
  const postBtn = document.getElementById('composer-post');
  const levelSelect = document.getElementById('composer-level');
  if (!textInput || !fileInput || !attachBtn || !preview || !postBtn || !levelSelect) return;

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
    const level = levelSelect.value;

    if (!level) {
      showToast('Choose a priority level first');
      return;
    }
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

    const posts = loadElementPosts(element.key);
    posts.unshift({
      id: `${Date.now()}`,
      element: element.key,
      level,
      text,
      mediaType,
      mediaData,
      liked: false,
      likes: 0,
      createdAt: new Date().toISOString(),
    });
    saveElementPosts(element.key, posts);

    textInput.value = '';
    levelSelect.value = '';
    pendingFile = null;
    fileInput.value = '';
    preview.hidden = true;

    renderFeed(element);
    showToast('Posted!');
  });
}

// ── 5. Boot ───────────────────────────────────────────────────

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
