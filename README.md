# Flowdot

A tiny, **zero-dependency** framework **and language** for **animated architecture / data-flow
diagrams** on HTML canvas 2D — boxes, ring buffers, matrices, roads, and packets that flow along
routes and keep one identity, so a dot never teleports or changes colour mid-air.

**▶ [Live example gallery](https://ljopek.github.io/flowdot/examples/)** — every feature running in your browser, each with its `.flow` source.

- **Zero dependencies.** Classic `<script>` tags — diagrams open straight from disk (`file://`), no
  build step. Also ships an ESM build for bundlers and a CommonJS entry for Node.
- **Zero authored JavaScript.** Write a `.flow` source; the library parses, lays out, and animates it.
- **A real language.** Structure (`node`/`edge`/`lane`/`rail`/`zone`) **and** behaviour
  (`flow`/`spawn`/`every`/`on`/`mode`) are declared in `.flow` and compiled to an animated diagram.

## Install

```sh
npm install flowdot
```

Or drop it in from a CDN — no install, no build:

```html
<!-- unpkg (minified) -->
<script src="https://unpkg.com/flowdot/dist/flowdot.min.js"></script>
<!-- or jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/flowdot/dist/flowdot.min.js"></script>
```

## Quick start (zero-JS)

Put a `.flow` source in a `<script type="text/flow" data-flowdot>` and include the library — it
auto-boots on load, inserting a `<canvas>` and animating it. No other JavaScript.

```html
<script type="text/flow" data-flowdot>
diagram "one source → one worker" 680x240 dark
lane in
lane out
rail mid
node src box  lane:in  rail:mid name:"Source"
node dst core lane:out rail:mid name:"Worker"
edge src.out -> dst.in
flow f rate:0.7 : src ~0.9 dst
</script>
<script src="https://cdn.jsdelivr.net/npm/flowdot/dist/flowdot.js"></script>
```

Add a `controls` line to the source and the library auto-renders a play/pause · reset · speed bar —
still zero authored JavaScript.

## Use it from code

ESM (bundlers, modern browsers):

```js
import { mount } from 'flowdot';

mount(document.querySelector('#diagram'), `
  diagram "hello" 400x160 dark
  lane a
  lane b
  rail r
  node x box  lane:a rail:r name:"A"
  node y core lane:b rail:r name:"B"
  edge x.out -> y.in
  flow f rate:0.8 : x ~0.9 y
`);
```

CommonJS (Node):

```js
const { Flow, SceneBuilder, Diagram } = require('flowdot');
const ir = Flow.parse('diagram "x" 400x200 dark\nnode a box name:"A"');
```

## Gallery

The best way to see what Flowdot can do is the **[live example gallery](https://ljopek.github.io/flowdot/examples/)** — one feature
per example, grouped by category, each rendered live and showing its own `.flow` source:

- **Structure** — nodes, edges, zones, and list comprehensions.
- **Layout** — coordinate-free `lane` × `rail` auto-layout.
- **Behaviour** — flows, weighted picks, fan-out, hop actions, scheduling, periodics, drop/events.
- **Controls** — an auto-rendered transport bar (play/pause/reset/speed) and mode toggles.
- **Theming** — named palettes and registered theme packs (dark / light / corporate).

## Docs

- **[API.md](docs/API.md)** — the three ways to build a diagram (imperative, IR builder, `.flow`) and the full surface.
- **[AI-AUTHORING.md](docs/AI-AUTHORING.md)** — a precise, standalone spec for an AI agent authoring a diagram in one pass.
- **[HOWTO.md](docs/HOWTO.md)** — every feature with a minimal snippet and a live example.
- **[FLOW-FORMAT.md](docs/FLOW-FORMAT.md)** — the `.flow` grammar · **[ERRORS.md](docs/ERRORS.md)** — every located error.

## License

MIT © 2026 ljopek
