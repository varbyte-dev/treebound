/**
 * TreeBound — Playground de ejemplos
 *
 * Nota: usamos customElements.define() directamente en lugar del
 * decorador @define para evitar depender de Babel en el playground.
 * El decorador es syntactic sugar — hace exactamente lo mismo.
 *
 * Lifecycle correcto:
 *   render() → initialState() → setupBindings(engine) → onConnected()
 *
 * - initialState(): retorna datos reactivos iniciales. SIN acceso a this.engine.
 * - onConnected():  lógica post-engine. this.engine YA existe aquí.
 */

import { TreeBoundElement, TreeBoundEngine } from '../src/index';

// ============================================================
// EJEMPLO 1: User Card — text binding + *if + two-way input
// ============================================================

class UserCardDemo extends TreeBoundElement {
  constructor() { super({ shadow: false }); }

  render() {
    this.templateRoot.innerHTML = `
      <div class="component-card">
        <h3>{{ user.name }}</h3>
        <p>Edad: {{ user.age }} años</p>
        <p *if="user.isAdmin"><span class="admin-badge">Administrador</span></p>
        <input type="text" bind-value="user.name" placeholder="Edita el nombre..." />
      </div>
    `;
  }

  initialState() {
    return {
      user: { name: 'Ana García', age: 30, isAdmin: true },
    };
  }
}

customElements.define('user-card-demo', UserCardDemo);

// ============================================================
// EJEMPLO 2: Counter — reactividad + eventos
// ============================================================

class CounterDemo extends TreeBoundElement {
  constructor() { super({ shadow: false }); }

  render() {
    this.templateRoot.innerHTML = `
      <div class="component-card">
        <div class="counter-display">{{ count }}</div>
        <div class="counter-controls">
          <button class="btn-danger" id="dec">−</button>
          <button id="reset">Reset</button>
          <button id="inc">+</button>
        </div>
        <p style="text-align:center; margin-top:0.5rem; font-size:0.8rem; color:#64748b;">
          {{ count === 0 ? 'En cero' : count > 0 ? 'Positivo' : 'Negativo' }}
        </p>
      </div>
    `;
  }

  initialState() {
    return { count: 0 };
  }

  onConnected() {
    this.querySelector('#inc')?.addEventListener('click', () => {
      this.engine!.data['count'] = (this.engine!.data['count'] as number) + 1;
    });
    this.querySelector('#dec')?.addEventListener('click', () => {
      this.engine!.data['count'] = (this.engine!.data['count'] as number) - 1;
    });
    this.querySelector('#reset')?.addEventListener('click', () => {
      this.engine!.data['count'] = 0;
    });
  }
}

customElements.define('counter-demo', CounterDemo);

// ============================================================
// EJEMPLO 3: Todo List — lista manual + two-way input
// ============================================================

interface Todo {
  text: string;
  done: boolean;
}

class TodoListDemo extends TreeBoundElement {
  private todos: Todo[] = [
    { text: 'Aprender TreeWalker', done: true },
    { text: 'Construir motor de binding', done: true },
    { text: 'Crear directivas reactivas', done: false },
  ];

  constructor() { super({ shadow: false }); }

  render() {
    this.templateRoot.innerHTML = `
      <div class="component-card">
        <ul id="todo-list"></ul>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
          <input type="text" id="new-todo" bind-value="newText" placeholder="Nueva tarea..." style="flex:1" />
          <button id="add-btn">Añadir</button>
        </div>
        <p style="margin-top:0.5rem; font-size:0.8rem; color:#64748b;">
          {{ pendingCount }} tarea{{ pendingCount === 1 ? '' : 's' }} pendiente{{ pendingCount === 1 ? '' : 's' }}
        </p>
      </div>
    `;
  }

  initialState() {
    return {
      newText: '',
      pendingCount: this.todos.filter(t => !t.done).length,
    };
  }

  onConnected() {
    this.renderTodos();

    this.querySelector('#add-btn')?.addEventListener('click', () => {
      const text = (this.engine!.data['newText'] as string).trim();
      if (!text) return;
      this.todos.push({ text, done: false });
      this.engine!.data['newText'] = '';
      this.engine!.data['pendingCount'] = this.todos.filter(t => !t.done).length;
      this.renderTodos();
    });

    this.querySelector('#new-todo')?.addEventListener('keydown', (e: Event) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        this.querySelector<HTMLButtonElement>('#add-btn')?.click();
      }
    });
  }

  private renderTodos() {
    const list = this.querySelector('#todo-list');
    if (!list) return;

    list.innerHTML = '';
    this.todos.forEach((todo, i) => {
      const li = document.createElement('li');
      li.className = `todo-item${todo.done ? ' done' : ''}`;
      li.innerHTML = `<input type="checkbox" ${todo.done ? 'checked' : ''} /><span>${todo.text}</span>`;
      li.querySelector('input')?.addEventListener('change', (e) => {
        this.todos[i].done = (e.target as HTMLInputElement).checked;
        li.className = `todo-item${this.todos[i].done ? ' done' : ''}`;
        this.engine!.data['pendingCount'] = this.todos.filter(t => !t.done).length;
      });
      list.appendChild(li);
    });
  }
}

customElements.define('todo-list-demo', TodoListDemo);

// ============================================================
// EJEMPLO 4: User Form — two-way binding completo
// ============================================================

class UserFormDemo extends TreeBoundElement {
  constructor() { super({ shadow: false }); }

  render() {
    this.templateRoot.innerHTML = `
      <div class="component-card">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" bind-value="form.name" placeholder="Tu nombre" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" bind-value="form.email" placeholder="tu@email.com" />
        </div>
        <div class="form-group">
          <label>Edad</label>
          <input type="number" bind-value="form.age" placeholder="0" />
        </div>
        <p style="font-size:0.75rem; color:#64748b; margin-bottom:0.25rem;">Preview reactivo:</p>
        <div class="json-preview">{{ formJson }}</div>
      </div>
    `;
  }

  initialState() {
    return {
      form: { name: '', email: '', age: '' },
      formJson: '{}',
    };
  }

  onConnected() {
    const updateJson = () => {
      const form = this.engine!.data['form'] as Record<string, unknown>;
      this.engine!.data['formJson'] = JSON.stringify(form, null, 2);
    };

    this.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', updateJson);
    });
  }
}

customElements.define('user-form-demo', UserFormDemo);

// ============================================================
// EJEMPLO 5: Products — *if + *for con índice
// ============================================================

class ConditionalDemo extends TreeBoundElement {
  constructor() { super({ shadow: false }); }

  render() {
    this.templateRoot.innerHTML = `
      <div class="component-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-size:0.85rem; color:#94a3b8;">
            {{ showList ? 'Mostrando' : 'Oculto' }} — {{ items.length }} productos
          </span>
          <button id="toggle-btn">{{ showList ? 'Ocultar' : 'Mostrar' }}</button>
        </div>

        <ul class="items-list" *if="showList">
          <li *for="item, i in items">
            <span class="index">{{ i + 1 }}.</span>{{ item.name }}<span class="price">{{ item.price }}€</span>
          </li>
        </ul>

        <div style="margin-top:0.75rem; display:flex; gap:0.5rem;">
          <input type="text" bind-value="newItem" placeholder="Nuevo producto..." style="flex:1" />
          <button id="add-item">Añadir</button>
        </div>
      </div>
    `;
  }

  initialState() {
    return {
      showList: true,
      items: [
        { name: 'Teclado mecánico', price: 89 },
        { name: 'Monitor 4K', price: 349 },
        { name: 'Ratón inalámbrico', price: 45 },
      ],
      newItem: '',
    };
  }

  onConnected() {
    this.querySelector('#toggle-btn')?.addEventListener('click', () => {
      this.engine!.data['showList'] = !this.engine!.data['showList'];
    });

    this.querySelector('#add-item')?.addEventListener('click', () => {
      const name = (this.engine!.data['newItem'] as string).trim();
      if (!name) return;
      const items = this.engine!.data['items'] as Array<{ name: string; price: number }>;
      items.push({ name, price: Math.floor(Math.random() * 200) + 10 });
      this.engine!.data['newItem'] = '';
      this.engine!.data['items'] = [...items];
    });
  }
}

customElements.define('conditional-demo', ConditionalDemo);

// ============================================================
// EJEMPLO 6: TreeBoundEngine directo (sin Custom Element)
// ============================================================

const mount = document.getElementById('direct-engine-mount');
if (mount) {
  mount.innerHTML = `
    <div class="component-card">
      <h3 style="color:#6ee7f7; margin-bottom:0.5rem;">{{ greeting }}</h3>
      <p style="color:#94a3b8; font-size:0.85rem;">
        El engine se instancia directamente sobre cualquier nodo DOM.
      </p>
      <p style="margin-top:0.75rem; font-size:0.9rem;">
        Visitas: <strong style="color:#a78bfa;">{{ visits }}</strong>
      </p>
      <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
        <input type="text" bind-value="greeting" placeholder="Cambia el saludo..." />
      </div>
      <p style="margin-top:0.5rem; font-size:0.75rem; color:#475569;">
        {{ greeting.length }} caracteres
      </p>
    </div>
  `;

  const engine = new TreeBoundEngine(mount, {
    greeting: '¡Hola desde el engine!',
    visits: 0,
  });

  let visits = 0;
  setInterval(() => {
    visits++;
    engine.data['visits'] = visits;
  }, 2000);
}
