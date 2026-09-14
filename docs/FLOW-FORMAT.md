# The `.flow` format — readability & agent-safety notes

The animated-diagram language (files: `.flow`, embedded as `<script type="text/flow">`, parsed by
`Flow.parse`) is deliberately tiny and line-oriented. This note is the **research** behind its
design for two audiences that now matter as much as a human reader:

- **A human skimming** should guess what a line does without a manual.
- **An agent generating it** should have *one* obvious way to write each thing, and should get a
  **loud error** on a mistake rather than a silently-wrong diagram.

Below: the hazards found in the format, the fixes applied in v1, and what is deliberately deferred.

---

## Hazards found (and whether they bite an agent)

| # | Hazard | Why it's error-prone | Verdict |
|---|--------|----------------------|---------|
| 1 | **`\|` was overloaded** — array separator in values (`stages:"a\|b\|c"`) *and* the pick operator in `flow` routes (`a \| b`) | The same glyph means two unrelated things; an agent must infer from context | **Fixed** — arrays now use `[ … ]`; `\|` means *only* "weighted pick" in a flow route |
| 2 | **Quotes didn't protect `\|`** — `name:"a\|b"` silently became the array `["a","b"]` | A literal string with a pipe turned into a list with no error | **Fixed** — quotes are now always a literal string; only `[ … ]` makes an array |
| 3 | **Out-of-range palette ref** — `series9` (palette has 3) silently became the string `"series9"` | Wrong colour, no error; hard to spot | **Fixed** — a ref into a *known* palette that is out of range now throws |
| 4 | **Unknown attributes are silently kept** — `colr:#f00` is accepted as a junk field | A typo'd key is dropped with no feedback | **Deferred** — needs per-kind schemas; would add weight. Documented as the top future guardrail |
| 5 | **Indentation-sensitive `each` blocks** | Whitespace slips are easy for generators | **Kept** — Pythonic and concise; `each` already errors clearly on a bad iterable |
| 6 | **Positional header** `diagram "T" 1200x600 dark` | Order matters (title, size, theme) | **Kept** — small, and each piece is shape-distinct (quoted / `NxN` / word) so it's order-tolerant in practice |
| 7 | **Sigils** `~dur` (hop seconds), `@weight`, `->`/`~>` | Terse; must be learned once | **Kept** — concise, and each now has a targeted parse error |

## Fixes applied in v1 (the format is now `.flow`)

1. **Arrays are bracketed, comma- or space-separated:** `stages:[decode, transform, "final emit"]`,
   `dash:[3, 4]`. Elements coerce individually (numbers, `#hex`, palette refs, quoted strings).
2. **Quotes are always a literal string** — `name:"buy|sell"` is the string `buy|sell`, never an array.
3. **`|` is reserved for the `flow` pick** (`a @0.8 | b @0.2`); `&` for fan-out. No other meaning.
4. **A known-palette ref that is out of range throws** a clear error instead of leaking a string.
5. Renamed **`.dgm` → `.flow`**, MIME **`text/dgm` → `text/flow`**, parser global **`Dgm` → `Flow`**,
   so the file format matches the library name (Flowdot) — one fewer inconsistency for a reader/agent.
6. **Coordinates and sizes are optional** — an agent need not compute pixel positions: kinds carry
   default `w`/`h`, and a bare `lane`/`rail` (no `x`/`w`/`y`) auto-distributes into even columns/rows
   with nodes auto-stacking so they never overlap. Fewer numbers to get wrong; an explicit coordinate
   still wins per field when exact control is needed. (See `docs/API.md` → *Auto-layout*.)

The result: for every value there is exactly one obvious spelling, `|` has a single meaning, and the
three previously-silent failure modes (pipe-in-quotes, out-of-range palette, `/`-in-expression from
the earlier hardening pass) now error.

## Deferred (would help, but not now)

- **Attribute validation per kind** (#4) — the highest-value remaining guardrail: reject/warn on
  unknown keys so `colr:` is caught. Needs a small schema per component kind; do it when kinds
  stabilise, and surface warnings without failing the render.
- **A behaviour block in the parser** — `source`/`every`/`on` authored in text (needs a host-call
  escape). Rate-driven `flow`s (incl. pick/fan-out) already cover the common case.
- **Function-valued attributes** — stay in the JS IR path by design.

See `docs/API.md` for the concrete grammar and `examples/` for every construct in use.
