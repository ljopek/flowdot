# Flowdot API

This file lists the supported DSL and JavaScript API.

See the [guide](GUIDE.md) for concepts and examples.

## File rules

- Use one statement per line.
- Use two or more spaces for an `each` body.
- Use `key:value` for attributes.
- Quote text that contains spaces.
- Use `[a, b, "c d"]` for a list.
- Use `#sky`, `#series0`, or `#5cb4ff` for a color.
- Start a comment with `#` followed by a space.

`flowdot 1` is an optional version marker. The current format is `1.0`.

`set` and `each` expand before parsing. Use `{name}`, `{list[i]}`, or `{1+i}` inside the repeated
lines. Repeats can be nested.

## Top-level statements

| Statement | Form |
|---|---|
| Diagram | `diagram "Title" 800x400 dark` |
| Version | `flowdot 1` |
| Lane | `lane id [x:N] [w:N]` |
| Rail | `rail id [y:N]` |
| Node | `node id [kind] [attributes]` |
| Zone | `zone id ["Label"] [attributes]` |
| Edge | `edge from -> to [attributes]` |
| Road | `road from ~> to [attributes]` |
| Flow | `flow id rate:N [attributes] : route` |
| Values | `set name = value...` |
| Repeat | `each name in 0..3:` or `each name in [a,b]:` |
| Controls | `controls` |
| Theme switch | `theme-toggle` |
| Derived edges | `auto-edges` |
| Kind colors | `colors box:#sky edge:#muted` |
| Seed | `seed 42` or `seed 0x2a` |
| Event | `on name: actions` |
| Periodic | `every seconds per item in list [when expression] : actions` |
| Mode | `mode name: effects` |
| Note | `note "Text" -> node` |
| Legend | `legend "Text" #sky` |
| Divider | `divider ["Text"] x1,y1 -> x2,y2 [#color] [solid]` |
| Ghost | `ghost "Text" x,y [-> x2,y2] [#color]` |
| Narration | `narrate seconds node... : "Text"` |
| Join | `join node : inputA inputB...` |
| Import | `import "file.flow"` |
| Host model | `model "module"` or `model BrowserGlobal` |

`behavior seed:N` is an optional section marker. It does not create a block.

## Layout

Bare lanes become equal columns. Bare rails become equal rows.

A node can use `lane:id`, `rail:id`, coordinates, or both. Explicit values win.

Nodes with the same lane and no rail stack vertically. Nodes with the same rail and no lane
spread horizontally. Declaration order sets their order.

A `lane:` or `rail:` reference creates a missing track. Declare tracks when their order matters.

A zone can span one or more lanes and rails.

### Default sizes and spacing

A node with no `w`/`h` takes its kind's default size: `box` 140×56, `core` 160×60, `slot` 120×56,
`readout` 120×60, `pipeline` 150×72, `ring` 48 tall (square from its radius). Auto-layout keeps a
24px canvas margin and a 24px gap between tracks; a bare column of slots is 200px wide, a bare row
120px tall. Size the canvas to fit: a row of N default boxes needs roughly `N*140 + (N+1)*24` px of
width. Run `flowdot lint` to catch nodes that overlap or leave the canvas.

## References and ports

- `node` means the node's default port.
- `node.out` and `node.in` select named ports.
- `120,80` is a fixed point.
- All nodes have `center`, `in`, `out`, `left`, `right`, `top`, and `bottom`.
- A matrix also has `cell:i:j`, `rowLeft:i`, `rowRight:i`, and `colTop:j`.
- A pipeline also has `stage:i` and `stages`.

## Edges and roads

Edge attributes:

- `label:"Text"`
- `alpha:N`
- `dashed` or `dash:[on,off]`
- `lw:N`
- `pulseColor:#color`
- `route:ortho` or `route:elbow`
- `id:name`
- a bare `#color`

Road attributes are `id`, `label`, `width`, `route`, and a bare color. The default width is 16.

Orthogonal routing changes the drawn connection. Moving packets still travel directly between
ports.

## Flow routes

```text
flow id rate:2 #sky r:4 max:100 : a ~0.4 b ~0.6 c
```

- `rate` is packets per animation second. It defaults to 1 and must be positive when set.
- `~N` is a hop duration in animation seconds.
- `r` is packet radius.
- `max` stops new emissions while the diagram has that many active packets.
- A bare color sets the packet color.
- `pick v in [a,b]` binds a random value for one emission.

A route can end with one branch group:

```text
# weighted choice
a ~0.4 hub ~0.5 ok @0.8 | ~0.5 failed @0.2

# guarded choice
a ~0.4 hub ~0.5 large when amount > 10 | ~0.5 normal

# fan-out
a ~0.4 hub ~0.5 left & ~0.5 right
```

A branch can have a color and actions. For example:

```text
~0.5 failed @0.2 #rose { count failures }
```

## Actions

Actions are separated by semicolons.

| Action | Effect |
|---|---|
| `count name` | Add one to a counter. |
| `set name = expr` | Set a value. |
| `write target = expr` | Write a latest value and mark it dirty. |
| `push ring` | Add one item to a ring. |
| `drain ring` | Remove one item from a ring. |
| `dirty target` | Mark a value unread. |
| `clean target` | Mark a value read. |
| `drop [if expr]` | Stop the packet. |
| `after N: event` | Emit an event later. |
| `spawn a ~N b` | Start a linear packet route. |
| `highlight grid.row:i` | Highlight one matrix row. |
| `down grid.col:j` | Mark one matrix column down. |
| `up grid.col:j` | Restore one matrix column. |
| `surge ring [= N]` | Add several items to a ring. |
| `snapshot grid[.row:i]` | Highlight a grid or row read. |
| `call [name=]fn(args)` | Call the trusted host model. |

Actions at the first route node run when the packet starts. Other actions run on arrival.

## Expressions

Expressions support:

- numbers and names
- `name[index]`
- `+ - * / %`
- `== != < <= > >=`
- `&& || !`
- parentheses
- `rand()`
- `mode(name)`
- `dirty(name)`
- `now()`

Expressions do not support string literals, objects, or user functions.

## Events, periodics, and modes

`on name: actions` registers a synchronous named event. Emit it with `view.rt.emit(name, data)`.
Payload fields are visible as expression names.

`every N per item in list when condition: actions` runs once per item after each period.

Mode effects are separated by semicolons:

- `spawn x2`
- `down grid.col:1` or `up grid.col:1`
- `surge ring = 4`
- `decay grid x2`

Toggle a mode with `view.rt.setMode(name, true)`.

## Node attributes

The kind defaults to `box`. Give the kind, when set, as the first token after the id — before any
flags or `key:value` attributes (`node q ring slots:16`, not `node q slots:16 ring`). Unknown
attributes on built-in kinds are errors.

### Common node attributes

| key | meaning |
|---|---|
| `x` | Left position. |
| `y` | Top position. |
| `w` | Width. |
| `h` | Height. |
| `inspect` | Hover text or trusted function. |
| `hoverable` | Enable hit testing. |
| `lane` | Lane ID. |
| `rail` | Rail ID. |
| `align` | `left`, `center`, or `right` in a lane. |
| `inset` | Lane margin. |
| `decay` | Activity fade per second. |

### box

| key | meaning |
|---|---|
| `name` | Label. |
| `sub` | Subtitle. |
| `accent` | Accent color. |

### core

| key | meaning |
|---|---|
| `name` | Label. |
| `sub` | Subtitle. |
| `accent` | Accent color. |
| `lit` | Bright inner border. |
| `idle` | Calm lit state. |
| `owns` | Ownership label. |

### slot

| key | meaning |
|---|---|
| `name` | Label. |
| `accent` | Accent color. |
| `value` | Initial value. |

### readout

| key | meaning |
|---|---|
| `watch` | Store key or component property. |
| `name` | Alias for `watch`. |
| `label` | Caption. |
| `unit` | Value suffix. |
| `accent` | Accent color. |
| `value` | Initial number. |

### ring

| key | meaning |
|---|---|
| `slots` | Capacity. Default: 12. |
| `r` | Radius. Default: 16. |
| `color` | Color. |
| `label` | Side label. |

### matrix

| key | meaning |
|---|---|
| `rows` | Row count. |
| `cols` | Column count. |
| `cw` | Cell width. |
| `ch` | Cell height. |
| `gap` | Cell gap. |
| `colColors` | Column colors. |
| `rowLabels` | Row labels. |
| `colLabels` | Column labels. |
| `title` | Title. |
| `subtitle` | Subtitle. |
| `cellNote` | Trusted `(row,col)=>text` function. |

### pipeline

| key | meaning |
|---|---|
| `stages` | Stage labels. |
| `nodeR` | Stage radius. |
| `idle` | Dim stages. |
| `vertical` | Stack stages. |
| `boxed` | Draw a container. |
| `pinned` | Draw a double border. |
| `name` | Container label. |
| `accent` | Accent color. |
| `pad` | First-stage offset. |
| `step` | Stage spacing. |

### zone

| key | meaning |
|---|---|
| `label` | Label. |
| `tint` | Fill color. |
| `accent` | Border color. |
| `lane` | Span one lane. |
| `lanes` | Span several lanes. |
| `rail` | Span one rail. |
| `rails` | Span several rails. |

A zone also accepts `x`, `y`, `w`, `h`, `inspect`, and `hoverable`.

## Mount API

```js
const view = Flowdot.mount(target, source, options);
```

`target` is a canvas, selector, or Diagram-like object. `source` is DSL text or parsed IR.

Options:

- `safe`: disable `import`, `model`, and `call`.
- `seed` or `rng`: control random choices.
- `autoStart:false`: build without starting animation.
- `diagram`: extra `Diagram` options.
- `showSource`: copy source into an element.
- `base` and `resolveImport`: resolve trusted imports.

The returned view has:

- `ir`: parsed scene data.
- `diagram`: renderer and animation loop.
- `rt`: behavior runtime and state store.
- `byId`: components by node ID.
- `edgesById`: named edges.
- `theme`: resolved theme name.
- `dispose()`: stop work and remove listeners.

Useful methods:

- `view.rt.emit(name, payload)`
- `view.rt.setMode(name, on)`
- `view.rt.reset()`
- `view.diagram.setPaused(on)`
- `view.diagram.setSpeed(multiplier)`
- `view.diagram.render()`
- `view.diagram.start()` and `stop()`

`Flowdot.boot(root)` mounts each `script[type="text/flow"][data-flowdot]` element.

## Command line

The package installs a `flowdot` binary.

```sh
flowdot lint diagram.flow     # check syntax and layout; exit 0 clean, 1 on any error
flowdot vendor ./assets       # copy dist/flowdot.js into ./assets for a static/file:// page
```

`lint` parses the file in safe mode and reports syntax and attribute errors with line numbers, then
checks the resolved layout for degenerate sizes, off-canvas nodes, and node overlaps. It is the
validate step of an author → lint → fix → render loop. `import`, `model`, and `call` are flagged in
safe mode rather than run.

## Lower-level API

CommonJS exports all modules from one entry:

```js
const { Flow, SceneBuilder, Diagram, Rng } = require('flowdot');
```

- `Flow.parse(text, options)` returns IR.
- `SceneBuilder.build(ir, diagram)` returns components and edges.
- `SceneBuilder.buildFlows(ir, context)` returns a `FlowRuntime`.
- `SceneBuilder.register(kind, factory)` adds a component kind.
- `Flowdot.registerTheme(name, theme)` adds a theme.
- `Rng(seed)` returns a repeatable random function.

The renderer also exports its component classes and drawing helpers.

## Safe mode

`import`, `model`, and `call` can read files or run host code. Safe mode rejects them.

Auto-boot uses safe mode unless the source element has `data-unsafe`. Direct `parse` and `mount`
calls are trusted by default.

## Current limits

- Timing is illustrative. It is not an event simulator.
- Reset does not restore every component, mode, or random state. Remount for a clean restart.
- Event payloads are not copied. Do not mutate an object after `emit`.
- Orthogonal edges do not change packet paths.
- A join is a global visual barrier. It does not correlate requests.
- Matrix age text is illustrative. It is not measured time.
- Put `drop` after the source node. A source action cannot cancel its own emission.
- Use positive hop durations and weights. Zero currently falls back to the default.
- Give a guarded choice an unguarded fallback.
