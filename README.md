# Flowdot

<img src="examples/assets/flowdot-logo.png" alt="Flowdot" width="180">

Flowdot makes animated data-flow diagrams on an HTML canvas.

Write a small `.flow` file. Flowdot draws the system and moves packets through it.

## Principles

- Describe data flow. Do not script a timeline.
- Use rates, durations, and probabilities for ambient motion.
- Use JavaScript for exact events and calculations.
- Keep structure readable when animation is paused.
- Prefer a few general parts over domain-specific shapes.
- Keep the browser runtime dependency-free.

## Quick start

```html
<script type="text/flow" data-flowdot>
diagram "Request path" 640x240 dark
controls
lane left
lane right
rail middle
node client lane:left rail:middle name:"Client"
node service core lane:right rail:middle name:"Service"
edge client -> service label:"request"
flow requests rate:2 : client ~0.6 service
</script>
<script src="dist/flowdot.js"></script>
```

The `data-flowdot` marker mounts the diagram. Flowdot inserts the canvas.

For a packaged project:

```sh
npm install flowdot
```

```js
import { mount } from 'flowdot';

const view = mount(canvas, source);
view.dispose();
```

For a static page, copy `dist/flowdot.js` into the project. Do not link to a local
`node_modules` directory.

## Learn Flowdot

- [Guide](docs/GUIDE.md): concepts, patterns, and host events.
- [API](docs/API.md): exact syntax and JavaScript surface.
- [Examples](examples/index.html): runnable diagrams with visible source.
- [IR schema](docs/ir.schema.json): generated scene data schema.
