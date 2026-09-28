#!/usr/bin/env node
/*
 * flowdot — the consumer CLI shipped with the npm package. Two verbs:
 *
 *   flowdot lint <file.flow>   parse the diagram + check its resolved layout, then report syntax
 *                          errors (with line numbers) and the hard geometry faults an author can't
 *                          see in text — degenerate size, off-canvas, node overlaps. Exit 1 on any
 *                          error, 0 when clean. This is the validate step of the author→lint→fix→
 *                          render loop (see llms.txt). Parsing runs in safe mode, so the trusted
 *                          import/model/call escapes are flagged rather than executed.
 *
 *   flowdot vendor <dir>   copy the built dist/flowdot.js bundle into <dir> — the one-command
 *                          refresh on upgrade. For static / file:// pages, vendor the bundle into
 *                          your own repo and reference it relatively; never point a page at
 *                          node_modules/ (it is gitignored and 404s once the page is committed).
 *                          See the README "Using flowdot in your own project" section.
 *
 * `vendor` needs no library (a file copy). `lint` reuses the shipped bundle (Flow.parse +
 * SceneBuilder.resolveLayout), so both work from a bare `npm install flowdot`.
 */
const fs = require('fs');
const path = require('path');

// The bundle that ships in the package: <pkg>/dist/flowdot.js, relative to this file (<pkg>/bin/).
const BUNDLE = path.resolve(__dirname, '..', 'dist', 'flowdot.js');

// Copy the bundle into <dir> (created if needed) as flowdot.js. Idempotent — overwrites any existing
// copy, so re-running after an upgrade just refreshes it. `src` is injectable for tests.
function vendor(dir, src = BUNDLE) {
  if (!dir) { console.error('vendor: needs a target dir — `flowdot vendor <dir>`'); return 2; }
  if (!fs.existsSync(src)) {
    console.error('vendor: bundle not found at ' + src + ' — build it (`npm run build`) or reinstall the package');
    return 1;
  }
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'flowdot.js');
  fs.copyFileSync(src, dest);
  console.log('vendored flowdot.js → ' + dest);
  return 0;
}

// Load the shipped library bundle for `lint` (only this verb needs it). Prefer the CommonJS build;
// fall back to the UMD .js loaded into a scratch global. `libLoader` is injectable for tests.
function loadLib(libLoader = require) {
  const cjs = path.resolve(__dirname, '..', 'dist', 'flowdot.cjs');
  if (fs.existsSync(cjs)) return libLoader(cjs);
  return null;
}

// Bounding box of a resolved node. A radius-based kind (ring) carries only one of w/h — derive the
// missing dimension square, matching tools/layout-lint.js effSize.
function nodeBox(n) { const w = n.w > 0 ? n.w : n.h, h = n.h > 0 ? n.h : n.w; return { x1: n.x, y1: n.y, x2: n.x + w, y2: n.y + h }; }

// `flowdot lint <file>` — parse (safe) then layout-check. Returns 0 clean, 1 on error, 2 on bad usage.
// ponytail: repeats the three HARD checks (degenerate/out-of-bounds/overlap) from tools/layout-lint.js
// rather than importing it — that checker is a private authoring gate and must NOT bloat the browser
// runtime bundle every page loads. If the CLI ever needs zones/lanes/min-gap, expose checkLayout from
// the package and call it instead of extending this copy.
function lint(file, lib = loadLib()) {
  if (!file) { console.error('lint: needs a file — `flowdot lint <file.flow>`'); return 2; }
  if (!fs.existsSync(file)) { console.error('lint: no such file: ' + file); return 2; }
  if (!lib || !lib.Flow || !lib.SceneBuilder) {
    console.error('lint: library bundle not found under dist/ — build it (`npm run build`) or reinstall the package');
    return 1;
  }
  let ir;
  try { ir = lib.Flow.parse(fs.readFileSync(file, 'utf8'), { safe: true }); }
  catch (e) { console.error('✗ ' + file + '\n  ' + String(e.message).split('\n')[0]); return 1; }

  const nodes = lib.SceneBuilder.resolveLayout(ir), problems = [];
  for (const n of nodes) {
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !(n.w > 0 || n.h > 0)) {
      problems.push(`degenerate: node "${n.id}" has no usable size (x=${n.x} y=${n.y} w=${n.w} h=${n.h})`);
      continue;                                                      // skip geometry checks on a degenerate node
    }
    const b = nodeBox(n);
    if (b.x1 < -1 || b.y1 < -1 || b.x2 > ir.width + 1 || b.y2 > ir.height + 1)
      problems.push(`out-of-bounds: node "${n.id}" escapes the ${ir.width}×${ir.height} canvas`);
  }
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodeBox(nodes[i]), b = nodeBox(nodes[j]);
    if (Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1) > 1 && Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) > 1)
      problems.push(`overlap: nodes "${nodes[i].id}" and "${nodes[j].id}" overlap`);
  }
  if (problems.length) { console.error('✗ ' + file + ' — ' + problems.length + ' issue(s):'); problems.forEach(p => console.error('  ' + p)); return 1; }
  console.log('✓ ' + file + ' — ' + nodes.length + ' node(s), ' + (ir.edges ? ir.edges.length : 0) + ' edge(s), no issues');
  return 0;
}

function run(argv) {
  const [cmd, arg] = argv;
  if (cmd === 'lint') return lint(arg);
  if (cmd === 'vendor') return vendor(arg);
  console.error('usage:\n' +
    '  flowdot lint <file.flow>   # check a diagram for syntax and layout errors\n' +
    '  flowdot vendor <dir>       # copy dist/flowdot.js into <dir> for static/file:// pages');
  return 2;
}

module.exports = { run, vendor, lint, loadLib, BUNDLE };

if (require.main === module) process.exit(run(process.argv.slice(2)));
