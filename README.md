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

## Deploy

Pushed to GitHub Pages automatically via `.github/workflows/deploy.yml` when the repo is made public, or enable Pages on the `main` branch.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Page markup and content |
| `styles.css` | All styling and animation |
| `script.js` | Cursor, reveals, typing demo, branching player, node graph |
| `assets/icon.png` | Plugin icon (favicon + brand mark) |
