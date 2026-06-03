# Dialogue Component Showcase Site

A high-performance marketing/showcase site for the **Dialogue Component** Unreal Engine asset by DYLO Gaming. Content is drawn from the [project wiki](https://github.com/dylogaming/Dialogue-Component/wiki).

Zero build step. Pure HTML, CSS, and vanilla JavaScript so it runs at high frame rates and deploys anywhere.

## Highlights

- Animated aurora background, scroll-reactive grid, film grain, and a smoothed custom cursor.
- A live, character-by-character typing dialogue demo in the hero.
- An interactive branching "play the branch" runtime with gold/evidence conditions.
- A generated node-graph visual with animated connection edges.
- Reveal-on-scroll, count-up stats, 3D tilt cards, and magnetic buttons.
- Fully responsive and respects `prefers-reduced-motion`.

## Run locally

No terminal required to view it. Just **double-click `index.html`**. (Live Server in VS Code also works for auto-reload.)

The documentation lives at `docs.html` and renders from `docs-content.js` (a content file), so the page works over both `file://` and a web server.

## Editing the docs

The docs have a built-in GitBook-style editor that only turns on when the page is opened through the local editor server (so the public site stays read-only).

1. **Double-click `Edit Docs.vbs`** (in this folder). It starts a tiny local server with no console window and opens the editor in your browser.
2. Click **Edit** (bottom-right). Now you can:
   - Click any text to edit it inline.
   - **Paste** an image or gif straight from the clipboard, or drag media files in.
   - Add an image or video, or pick from existing screenshots with **Existing**.
   - Click an image to **Annotate** it (arrows, boxes, pen, text, snipping-tool style), **Replace**, resize, or delete it.
3. Click **Save** (or Ctrl+S). Changes are written to `docs-content.js` (a `.bak` backup is kept).
4. Commit and push to publish.

## Deploy

Pushed to GitHub Pages automatically via `.github/workflows/deploy.yml` when the repo is made public, or enable Pages on the `main` branch.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Landing page markup and content |
| `styles.css` | Landing-page styling and animation |
| `script.js` | Cursor, reveals, typing demo, branching player, node graph |
| `docs.html` | Documentation shell (renders from the content file) |
| `docs-content.js` | The documentation content (edited by the editor) |
| `docs-render.js` | Builds the docs DOM + nav from the content |
| `docs.js` | Docs scrollspy, lightbox, mobile sidebar |
| `docs.css` | Docs layout and styling |
| `docs-edit.js` / `docs-edit.css` | The local-only inline editor |
| `server.py` / `Edit Docs.vbs` | Local save-server and its launcher |
| `build-docs.js` | Regenerates `docs-content.js` from the wiki markdown |
| `assets/docs/` | All documentation images and gifs |
| `assets/icon.png` | Plugin icon (favicon + brand mark) |
