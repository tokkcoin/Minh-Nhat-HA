/* ============================================================
   Life Balance — main.js
   index.html boot: "How it works" live preview + the unified
   multi-element feed that replaced the old 5-card dashboard.
   Shared helpers/metadata (ELEMENTS, PRIORITY_LEVELS, post storage,
   timeAgo, escapeHtml, readFileAsDataUrl) live in common.js.
   ============================================================ */

'use strict';

// ── 1. How It Works — live post-count preview ───────────────
// Reads the same localStorage keys journal.js writes to
// (lifebalance_journal_<element>) and counts posts per range.

const HOW_PREVIEW_ELEMENTS = ['metal', 'wood', 'water', 'fire', 'earth'];

const HOW_PREVIEW_RANGE_START = {
  today: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  },
  week: () => Date.now() - 7 * 24 * 60 * 60 * 1000,
  month: () => Date.now() - 30 * 24 * 60 * 60 * 1000,
};

function countJournalPosts(range) {
  const since = HOW_PREVIEW_RANGE_START[range]?.() ?? 0;
  const counts = {};

  HOW_PREVIEW_ELEMENTS.forEach(key => {
    counts[key] = loadElementPosts(key).filter(
      post => new Date(post.createdAt).getTime() >= since
    ).length;
  });

  return counts;
}

function renderHowPreview(range) {
  const counts = countJournalPosts(range);
  const maxCount = Math.max(1, ...Object.values(counts));

  HOW_PREVIEW_ELEMENTS.forEach(key => {
    const bar = document.querySelector(`.how-preview__bar--${key}`);
    if (!bar) return;
    const fill = bar.querySelector('.how-preview__bar-fill');
    const countEl = bar.querySelector('.how-preview__bar-count');
    const count = counts[key];
    if (fill) fill.style.width = `${(count / maxCount) * 100}%`;
    if (countEl) countEl.textContent = count;
  });
}

function initHowPreview() {
  const tabs = document.querySelectorAll('.how-preview__tab');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderHowPreview(tab.dataset.range);
    });
  });

  renderHowPreview(document.querySelector('.how-preview__tab.active')?.dataset.range ?? 'today');
}

// ── 2. Unified Feed — merge all 5 elements' posts ────────────

let activeFeedFilter = 'all';

function loadAllPostsMerged() {
  const merged = [];
  Object.values(ELEMENTS).forEach(el => {
    loadElementPosts(el.key).forEach(post => merged.push({ ...post, element: post.element || el.key }));
  });
  merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return merged;
}

function renderUnifiedFeed() {
  const feed = document.getElementById('feed');
  if (!feed) return;

  const all = loadAllPostsMerged();
  const filtered = activeFeedFilter === 'all' ? all : all.filter(p => p.element === activeFeedFilter);

  feed.innerHTML = '';

  if (filtered.length === 0) {
    const elName = ELEMENTS[activeFeedFilter]?.name;
    feed.innerHTML = `<p class="feed-empty">No posts yet${elName ? ` for ${elName}` : ''}.</p>`;
    return;
  }

  filtered.forEach(post => feed.appendChild(buildUnifiedPostCard(post)));
}

function buildUnifiedPostCard(post) {
  const element = ELEMENTS[post.element];
  const card = document.createElement('article');
  card.className = 'post-card';

  const media = post.mediaType === 'image'
    ? `<img class="post-card__media" src="${post.mediaData}" alt="">`
    : post.mediaType === 'video'
      ? `<video class="post-card__media" src="${post.mediaData}" controls></video>`
      : post.mediaType === 'audio'
        ? `<audio class="post-card__media post-card__media--audio" src="${post.mediaData}" controls></audio>`
        : '';

  const levelInfo = PRIORITY_LEVELS[post.level];

  card.innerHTML = `
    <div class="post-card__head">
      <span class="post-card__avatar">${element?.icon ?? '❔'}</span>
      <div>
        <strong class="post-card__author">You</strong>
        <span class="post-card__time">${timeAgo(post.createdAt)}</span>
      </div>
      <button class="post-card__delete" type="button" aria-label="Delete post">✕</button>
    </div>
    <div class="post-card__tags">
      <span class="post-card__badge post-card__badge--${post.element}">${element?.icon ?? ''} ${element?.name ?? 'Unknown'}</span>
      ${levelInfo ? `<span class="post-card__level" style="color:${levelInfo.color}">${levelInfo.label}</span>` : ''}
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

  card.querySelector('.post-card__like')?.addEventListener('click', () => toggleFeedLike(post));
  card.querySelector('.post-card__delete')?.addEventListener('click', () => deleteFeedPost(post));

  return card;
}

function toggleFeedLike(post) {
  const posts = loadElementPosts(post.element);
  const target = posts.find(p => p.id === post.id);
  if (!target) return;
  target.liked = !target.liked;
  target.likes += target.liked ? 1 : -1;
  saveElementPosts(post.element, posts);
  renderUnifiedFeed();
}

function deleteFeedPost(post) {
  const posts = loadElementPosts(post.element).filter(p => p.id !== post.id);
  saveElementPosts(post.element, posts);
  renderUnifiedFeed();
}

// ── 3. Stories-style element filter row ───────────────────────

function initStoriesRow() {
  const chips = document.querySelectorAll('.story-chip');
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      activeFeedFilter = chip.dataset.filter;
      renderUnifiedFeed();
    });
  });
}

// ── 4. Unified Composer ────────────────────────────────────────

function initUnifiedComposer() {
  const textInput = document.getElementById('composer-text');
  const fileInput = document.getElementById('composer-file');
  const attachBtn = document.getElementById('composer-attach');
  const preview = document.getElementById('composer-preview');
  const postBtn = document.getElementById('composer-post');
  const elementSelect = document.getElementById('composer-element');
  const levelSelect = document.getElementById('composer-level');
  if (!textInput || !fileInput || !attachBtn || !preview || !postBtn || !elementSelect || !levelSelect) return;

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
    const element = elementSelect.value;
    const level = levelSelect.value;

    if (!element) {
      showToast('Choose an element first');
      return;
    }
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

    const posts = loadElementPosts(element);
    posts.unshift({
      id: `${Date.now()}`,
      element,
      level,
      text,
      mediaType,
      mediaData,
      liked: false,
      likes: 0,
      createdAt: new Date().toISOString(),
    });
    saveElementPosts(element, posts);

    textInput.value = '';
    elementSelect.value = '';
    levelSelect.value = '';
    pendingFile = null;
    fileInput.value = '';
    preview.hidden = true;

    renderUnifiedFeed();
    showToast('Posted!');
  });
}

// ── 5. Stories (separate from the element filter row above) ───
// Single-user "Your Story" tray: photo/video + optional caption,
// no expiry (stays until deleted) — see .claude/memory.md, 2026-06-21.

const STORIES_KEY = 'lifebalance_stories';

function loadStories() {
  try {
    return JSON.parse(localStorage.getItem(STORIES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStories(stories) {
  localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
}

function renderStories() {
  const list = document.getElementById('stories-list');
  if (!list) return;
  list.innerHTML = '';
  loadStories().forEach(story => list.appendChild(buildStoryChip(story)));
}

function buildStoryChip(story) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'story-chip story-chip--user';

  const thumb = story.mediaType === 'image'
    ? `<img src="${story.mediaData}" alt="">`
    : `<video src="${story.mediaData}" muted></video>`;

  btn.innerHTML = `
    <span class="story-chip__icon story-chip__icon--thumb" aria-hidden="true">${thumb}</span>
    <span class="story-chip__label">You</span>
  `;
  btn.addEventListener('click', () => openStoryViewer(story));
  return btn;
}

function initStoryCreate() {
  const createBtn = document.getElementById('story-create-btn');
  const fileInput = document.getElementById('story-file-input');
  if (!createBtn || !fileInput) return;

  createBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > MAX_MEDIA_BYTES) {
      showToast('File too large for local demo storage (max 4MB)');
      fileInput.value = '';
      return;
    }

    const mediaType = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
      : null;
    if (!mediaType) {
      showToast('Stories need a photo or video');
      fileInput.value = '';
      return;
    }

    const mediaData = await readFileAsDataUrl(file);
    const caption = (prompt('Add a caption (optional):', '') ?? '').trim();

    const stories = loadStories();
    stories.unshift({
      id: `${Date.now()}`,
      mediaType,
      mediaData,
      caption,
      createdAt: new Date().toISOString(),
    });
    saveStories(stories);
    fileInput.value = '';

    renderStories();
    showToast('Story posted!');
  });
}

function openStoryViewer(story) {
  const overlay = document.getElementById('story-viewer');
  const mediaWrap = document.getElementById('story-viewer-media');
  const captionEl = document.getElementById('story-viewer-caption');
  if (!overlay || !mediaWrap) return;

  mediaWrap.innerHTML = story.mediaType === 'image'
    ? `<img src="${story.mediaData}" alt="">`
    : `<video src="${story.mediaData}" controls autoplay></video>`;
  if (captionEl) captionEl.textContent = story.caption || '';

  overlay.dataset.storyId = story.id;
  overlay.hidden = false;
}

function closeStoryViewer() {
  const overlay = document.getElementById('story-viewer');
  if (!overlay) return;
  overlay.hidden = true;
  const mediaWrap = document.getElementById('story-viewer-media');
  if (mediaWrap) mediaWrap.innerHTML = ''; // stop any playing video
}

function deleteCurrentStory() {
  const overlay = document.getElementById('story-viewer');
  const id = overlay?.dataset.storyId;
  if (!id) return;
  saveStories(loadStories().filter(s => s.id !== id));
  closeStoryViewer();
  renderStories();
  showToast('Story deleted');
}

function initStoryViewer() {
  document.getElementById('story-viewer-close')?.addEventListener('click', closeStoryViewer);
  document.getElementById('story-viewer-delete')?.addEventListener('click', deleteCurrentStory);
  document.getElementById('story-viewer')?.addEventListener('click', evt => {
    if (evt.target.id === 'story-viewer') closeStoryViewer();
  });
}

// ── 6. Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initPiSdk();
  initHowPreview();
  initStoriesRow();
  initUnifiedComposer();
  renderUnifiedFeed();
  initStoryCreate();
  initStoryViewer();
  renderStories();
});
