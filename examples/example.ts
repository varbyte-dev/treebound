/**
 * Ejemplos de uso de TreeBound
 */

import { TreeBoundElement, define, TreeBoundEngine } from './src/index';

// ============================================
// EJEMPLO 1: Componente básico con binding
// ============================================

@define('user-card')
class UserCard extends TreeBoundElement {
  render() {
    this.templateRoot.innerHTML = `
      <div class="card">
        <h2>{{ user.name }}</h2>
        <p>Edad: {{ user.age }}</p>
        <p *if="user.isAdmin">Administrador</p>
        <input bind-value="user.name" placeholder="Nombre">
      </div>
    `;
  }
}

// Uso:
// <user-card></user-card>
// const card = document.querySelector('user-card');
// card.data = {
//   user: { name: 'Juan', age: 30, isAdmin: true }
// };

// ============================================
// EJEMPLO 2: Lista con *for
// ============================================

@define('todo-list')
class TodoList extends TreeBoundElement {
  render() {
    this.templateRoot.innerHTML = `
      <div>
        <h3>{{ title }}</h3>
        <ul>
          <li *for="todo in todos">
            <span *if="todo.completed" style="text-decoration: line-through;">
              {{ todo.text }}
            </span>
            <span *if="!todo.completed">
              {{ todo.text }}
            </span>
            <button @click="toggleTodo">Toggle</button>
          </li>
        </ul>
        <p>Total: {{ todos.length }}</p>
      </div>
    `;
  }

  onConnected() {
    this.data = {
      title: 'Mis Tareas',
      todos: [
        { text: 'Aprender TreeWalker', completed: true },
        { text: 'Construir motor de binding', completed: false },
        { text: 'Crear directivas', completed: false }
      ]
    };
  }

  toggleTodo(event: Event) {
    // Lógica para toggle
    console.log('Toggle todo:', event);
  }
}

// ============================================
// EJEMPLO 3: Formulario con two-way binding
// ============================================

@define('user-form')
class UserForm extends TreeBoundElement {
  render() {
    this.templateRoot.innerHTML = `
      <form @submit="handleSubmit">
        <label>
          Nombre:
          <input bind-value="form.name" type="text">
        </label>
        <label>
          Email:
          <input bind-value="form.email" type="email">
        </label>
        <label>
          Activo:
          <input bind-value="form.active" type="checkbox">
        </label>
        <button type="submit">Guardar</button>
      </form>
      <pre>{{ JSON.stringify(form, null, 2) }}</pre>
    `;
  }

  onConnected() {
    this.data = {
      form: {
        name: '',
        email: '',
        active: false
      }
    };
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    console.log('Formulario enviado:', this.data.form);
  }
}

// ============================================
// EJEMPLO 4: Uso directo del engine
// ============================================

function exampleDirectEngine() {
  const container = document.createElement('div');
  container.innerHTML = `
    <div>
      <h1>{{ greeting }}</h1>
      <p>Contador: {{ count }}</p>
      <button @click="increment">+1</button>
      <button @click="decrement">-1</button>
    </div>
  `;

  const engine = new TreeBoundEngine(container, {
    greeting: 'Hola Mundo',
    count: 0
  });

  // Los eventos se manejan automáticamente
  // Los cambios en data son reactivos

  document.body.appendChild(container);
}

// ============================================
// EJEMPLO 5: Directivas avanzadas
// ============================================

@define('conditional-render')
class ConditionalRender extends TreeBoundElement {
  render() {
    this.templateRoot.innerHTML = `
      <div>
        <button @click="toggle">Toggle</button>

        <div *if="showContent">
          <h2>Contenido condicional</h2>
          <p>Este contenido se muestra/oculta con *if</p>
        </div>

        <ul>
          <li *for="item, index in items">
            {{ index + 1 }}. {{ item.name }} - {{ item.price }}€
          </li>
        </ul>

        <input *ref="inputRef" bind-value="searchText" placeholder="Buscar...">
      </div>
    `;
  }

  onConnected() {
    this.data = {
      showContent: true,
      items: [
        { name: 'Producto A', price: 10 },
        { name: 'Producto B', price: 20 },
        { name: 'Producto C', price: 30 }
      ],
      searchText: ''
    };
  }

  toggle() {
    this.data.showContent = !this.data.showContent;
  }
}
