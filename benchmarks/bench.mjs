/**
 * TreeBound — Benchmark de rendimiento
 *
 * Mide cuatro escenarios clave:
 *   1. Inicialización del engine (walk + setup) con N bindings
 *   2. Velocidad de actualización reactiva (proxy → DOM)
 *   3. Throughput del parser (con y sin caché)
 *   4. Walk sobre DOM grande (número de nodos procesados por ms)
 *
 * Corre en Node.js usando jsdom como entorno DOM.
 * Ejecutar: node benchmarks/bench.mjs
 */

import { JSDOM } from 'jsdom';

// ── Setup jsdom global ───────────────────────────────────────────────────────

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window    = dom.window;
global.document  = dom.window.document;
global.Node      = dom.window.Node;
global.NodeFilter = dom.window.NodeFilter;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.ShadowRoot = dom.window.ShadowRoot;
global.Comment    = dom.window.Comment;
global.Text       = dom.window.Text;
global.DocumentFragment = dom.window.DocumentFragment;
global.customElements = dom.window.customElements;
global.Event = dom.window.Event;

// ── Import después de globals ────────────────────────────────────────────────

const { TreeBoundEngine } = await import('../src/engine.js').catch(async () => {
  // Fallback para ESM compiled
  const { TreeBoundEngine } = await import('../dist/engine.js');
  return { TreeBoundEngine };
});

const { SafeExpressionParser } = await import('../src/parser.js').catch(async () => {
  const { SafeExpressionParser } = await import('../dist/parser.js');
  return { SafeExpressionParser };
});

// ── Utilidades ───────────────────────────────────────────────────────────────

function makeContainer(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

function removeContainer(el) {
  document.body.removeChild(el);
}

/**
 * Corre una función `fn` durante `duration` ms y devuelve las estadísticas.
 * Usa warmup de 50 iteraciones antes de medir.
 */
function bench(label, fn, { warmup = 50, duration = 1000, setup, teardown } = {}) {
  // Warmup
  for (let i = 0; i < warmup; i++) {
    const ctx = setup?.();
    fn(ctx);
    teardown?.(ctx);
  }

  // Medición
  const times = [];
  const end = performance.now() + duration;

  while (performance.now() < end) {
    const ctx = setup?.();
    const t0 = performance.now();
    fn(ctx);
    const t1 = performance.now();
    teardown?.(ctx);
    times.push(t1 - t0);
  }

  times.sort((a, b) => a - b);

  const sum = times.reduce((s, v) => s + v, 0);
  const mean = sum / times.length;
  const p50  = times[Math.floor(times.length * 0.50)];
  const p95  = times[Math.floor(times.length * 0.95)];
  const p99  = times[Math.floor(times.length * 0.99)];
  const opsPerSec = Math.round(1000 / mean);

  return { label, iterations: times.length, mean, p50, p95, p99, opsPerSec };
}

function printResult(r) {
  const fmt = (n) => n < 0.1 ? `${(n * 1000).toFixed(2)}µs` : `${n.toFixed(3)}ms`;
  console.log(`  ${r.label}`);
  console.log(`    ops/sec : ${r.opsPerSec.toLocaleString()}`);
  console.log(`    mean    : ${fmt(r.mean)}`);
  console.log(`    p50     : ${fmt(r.p50)}`);
  console.log(`    p95     : ${fmt(r.p95)}`);
  console.log(`    p99     : ${fmt(r.p99)}`);
  console.log(`    samples : ${r.iterations}`);
  console.log();
}

function printHeader(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ── Benchmark 1: Inicialización del engine ───────────────────────────────────

printHeader('1. Engine initialization (walk + reactivity setup)');

// 1a. 10 bindings
{
  const bindings10 = Array.from({ length: 10 }, (_, i) =>
    `<span>{{ item${i} }}</span>`
  ).join('');

  const data10 = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`item${i}`, i])
  );

  const r = bench(
    '10 bindings',
    (root) => {
      const engine = new TreeBoundEngine(root, { ...data10 });
      engine.destroy();
    },
    {
      setup: () => makeContainer(`<div>${bindings10}</div>`),
      teardown: (root) => removeContainer(root),
    }
  );
  printResult(r);
}

// 1b. 50 bindings
{
  const bindings50 = Array.from({ length: 50 }, (_, i) =>
    `<span>{{ item${i} }}</span>`
  ).join('');

  const data50 = Object.fromEntries(
    Array.from({ length: 50 }, (_, i) => [`item${i}`, i])
  );

  const r = bench(
    '50 bindings',
    (root) => {
      const engine = new TreeBoundEngine(root, { ...data50 });
      engine.destroy();
    },
    {
      setup: () => makeContainer(`<div>${bindings50}</div>`),
      teardown: (root) => removeContainer(root),
    }
  );
  printResult(r);
}

// 1c. 200 bindings
{
  const bindings200 = Array.from({ length: 200 }, (_, i) =>
    `<span>{{ item${i} }}</span>`
  ).join('');

  const data200 = Object.fromEntries(
    Array.from({ length: 200 }, (_, i) => [`item${i}`, i])
  );

  const r = bench(
    '200 bindings',
    (root) => {
      const engine = new TreeBoundEngine(root, { ...data200 });
      engine.destroy();
    },
    {
      setup: () => makeContainer(`<div>${bindings200}</div>`),
      teardown: (root) => removeContainer(root),
    }
  );
  printResult(r);
}

// ── Benchmark 2: Actualización reactiva (Proxy → DOM) ───────────────────────

printHeader('2. Reactive update (data change → DOM update)');

// 2a. Un solo binding
{
  const root = makeContainer('<div><span>{{ count }}</span></div>');
  const engine = new TreeBoundEngine(root, { count: 0 });
  let n = 0;

  const r = bench('1 binding — scalar update', () => {
    engine.data['count'] = n++;
  });
  printResult(r);
  engine.destroy();
  removeContainer(root);
}

// 2b. Objeto anidado
{
  const root = makeContainer('<div><span>{{ user.name }}</span><span>{{ user.age }}</span></div>');
  const engine = new TreeBoundEngine(root, { user: { name: 'Ana', age: 30 } });
  let n = 0;

  const r = bench('2 bindings — nested object property', () => {
    (engine.data['user'])['name'] = `User${n++}`;
  });
  printResult(r);
  engine.destroy();
  removeContainer(root);
}

// 2c. 20 bindings afectados por un cambio
{
  const html = Array.from({ length: 20 }, (_, i) =>
    `<span>{{ base + ${i} }}</span>`
  ).join('');
  const root = makeContainer(`<div>${html}</div>`);
  const engine = new TreeBoundEngine(root, { base: 0 });
  let n = 0;

  const r = bench('20 dependent bindings — single change', () => {
    engine.data['base'] = n++;
  });
  printResult(r);
  engine.destroy();
  removeContainer(root);
}

// ── Benchmark 3: Parser de expresiones ──────────────────────────────────────

printHeader('3. Expression parser');

const parser = SafeExpressionParser.getInstance();

// 3a. Parse + evaluate — cold (sin caché / expresiones únicas)
{
  let n = 0;
  const r = bench('parse + evaluate — cold (unique expressions)', () => {
    // Forzar miss de caché generando expresión única cada vez
    const expr = `item${n++} + 1`;
    parser.parse(expr).evaluate({ [`item${n - 1}`]: n });
  });
  printResult(r);
}

// 3b. Parse + evaluate — warm (con caché)
{
  // Pre-poblar caché
  const EXPRS = [
    'count',
    'user.name',
    "active ? 'sí' : 'no'",
    'a + b * c',
    'items.length',
    "count === 0 ? 'vacío' : count + ' items'",
    'x > 0 && y < 100',
    'typeof value',
  ];
  EXPRS.forEach(e => parser.parse(e));

  let i = 0;
  const ctx = { count: 5, user: { name: 'Ana' }, active: true, a: 1, b: 2, c: 3, items: [1, 2, 3], x: 5, y: 50, value: 'hello' };

  const r = bench('parse + evaluate — warm (cached expressions)', () => {
    const expr = EXPRS[i++ % EXPRS.length];
    parser.parse(expr).evaluate(ctx);
  });
  printResult(r);
}

// 3c. Solo tokenize
{
  let n = 0;
  // Acceder al método privado via cast
  const parserAny = parser;
  const EXPRS_FIXED = [
    "count === 0 ? 'vacío' : count + ' items'",
    'user.name',
    'a + b * c',
    'items.length',
    'active && !disabled',
  ];

  const r = bench('full parse (tokenize + compile) — fixed expressions', () => {
    const expr = EXPRS_FIXED[n++ % EXPRS_FIXED.length];
    // Reset cache to force re-parse
    parserAny.cache?.delete(expr);
    parser.parse(expr);
  });
  printResult(r);
}

// ── Benchmark 4: DOM walk escalabilidad ─────────────────────────────────────

printHeader('4. DOM walk scalability');

const sizes = [50, 100, 500, 1000];

for (const size of sizes) {
  const html = Array.from({ length: size }, (_, i) => `
    <div class="item">
      <span>{{ items[${i}].name }}</span>
      <span>{{ items[${i}].value }}</span>
    </div>
  `).join('');

  const data = {
    items: Array.from({ length: size }, (_, i) => ({ name: `Item ${i}`, value: i }))
  };

  const r = bench(
    `${size} nodes (${size * 2} bindings)`,
    (root) => {
      const engine = new TreeBoundEngine(root, { ...data });
      engine.destroy();
    },
    {
      warmup: 5,
      duration: 800,
      setup: () => makeContainer(`<div>${html}</div>`),
      teardown: (root) => removeContainer(root),
    }
  );

  // Para DOM grande, mostrar ms/op además de ops/sec
  const fmtMs = (n) => `${n.toFixed(2)}ms`;
  console.log(`  ${r.label}`);
  console.log(`    ops/sec : ${r.opsPerSec.toLocaleString()}`);
  console.log(`    mean    : ${fmtMs(r.mean)}  |  p95: ${fmtMs(r.p95)}  |  p99: ${fmtMs(r.p99)}`);
  console.log(`    bindings/ms: ${Math.round((size * 2) / r.mean).toLocaleString()}`);
  console.log(`    samples : ${r.iterations}`);
  console.log();
}

// ── Resumen ──────────────────────────────────────────────────────────────────

console.log('─'.repeat(60));
console.log('  Environment');
console.log('─'.repeat(60));
console.log(`  Node.js : ${process.version}`);
console.log(`  Platform: ${process.platform} ${process.arch}`);
console.log(`  jsdom   : ${(await import('jsdom')).version ?? 'n/a'}`);
console.log();
