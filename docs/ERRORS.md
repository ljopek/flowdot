# Error catalogue

Every **loud error** Flowdot throws while parsing / building / running a `.flow` diagram — what trips
it and how to fix it. The library never fails silently: a bad diagram throws a located, specific error
rather than rendering something wrong. Parser errors carry `flow: line N:`.

The first column is the **literal message fragment** (a substring of the actual thrown string); a
parity test (`src/error-catalogue.test.js`) asserts every fragment below is really thrown by the
source, so this catalogue can't drift out of date.

## Parser — statements & values (`src/flow.js`)

| Message fragment | Trigger | Fix |
|---|---|---|
| `unknown statement "` | a line's first word is not a known statement | Use one of `flow diagram palette set lane rail zone node edge road flow mode seed behavior on every model import` (or `each`). |
| `has no attribute "` | a misspelled/unknown key on a built-in kind | Check the [per-kind reference](API.md#per-kind-attribute-reference); the error lists the valid keys. |
| `has no index ` | a palette ref index past the ramp (`series9` on a 3-colour palette) | Use an in-range index, or add more colours to the `palette`. |
| `cannot iterate "` | an `each … in <x>` where `<x>` is neither a range nor a list | Use `each i in 0..3` or `each x in [a, b, c]`. |
| `bad expression "` | a malformed `{expr}` / guard / RHS (or a **typo'd verb** in a `{ … }` block) | Fix the expression; if it was meant to be an action, start the block with a real verb. |
| `unsupported flowdot version ` | `flowdot <n>` with a major this build does not support | Use `flowdot 1.x`, or upgrade the library to a build that supports the declared major. |
| `flowdot version must be a number` | `flowdot <x>` where `<x>` isn't `N` or `N.M` | `flowdot 1` or `flowdot 1.2`. |
| `seed must be a number` | `seed <x>` where `<x>` isn't decimal or `0x` hex | `seed 42` or `seed 0x51F0`. |

## Parser — behaviour block (`src/flow.js`)

| Message fragment | Trigger | Fix |
|---|---|---|
| `bad action "` | a known verb with bad args in a hop `{ … }` (`{ count }`, `{ write x }`) | Give the verb its argument: `count name`, `write cell = expr`. |
| `unknown mode effect "` | a `mode <name>: <effect>` whose effect isn't recognised | Use `spawn xN` (rate) — the only wired effect. |
| `mode must be ` | a `mode` line missing `<name>: <effects>` | `mode storm: spawn x4`. |
| `every must be ` | an `every` line missing its shape | `every 0.5 per w in [a, b] when q > 0 : drain q`. |
| `every rate must be a number` | the rate in `every <rate> …` isn't numeric | `every 0.4 per …` (a number, optional trailing `s`). |
| `every list must be a [bracket list] or a range` | the `per v in <x>` list is neither | `per _ in [0]` or `per i in 0..2`. |
| `on must be ` | an `on` line missing `<event>[(params)]: <actions>` | `on audit: count audited`. |
| `pick list must be a [bracket list]` | a `pick v in <x>` where `<x>` isn't an inline list | `pick c in [clientA, clientB]` (named `set` lists aren't supported here). |
| `pick expects ` | a malformed `pick <var> in <list>` clause | `flow f … pick v in [a, b] : …`. |
| `flow route must start with a node` | a `flow … : ~0.5 b` beginning with a hop | Start the route with a node id: `flow … : a ~0.5 b`. |
| `a flow branch cannot mix ` | a route mixing `|` and `&` | Use only one fork kind per route (all `|` **or** all `&`). |
| `a flow branch needs a node to branch from` | a `|`/`&` with no prefix node | Give the fork a node to branch from: `a ~0.5 hub ~0.5 x | ~0.5 y`. |
| `branch option must be "~dur node [@weight]"` | a fork option missing its `~dur` or node | Each option is `~dur node [@weight] [{actions}]`. |
| `a branch option must be "~dur node [@weight] [{actions}]"` | a fork option with extra tokens | Keep each option to one hop (+ optional weight/actions). |
| `expected "~dur" before ` | two nodes in a route with no `~dur` between | Put a hop duration between nodes: `a ~0.5 b`. |
| `"~dur" without a node` | a `~dur` at the end of a route with nothing after | Follow every `~dur` with a node. |
| `spawn route must start with a node` | a `spawn` action route starting with a hop | `spawn server ~0.5 client`. |
| `spawn route needs at least one hop` | a `spawn` with a single node | `spawn a ~0.4 b` (≥ 2 nodes). |
| `spawn "~dur" without a node` | a trailing `~dur` in a spawn route | Follow the `~dur` with a node. |
| `spawn expected "~dur" before ` | two spawn-route nodes with no `~dur` | `spawn a ~0.4 b`. |
| `needs "` | an `edge`/`road` missing its arrow | `edge a -> b` (connector) or `road a ~> b` (channel). |

## Runtime — expressions & state (`src/flow.js` · `src/flowdot.js`)

| Message fragment | Trigger | Fix |
|---|---|---|
| `rand() is not available in this context` | `rand()` used where no RNG is bound (e.g. a structural `{expr}`) | Use `rand()` only in behaviour (`drop if`, `when`, action RHS). |
| `mode() is not available in this context` | `mode(name)` used outside behaviour | Same — behaviour expressions only. |
| `dirty() is not available in this context` | `dirty(name)` used outside behaviour | Same — behaviour expressions only. |
| `unknown state verb "` | an action verb the store doesn't implement reached the runtime | Use the closed verb set (`count set write push drain dirty clean`). |

## Scene builder & mount (`src/scene.js` · `src/mount.js`)

| Message fragment | Trigger | Fix |
|---|---|---|
| `scene.build: missing IR` | `build(undefined, …)` | Pass a parsed IR (`Flow.parse(text)`). |
| `scene.build: unknown kind "` | a `node … <kind>` whose kind isn't built-in or registered | Use a built-in kind, or `SceneBuilder.register(kind, factory)`. |
| `scene.build: duplicate node id "` | two nodes share an id | Give every node a unique id. |
| `references unknown lane "` | `node … lane:<id>` with no matching `lane` | Use one of the declared lanes the message lists, or add `lane <id>`. |
| `references unknown rail "` | `node … rail:<id>` with no matching `rail` | Use one of the declared rails the message lists, or add `rail <id>`. |
| `references unknown node "` | a `flow` route names a node that doesn't exist | Fix the id, or add the `node`. |
| `needs a model` | a `call` with no `model` declared | Add `model "./m.js"` (or pass `ctx.model`) — Tier-2 only. |
| `model has no function "` | `call fn(…)` where the model has no `fn` | Export `fn` from the model module. |
| `Flowdot.mount: missing source` | `mount(target)` with no `.flow` text / IR | Pass the source: `mount('#c', text)`. |

## Security — safe mode (`src/flow.js` · `src/scene.js`)

| Message fragment | Trigger | Fix |
|---|---|---|
| `'model' is disabled in safe mode` | a `model` statement while safe mode is on (default for `boot`/embed) | Only use `model` in a trusted page via `mount(…, { safe:false })` / `data-unsafe`. |
| `'call' is disabled in safe mode` | a `call fn(…)` action under safe mode | As above — Tier-2 escapes need a trusted context. |
| `'import' is disabled in safe mode` | an `import` statement under safe mode | Includes are a host-file read; enable only for trusted input. |
| `import cycle at "` | `import`s form a loop (a → b → a) | Break the cycle; a shared file may be imported from many places but not circularly. |
| `cannot import "` | the imported file is missing / the resolver returned nothing | Fix the path (relative to the importing file), or supply `opts.resolveImport`. |
