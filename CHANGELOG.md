# Changelog

All notable changes to Flowdot. Format loosely follows [Keep a Changelog](https://keepachangelog.com/);
this project uses [semver](https://semver.org/).

## 0.6.0 — Initial public release

- Zero-dependency framework **and language** (`.flow`) for animated architecture / data-flow diagrams on
  HTML canvas 2D.
- **Structure:** `node` / `edge` (`->`) / `road` (`~>`) / `lane` / `rail` / `zone`, with coordinate-free
  lane × rail auto-layout.
- **Behaviour:** `flow` routes with per-hop `{ actions }` (the closed verb set), weighted `pick` (`|`) and
  fan-out (`&`), `spawn`, `after`/`on` events, `every … per … when` periodics, and a `seed` for
  determinism.
- **Comprehensions:** `set` / `each … in` / `{expr}` interpolation.
- **Theming:** named palettes and registered theme packs (dark / light / corporate).
- **Controls (zero-JS):** a `controls` line auto-renders a play/pause · reset · speed bar; each `mode`
  renders a toggle button.
- **Distribution:** a UMD browser bundle (`dist/flowdot.js`) and an ESM build (`dist/flowdot.mjs`);
  works via `<script>` / `file://`, bundler `import`, Node `require`, and CDN (unpkg / jsDelivr).
- **Accessibility:** every canvas mount sets `role="img"` + an `aria-label`/text fallback and honours
  `prefers-reduced-motion`.
- MIT licensed.
