# Flowdot guide

Flowdot describes a system and shows data moving through it.

The language has four main parts:

- **Nodes** are things.
- **Edges and roads** connect things.
- **Flows** move packets.
- **Actions** change simple visual state.

JavaScript can send real application events. It should own exact timing and domain logic.

## A small diagram

```flow
diagram "Request path" 640x240 dark
controls
lane left
lane right
rail middle
node client lane:left rail:middle name:"Client"
node service core lane:right rail:middle name:"Service"
edge client -> service label:"request"
flow requests rate:2 : client ~0.6 service
```

- `diagram` sets the title, size, and theme.
- `lane` makes a column.
- `rail` makes a row.
- `node` places a thing.
- `edge` draws a connection.
- `flow` emits two packets per animation second.
- `~0.6` sets the travel duration in animation seconds.
- `controls` adds pause, reset, and speed controls.

## Layout

Use lanes and rails first.

```text
lane input
lane work
lane output
rail top
rail bottom
node api lane:input rail:top
node worker core lane:work rail:top
node db lane:output rail:bottom
```

Flowdot spreads bare lanes and rails across the canvas.

Use `x:`, `y:`, `w:`, and `h:` when exact placement matters. You can mix both styles.

Use a `zone` to group nodes. A zone can span lanes or rails.

## Nodes

Use a plain node unless its behavior matters.

- `box`: a service, actor, or destination. This is the default.
- `core`: a processor or worker.
- `pipeline`: named stages.
- `ring`: bounded queue occupancy.
- `matrix`: rows and columns of values.
- `slot`: one latest-value cell.
- `readout`: one live number.

Labels do not define behavior. IDs do.

```text
node api name:"Public API"
node jobs ring slots:16 label:"Jobs"
node worker pipeline stages:[decode, run, store] boxed
```

## Connections

Use `edge` for a thin link. Use `road` for a wide channel.

```text
edge api -> worker label:"jobs"
road worker ~> store width:12
```

Bare node IDs use the right output and left input ports. Name a port only when needed.

```text
edge source.bottom -> worker.top
edge reader -> cache.rowLeft:1
```

A connection does not emit packets. A flow does.

## Flows

A linear route starts with a node. Each next node has a duration.

```text
flow work rate:1.5 : source ~0.4 queue ~0.8 worker
```

Use `|` to choose one branch.

```text
flow result rate:1 : worker ~0.4 ok @0.8 | ~0.4 failed @0.2
```

Use `when` for content-based routing. Keep one unguarded fallback.

```text
flow order rate:2 pick amount in [2,5,20] : input ~0.4 router ~0.5 review when amount > 10 | ~0.5 accept
```

Use `&` to copy a packet to every branch.

```text
flow publish rate:1 : publisher ~0.5 fast & ~0.8 slow
```

Use `seed` when random choices must repeat.

## Actions

Put actions after the node where they occur.

```text
flow jobs rate:2 : producer { count sent; push queue } ~0.7 consumer { drain queue; count done }
```

Common actions:

- `count name`
- `set name = expression`
- `write target = expression`
- `push ring` and `drain ring`
- `dirty target` and `clean target`
- `drop if expression`
- `spawn a ~0.5 b`
- `after 0.5: event`
- `highlight grid.row:1`
- `down grid.col:1` and `up grid.col:1`
- `surge ring = 4`
- `snapshot grid` or `snapshot grid.row:1`

The state store is small. It supports counters, numbers, flags, and latest values. It is for the
picture. It is not an application database.

## Time

- `rate:2` means two packets per animation second.
- `~0.6` means a hop lasts 0.6 animation seconds.
- `every 2` means once every two animation seconds.
- Speed controls scale the animation clock.
- Pause stops the animation clock.

These values make motion readable. They do not claim real latency or throughput.

## Application events

Keep the diagram in the DSL. Let the application say what happened.

```flow
diagram "Stored value" 640x220 dark
node cache slot x:80 y:80 w:140 h:56 name:"Latest value"
node consumer x:400 y:80 w:140 h:56 name:"Consumer"
edge cache -> consumer label:"notification"
on stored: write cache = price; count updates; spawn cache ~0.6 consumer
```

```js
const view = Flowdot.mount(canvas, source, { safe: true });

view.rt.emit('stored', { price: 108580 });

view.diagram.setSpeed(0.5);
view.diagram.setPaused(true);
view.diagram.setPaused(false);

view.dispose();
```

`emit` runs handlers at once. Packet travel still uses the animation clock.

Dispose the view when its page or component is removed. Cancel host timers and subscriptions too.

## Color and themes

Use a theme token for colors that should adapt.

```text
node ok #emerald
edge worker -> failed #rose dashed
flow updates rate:2 #sky : source ~0.5 target
```

Flowdot ships `dark` and `light`. Use `theme-toggle` to add a switch.

Use `#5cb4ff` for a fixed color. A comment starts with `#` followed by a space.

## Annotations

- `note "text" -> node` points at a node.
- `legend "meaning" #color` adds a color key.
- `divider "label" x1,y1 -> x2,y2` draws a boundary.
- `ghost "alternative" x,y -> x2,y2` adds a hidden comparison layer.
- `narrate 3 nodeA nodeB : "caption"` adds a guided step.

Use annotations to explain the picture. Do not hide required meaning in hover text.

## Safe input

Safe mode disables `import`, `model`, and `call`. These features can reach host code or files.

- Auto-mounted diagrams use safe mode by default.
- `Flowdot.mount()` is trusted by default.
- Pass `{ safe: true }` for untrusted source.

## Working method

1. Add nodes.
2. Add lanes and rails.
3. Add visible connections.
4. Add one flow at a time.
5. Add actions only when they improve the explanation.
6. Run `flowdot lint diagram.flow`.
7. Check the paused and animated views.

Browse the [examples](../examples/index.html) for working combinations.
