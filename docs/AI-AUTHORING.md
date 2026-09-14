# Authoring `.flow` diagrams (AI guide)

A mistake-free playbook for generating **animated architecture / data-flow diagrams** as `.flow` text.
Goal: an agent produces a complete, correct diagram in one pass. Read this with the grammar reference
([`API.md`](API.md)) and the per-feature how-to ([`HOWTO.md`](HOWTO.md)).

## Mental model

A diagram has two halves, **both authored in `.flow`, with zero JavaScript**:

1. **Structure** — `diagram`, `palette`, `lane`/`rail`, `node`, `edge`(`->`)/`road`(`~>`), `zone`.
2. **Behaviour** — `flow` (packets on routes), hop `{ actions }`, `every` (periodics), `on`/`after`
   (events), `mode` (toggles), `seed` (determinism).
3. **Controls** (optional) — a `controls` line auto-renders a play/pause · reset · speed bar; each
   `mode <name>` adds its own toggle button. Both are rendered by the library — still zero JavaScript.

A page is just the source plus four library `<script src>` includes; `boot()` mounts it. Never write
per-diagram JavaScript. The one exception is the Tier-2 host escape (`model`/`call`) for heavy domain
maths — reserved for compute-heavy diagrams, not everyday ones.

## The closed verb vocabulary

Hop `{ … }` blocks and `on`/`every` bodies use **only** these verbs (`;`-separated). An unknown verb
is a **loud, located error** — there are no synonyms. Full table in [`API.md`](API.md#actions--the-closed-verb-vocabulary).

| Verb | Use |
|---|---|
| `count <name>` | increment a counter |
| `set <name> = <expr>` | assign a value |
| `write <target> = <expr>` | latest-value write (last-write-wins) |
| `push <target>` / `drain <target>` | ring depth ++ / drain one |
| `dirty <target>` / `clean <target>` | set / clear a dirty flag |
| `drop [if <cond>]` | terminate this packet |
| `after <D>: <event>` | schedule an event `D`s later |
| `spawn <route>` | emit a secondary packet (linear route) |
| `call [<name>=]<fn>(<args>)` | Tier-2 host escape only |

Expression built-ins: `rand()`, `mode(<name>)`, `dirty(<name>)`. Operators: `+ - * / %`, `== != < <= >
>=`, `&& || !`. **No string literals** — every value is a number, name, or expression.

## One obvious spelling (no synonyms, no options)

- **One verb per concept** — `count`, not `increment`/`inc`; `drop`, not `reject`/`kill`.
- **Edges:** `A -> B` is a thin connector; `A ~> B` is a fat animated road. Nothing else.
- **Hops:** `~0.5` is the seconds for a hop. **Weights:** `@0.8`. **Forks:** `|` (pick one) or `&`
  (fan-out to all) — never both in one route.
- **Booleans are bare flags:** `node x pipeline boxed vertical` — **not** `boxed:true`.
- **Palette:** define `palette s = #.. #.. #..`, reference by index `accent:s0`; a literal `accent:#ff0`
  overrides. An out-of-range ref (`s9`) throws.
- **Comments:** `#` only, to end of line.
- **Layout:** prefer `lane`/`rail` (no coordinates) for tidy rows/columns; give `x:`/`y:` only when you
  need an exact spot (e.g. a `ring` between two lanes). **Sizes are optional** — every kind has a
  sensible default; add `w:`/`h:` only to override.

## Controls (optional, zero-JS)

Two opt-in UI affordances, both auto-rendered by the library — never wire buttons yourself:

- **Transport bar** — add a bare `controls` line to the source and a play/pause · reset · speed bar
  appears under the canvas (Reset restarts the animation from the beginning). Use it whenever a reader
  benefits from pausing or slowing the motion.
- **Mode toggles** — every `mode <name>: …` renders its own toggle button (see pitfall 9).

```flow
diagram "Controls" 600x200 dark
controls                         # ← the whole opt-in: a transport bar renders itself
lane a
lane b
rail r
node x box  lane:a rail:r name:"A"
node y core lane:b rail:r name:"B"
edge x.out -> y.in
flow f rate:0.8 : x ~0.9 y
```

## Pitfalls (wrong → right)

These are the traps that actually bite. Each is enforced by a loud error or a documented rule.

1. **Action block vs interpolation braces.** A `{ … }` that **starts with a verb** is an on-arrival
   action block; any other `{ … }` is an `{expr}` interpolation evaluated at parse time.
   - `~0.5 grid { write cell = v }` ✅ action · `name:"row {r}"` ✅ interpolation
   - A **typo'd verb** falls through to the expression evaluator: `{ wobbel x }` → `bad expression`
     (still loud, but not the located `bad action`). Start action blocks with a real verb.

2. **`pick v in [list]` needs an inline bracket list**, not a named `set`.
   - `pick c in [clientA, clientB]` ✅ · `pick c in clients` ❌ (named-list picks are not supported).
   - The picked var is usable **only as a route node id**: `{c}` as an origin/hop. Not in action names.

3. **No string literals in expressions.** `write slot = "text"` ❌. Use a number or expression:
   `write slot = n` / `write cell = v + 1`. Matrix cell **values are numeric**.

4. **Matrix cells use a literal `id.i.j` target**, and the coordinate can't be interpolated.
   - `write grid.2.0 = n` ✅ · `write grid.{i}.0 = n` ❌ (action targets are not templated).
   - Ring targets are a bare id: `push queue`, `drain queue`.

5. **A bound `ring` reads its live fill in expressions.** After `push queue`/`drain queue`, use
   `queue` in a guard for the true on-canvas depth: `drop if queue >= 10`, `when queue > 0`. (The
   store's own ring counter zeroes on drain — the component fill is the source of truth.)

6. **`drop` stops the rest of the block.** Order matters: put `drop if …` **first** so a dropped packet
   skips the `push`/`count` after it. `{ drop if queue >= 10; push queue; count enqueued }` ✅.

7. **`spawn` routes are linear** (no `|`/`&`). A retry is a **re-issued** packet, not a recursive
   re-pick: `on retry: spawn client ~0.5 server`. This also prevents infinite retry storms.

8. **Template attributes** `key:(i,j)=>{expr}` need a **tight `=>`** (no spaces) and bind **only their
   params** — no access to `set` vars. Body is `{expr}` or a bare expression.

9. **`mode <name>: spawn xN`** speeds sources ×N while active (a `boot()` toggle appears per mode). The
   `tier>=k drain xM` effect parses but is **not wired yet** — don't rely on it.

10. **Unknown attribute keys are rejected.** `node x box colr:#f00` → `"box" has no attribute "colr"`.
    Check the [per-kind reference](API.md#per-kind-attribute-reference); custom kinds aren't validated.

## Worked example — a task queue with workers (end to end)

Build a complex diagram that combines **`mode` · `pick v in [list]` · hop actions · `drop if` ·
store→ring binding · `every…per…when` · `after`/`on` events**.

**1. Frame + palette + a toggle mode.**
```flow
diagram "Task queue with workers" 900x400 dark
palette s = #5ef2a0 #5cb4ff #ff9db1
mode surge: spawn x3           # while active, clients submit 3× faster
```

**2. Structure with lane/rail (no coordinates), the queue as a `ring` between the lanes.**
```flow
lane in  x:40  w:200
lane out x:640 w:200
rail top 110
rail mid 200
rail bot 290

node clientA box  lane:in  rail:top name:"client A" accent:s0
node clientB box  lane:in  rail:bot name:"client B" accent:s0
node queue   ring x:410 y:176 slots:10 label:"queue" color:s1
node worker  core lane:out rail:mid name:"worker" sub:"drains 1/step"
edge clientA.out -> queue.in  alpha:0.18
edge clientB.out -> queue.in  alpha:0.18
edge queue.out   -> worker.in alpha:0.18
```

**3. Behaviour.** One flow picks a client per step and enqueues (dropping when full); one periodic
drains the worker and schedules an audit; one event handler tallies audits.
```flow
flow submit rate:0.8 color:s0 pick c in [clientA, clientB] : {c} { count submitted } ~0.5 queue { drop if queue >= 10; push queue; count enqueued }

every 0.5 per _ in [0] when queue > 0 : drain queue; count done; after 0.2: audit
on audit: count audited
```

Concatenate the three blocks — that is the whole diagram, **zero JavaScript**. Under `surge`, clients
outrun the single worker, so the queue pins at 10 and `drop if` sheds the overflow (`overruns` stays 0);
`submitted > enqueued` is the dropped count, and `audited == done`. Wrap it in the standard page shell
(see any `examples/*/index.html`): the `<script type="text/flow" data-flowdot data-source="#src">`
block plus the four `<script src>` includes.

## Pre-flight checklist

- [ ] Every `node` uses a built-in `kind` (`box|core|ring|matrix|pipeline|zone`) with only its
      documented attributes.
- [ ] Action blocks start with a real verb; targets are bare ids (rings) or literal `id.i.j` (matrix).
- [ ] `pick v in [ … ]` uses an inline list; `{v}` appears only as a route node id.
- [ ] Guards (`drop if`, `when`) use numbers/expressions — no string literals; ring depth reads the
      bound ring id.
- [ ] `drop if` comes first in its block; `spawn` routes are linear.
- [ ] A `seed` is set if you want reproducible `pick`/`rand()`.
- [ ] No authored JavaScript — only the `.flow` source and the library includes.
