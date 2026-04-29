# @varbyte/treebound

> Motor de binding reactivo para Custom Elements — sin dependencias, sin `eval()`.

[![npm](https://img.shields.io/npm/v/@varbyte/treebound)](https://www.npmjs.com/package/@varbyte/treebound)
[![license](https://img.shields.io/npm/l/@varbyte/treebound)](./LICENSE)
[![coverage](https://img.shields.io/badge/coverage-96%25-brightgreen)](#tests)

TreeBound añade reactividad declarativa a tus Custom Elements usando `TreeWalker` nativo del DOM. Sin virtual DOM, sin compilador, sin dependencias externas.

---

## Características

- **Binding de texto** — `{{ expresión }}` en cualquier nodo de texto
- **Binding de atributos** — `bind-attr="expr"` o `:attr="expr"`
- **Eventos** — `@click="handler"`
- **Two-way binding** — `bind-value="propiedad"` en inputs, textareas y selects
- **Directivas estructurales** — `*if`, `*for`, `*ref`
- **Reactividad basada en Proxy** — sin polling, sin dirty-checking
- **Parser de expresiones seguro** — sin `eval()` ni `Function()`
- **Zero dependencias** en producción
- **TypeScript** nativo

---

## Instalación

```bash
npm install @varbyte/treebound
```

---

## Inicio rápido

### Con `TreeBoundEngine` directamente

```ts
import { TreeBoundEngine } from '@varbyte/treebound';

const container = document.querySelector('#app')!;
container.innerHTML = `
  <h1>{{ greeting }}</h1>
  <p>Contador: {{ count }}</p>
  <button @click="increment">+1</button>
  <input bind-value="greeting" />
`;

const engine = new TreeBoundEngine(container, {
  greeting: 'Hola mundo',
  count: 0,
  increment() {
    engine.data['count'] = (engine.data['count'] as number) + 1;
  }
});
```

### Con `TreeBoundElement` (Custom Elements)

```ts
import { TreeBoundElement, define } from '@varbyte/treebound';

@define('user-card')
class UserCard extends TreeBoundElement {
  render() {
    this.templateRoot.innerHTML = `
      <div class="card">
        <h2>{{ user.name }}</h2>
        <p>{{ user.age }} años</p>
        <p *if="user.isAdmin">Administrador</p>
        <input bind-value="user.name" placeholder="Nombre" />
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

## Lifecycle de `TreeBoundElement`

El orden de ejecución al conectar el elemento al DOM es:

```
render()        → escribe el HTML del template en this.templateRoot
initialState()  → retorna los datos reactivos iniciales (sin acceso a this.engine)
setupBindings() → crea el engine con los datos de initialState()
onConnected()   → hook post-engine: this.engine ya existe aquí
```

| Hook | Acceso a `this.engine` | Propósito |
|---|---|---|
| `render()` | ❌ | Escribir el HTML |
| `initialState()` | ❌ | Declarar datos iniciales |
| `onConnected()` | ✅ | Registrar eventos, lógica post-render |
| `onDisconnected()` | ✅ | Cleanup |
| `onAttributeChanged()` | ✅ | Reaccionar a cambios de atributos |

---

## Sintaxis de binding

### Interpolación de texto

```html
<p>Hola, {{ user.name }}!</p>
<span>{{ count === 0 ? 'vacío' : count + ' items' }}</span>
```

Expresiones soportadas:
- Variables y propiedades anidadas: `user.name`, `a.b.c`
- Aritmética: `+`, `-`, `*`, `/`, `%`
- Comparación: `===`, `!==`, `==`, `!=`, `<`, `>`, `<=`, `>=`
- Lógica: `&&`, `||`, `!`
- Ternario: `condición ? rama_verdadera : rama_falsa`
- `typeof`, paréntesis, `null`, `undefined`, `true`, `false`

### Binding de atributos

```html
<input bind-value="name" />        <!-- two-way binding -->
<div :class="cssClass"></div>       <!-- one-way binding de atributo -->
<button :disabled="isLoading"></button>
```

### Eventos

```html
<button @click="handleClick">Enviar</button>
<input @input="onInput" />
```

> **Nota:** Los handlers deben existir en el contexto del engine (`engine.data`).

### Directiva `*if`

```html
<div *if="isVisible">
  Este contenido se muestra u oculta con display:none
</div>
```

### Directiva `*for`

```html
<!-- Forma básica -->
<ul>
  <li *for="item in items">{{ item.name }}</li>
</ul>

<!-- Con índice -->
<ul>
  <li *for="item, i in items">{{ i + 1 }}. {{ item.name }}</li>
</ul>
```

### Directiva `*ref`

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

  readonly data: Record<string, unknown>;  // Proxy reactivo

  update(): void;    // Fuerza re-evaluación de todos los bindings
  destroy(): void;   // Cancela suscripciones y limpia bindings

  bindInput(
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    property: string
  ): void;  // Registra two-way binding manualmente
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

  // Acceso al DOM interno (shadow o light)
  public querySelector<E>(selector: string): E | null;
  public querySelectorAll<E>(selector: string): NodeListOf<E>;
  protected get templateRoot(): ShadowRoot | HTMLElement;

  // Datos reactivos
  get data(): Record<string, unknown>;
  set data(value: Record<string, unknown>);
}
```

### `TreeBoundConfig`

```ts
interface TreeBoundConfig {
  prefix?: string;           // Prefijo de interpolación, por defecto '{{'
  attributePrefix?: string;  // Prefijo de atributos, por defecto 'bind-'
  eventPrefix?: string;      // Prefijo de eventos, por defecto '@'
  directivePrefix?: string;  // Prefijo de directivas, por defecto '*'
}
```

### `define(tagName)` — Decorador

```ts
@define('my-component')
class MyComponent extends TreeBoundElement {
  // ...
}
```

Equivalente funcional sin decorador:

```ts
class MyComponent extends TreeBoundElement { /* ... */ }
customElements.define('my-component', MyComponent);
```

### `DirectiveRegistry`

```ts
import { directives } from '@varbyte/treebound';

directives.register({
  name: 'mi-directiva',
  bind(binding, context) { /* setup */ },
  update(binding, context) { /* re-evaluación */ },
  unbind?(binding) { /* cleanup */ },
});
```

---

## Shadow DOM vs Light DOM

Por defecto los componentes usan **shadow DOM** (`mode: 'open'`). Para usar light DOM:

```ts
class MyEl extends TreeBoundElement {
  constructor() {
    super({ shadow: false });
  }
  // ...
}
```

Con **light DOM** (`shadow: false`):
- Los estilos del host aplican directamente al contenido
- `querySelector` y `querySelectorAll` buscan en el propio elemento

---

## Rendimiento

Benchmarks medidos en Node.js v22 con jsdom en Apple M-series.  
Ejecutar localmente: `npm run benchmark`

> Los tiempos en browser real son menores — jsdom es significativamente más lento que los motores nativos de los navegadores.

### Inicialización del engine

Tiempo en crear el engine, hacer el walk del DOM y registrar todos los bindings:

| Bindings | ops/seg | media | p95 |
|---|---|---|---|
| 10 | 11,258 | 88 µs | 100 µs |
| 50 | 2,367 | 422 µs | 545 µs |
| 100 | 1,113 | 898 µs | 1.14 ms |
| 200 | 588 | 1.70 ms | 1.89 ms |

### Actualización reactiva (dato → DOM)

Tiempo desde `engine.data['x'] = valor` hasta que el DOM refleja el cambio:

| Escenario | ops/seg | media | p95 |
|---|---|---|---|
| 1 binding — escalar simple | 432,420 | 2.3 µs | 2.4 µs |
| 1 binding — propiedad anidada (`user.name`) | 408,981 | 2.4 µs | 2.6 µs |
| 10 bindings dependientes de una variable | 50,115 | 20 µs | 20 µs |
| 50 bindings dependientes de una variable | 10,015 | 99 µs | 104 µs |

### Parser de expresiones

| Escenario | ops/seg | media |
|---|---|---|
| Evaluación con caché (hit) | 540,854 | 1.8 µs |
| Evaluación sin caché (miss) | 281,764 | 3.5 µs |

El caché del parser persiste durante la vida del engine. En uso normal todas las expresiones se cachean tras la primera evaluación.

### Escalabilidad del walk

| Tamaño DOM | Bindings | ops/seg | media | Bindings/ms |
|---|---|---|---|---|
| 50 elementos | 100 | 738 | 1.35 ms | 74 |
| 200 elementos | 400 | 103 | 9.70 ms | 41 |
| 500 elementos | 1,000 | 22 | 46 ms | 22 |
| 1,000 elementos | 2,000 | 6 | 154 ms | 13 |

> **Nota de diseño:** TreeBound está optimizado para componentes con menos de 100 bindings — el caso habitual de un Custom Element. Para listas largas, delega el renderizado a `*for` que evalúa cada ítem en contexto local sin pasar por el engine global.

---

```bash
npm test              # Ejecutar tests
npm run test:coverage # Tests con reporte de cobertura
```

Cobertura actual:

| Métrica | Cobertura |
|---|---|
| Statements | 96.74% |
| Branches | 89.76% |
| Functions | 96.07% |
| Lines | 97.07% |

---

## Build

```bash
npm run build          # Compila a dist/
npm run playground     # Servidor de desarrollo con ejemplos interactivos
```

---

## Compatibilidad

Requiere un entorno que soporte:
- Custom Elements v1
- Proxy
- `document.createTreeWalker`
- ES2020+

Compatible con todos los navegadores modernos. **No compatible con IE11.**

---

## Licencia

[MIT](./LICENSE) © VarByte
