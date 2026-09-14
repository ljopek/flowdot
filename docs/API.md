# Flowdot API reference

Three entry points, one IR at the centre. In the browser, `<script>` tags expose the globals
`Flowdot`, `SceneBuilder`, `Flow`. In node, `require('flowdot')` returns all three merged.

```
const { Diagram, Box, RingBuffer, FlowRuntime, Rng, SceneBuilder, Flow } = require('flowdot');
```

---

## `Flowdot` (src/flowdot.js) — the renderer

### `new Diagram(canvas, spec)`
The shell: owns the canvas (device-pixel-ratio aware), the animation loop, hit-testing, the
inspector, and layered overlays.
- `spec`: `{ width, height, theme?, onUpdate?(dt, now), background?(g, env), title?, subtitle? }`
- `.add(component)` → component · `.addZone(zone)` · `.addRoad(channel)` · `.connector(from, to, opts)` → Connector
- `.overlay(fn)` — add a draw layer `fn(g, env)` · `.inspector(el, defaultHTML)` — hover text target
- `.start()` · `.stop()` (cancel the RAF loop) · `.dispose()` (stop + drop canvas listeners) · `.paused` · `.setSpeed(x)` · `.now` (seconds) · `.flow` (a FlowSystem)
- `env` passed to draw hooks: `{ now, dt, theme, flow, diagram }`

### Components (all extend `Component`)
A **port** is the contract: `component.port(name) → [x, y]`. Base ports: `center, in/left, out/right,
top, bottom`.

| Class | spec highlights | extra ports / methods |
|---|---|---|
| `Box` | `name, sub, accent` | — |
| `Core` | `name, accent, lit` | double-border "pinned" look |
| `RingBuffer` | `slots, r, color, label` | `push() drain(n) surge(a)`, `.fill/.overruns/.lapping`; ports `in, center` |
| `Matrix` | `rows, cols, cw, ch, gap, colColors, rowLabels, colLabels, title, subtitle, cellNote(i,j)` | `write(i,j,{value,bid,ask,fresh,down}) cell(i,j) decay(dt,rate) setDown(j,b) highlightRow(i,now)`; ports `cell:i:j, rowRight:i, rowLeft:i, colTop:j` |
| `Pipeline` | `stages[], vertical, boxed, pinned, name, accent, nodeR, pad, step, idle` | `pulse(now)`; ports `in, out, stage:k` |
| `Zone` | `label, tint, accent` | a labelled background layer (added via `addZone`) |
| `Channel` | `from, to, roadW, color, label` | a fat animated "road" (added via `addRoad`) |
| `Connector` | via `diagram.connector(from,to,opts)` | `pulse(now)`; `opts: {c, alpha, dash, pulseColor}` |

A port ref (in connectors, channels, flow legs) is `[component, portName]`, `[x, y]`, or `() => [x,y]`
— resolved live each frame, so moving a component moves everything wired to it.

### `FlowSystem` (`diagram.flow`)
Packets that travel a **route of legs**, each packet keeping one identity (never teleports).
- `spawn(route, { style, data })` where a leg is `{ from, to, dur, style?, onArrive?(packet) }`
- pure `update(dt)`, `draw(g)`, `.size`

### `new FlowRuntime()` — temporal control (discrete-event core)
Chainable; `update(dt, now)` runs five phases in a fixed order (sources → onFrame → timers →
periodics → afterFrame).
- `.source({ interval:()=>s, guard?:()=>bool, fire:()=>void })` — rate-driven emitter
- `.after(delay, fn)` — schedule a callback · `.timerBudget(()=>n)` — cap timers fired per update
- `.every({ items, interval:(it,i)=>s, when?:(it,i)=>bool, fire:(it,i)=>void })` — per-entity periodic
- `.onFrame(fn)` / `.afterFrame(fn)` — host per-frame escapes

### `Rng(seed)` — seedable PRNG (mulberry32)
`rng()` → `[0,1)`; `rng.int(n)`, `rng.range(lo,hi)`, `rng.pick(arr)`. A fixed seed makes an
animation reproducible frame-for-frame.

### `Theme`, `Tween`, `Draw`
`Theme` — palette by role (`bg, panel, line, text, muted, hot, bad, accent, series[]`).
`Tween` — `ease, lerp, lerpPt, mix, clamp01` (pure). `Draw` — `roundRect, box, text, glow, link`.

---

## `SceneBuilder` (src/scene.js) — the IR builder

`build(ir, diagram) → { diagram, byId, edgesById }`. The IR is a plain object:

```js
{
  lanes: [ { id, x?, w? } ],            // optional layout columns (bare → auto-distributed)
  rails: [ { id, y? } ],                // optional layout rows    (bare → auto-distributed)
  zones: [ { id, ...ZoneSpec } ],
  nodes: [ { id, kind, ...spec } ],     // kind ∈ box|core|ring|matrix|pipeline|zone + registered
  edges: [ { id?, kind?:'road', from, to, style?, ...ChannelSpec } ],
}
```
- `register(kind, (id, spec) => Component)` — teach it a custom component kind.
- Edge refs `[nodeId, port]` resolve to the built component; `[x,y]` / functions pass through.
- Edges with an `id` are returned in `edgesById` so a simulation can `pulse()` them.

### Auto-layout — `resolveLayout(ir)`
Run automatically at the start of `build`. A node may carry `lane` (an `id` into `ir.lanes`) and/or
`rail` (an `id` into `ir.rails`) instead of `x/y`:
- **lane** → horizontal: fills the lane if `w` is omitted, else aligns `left|center|right` (`align`,
  default `center`) with a margin (`inset`, default 12).
- **rail** → vertical: centres the node on the rail's `y`.
- **Bare tracks auto-distribute** (GraphViz-lite, deterministic). A `lane` with no `x`/`w` splits the
  diagram width into even columns; a `rail` with no `y` becomes an even horizontal band (one rail →
  centred). The outer pad and inter-lane gap are `SceneBuilder.layoutDefaults` (`{ pad: 24, gap: 24 }`).
- **Auto-stacking — the non-overlap guarantee.** Several nodes in one lane with no rail (and no `y`)
  spread evenly *down* the lane (a lone one centres); the transpose holds for nodes on one rail with no
  lane, which spread *across* it. Declaration order fixes the position, so it stays deterministic.
- An explicit `x`, `y`, or `w` always wins **per field** — auto-layout only fills a coordinate left
  blank, so mixed (some placed, some auto) diagrams work. A node with neither `lane` nor `rail` is
  untouched; an unknown lane/rail throws. Pure — exposed as `SceneBuilder.resolveLayout(ir)` for testing.

### Behaviour from text — `buildFlows(ir, ctx)`
`ir.flows` (from the `.flow` `flow` statement) compile into a `FlowRuntime`:
`buildFlows(ir, { byId, diagram, rng? }) → FlowRuntime`. Each flow spawns a packet that travels its
node route at its rate (auto-pulsing arrivals, budget-guarded); drive it with
`diagram.onUpdate = (dt, now) => rt.update(dt, now)`. Mount a whole `.flow` diagram with:
```js
const ir = Flow.parse(text);
const { byId } = SceneBuilder.build(ir, diagram);
const rt = SceneBuilder.buildFlows(ir, { byId, diagram, rng });  // rng optional (weighted picks)
diagram.onUpdate = (dt, now) => rt.update(dt, now);
```
A flow may end in a **fork** off its last route node:
- **pick** (`f.fork.mode === 'pick'`) — spawn one packet down a **weighted-random** branch. `ctx.rng`
  (a `()=>[0,1)`, default `Math.random`; pass `Flowdot.Rng(seed)` for reproducibility) picks it.
- **fan-out** (`mode === 'all'`) — spawn a packet to **every** branch, splitting at the branch node.

See `examples/flow-pick` and `examples/flow-fanout` for each, authored entirely in `.flow`.

### Batteries-included — `Flowdot.mount` / `Flowdot.boot` (src/mount.js)
The whole `parse → Diagram → build → buildFlows → onUpdate → start` sequence collapses into one call:
```js
const { ir, diagram, rt, byId, dispose } = Flowdot.mount(target, source, opts);
// dispose() — stop the loop, drop canvas listeners, and neutralize the runtime (no callback fires
// afterward). The prerequisite for live-editing: re-mount into the same canvas without leaking
// timers/RAF/listeners. Idempotent.
```
- **`target`** — a `Diagram`-like object (used as-is), a `<canvas>` element, or a selector string.
- **`source`** — `.flow` text, or an already-parsed IR object.
- **`opts`** — `{ seed?, rng?, diagram?:extraDiagramOpts, autoStart?:true, showSource?, safe? }`. `safe:true`
  disables the Tier-2 `model`/`call`/`import` escapes (see [Security](#security--safe-mode--the-trust-model)); `seed`
  (number or `"0x…"`) seeds `Flowdot.Rng` for reproducible weighted picks; `autoStart:false` builds
  without starting the loop; **`showSource`** (a selector or element) mirrors the raw `.flow` text
  into that element — the "view the source" panel demos used to wire by hand (skipped when `source`
  is already an IR).

**Zero-JS auto-boot.** On load, `Flowdot.boot()` mounts every opted-in source — no script needed:
```html
<script type="text/flow" data-flowdot data-seed="0x51F0" data-source="#echo"> …diagram source… </script>
<script src="flowdot.js"></script><script src="scene.js"></script>
<script src="flow.js"></script><script src="mount.js"></script>
```
It inserts a `<canvas>` after each marked source and mounts it (handle stashed on `canvas.__flowdot`).
`data-seed` seeds the PRNG; `data-source="#sel"` fills that element with the source (a zero-JS
"view the source" panel).
The `data-flowdot` marker is **opt-in**, so a page with its own bespoke mount is never double-mounted.
`boot(root?, mountFn?)` is parameterisable for testing. See `examples/auto-layout` (zero-JS auto-boot)
and `examples/hello-world` (the smallest zero-JS diagram).

---

## `Flow` (src/flow.js) — the `.flow` structure language

`parse(text) → ir` (feed straight to `SceneBuilder.build`). Line-oriented, `#` comments.

```flow
diagram "Title" 1200x600 dark
palette series = #5ef2a0 #5cb4ff #c98cff
set feeds = Alpha Beta Gamma
rails = 150 320 490
each f in 0..2:
  node src{f} pipeline x:44 y:{rails[f]} w:150 h:72 name:"{feeds[f]}" accent:series{f} boxed vertical stages:[decode, transform, emit]
  road src{f} ~> hub{f} color:series{f} width:14 label:"link {7001+f}"
  edge hub{f}.out -> grid.colTop:{f} alpha:0.18
zone sources "Sources" x:14 y:60 w:206 h:520
```
- **Statements:** `flow · diagram · palette · set · lane · rail · zone · node · edge (->) · road (~>) · flow · import`.
- **Version & compatibility:** the format is **semver'd** — this build is **`flowdot 1.0`**. A source may
  declare `flowdot <version>` (e.g. `flowdot 1`) as the first statement; it records `ir.version` and **throws
  on an unsupported major** (`this build supports flowdot 1.x`). Policy: a **minor** bump is additive /
  backward-compatible (new statements/attributes; old sources keep working); a **major** bump is
  breaking. The pragma is optional — omit it and a source is parsed as current. (`Flow.SPEC_VERSION` /
  `Flow.SPEC_MAJOR` expose the supported version.)
- **Modules:** `import "<path.flow>"` inlines a shared source (a palette / node library) before parsing.
  Resolution: `Flow.parse(text, { base, resolveImport })` — under node, files resolve via `fs` relative to
  `base` (the importing file's dir); in the browser, supply `resolveImport(path, base) → text` (parsing is
  synchronous, so fetch/preload the imports first). Cycles and missing files throw; **safe mode disables it**.
- **Layout:** `lane <id> [x:.. w:..]` and `rail <id> [<y>|y:..]` — coordinates are optional; a bare
  `lane l` / `rail r` auto-distributes into even columns/rows. A node then places with
  `lane:<id> rail:<id>` (+ optional `align:left|center|right`, `inset:N`) instead of `x/y`; several
  nodes in a lane with no rail auto-stack down it (and the transpose across a shared rail).
- **Behaviour:** `flow · mode · seed · behavior · on · every · model` and hop `{ actions }` — the
  full temporal language, specified in **[The `.flow` behaviour block](#the-flow-behaviour-block)** below.
- **Values coerce:** `12`→number, `#abc`→colour, `series1`→palette ref, `[a, b, "c d"]`→array
  (comma/space-separated, elements coerce), `"x"`→string (quotes are *always* literal),
  a bare token on a node → boolean flag (`boxed`, `vertical`, `pinned`). An out-of-range palette
  ref throws. (`|` means *only* the flow pick — see Behaviour.)
- **Comprehensions:** `each VAR in 0..N` / `each VAR in <list>` (indent-delimited, nestable),
  `{expr}` interpolation with numbers, bound vars, `list[i]`, and `+ - * / %`.
- **Refs:** `id`, `id.port`, or `x,y`; a bare id defaults to `.out` (from) / `.in` (to).

---

## The `.flow` behaviour block

Everything above is **structure**. Behaviour — how packets move and how named state changes over time
— is also authored in `.flow`, with **zero JavaScript**, and compiled by `SceneBuilder.buildFlows`
(or `Flowdot.mount`, which calls it). This is the animated-diagram half that PlantUML/Mermaid lack.

### Behaviour statements

| Statement | Form | Meaning |
|---|---|---|
| `seed` | `seed 42` · `seed 0x51F0` | seed the runtime RNG (reproducible `pick` / `rand()`); decimal or hex |
| `behavior` | `behavior` · `behavior seed:42` | optional section header; may carry `seed:` inline |
| `mode` | `mode storm: spawn x4` | a togglable mode (below); `boot()` auto-renders a toggle button per mode |
| `flow` | `flow <id> rate:R [color:C r:N max:M] [pick …] : <route>` | a rate-driven packet along a route (below) |
| `on` | `on <event>[(p1,p2)]: <actions>` | a named event handler, fired by `after … : <event>` (or `rt.emit`) |
| `every` | `every <rate> per <v> in [list] [when <cond>]: <actions>` | a per-entity periodic: fires for each element at `rate` while the guard holds |
| `model` | `model "./m.js"` · `model MyGlobal` | Tier-2 host escape — names a companion module for `call` (node `require` / browser global) |

**Modes.** `mode <name>: <effect>[; <effect>]`. Effects: `spawn xN` → while the mode is active every
flow source fires **N× faster** (`op:'rate'`). `tier>=k drain xM` parses to a `drainMul` effect
(reserved; not yet wired to periodics). Toggle at runtime with `rt.setMode(name, on)` / read with the
`mode(name)` expression built-in.

### Routes, hops, forks

A **route** is a chain of nodes joined by `~dur` hops (seconds): `A ~0.6 B ~0.5 C`.

- **On-arrival actions.** Any node may carry a `{ … }` action block run when a packet arrives there;
  actions on the **first** node run at packet birth: `A { count sent } ~0.5 B { push q; count in }`.
- **Forks.** A route may end in **one** fork off its last node (options are homogeneous):
  - weighted **pick** `|`: `… ~0.5 ok @0.75 | ~0.5 fail @0.25` — exactly one branch per packet, chosen by `@weight` (default 1).
  - **fan-out** `&`: `… ~0.5 a & ~0.5 b & ~0.5 c` — a copy to **every** branch.
  - a fork option may also carry `{ actions }`: `… ok @0.7 { spawn s ~0.4 c } | ~0.5 fail { after 0.6: retry }`.
- **Per-fire entity pick.** `pick v in [list]` (before the `:`) binds `v` to a random list element each
  time the flow fires; reference it as `{v}` in a route node id — e.g. `flow f pick p in [p1, p2] : {p} …`
  makes a randomly-chosen producer the origin. Multiple: `pick f in [..], p in [..]`.

### Actions — the closed verb vocabulary

`;`-separated inside a hop `{ … }`, or after the `:` of `on` / `every`. An **unknown verb is a loud,
located error**. `<target>` is a bare name (a store slot) or a dotted component path (see binding).

| Verb | Meaning |
|---|---|
| `count <name>` | increment a named counter |
| `set <name> = <expr>` | assign a named value |
| `write <target> = <expr>` | latest-value write; overwriting a still-dirty cell tallies `superseded` (last-write-wins) |
| `push <target>` / `drain <target>` | ring depth `++` / drain one |
| `dirty <target>` / `clean <target>` | set / clear a cell's dirty flag |
| `drop [if <cond>]` | terminate this packet — unconditionally, or when `cond` holds |
| `after <D>: <event>` | schedule the named `<event>` `D` seconds later |
| `spawn <route>` | emit a secondary packet along an inline **linear** route (no fork) |
| `call [<name>=]<fn>(<args>)` | **Tier-2 only** — invoke `model.<fn>(args)`; optional `<name>=` stores the result |

### Store → component binding

State verbs update a small in-memory **store** (counters / values / cells / ring depths), readable in
expressions. When `<target>` names a built-in component, the verb **also drives it on-canvas**:

- `push` / `drain <ringId>` → a `RingBuffer`'s fill (a live queue depth). In an expression a bound ring
  id reads its live `fill` (so `drop if queue >= 12` / `when queue > 0` see the true depth).
- `write` / `dirty` / `clean <matrixId.i.j>` → that `Matrix` cell's value + freshness. Values are
  numeric/expressions (the expression grammar has no string literals).

Unbound names touch only the store. Inspect it at runtime via `canvas.__flowdot.rt.store`.

### Expressions

Used in `drop if`, `when <cond>`, the RHS of `set`/`write`, `call` args, and `{expr}` interpolation:

- numbers, names, `name[idx]`, `( )`, `+ - * / %`, unary `-` and `!`
- comparisons `== != < <= > >=`, boolean `&& ||`
- built-ins: **`rand()`** (seeded `[0,1)`), **`mode(<name>)`** (is a mode active?), **`dirty(<name>)`** (is a cell dirty?)

### Sigils

| Sigil | Meaning |
|---|---|
| `#` | comment to end of line |
| `->` · `~>` | edge (`Connector`) · road (`Channel`) |
| `~d` | hop duration, seconds |
| `@w` | pick-branch weight |
| `\|` · `&` | weighted-pick · fan-out fork |
| `{ verb … }` | on-arrival action block (verb-led) |
| `{ expr }` | interpolation — arithmetic, `list[i]`, bound vars, palette index |
| `name0` | palette ref (name + index) |

**Worked, zero-JS examples:** browse the [example gallery](../examples/index.html) — one feature per
example, grouped by category (structure · layout · behaviour · controls · theming), each rendered live
with its `.flow` source. Every feature also has a minimal snippet in [`HOWTO.md`](HOWTO.md).

---

## Per-kind attribute reference

Every `node <id> <kind> …` / `zone …` attribute the parser accepts, per built-in kind. A **misspelled
or unknown key on a built-in kind is a loud, located error** (listing the valid keys) — this table is
the closed set. Custom (registered) kinds are not validated. Types: `num`, `str`, `bool`, `colour`
(`#hex` or a `palette` ref), `id` (a lane/rail id), `list` (a `[bracket list]`), `fn` (a template
`(i,j)=>…`). This section is kept in lock-step with the parser schema by a parity test
(`src/kind-schema.test.js`).

### Common node attributes

Accepted by `box`, `core`, `ring`, `matrix`, `pipeline` (a `zone` accepts only `x y w h inspect
hoverable` from this set — not `align/inset`; it has its own `lane/lanes/rail/rails` for inferring its
box, see the `zone` table below).

| key | type | default | notes |
|---|---|---|---|
| `x` | num | `0` (or kind/lane) | absolute x; a `lane` or the kind default supplies it if omitted |
| `y` | num | `0` (or rail) | absolute y; a `rail` centres it if omitted |
| `w` | num | kind default / lane-fill | box 140 · core 160 · pipeline 150 · ring label-aware · matrix computed |
| `h` | num | kind default / rail | box 56 · core 60 · pipeline 72 · ring 48 · matrix computed |
| `lane` | id | — | place in an `ir.lanes` column instead of giving `x` |
| `rail` | id | — | place on an `ir.rails` row instead of giving `y` |
| `align` | str | `center` | `left\|center\|right` within a lane |
| `inset` | num | `12` | lane margin |
| `inspect` | str \| fn | — | hover-inspector text (string or `(now)=>string`) |
| `hoverable` | bool | `true` | participates in hit-testing (`zone` defaults `false`) |

### box

| key | type | default | notes |
|---|---|---|---|
| `name` | str | the node id | label drawn in the box |
| `sub` | str | — | a smaller subtitle line under the name |
| `accent` | colour | theme line | border/label colour |

### core

Like `box` (pinned double-border look), plus:

| key | type | default | notes |
|---|---|---|---|
| `name` | str | the node id | label |
| `sub` | str | — | subtitle line |
| `accent` | colour | theme line | inner-border/label colour |
| `lit` | bool | `true` | inner border lit (on) vs dimmed (off) |

### ring

| key | type | default | notes |
|---|---|---|---|
| `slots` | num | `12` | ring capacity (dots around the circle) |
| `r` | num | `16` | circle radius |
| `color` | colour | theme hot | slot/label colour (turns red when lapping) |
| `label` | str | — | side label; widens the reserved box so rings never overlap |

### matrix

| key | type | default | notes |
|---|---|---|---|
| `rows` | num | required | grid rows |
| `cols` | num | required | grid columns |
| `cw` | num | `76` | cell width |
| `ch` | num | `56` | cell height |
| `gap` | num | `4` | gap between cells |
| `colColors` | list | theme series | per-column accent colours |
| `rowLabels` | list | `[]` | left-side row labels |
| `colLabels` | list | `[]` | top column labels |
| `title` | str | `"Matrix"` | title above the grid |
| `subtitle` | str | `""` | subtitle beside the title |
| `cellNote` | fn | — | `(i,j)=>string` note drawn in each cell |

### pipeline

| key | type | default | notes |
|---|---|---|---|
| `stages` | list | `[a, b]` | the stage-node labels, lit in sequence on pulse |
| `nodeR` | num | `15` | stage-node radius |
| `idle` | bool | `false` | render dimmed (a busy-spinning worker) |
| `vertical` | bool | `false` | stack stages vertically (label to the right) |
| `boxed` | bool | `false` | wrap the stages in a container box |
| `pinned` | bool | `false` | boxed double-border (a pinned thread) |
| `name` | str | — | container label (with `boxed`) |
| `accent` | colour | theme accent | container/first-stage colour |
| `pad` | num | `118` (v: `36`) | offset of the first stage from the box |
| `step` | num | `70` (v: `24`) | spacing between stages |

### zone

A labelled background band (added behind the nodes). Accepts `x y w h inspect hoverable` (above; note
`hoverable` defaults **`false`**), plus:

| key | type | default | notes |
|---|---|---|---|
| `label` | str | `""` | band label (top-left) |
| `tint` | colour | subtle blue | fill tint |
| `accent` | colour | theme line | dashed border colour |
| `lane` | id | — | span this lane's column — the zone **infers** `x`/`w` from it (explicit `x`/`w` still win) |
| `lanes` | list | — | span several lanes: `lanes:[fe, be]` → `x`/`w` cover their union |
| `rail` | id | — | span this rail's row — infers `y`/`h` (explicit wins); with no rail, a lane-zone gets a full-height band |
| `rails` | list | — | span several rails: `rails:[top, bot]` → `y`/`h` cover their vertical extent |

---

## Security — safe mode & the trust model

Almost all of `.flow` is inert: it describes shapes and packet motion, reading/writing only an in-memory
store. **Three constructs are different** — they reach outside the diagram and are unsafe for untrusted
input (a portal rendering user-submitted `.flow`, or a live-edited source):

- `model "<path>"` / `call fn(…)` — the Tier-2 host escape (in node, `require`s a module and calls it).
- `import "<path.flow>"` — a host-file include (inlines another source; reads a file / needs a resolver).

**Safe mode** disables all three. Pass `safe: true` to `Flow.parse(text, { safe })` or
`Flowdot.mount(target, source, { safe })`; a source using a gated construct throws a clear, located
`… is disabled in safe mode`. It is enforced at parse **and** (defence in depth) in `buildFlows`, so an
IR handed in directly is gated too.

**Defaults.**
- `Flowdot.boot()` (the zero-JS embed/auto-mount path — the untrusted case) is **safe by default**. Opt
  out per source with `data-unsafe` on the `<script type="text/flow">` (only for content you trust).
- Direct `Flowdot.mount(...)` / `Flow.parse(...)` default to **safe: false** (a programmatic caller is
  trusted); pass `safe: true` when rendering untrusted input.

So a trusted, hand-authored page using its own `mount` keeps its Tier-2 `model`/`call`; a live-edited
tutorial or an embedded user source cannot read or execute host code.
