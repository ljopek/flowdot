# Per-feature how-to

Each Flowdot feature, in one line of "how", linked to an example that shows it. Every example page is
zero-JS and opens from `file://` — click through and read its `.flow` source panel. The full grammar is
in [API.md](API.md); mistakes to avoid are in [AI-AUTHORING.md](AI-AUTHORING.md) and [ERRORS.md](ERRORS.md).

## Structure

- **Nodes + edges** — `node id kind …` then `edge a -> b`. → [hello-world](../examples/hello-world/index.html)
- **Lane/rail auto-layout** — place by `lane:<col> rail:<row>` instead of `x/y`. Tracks may carry coordinates (`lane <id> x:.. w:..`, `rail <id> <y>`) or be left **bare** (`lane l`, `rail r`) to auto-distribute into even columns/rows; several nodes in a lane with no rail auto-stack. → [auto-layout](../examples/auto-layout/index.html)
- **Zones** — `zone id "Label" x:.. y:.. w:.. h:..` draws a labelled band behind the nodes. → [zones](../examples/zones/index.html)
- **Roads** — `road a ~> b color:.. width:..` is a fat animated transport edge (vs the thin `->`). → [flow-schedule](../examples/flow-schedule/index.html)
- **Optional sizes** — every kind has a default `w/h`; omit them, add only to override. → [hello-world](../examples/hello-world/index.html)

## Comprehensions

- **`set` + `each` + `{expr}`** — name a list with `set`, unroll with `each v in 0..N` (indent-delimited), interpolate with `{expr}` / `{list[i]}`. → [comprehensions](../examples/comprehensions/index.html)

## Flow & routing

- **Linear flow** — `flow f rate:R : a ~0.6 b ~0.5 c` sends a packet along the route, `~dur` per hop. → [hello-world](../examples/hello-world/index.html)
- **Hop actions** — a node may carry `{ verb …; verb … }` run on arrival (origin actions run at birth). → [flow-actions](../examples/flow-actions/index.html)
- **Weighted pick `|`** — end a route in `~d x @0.8 | ~d y @0.2` to send each packet down one branch. → [flow-pick](../examples/flow-pick/index.html)
- **Fan-out `&`** — end a route in `~d a & ~d b & ~d c` to copy each packet to every branch. → [flow-fanout](../examples/flow-fanout/index.html)

## Behaviour verbs & scheduling

- **Counters & state verbs** — `count`, `set`, `write`, `push`, `drain`, `dirty`, `clean` mutate the store. → [flow-actions](../examples/flow-actions/index.html)
- **Store→component binding** — `push/drain <ringId>` drives a ring's fill; `write/dirty/clean <matrixId.i.j>` drives a matrix cell. → [flow-actions](../examples/flow-actions/index.html)
- **`drop if`** — `{ drop if <cond> }` terminates a packet (put it first in the block). → [flow-events](../examples/flow-events/index.html)
- **`after` + `spawn`** — `after D: ev` schedules an event; `spawn a ~d b` emits a secondary packet. → [flow-schedule](../examples/flow-schedule/index.html)
- **`on <event>`** — a named handler fired by `after`/emit: `on audit: count audited`. → [flow-events](../examples/flow-events/index.html)
- **Periodics `every … per … when`** — `every 0.5 per _ in [0] when q > 0 : drain q` fires per entity at its rate under a guard. → [periodics](../examples/periodics/index.html)

## Expressions & modes

- **`rand()`** — seeded `[0,1)`: `drop if rand() < 0.05`. → [flow-events](../examples/flow-events/index.html)
- **`mode` (rate)** — `mode storm: spawn x4`; `boot()` renders a toggle button per mode. → [modes](../examples/modes/index.html)
- **`seed`** — `seed 0x51F0` makes `pick`/`rand()` reproducible. → [flow-pick](../examples/flow-pick/index.html)

## Controls

- **Transport bar** — a `controls` line auto-renders a play/pause · reset · speed bar under the diagram (wired to `Diagram.setPaused`/`setSpeed` + `FlowRuntime.reset`); zero authored JS. → [transport-controls](../examples/controls/index.html)
- **Mode toggle** — `mode storm: spawn x4`; `boot()` renders a toggle button per declared mode. → [modes](../examples/modes/index.html)

## Theming

- **Palette & colour** — `palette s = #.. #..`; reference `accent:s0`; a literal `accent:#hex` overrides. → [palette-colors](../examples/palette-colors/index.html)
- **Named theme packs** — `diagram … corporate` picks a registered house style (ships dark/light/corporate; add your own with `Flowdot.registerTheme`). → [branded](../examples/branded/index.html)

---

**Browse everything** in the [example gallery](../examples/index.html) — one feature per example,
grouped by category, each rendered live with its `.flow` source.
