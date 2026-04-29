/**
 * Motor de binding TreeBound
 * Utiliza TreeWalker para recorrer el DOM y establecer bindings
 */

import { Binding, ReactiveContext, TreeBoundConfig } from './types';
import { SafeExpressionParser } from './parser';
import { ReactiveState } from './proxy';
import { directives } from './directives';

export class TreeBoundEngine {
  private bindings: Binding[] = [];
  private parser = SafeExpressionParser.getInstance();
  private state: ReactiveState;
  private root: Node;
  private config: Required<TreeBoundConfig>;
  private unsubscribe?: () => void;

  constructor(
    root: Node,
    initialData: Record<string, unknown> = {},
    config: TreeBoundConfig = {}
  ) {
    this.root = root;
    this.config = {
      prefix: '{{',
      attributePrefix: 'bind-',
      eventPrefix: '@',
      directivePrefix: '*',
      ...config
    };

    this.state = new ReactiveState(initialData);
    this.walk();
    this.setupReactivity();
  }

  get data(): Record<string, unknown> {
    return this.state.data;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.bindings = [];
  }

  update(): void {
    const context = this.createContext();
    this.bindings.forEach(binding => {
      this.applyBinding(binding, context);
    });
  }

  private createContext(): ReactiveContext {
    return {
      data: this.state.data,
      update: () => this.update(),
      evaluate: (expr: string) => this.evaluate(expr)
    };
  }

  private evaluate(expr: string): unknown {
    const parsed = this.parser.parse(expr);
    return parsed.evaluate(this.state.data);
  }

  private walk(): void {
    // Walk en un solo paso, nodo a nodo, con un iterador manual sobre el árbol.
    // Esto permite que cuando encontramos un elemento con *for, podamos
    // SALTAR sus hijos — el *for los gestiona internamente con evaluateInContext.
    // Si usáramos dos TreeWalkers separados, el primero (texto) procesaría
    // los {{ }} dentro del <li *for> antes de que *for pueda clonarlos,
    // dejando el template del *for con placeholders vacíos en lugar de expresiones.

    const directivePrefix = this.config.directivePrefix;
    const forAttr = `${directivePrefix}for`;

    // Iterador manual DFS que permite saltar subárboles
    const stack: Node[] = [this.root];

    // Recoger primero todos los text nodes con {{ }} para procesarlos
    // después sin mutar el DOM durante la recolección.
    const textNodesTodo: Text[] = [];

    while (stack.length > 0) {
      const node = stack.pop()!;

      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node as Text).nodeValue || '';
        if (text.includes(this.config.prefix) && text.includes('}}')) {
          textNodesTodo.push(node as Text);
        }
        // Los Text nodes no tienen hijos, no hay nada que apilar
        continue;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;

        // Si este elemento tiene *for, procesamos sus atributos
        // pero NO apilamos sus hijos — el *for los gestiona internamente.
        const hasFor = el.hasAttribute(forAttr);

        this.parseElementBindings(el);

        if (!hasFor) {
          // Apilar hijos en orden inverso para procesar en orden correcto (DFS)
          for (let i = el.childNodes.length - 1; i >= 0; i--) {
            stack.push(el.childNodes[i]);
          }
        }
        // Si tiene *for: saltamos los hijos — el *for.bind() acaba de
        // remover el elemento del DOM con su contenido original intacto.
        continue;
      }

      // Otros tipos de nodo (Comment, etc.): ignorar
    }

    // Procesar text nodes después de que el walk completo ha terminado
    // y las directivas ya han sido registradas (DOM estable para replaceChild)
    textNodesTodo.forEach(node => {
      // Saltar si el nodo ya no está en el DOM (fue removido por *for.bind())
      if (node.parentNode) {
        this.parseTextBinding(node);
      }
    });
  }

  private parseTextBinding(node: Text): void {
    const template = node.nodeValue || '';
    const regex = new RegExp(
      `${this.escapeRegex(this.config.prefix)}(.*?)${this.escapeRegex('}}')}`,
      'g'
    );

    // Verificar si hay bindings
    if (!regex.test(template)) return;
    regex.lastIndex = 0;

    const parts: (string | Binding)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
      // Texto antes del binding
      if (match.index > lastIndex) {
        parts.push(template.slice(lastIndex, match.index));
      }

      const expr = match[1].trim();
      parts.push({
        type: 'text',
        expr,
        node: undefined // Se asignará después
      });

      lastIndex = regex.lastIndex;
    }

    // Texto después del último binding
    if (lastIndex < template.length) {
      parts.push(template.slice(lastIndex));
    }

    // Reemplazar el nodo por un fragmento
    const fragment = document.createDocumentFragment();
    const newBindings: Binding[] = [];

    parts.forEach(part => {
      if (typeof part === 'string') {
        fragment.appendChild(document.createTextNode(part));
      } else {
        const placeholder = document.createTextNode('');
        fragment.appendChild(placeholder);
        newBindings.push({ ...part, node: placeholder });
      }
    });

    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node);
    }
    this.bindings.push(...newBindings);
  }

  private parseElementBindings(element: Element): void {
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      const name = attr.name;
      const value = attr.value;

      // Directivas (*if, *for, *ref)
      if (name.startsWith(this.config.directivePrefix)) {
        const directiveName = name.slice(this.config.directivePrefix.length);

        if (directives.has(directiveName)) {
          const binding: Binding = {
            type: 'directive',
            directive: directiveName,
            element,
            expr: value
          };

          const directive = directives.get(directiveName)!;
          directive.bind(binding, this.createContext());

          this.bindings.push(binding);
          element.removeAttribute(name);
        }
      }
      // Atributos de binding (bind-value, :class)
      else if (name.startsWith(this.config.attributePrefix) || name.startsWith(':')) {
        const prop = name.startsWith(this.config.attributePrefix)
          ? name.slice(this.config.attributePrefix.length)
          : name.slice(1);

        this.bindings.push({
          type: 'attribute',
          element,
          property: prop,
          expr: value
        });

        // Si el atributo es 'value' sobre un input/textarea/select, registrar two-way binding
        if (
          prop === 'value' &&
          (element instanceof HTMLInputElement ||
           element instanceof HTMLTextAreaElement ||
           element instanceof HTMLSelectElement)
        ) {
          this.bindInput(element, value);
        }

        element.removeAttribute(name);
      }
      // Eventos (@click, @input)
      else if (name.startsWith(this.config.eventPrefix)) {
        const event = name.slice(this.config.eventPrefix.length);

        this.bindings.push({
          type: 'event',
          element,
          event,
          handler: value,
          expr: value
        });

        element.removeAttribute(name);
      }
    });
  }

  private setupReactivity(): void {
    // Obtener todas las dependencias de los bindings
    const allDependencies = new Set<string>();

    this.bindings.forEach(binding => {
      const parsed = this.parser.parse(binding.expr);
      parsed.dependencies.forEach(dep => allDependencies.add(dep));
    });

    // Suscribirse a cambios
    this.unsubscribe = this.state.subscribe((path, _value) => {
      // Un binding es afectado cuando:
      // - el path notificado ES la dependencia exacta ('user.name' === 'user.name')
      // - el path notificado es un ancestro de la dependencia
      //   (notifican 'user', dep es 'user.name' → toda la rama cambió)
      // - la dependencia es un ancestro del path notificado
      //   (notifican 'user.name', dep es 'user' → el objeto que contiene name cambió)
      const affectedBindings = this.bindings.filter(binding => {
        const parsed = this.parser.parse(binding.expr);
        return parsed.dependencies.some(dep =>
          dep === path ||
          dep.startsWith(path + '.') ||
          path.startsWith(dep + '.')
        );
      });

      if (affectedBindings.length > 0) {
        const context = this.createContext();
        affectedBindings.forEach(binding => {
          this.applyBinding(binding, context);
        });
      }
    });

    // Actualización inicial
    this.update();
  }

  private applyBinding(binding: Binding, context: ReactiveContext): void {
    try {
      switch (binding.type) {
        case 'text': {
          const value = context.evaluate(binding.expr);
          if (binding.node) {
            binding.node.nodeValue = String(value ?? '');
          }
          break;
        }

        case 'attribute': {
          const value = context.evaluate(binding.expr);
          const el = binding.element!;
          const prop = binding.property!;

          if (prop in el) {
            (el as any)[prop] = value;
          } else {
            if (value === null || value === undefined || value === false) {
              el.removeAttribute(prop);
            } else {
              el.setAttribute(prop, String(value));
            }
          }
          break;
        }

        case 'event': {
          // Los eventos ya están vinculados en bind()
          break;
        }

        case 'directive': {
          const directive = directives.get(binding.directive!);
          if (directive) {
            directive.update(binding, context);
          }
          break;
        }
      }
    } catch (e) {
      console.warn(`[TreeBound] Error aplicando binding:`, e);
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Two-way binding helpers
  bindInput(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, property: string): void {
    const event = element instanceof HTMLSelectElement ? 'change' : 'input';

    element.addEventListener(event, () => {
      const value = element.type === 'checkbox' 
        ? (element as HTMLInputElement).checked
        : element.value;

      this.setValue(property, value);
    });
  }

  private setValue(path: string, value: unknown): void {
    const parts = path.split('.');
    let current: any = this.state.data;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }
}
