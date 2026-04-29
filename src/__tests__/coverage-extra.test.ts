/**
 * Tests adicionales para cubrir ramas no alcanzadas y subir branch coverage sobre 85%
 */
import { describe, it, expect } from 'vitest';
import { TreeBoundEngine } from '../engine';
import { TreeBoundElement } from '../element';

function makeContainer(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

// ── engine.ts ramas faltantes ────────────────────────────────────────────────

describe('TreeBoundEngine — ramas faltantes', () => {
  describe('attribute binding — removeAttribute cuando valor es falsy', () => {
    it('elimina atributo cuando el valor es null', () => {
      const root = makeContainer('<div :data-x="val"></div>');
      new TreeBoundEngine(root, { val: null });
      expect(root.querySelector('div')!.hasAttribute('data-x')).toBe(false);
    });

    it('elimina atributo cuando el valor es undefined', () => {
      const root = makeContainer('<div :data-x="val"></div>');
      new TreeBoundEngine(root, { val: undefined });
      expect(root.querySelector('div')!.hasAttribute('data-x')).toBe(false);
    });

    it('elimina atributo cuando el valor es false', () => {
      const root = makeContainer('<div :aria-hidden="val"></div>');
      new TreeBoundEngine(root, { val: false });
      expect(root.querySelector('div')!.hasAttribute('aria-hidden')).toBe(false);
    });

    it('establece atributo cuando el valor es true', () => {
      const root = makeContainer('<div :data-active="val"></div>');
      new TreeBoundEngine(root, { val: true });
      expect(root.querySelector('div')!.getAttribute('data-active')).toBe('true');
    });
  });

  describe('event binding — no lanza en applyBinding', () => {
    it('registra binding de evento sin error', () => {
      const root = makeContainer('<button @click="handler">click</button>');
      expect(() => new TreeBoundEngine(root, { handler: () => {} })).not.toThrow();
    });
  });

  describe('setValue — ruta anidada', () => {
    it('setea propiedad en objeto anidado via bindInput', () => {
      const root = makeContainer('<input bind-value="user.name" />');
      const engine = new TreeBoundEngine(root, { user: { name: '' } });
      const input = root.querySelector('input') as HTMLInputElement;

      input.value = 'Carlos';
      input.dispatchEvent(new Event('input'));

      expect((engine.data['user'] as Record<string, unknown>)['name']).toBe('Carlos');
    });
  });

  describe('directiva *if integrada en engine', () => {
    it('oculta elemento con *if cuando condición es false', () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      root.innerHTML = '<p *if="show">visible</p>';
      new TreeBoundEngine(root, { show: false });
      const p = root.querySelector('p') as HTMLElement;
      expect(p.style.display).toBe('none');
      document.body.removeChild(root);
    });

    it('reactivamente muestra elemento cuando condición cambia a true', () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      root.innerHTML = '<p *if="show">visible</p>';
      const engine = new TreeBoundEngine(root, { show: false });
      const p = root.querySelector('p') as HTMLElement;

      engine.data['show'] = true;

      expect(p.style.display).not.toBe('none');
      document.body.removeChild(root);
    });
  });

  describe('directiva *for integrada en engine', () => {
    it('renderiza lista correctamente', () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      root.innerHTML = '<ul><li *for="item in items">x</li></ul>';
      new TreeBoundEngine(root, { items: ['a', 'b', 'c'] });
      expect(root.querySelectorAll('li').length).toBe(3);
      document.body.removeChild(root);
    });

    it('reactivamente actualiza lista al cambiar items', () => {
      const root = document.createElement('div');
      document.body.appendChild(root);
      root.innerHTML = '<ul><li *for="item in items">x</li></ul>';
      const engine = new TreeBoundEngine(root, { items: ['a', 'b'] });

      engine.data['items'] = ['x', 'y', 'z'];

      expect(root.querySelectorAll('li').length).toBe(3);
      document.body.removeChild(root);
    });
  });
});

// ── element.ts ramas faltantes ───────────────────────────────────────────────

describe('TreeBoundElement — ramas faltantes', () => {
  describe('initialState base sin override', () => {
    it('usa objeto vacío cuando la subclase no define initialState', () => {
      class NoStateEl extends TreeBoundElement {
        render() { this.templateRoot.innerHTML = '<span>hola</span>'; }
        // SIN initialState override
      }
      if (!customElements.get('no-state-el')) {
        customElements.define('no-state-el', NoStateEl);
      }
      const el = new NoStateEl({ shadow: false });
      document.body.appendChild(el);

      // No debe lanzar y debe renderizar sin datos
      expect(el.querySelector('span')!.textContent).toBe('hola');

      document.body.removeChild(el);
    });
  });

  describe('querySelector / querySelectorAll con shadow DOM', () => {
    it('querySelector busca dentro del shadowRoot', () => {
      class ShadowQueryEl extends TreeBoundElement {
        render() { this.templateRoot.innerHTML = '<span id="inner">ok</span>'; }
        initialState() { return {}; }
      }
      if (!customElements.get('shadow-query-el')) {
        customElements.define('shadow-query-el', ShadowQueryEl);
      }
      const el = new ShadowQueryEl({ shadow: true });
      document.body.appendChild(el);

      expect((el as any).querySelector('#inner')).not.toBeNull();

      document.body.removeChild(el);
    });

    it('querySelectorAll busca dentro del shadowRoot', () => {
      class ShadowQSAEl extends TreeBoundElement {
        render() { this.templateRoot.innerHTML = '<span>a</span><span>b</span>'; }
        initialState() { return {}; }
      }
      if (!customElements.get('shadow-qsa-el')) {
        customElements.define('shadow-qsa-el', ShadowQSAEl);
      }
      const el = new ShadowQSAEl({ shadow: true });
      document.body.appendChild(el);

      expect(el.querySelectorAll('span').length).toBe(2);

      document.body.removeChild(el);
    });
  });
});
