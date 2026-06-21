/* ============================================================
   Life Balance — diagram.js
   Simple freeform mind-map tool for the "Definition" tab on
   journal.html — one diagram per element, hand-built SVG (no
   drawing library), persisted to localStorage.
   Tools: Select/move, Circle, Arrow (connect two circles), Text.
   ============================================================ */

'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';

let diagramElementKey = null;
let diagramState = null; // { nodes: [{id,x,y,r,label}], edges: [{id,fromId,toId}], texts: [{id,x,y,content}] }
let activeDiagramTool = 'select';
let diagramSelection = null; // { type: 'node'|'text', id }
let diagramDrag = null;      // { type, id, offsetX, offsetY }
let arrowSourceId = null;

const DIAGRAM_HINTS = {
  select: 'Click a circle or text to select it; drag to move.',
  circle: 'Click the canvas to add a circle, then type its name.',
  arrow: 'Click a circle, then click another circle to connect them.',
  text: 'Click the canvas to add a text note.',
};

// ── 1. Storage ───────────────────────────────────────────────

function diagramStorageKey(elementKey) {
  return `lifebalance_definition_${elementKey}`;
}

function loadDiagram(elementKey) {
  try {
    return JSON.parse(localStorage.getItem(diagramStorageKey(elementKey))) || { nodes: [], edges: [], texts: [] };
  } catch {
    return { nodes: [], edges: [], texts: [] };
  }
}

function saveDiagram() {
  localStorage.setItem(diagramStorageKey(diagramElementKey), JSON.stringify(diagramState));
}

function genDiagramId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── 2. Boot ───────────────────────────────────────────────────

function initDiagram(element) {
  diagramElementKey = element.key;
  diagramState = loadDiagram(element.key);

  const svg = document.getElementById('diagram-canvas');
  if (!svg) return;

  document.querySelectorAll('.diagram-tool[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setActiveDiagramTool(btn.dataset.tool));
  });
  document.getElementById('diagram-delete')?.addEventListener('click', deleteDiagramSelection);
  document.getElementById('diagram-clear')?.addEventListener('click', clearDiagram);

  svg.addEventListener('mousedown', onDiagramMouseDown);
  svg.addEventListener('mousemove', onDiagramMouseMove);
  svg.addEventListener('click', onDiagramClick);
  svg.addEventListener('dblclick', onDiagramDoubleClick);
  window.addEventListener('mouseup', onDiagramMouseUp);

  renderDiagram();
}

function setActiveDiagramTool(tool) {
  activeDiagramTool = tool;
  arrowSourceId = null;
  document.querySelectorAll('.diagram-tool[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  const hint = document.getElementById('diagram-hint');
  if (hint) hint.textContent = DIAGRAM_HINTS[tool] ?? '';
}

function clearDiagram() {
  if (!confirm('Clear this element’s whole diagram?')) return;
  diagramState = { nodes: [], edges: [], texts: [] };
  diagramSelection = null;
  saveDiagram();
  renderDiagram();
}

// ── 3. Pointer Handling ────────────────────────────────────────

function diagramPoint(svg, evt) {
  const rect = svg.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

function onDiagramMouseDown(evt) {
  if (activeDiagramTool !== 'select') return;
  const nodeId = evt.target.closest('[data-node-id]')?.dataset.nodeId;
  const textId = evt.target.closest('[data-text-id]')?.dataset.textId;
  const pt = diagramPoint(evt.currentTarget, evt);

  if (nodeId) {
    const node = diagramState.nodes.find(n => n.id === nodeId);
    if (!node) return;
    diagramSelection = { type: 'node', id: nodeId };
    diagramDrag = { type: 'node', id: nodeId, offsetX: pt.x - node.x, offsetY: pt.y - node.y };
    renderDiagram();
  } else if (textId) {
    const text = diagramState.texts.find(t => t.id === textId);
    if (!text) return;
    diagramSelection = { type: 'text', id: textId };
    diagramDrag = { type: 'text', id: textId, offsetX: pt.x - text.x, offsetY: pt.y - text.y };
    renderDiagram();
  }
}

function onDiagramMouseMove(evt) {
  if (!diagramDrag) return;
  const pt = diagramPoint(evt.currentTarget, evt);
  const list = diagramDrag.type === 'node' ? diagramState.nodes : diagramState.texts;
  const item = list.find(it => it.id === diagramDrag.id);
  if (!item) return;
  item.x = pt.x - diagramDrag.offsetX;
  item.y = pt.y - diagramDrag.offsetY;
  renderDiagram();
}

function onDiagramMouseUp() {
  if (diagramDrag) {
    saveDiagram();
    diagramDrag = null;
  }
}

function onDiagramClick(evt) {
  const svg = evt.currentTarget;
  const pt = diagramPoint(svg, evt);
  const nodeId = evt.target.closest('[data-node-id]')?.dataset.nodeId;
  const textId = evt.target.closest('[data-text-id]')?.dataset.textId;

  if (activeDiagramTool === 'circle' && !nodeId && !textId) {
    const name = prompt('Name this circle:', '');
    if (name === null) return;
    diagramState.nodes.push({ id: genDiagramId(), x: pt.x, y: pt.y, r: 36, label: name.trim() || 'Untitled' });
    saveDiagram();
    renderDiagram();
    setActiveDiagramTool('select');
    return;
  }

  if (activeDiagramTool === 'text' && !nodeId && !textId) {
    const content = prompt('Text content:', '');
    if (content === null) return;
    diagramState.texts.push({ id: genDiagramId(), x: pt.x, y: pt.y, content: content.trim() || 'Note' });
    saveDiagram();
    renderDiagram();
    setActiveDiagramTool('select');
    return;
  }

  if (activeDiagramTool === 'arrow' && nodeId) {
    if (!arrowSourceId) {
      arrowSourceId = nodeId;
      return;
    }
    if (arrowSourceId !== nodeId) {
      diagramState.edges.push({ id: genDiagramId(), fromId: arrowSourceId, toId: nodeId });
      saveDiagram();
      renderDiagram();
    }
    arrowSourceId = null;
    setActiveDiagramTool('select');
    return;
  }

  if (activeDiagramTool === 'select' && !nodeId && !textId) {
    diagramSelection = null;
    renderDiagram();
  }
}

function onDiagramDoubleClick(evt) {
  if (activeDiagramTool !== 'select') return;
  const nodeId = evt.target.closest('[data-node-id]')?.dataset.nodeId;
  const textId = evt.target.closest('[data-text-id]')?.dataset.textId;

  if (nodeId) {
    const node = diagramState.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const name = prompt('Rename circle:', node.label);
    if (name === null) return;
    node.label = name.trim() || node.label;
    saveDiagram();
    renderDiagram();
  } else if (textId) {
    const text = diagramState.texts.find(t => t.id === textId);
    if (!text) return;
    const content = prompt('Edit text:', text.content);
    if (content === null) return;
    text.content = content.trim() || text.content;
    saveDiagram();
    renderDiagram();
  }
}

function deleteDiagramSelection() {
  if (!diagramSelection) {
    showToast('Nothing selected');
    return;
  }
  if (diagramSelection.type === 'node') {
    diagramState.nodes = diagramState.nodes.filter(n => n.id !== diagramSelection.id);
    diagramState.edges = diagramState.edges.filter(
      e => e.fromId !== diagramSelection.id && e.toId !== diagramSelection.id
    );
  } else {
    diagramState.texts = diagramState.texts.filter(t => t.id !== diagramSelection.id);
  }
  diagramSelection = null;
  saveDiagram();
  renderDiagram();
}

// ── 4. Render ───────────────────────────────────────────────

function renderDiagram() {
  const svg = document.getElementById('diagram-canvas');
  if (!svg) return;
  svg.innerHTML = '';
  svg.appendChild(buildArrowheadDefs());

  diagramState.edges.forEach(edge => {
    const from = diagramState.nodes.find(n => n.id === edge.fromId);
    const to = diagramState.nodes.find(n => n.id === edge.toId);
    if (from && to) svg.appendChild(buildDiagramArrow(from, to));
  });

  diagramState.nodes.forEach(node => svg.appendChild(buildDiagramNode(node)));
  diagramState.texts.forEach(text => svg.appendChild(buildDiagramText(text)));
}

function buildArrowheadDefs() {
  const defs = document.createElementNS(SVG_NS, 'defs');
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', 'diagram-arrowhead');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('refX', '6');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M0,0 L6,3 L0,6 Z');
  path.setAttribute('fill', 'var(--text-secondary)');
  marker.appendChild(path);
  defs.appendChild(marker);
  return defs;
}

function buildDiagramArrow(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / dist;
  const uy = dy / dist;

  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', from.x + ux * from.r);
  line.setAttribute('y1', from.y + uy * from.r);
  line.setAttribute('x2', to.x - ux * to.r);
  line.setAttribute('y2', to.y - uy * to.r);
  line.setAttribute('class', 'diagram-edge');
  line.setAttribute('marker-end', 'url(#diagram-arrowhead)');
  return line;
}

function buildDiagramNode(node) {
  const g = document.createElementNS(SVG_NS, 'g');
  const selected = diagramSelection?.type === 'node' && diagramSelection.id === node.id;
  g.setAttribute('class', `diagram-node${selected ? ' selected' : ''}`);
  g.setAttribute('data-node-id', node.id);

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', node.x);
  circle.setAttribute('cy', node.y);
  circle.setAttribute('r', node.r);
  g.appendChild(circle);

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', node.x);
  text.setAttribute('y', node.y);
  text.textContent = node.label;
  g.appendChild(text);

  return g;
}

function buildDiagramText(textItem) {
  const g = document.createElementNS(SVG_NS, 'g');
  const selected = diagramSelection?.type === 'text' && diagramSelection.id === textItem.id;
  g.setAttribute('class', `diagram-text-node${selected ? ' selected' : ''}`);
  g.setAttribute('data-text-id', textItem.id);

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', textItem.x);
  text.setAttribute('y', textItem.y);
  text.textContent = textItem.content;
  g.appendChild(text);

  return g;
}
