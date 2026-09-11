# AGENTS.md

## Project

Vanilla HTML5 Canvas Asteroids clone. No build step, no bundler, no dependencies.
Single entry: `index.html` loads `game.js`. Canvas is 800x600.

## Running

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Structure

- `game.js` — all game logic in one file (ES6 classes, `'use strict'`)
- `index.html` — minimal HTML shell
- `favicon.svg` — ship icon

## Conventions

- UI text (HUD, overlays, README) is in **Spanish**
- No tests, linter, formatter, or typecheck configured
- All movement uses toroidal wrapping (`wrap()` helper)
- Game loop uses `requestAnimationFrame` with dt capped at 50ms
