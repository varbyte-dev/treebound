# @varbyte/treebound

> Reactive binding engine for Custom Elements — zero dependencies, no `eval()`.

[![npm](https://img.shields.io/npm/v/@varbyte/treebound)](https://www.npmjs.com/package/@varbyte/treebound)
[![license](https://img.shields.io/npm/l/@varbyte/treebound)](./LICENSE)
[![coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](#tests)

TreeBound adds declarative reactivity to your Custom Elements using the native DOM `TreeWalker`. No virtual DOM, no compiler, no external dependencies.

---

## Features

- **Text binding** — `{{ expression }}` in any text node
- **Attribute binding** — `bind-attr="expr"` or `:attr="expr"`
- **Events** — `@click="handler"`
- **Two-way binding** — `bind-value="property"` on inputs, textareas and selects
- **Structural directives** — `*if`, `*for`, `*ref`
- **Proxy-based reactivity** — no polling, no dirty-checking
- **Safe expression parser** — no `eval()`, no `Function()`
- **Zero production dependencies**
- **Native TypeScript**

---

## Installation

```bash
npm install @varbyte/treebound
```

---

## Quick Start

### Using `TreeBoundEngine` directly

```ts
import { TreeBoundEngine } from '@varbyte/treebound';

const container = document.querySelector('#app')!;
container.innerHTML = `
  <h1>{{ greeting }}</h1>
  <p>Counter: {{ count }}</p>
  <button @click="increment">+1</button>
  <input bind-value="greeting" />
`;

const engine = new TreeBoundEngine(container, {
  greeting: 'Hello world',
  count: 0,
  increment() {
    engine.data['count'] = (engine.data['count'] as number) + 1;
  }
});
```

### Using `TreeBoundElement` (Custom Elements)

```ts
import { TreeBoundElement, define } from '@varbyte/treebound';

@define('user-card')
class UserCard extends TreeBoundElement {
  render() {
    this.templateRoot.innerHTML = `
      <div class="card">
        <h2>{{ user.name }}</h2>
        <p>{{ user.age }} years old</p>
        <p *if="user.isAdmin">Administrator</p>
        <input bind-value="user.name" placeholder="Name" />
      </div>
    `;
  }

  initialState() {
    return {
      user: { name: 'Ana García', age: 30, isAdmin: true }
    };
  }
}
```

```html
<user-card></user-card>
```

---

## `TreeBoundElement` Lifecycle

Execution order when the element is connected to the DOM:

```
render()        → writes the template HTML into this.templateRoot
initialState()  → returns the initial reactive data (no access to this.engine)
setupBindings() → creates the engine with the data from initialState()
onConnected()   → post-engine hook: this.engine already exists here
```

| Hook | Access to `this.engine` | Purpose |
|---|---|---|
| `render()` | ❌ | Write the template HTML |
| `initialState()` | ❌ | Declare initial reactive data |
| `onConnected()` | ✅ | Register events, post-render logic |
| `onDisconnected()` | ✅ | Cleanup |
| `onAttributeChanged()` | ✅ | React to attribute changes |

---

## Binding Syntax

### Text interpolation

```html
<p>Hello, {{ user.name }}!</p>
<span>{{ count === 0 ? 'empty' : count + ' items' }}</span>
```

Supported expressions:
- Variables and nested properties: `user.name`, `a.b.c`
- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `===`, `!==`, `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logic: `&&`, `||`, `!`
- Ternary: `condition ? true_branch : false_branch`
- `typeof`, parentheses, `null`, `undefined`, `true`, `false`

### Attribute binding

```html
<input bind-value="name" />        <!-- two-way binding -->
<div :class="cssClass"></div>       <!-- one-way attribute binding -->
<button :disabled="isLoading"></button>
```

### Events

```html
<button @click="handleClick">Submit</button>
<input @input="onInput" />
```

> **Note:** Handlers must exist in the engine's data context (`engine.data`).

### `*if` directive

```html
<div *if="isVisible">
  This content is shown/hidden with display:none
</div>
```

### `*for` directive

```html
<!-- Basic form -->
<ul>
  <li *for="item in items">{{ item.name }}</li>
</ul>

<!-- With index -->
<ul>
  <li *for="item, i in items">{{ i + 1 }}. {{ item.name }}</li>
</ul>
```

### `*ref` directive

```html
<input *ref="myInput" type="text" />
```

```ts
onConnected() {
  const input = this.engine!.data['myInput'] as HTMLInputElement;
  input.focus();
}
```

---

## API

### `TreeBoundEngine`

```ts
class TreeBoundEngine {
  constructor(
    root: Node,
    initialData?: Record<string, unknown>,
    config?: TreeBoundConfig
  );

  readonly data: Record<string, unknown>;  // Reactive Proxy

  update(): void;    // Forces re-evaluation of all bindings
  destroy(): void;   // Cancels subscriptions and clears bindings

  bindInput(
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    property: string
  ): void;  // Manually registers two-way binding
}
```

### `TreeBoundElement`

```ts
abstract class TreeBoundElement extends HTMLElement {
  protected engine?: TreeBoundEngine;

  // Hooks
  protected abstract render(): void;
  protected initialState(): Record<string, unknown>;
  protected onConnected(): void;
  protected onDisconnected(): void;
  protected onAttributeChanged(name, oldValue, newValue): void;

  // Internal DOM access (shadow or light)
  public querySelector<E>(selector: string): E | null;
  public querySelectorAll<E>(selector: string): NodeListOf<E>;
  protected get templateRoot(): ShadowRoot | HTMLElement;

  // Reactive data
  get data(): Record<string, unknown>;
  set data(value: Record<string, unknown>);
}
```

### `TreeBoundConfig`

```ts
interface TreeBoundConfig {
  prefix?: string;           // Interpolation prefix, default '{{'
  attributePrefix?: string;  // Attribute prefix, default 'bind-'
  eventPrefix?: string;      // Event prefix, default '@'
  directivePrefix?: string;  // Directive prefix, default '*'
}
```

### `define(tagName)` — Decorator

```ts
@define('my-component')
class MyComponent extends TreeBoundElement {
  // ...
}
```

Functional equivalent without decorator:

```ts
class MyComponent extends TreeBoundElement { /* ... */ }
customElements.define('my-component', MyComponent);
```

### `DirectiveRegistry`

```ts
import { directives } from '@varbyte/treebound';

directives.register({
  name: 'my-directive',
  bind(binding, context) { /* setup */ },
  update(binding, context) { /* re-evaluation */ },
  unbind?(binding) { /* cleanup */ },
});
```

---

## Shadow DOM vs Light DOM

By default components use **shadow DOM** (`mode: 'open'`). To use light DOM:

```ts
class MyEl extends TreeBoundElement {
  constructor() {
    super({ shadow: false });
  }
  // ...
}
```

With **light DOM** (`shadow: false`):
- Host styles apply directly to the content
- `querySelector` and `querySelectorAll` search in the element itself

---

## Performance

Benchmarks measured on Node.js v22 with jsdom on Apple M-series.  
Run locally: `npm run benchmark`

> Real browser times are lower — jsdom is significantly slower than native browser engines.

### Engine initialization

Time to create the engine, walk the DOM, and register all bindings:

| Bindings | ops/sec | mean | p95 |
|---|---|---|---|
| 10 | 11,258 | 88 µs | 100 µs |
| 50 | 2,367 | 422 µs | 545 µs |
| 100 | 1,113 | 898 µs | 1.14 ms |
| 200 | 588 | 1.70 ms | 1.89 ms |

### Reactive update (data → DOM)

Time from `engine.data['x'] = value` to the DOM reflecting the change:

| Scenario | ops/sec | mean | p95 |
|---|---|---|---|
| 1 binding — scalar | 432,420 | 2.3 µs | 2.4 µs |
| 1 binding — nested property (`user.name`) | 408,981 | 2.4 µs | 2.6 µs |
| 10 dependent bindings — single variable change | 50,115 | 20 µs | 20 µs |
| 50 dependent bindings — single variable change | 10,015 | 99 µs | 104 µs |

### Expression parser throughput

| Scenario | ops/sec | mean |
|---|---|---|
| Evaluate with cache (hit) | 540,854 | 1.8 µs |
| Evaluate without cache (miss) | 281,764 | 3.5 µs |

The parser cache persists for the lifetime of the engine. In normal use all expressions are cached after the first evaluation.

### DOM walk scalability

| DOM size | Bindings | ops/sec | mean | Bindings/ms |
|---|---|---|---|---|
| 50 elements | 100 | 738 | 1.35 ms | 74 |
| 200 elements | 400 | 103 | 9.70 ms | 41 |
| 500 elements | 1,000 | 22 | 46 ms | 22 |
| 1,000 elements | 2,000 | 6 | 154 ms | 13 |

> **Design note:** TreeBound is optimized for components with fewer than 100 bindings — the typical use case for a Custom Element. For long lists, delegate rendering to `*for`, which evaluates each item in local context without going through the global engine.

---

## Tests

```bash
npm test              # Run tests
npm run test:coverage # Tests with coverage report
```

Current coverage:

| Metric | Coverage |
|---|---|
| Statements | 96.74% |
| Branches | 89.76% |
| Functions | 96.07% |
| Lines | 97.07% |

---

## Build

```bash
npm run build          # Compile to dist/
npm run playground     # Dev server with interactive examples
```

---

## Browser Compatibility

Requires an environment that supports:
- Custom Elements v1
- Proxy
- `document.createTreeWalker`
- ES2020+

Compatible with all modern browsers. **Not compatible with IE11.**

---

## License

[MIT](./LICENSE) © VarByte
