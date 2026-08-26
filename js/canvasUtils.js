/* ============================================================
   Life Balance — canvasUtils.js
   Shared canvas-drawing helpers for the 2D-canvas games.

   Added 2026-08-26 (game-hub backlog item #2b): readColors()/
   loadPaletteColors() (the CSS-token→canvas-color reader) and
   roundRectPath() were byte-for-byte duplicated between
   game-arena.js and game-artillery.js. This module is now the one
   shared place for the parts that were truly identical; each game
   still keeps its own color-map shape (the two pages use different
   sets of roles/tokens), just built on top of readCssVar() instead
   of a locally copy-pasted reader.

   Loaded as a plain global (window.CanvasUtils), same script-tag
   convention as elementStats.js/data/*.js — no bundler, no ES
   modules, so every page that needs it must add its own
   <script src="js/canvasUtils.js"> tag before the script that uses
   it.
   ============================================================ */

'use strict';

window.CanvasUtils = {
  // Reads a CSS custom property off :root, falling back to a hardcoded
  // color if the token is missing/empty (e.g. stylesheet not loaded yet).
  readCssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  },

  // Traces a rounded-rect path on the given 2D context — caller still owns
  // fill()/stroke()/clip(). `ctx` is passed explicitly (not read off a
  // shared module-level variable) so this works the same regardless of
  // which game's own `ctx` is currently active.
  roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
