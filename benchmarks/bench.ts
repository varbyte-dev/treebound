/**
 * TreeBound — Benchmark de rendimiento
 *
 * Mide cuatro escenarios clave:
 *   1. Inicialización del engine (walk + setup) con N bindings
 *   2. Velocidad de actualización reactiva (proxy → DOM)
 *   3. Throughput del parser (con y sin caché)
 *   4. Walk sobre DOM grande
 *
 * Ejecutar: npm run benchmark
 */

import { JSDOM } from 'jsdom';

// ── Setup DOM global (jsdom) ─────────────────────────────────────────────────

const { window: w } = new JSDOM('<!DOCTYPE html><html><body></body></html>');

Object.assign(global, {
  window: w,
  document: w.document,
  Node: w.Node,
  NodeFilter: w.NodeFilter,
  HTMLElement: w.HTMLElement,
  HTMLInputElement: w.HTMLInputElement,
  HTMLTextAreaElement: w.HTMLTextAreaElement,
  HTMLSelectElement: w.HTMLSelectElement,
  ShadowRoot: w.ShadowRoot,
  Comment: w.Comment,
  Text: w.Text,
  DocumentFragment: w.DocumentFragment,
  customElements: w.customElements,
  Event: w.Event,
});

// Importar DESPUÉS de setear globals
import('../src/engine').then(({ TreeBoundEngine }) => {
  return import('../src/parser').then(({ SafeExpressionParser }) => {
    run(TreeBoundEngine, SafeExpressionParser);
  });
});

// ── Tipos ────────────────────────────────────────────────────────────────────

interface BenchResult {
  label: string;
  iterations: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  opsPerSec: number;
}

// ── Utilidades ───────────────────────────────────────────────────────────────

function makeContainer(html: string): HTMLElement {
  const div = w.document.createElement('div');
  div.innerHTML = html;
  w.document.body.appendChild(div);
  return div;
}

function removeContainer(el: HTMLElement): void {
  w.document.body.removeChild(el);
}

function bench(
  label: string,
  fn: (ctx?: HTMLElement) => void,
  opts: {
    warmup?: number;
    duration?: number;
    setup?: () => HTMLElement;
    teardown?: (ctx: HTMLElement) => void;
  } = {}
): BenchResult {
  const { warmup = 100, duration = 1500, setup, teardown } = opts;

  for (let i = 0; i < warmup; i++) {
    const ctx = setup?.();
    fn(ctx);
    teardown?.(ctx!);
  }

  const times: number[] = [];
  const end = performance.now() + duration;

  while (performance.now() < end) {
    const ctx = setup?.();
    const t0 = performance.now();
    fn(ctx);
    const t1 = performance.now();
    teardown?.(ctx!);
    times.push(t1 - t0);
  }

  times.sort((a, b) => a - b);

  const mean = times.reduce((s, v) => s + v, 0) / times.length;
  const p50  = times[Math.floor(times.length * 0.50)];
  const p95  = times[Math.floor(times.length * 0.95)];
  const p99  = times[Math.floor(times.length * 0.99)];

  return {
    label,
    iterations: times.length,
    mean,
    p50,
    p95,
    p99,
    opsPerSec: Math.round(1000 / mean),
  };
}

function fmt(ms: number): string {
  return ms < 0.01
    ? `${(ms * 1_000_000).toFixed(0)}ns`
    : ms < 1
    ? `${(ms * 1000).toFixed(1)}µs`
    : `${ms.toFixed(2)}ms`;
}

function printResult(r: BenchResult, extra?: string): void {
  console.log(`  ${r.label}`);
  console.log(`    ${r.opsPerSec.toLocaleString()} ops/sec  |  mean ${fmt(r.mean)}  |  p50 ${fmt(r.p50)}  |  p95 ${fmt(r.p95)}  |  p99 ${fmt(r.p99)}`);
  if (extra) console.log(`    ${extra}`);
  console.log(`    (${r.iterations} samples)`);
  console.log();
}

function header(title: string): void {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

// ── Main ─────────────────────────────────────────────────────────────────────

function run(TreeBoundEngine: any, SafeExpressionParser: any): void {

  // ── 1. Inicialización del engine ───────────────────────────────────────────

  header('1. Engine initialization (walk + setup)');

  for (const count of [10, 50, 100, 200]) {
    const html = Array.from({ length: count }, (_, i) =>
      `<span>{{ val${i} }}</span>`
    ).join('');
    const data = Object.fromEntries(Array.from({ length: count }, (_, i) => [`val${i}`, i]));

    const r = bench(
      `${count} text bindings`,
      (root) => {
        const e = new TreeBoundEngine(root, { ...data });
        e.destroy();
      },
      {
        setup:    () => makeContainer(`<div>${html}</div>`),
        teardown: (root) => removeContainer(root),
      }
    );
    printResult(r);
  }

  // ── 2. Actualización reactiva ──────────────────────────────────────────────

  header('2. Reactive update (data → DOM)');

  // 2a. Escalar simple
  {
    const root = makeContainer('<div><span>{{ count }}</span></div>');
    const engine = new TreeBoundEngine(root, { count: 0 });
    let n = 0;
    const r = bench('1 binding — scalar', () => { engine.data['count'] = n++; });
    printResult(r);
    engine.destroy();
    removeContainer(root);
  }

  // 2b. Propiedad anidada
  {
    const root = makeContainer('<div><span>{{ user.name }}</span></div>');
    const engine = new TreeBoundEngine(root, { user: { name: 'Ana' } });
    let n = 0;
    const r = bench('1 binding — nested property (user.name)', () => {
      (engine.data['user'] as any)['name'] = `U${n++}`;
    });
    printResult(r);
    engine.destroy();
    removeContainer(root);
  }

  // 2c. 10 bindings que dependen de una misma variable
  {
    const html = Array.from({ length: 10 }, (_, i) =>
      `<span>{{ base + ${i} }}</span>`
    ).join('');
    const root = makeContainer(`<div>${html}</div>`);
    const engine = new TreeBoundEngine(root, { base: 0 });
    let n = 0;
    const r = bench('10 dependent bindings — single source change', () => {
      engine.data['base'] = n++;
    });
    printResult(r);
    engine.destroy();
    removeContainer(root);
  }

  // 2d. 50 bindings
  {
    const html = Array.from({ length: 50 }, (_, i) =>
      `<span>{{ base + ${i} }}</span>`
    ).join('');
    const root = makeContainer(`<div>${html}</div>`);
    const engine = new TreeBoundEngine(root, { base: 0 });
    let n = 0;
    const r = bench('50 dependent bindings — single source change', () => {
      engine.data['base'] = n++;
    });
    printResult(r);
    engine.destroy();
    removeContainer(root);
  }

  // ── 3. Parser de expresiones ───────────────────────────────────────────────

  header('3. Expression parser throughput');

  const EXPRS = [
    'count',
    'user.name',
    "active ? 'sí' : 'no'",
    'a + b * c',
    'items.length',
    "count === 0 ? 'vacío' : count + ' items'",
    'x > 0 && y < 100',
    '!flag',
    'a !== b',
    'typeof value',
  ];
  const CTX = { count: 5, user: { name: 'Ana' }, active: true, a: 2, b: 3, c: 4, items: [1, 2, 3], x: 5, y: 50, flag: false, value: 'hello' };

  // Warm (caché activo)
  const parser = SafeExpressionParser.getInstance();
  EXPRS.forEach(e => parser.parse(e)); // Pre-poblar caché

  let idx = 0;
  const warmR = bench('parse + evaluate — cached (10 expr rotation)', () => {
    const expr = EXPRS[idx++ % EXPRS.length];
    parser.parse(expr).evaluate(CTX);
  });
  printResult(warmR, `~${warmR.opsPerSec.toLocaleString()} evaluations/sec`);

  // Cold (sin caché — expresión única cada vez)
  let coldN = 0;
  const coldR = bench('parse + evaluate — cold (unique expr every time)', () => {
    const expr = `item${coldN++} + 1`;
    parser.parse(expr).evaluate({ [`item${coldN - 1}`]: coldN });
  });
  printResult(coldR, `cache miss overhead: ~${Math.round(coldR.mean / warmR.mean)}x vs cached`);

  // ── 4. Escalabilidad del walk ──────────────────────────────────────────────

  header('4. DOM walk scalability');

  for (const size of [50, 200, 500, 1000]) {
    const html = Array.from({ length: size }, (_, i) =>
      `<div><span>{{ items[${i}].name }}</span><em>{{ items[${i}].value }}</em></div>`
    ).join('');
    const data = {
      items: Array.from({ length: size }, (_, i) => ({ name: `Item ${i}`, value: i })),
    };

    const r = bench(
      `${size} elements (${size * 2} bindings)`,
      (root) => {
        const e = new TreeBoundEngine(root, { ...data });
        e.destroy();
      },
      {
        warmup: 10,
        duration: 1200,
        setup:    () => makeContainer(`<div>${html}</div>`),
        teardown: (root) => removeContainer(root),
      }
    );
    printResult(r, `${Math.round((size * 2) / r.mean).toLocaleString()} bindings/ms`);
  }

  // ── Resumen del entorno ────────────────────────────────────────────────────

  header('Environment');
  console.log(`  Node.js  : ${process.version}`);
  console.log(`  Platform : ${process.platform} / ${process.arch}`);
  console.log(`  Date     : ${new Date().toISOString()}`);
  console.log();
}
