/* ============================================================
   Life Balance — main.js
   index.html boot: "How it works" live preview + the unified
   multi-element feed that replaced the old 5-card dashboard.
   Shared helpers/metadata (ELEMENTS, PRIORITY_LEVELS, post storage,
   timeAgo, escapeHtml, uploadMediaToCloudinary) live in common.js.
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
    loadElementPosts(el.key).forEach(post => merged.push({ ...post, element: post.element || el.key, kind: 'post' }));
  });
  loadStories().forEach(story => merged.push({ ...story, kind: 'story' }));
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

  filtered.forEach(item => feed.appendChild(item.kind === 'story' ? buildStoryFeedCard(item) : buildUnifiedPostCard(item)));
}

function buildUnifiedPostCard(post) {
  const element = ELEMENTS[post.element];
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

  if (post.mediaType === 'video') {
    const videoEl = card.querySelector('.post-card__media');
    const objectUrl = dataUrlToObjectUrl(post.mediaData);
    if (videoEl && objectUrl) videoEl.src = objectUrl;
    else if (videoEl) videoEl.replaceWith('⚠️ This video is corrupted and can\'t be played.');
  }

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

function buildStoryFeedCard(story) {
  const element = ELEMENTS[story.element];
  const card = document.createElement('article');
  card.className = 'post-card post-card--story';

  card.innerHTML = `
    <div class="post-card__head">
      <span class="post-card__avatar">${element?.icon ?? '❔'}</span>
      <div>
        <strong class="post-card__author">You</strong>
        <span class="post-card__time">${timeAgo(story.createdAt)} · Story</span>
      </div>
      <button class="post-card__delete" type="button" aria-label="Delete story">✕</button>
    </div>
    <div class="post-card__tags">
      <span class="post-card__badge post-card__badge--${story.element}">${element?.icon ?? ''} ${element?.name ?? 'Unknown'}</span>
    </div>
    ${story.caption ? `<p class="post-card__text">${escapeHtml(story.caption)}</p>` : ''}
    <div class="post-card__story-media"></div>
  `;

  const mediaWrap = card.querySelector('.post-card__story-media');
  mediaWrap.appendChild(buildStoryThumbMedia(story));
  if (story.mediaType === 'video') {
    const playIcon = document.createElement('span');
    playIcon.className = 'post-card__story-play';
    playIcon.setAttribute('aria-hidden', 'true');
    playIcon.textContent = '▶';
    mediaWrap.appendChild(playIcon);
  }
  mediaWrap.addEventListener('click', () => openStoryViewer(story));

  card.querySelector('.post-card__delete')?.addEventListener('click', evt => {
    evt.stopPropagation();
    deleteFeedStory(story);
  });

  return card;
}

function deleteFeedStory(story) {
  saveStories(loadStories().filter(s => s.id !== story.id));
  renderUnifiedFeed();
  renderStories();
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
    if (file.size > maxBytesForFile(file)) {
      showToast('File too large (max 10MB images / 100MB video & audio)');
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
      postBtn.disabled = true;
      showToast('Uploading...');
      try {
        mediaData = await uploadMediaToCloudinary(pendingFile);
      } catch {
        showToast("Upload failed — check your connection and try again");
        postBtn.disabled = false;
        return;
      }
      postBtn.disabled = false;
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
    if (!saveElementPosts(element, posts)) return;

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
  return safeSetItem(STORIES_KEY, JSON.stringify(stories));
}

function renderStories() {
  const list = document.getElementById('stories-list');
  if (!list) return;
  list.innerHTML = '';
  loadStories().forEach(story => list.appendChild(buildStoryChip(story)));
}

function buildStoryThumbMedia(story) {
  const fallback = () => document.createTextNode(story.mediaType === 'image' ? '🖼️' : '🎬');

  if (story.mediaType === 'image') {
    const img = document.createElement('img');
    img.src = story.mediaData;
    img.alt = '';
    img.addEventListener('error', () => img.replaceWith(fallback()));
    return img;
  }

  const objectUrl = dataUrlToObjectUrl(story.mediaData);
  if (!objectUrl) return fallback();

  const video = document.createElement('video');
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.addEventListener('error', () => video.replaceWith(fallback()));
  return video;
}

function buildStoryChip(story) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'story-chip story-chip--user';

  const icon = document.createElement('span');
  icon.className = 'story-chip__icon story-chip__icon--thumb';
  icon.setAttribute('aria-hidden', 'true');
  if (story.element) icon.style.setProperty('--current-element', `var(--${story.element})`);
  icon.appendChild(buildStoryThumbMedia(story));

  const label = document.createElement('span');
  label.className = 'story-chip__label';
  label.textContent = 'You';

  btn.append(icon, label);
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

    if (file.size > maxBytesForFile(file)) {
      showToast('File too large (max 10MB images / 100MB video)');
      fileInput.value = '';
      return;
    }

    await openStoryEditor(file, story => {
      const stories = loadStories();
      stories.unshift(story);
      if (!saveStories(stories)) return false;
      renderStories();
      renderUnifiedFeed();
      showToast('Story posted!');
    });
    fileInput.value = '';
  });
}

let currentStoryViewerObjectUrl = null;
let storyViewerMusicAudio = null;

function openStoryViewer(story) {
  const overlay = document.getElementById('story-viewer');
  const mediaWrap = document.getElementById('story-viewer-media');
  const captionEl = document.getElementById('story-viewer-caption');
  const badgeEl = document.getElementById('story-viewer-badge');
  if (!overlay || !mediaWrap) return;

  mediaWrap.innerHTML = '';
  currentStoryViewerObjectUrl = null;

  if (storyViewerMusicAudio) {
    storyViewerMusicAudio.pause();
    storyViewerMusicAudio = null;
  }
  if (story.musicTrackId) {
    const track = (window.STORY_MUSIC_TRACKS || []).find(t => t.id === story.musicTrackId);
    if (track) {
      storyViewerMusicAudio = new Audio(track.url);
      storyViewerMusicAudio.volume = story.musicVolume ?? 0.8;
      storyViewerMusicAudio.loop = true;
      storyViewerMusicAudio.play().catch(() => {});
    }
  }

  const element = ELEMENTS[story.element];
  if (badgeEl) {
    badgeEl.hidden = !element;
    if (element) {
      badgeEl.textContent = `${element.icon} ${element.name}`;
      badgeEl.className = `post-card__badge post-card__badge--${story.element}`;
    }
  }

  let media = null;

  if (story.mediaType === 'image') {
    media = document.createElement('img');
    media.src = story.mediaData;
    media.alt = '';
    media.addEventListener('error', () => {
      showToast("Couldn't load this story's photo — it may be corrupted.");
    });
    mediaWrap.appendChild(media);
  } else {
    const objectUrl = dataUrlToObjectUrl(story.mediaData);
    if (!objectUrl) {
      mediaWrap.innerHTML = '<p class="story-viewer__broken">⚠️ This story\'s video is corrupted and can\'t be played. Delete it and post a new one.</p>';
    } else {
      currentStoryViewerObjectUrl = objectUrl;
      media = document.createElement('video');
      media.src = objectUrl;
      media.controls = true;
      media.autoplay = true;
      media.muted = true;       // autoplay is blocked by browsers unless muted
      media.playsInline = true; // required on iOS/Pi Browser to play inline, not fullscreen
      media.addEventListener('error', () => {
        showToast("Couldn't load this story's video — the file may be too large for this device.");
      });
      mediaWrap.appendChild(media);

      if (story.trimStart != null && story.trimEnd != null) {
        media.addEventListener('loadedmetadata', () => { media.currentTime = story.trimStart; });
        applyTrimLoop(media, story);
      }
    }
  }

  if (media && story.filterKey) media.style.filter = FILTER_PRESETS[story.filterKey] || '';

  const layersEl = document.createElement('div');
  layersEl.className = 'story-editor__layers';
  mediaWrap.appendChild(layersEl);
  renderLayersReadOnly(layersEl, story.layers);

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
  if (currentStoryViewerObjectUrl) {
    URL.revokeObjectURL(currentStoryViewerObjectUrl);
    currentStoryViewerObjectUrl = null;
  }
  if (storyViewerMusicAudio) {
    storyViewerMusicAudio.pause();
    storyViewerMusicAudio = null;
  }
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

// ── 6. Bottom Navigation ─────────────────────────────────────

function initBottomNav() {
  const tabs = document.querySelectorAll('.bottom-nav__tab');
  const contents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    contents.forEach(el => { el.hidden = el.id !== `tab-${tabId}`; });
    tabs.forEach(t => t.classList.toggle('bottom-nav__tab--active', t.dataset.tab === tabId));
    sessionStorage.setItem('activeTab', tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // "Get started" button in hero switches to Activities
  document.getElementById('hero-get-started')?.addEventListener('click', () => switchTab('activities'));

  // Restore last-visited tab across navigations within the same session
  const saved = sessionStorage.getItem('activeTab') || 'home';
  switchTab(saved);
}

// ── 7. Boot ───────────────────────────────────────────────────
// runBootStep (common.js) isolates each step so one failure can't cascade.

document.addEventListener('DOMContentLoaded', () => {
  runBootStep(initPiSdk);
  runBootStep(initBottomNav);
  runBootStep(initHowPreview);
  runBootStep(initStoriesRow);
  runBootStep(initUnifiedComposer);
  runBootStep(renderUnifiedFeed);
  runBootStep(initStoryCreate);
  runBootStep(initStoryViewer);
  runBootStep(renderStories);
});
