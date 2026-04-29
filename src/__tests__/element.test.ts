import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeBoundElement, define } from '../element';

// Implementación concreta mínima para tests
class TestElement extends TreeBoundElement {
  public renderCalled = false;
  public connectedCalled = false;
  public disconnectedCalled = false;
  public attrChanges: Array<[string, string | null, string | null]> = [];

  constructor(options: ConstructorParameters<typeof TreeBoundElement>[0] = {}) {
    super(options);
  }

  render() {
    this.renderCalled = true;
    this.templateRoot.innerHTML = `
      <div>
        <span id="name">{{ name }}</span>
        <span id="count">{{ count }}</span>
        <input bind-value="name" />
      </div>
    `;
  }

  initialState() {
    return { name: 'inicial', count: 0 };
  }

  onConnected() {
    this.connectedCalled = true;
  }

  onDisconnected() {
    this.disconnectedCalled = true;
  }

  onAttributeChanged(name: string, oldVal: string | null, newVal: string | null) {
    this.attrChanges.push([name, oldVal, newVal]);
  }

  // Exponer engine para tests
  getEngine() { return this.engine; }
}

// Registrar custom element una sola vez
let registered = false;
function ensureRegistered() {
  if (!registered) {
    customElements.define('test-element', TestElement);
    registered = true;
  }
}

describe('TreeBoundElement', () => {
  beforeEach(() => {
    ensureRegistered();
  });

  describe('lifecycle — connectedCallback', () => {
    it('llama a render() al conectarse', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      expect(el.renderCalled).toBe(true);

      document.body.removeChild(el);
    });

    it('llama a onConnected() después de setupBindings', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      // onConnected ya fue llamado y el engine existe
      expect(el.connectedCalled).toBe(true);
      expect(el.getEngine()).toBeDefined();

      document.body.removeChild(el);
    });

    it('el DOM refleja initialState() inmediatamente', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      expect((el as any).querySelector('#name')!.textContent).toBe('inicial');
      expect((el as any).querySelector('#count')!.textContent).toBe('0');

      document.body.removeChild(el);
    });
  });

  describe('lifecycle — disconnectedCallback', () => {
    it('llama a onDisconnected() al desconectarse', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);
      document.body.removeChild(el);

      expect(el.disconnectedCalled).toBe(true);
    });

    it('destruye el engine al desconectarse', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      const engine = el.getEngine();
      const destroySpy = vi.spyOn(engine!, 'destroy');

      document.body.removeChild(el);

      expect(destroySpy).toHaveBeenCalledOnce();
    });
  });

  describe('lifecycle — attributeChangedCallback', () => {
    it('llama a onAttributeChanged con los parámetros correctos', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      el.attributeChangedCallback('data-x', null, 'valor');

      expect(el.attrChanges).toContainEqual(['data-x', null, 'valor']);

      document.body.removeChild(el);
    });
  });

  describe('data getter/setter', () => {
    it('data getter devuelve _data antes de conectarse', () => {
      const el = new TestElement({ shadow: false });
      expect(el.data).toEqual({});
    });

    it('data setter propaga al engine cuando está conectado', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      el.data = { name: 'nuevo', count: 5 };

      // El engine debe tener los datos actualizados
      expect(el.getEngine()!.data['name']).toBe('nuevo');
      expect(el.getEngine()!.data['count']).toBe(5);

      document.body.removeChild(el);
    });
  });

  describe('querySelector / querySelectorAll — light DOM (shadow:false)', () => {
    it('querySelector encuentra elementos hijos', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      expect((el as any).querySelector('#name')).not.toBeNull();

      document.body.removeChild(el);
    });

    it('querySelectorAll devuelve todos los matches', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      const spans = el.querySelectorAll('span');
      expect(spans.length).toBeGreaterThan(0);

      document.body.removeChild(el);
    });

    it('querySelector no entra en recursión infinita', () => {
      const el = new TestElement({ shadow: false });
      document.body.appendChild(el);

      // Debe ejecutarse sin stack overflow
      expect(() => el.querySelector('input')).not.toThrow();

      document.body.removeChild(el);
    });
  });

  describe('templateRoot', () => {
    it('templateRoot devuelve el elemento mismo cuando shadow:false', () => {
      const el = new TestElement({ shadow: false });
      // @ts-expect-error acceso a propiedad protected
      expect(el.templateRoot).toBe(el);
    });

    it('templateRoot devuelve shadowRoot cuando shadow:true', () => {
      // Crear elemento distinto con shadow DOM
      class ShadowEl extends TreeBoundElement {
        render() { this.templateRoot.innerHTML = '<span>{{ x }}</span>'; }
        initialState() { return { x: 1 }; }
      }
      if (!customElements.get('shadow-el')) {
        customElements.define('shadow-el', ShadowEl);
      }
      const el = new ShadowEl({ shadow: true });
      // @ts-expect-error acceso a propiedad protected
      expect(el.templateRoot).toBeInstanceOf(ShadowRoot);
    });
  });

  describe('define() decorator', () => {
    it('registra el custom element con el nombre dado', () => {
      const decorated = define('define-test-el');
      class MyEl extends TreeBoundElement {
        render() {}
      }
      decorated(MyEl);
      expect(customElements.get('define-test-el')).toBeDefined();
    });

    it('devuelve el mismo constructor', () => {
      class MyEl2 extends TreeBoundElement {
        render() {}
      }
      const decorated = define('define-test-el-2');
      const result = decorated(MyEl2);
      expect(result).toBe(MyEl2);
    });
  });
});
