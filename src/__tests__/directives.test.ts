import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DirectiveRegistry } from '../directives';
import { Binding, ReactiveContext } from '../types';

// Helpers
function makeElement(html: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  return wrapper.firstElementChild as HTMLElement;
}

function makeContext(data: Record<string, unknown> = {}): ReactiveContext {
  return {
    data,
    update: () => {},
    evaluate: (expr: string) => {
      // Evaluador simple para tests
      try {
        // eslint-disable-next-line no-new-func
        return new Function(...Object.keys(data), `return (${expr})`)(...Object.values(data));
      } catch {
        return undefined;
      }
    },
  };
}

describe('DirectiveRegistry', () => {
  let registry: DirectiveRegistry;

  beforeEach(() => {
    registry = new DirectiveRegistry();
  });

  describe('register / get / has', () => {
    it('registra y recupera una directiva', () => {
      registry.register({
        name: 'test',
        bind: () => {},
        update: () => {},
      });
      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toBeDefined();
    });

    it('has devuelve false para directiva no registrada', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('get devuelve undefined para directiva no registrada', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('tiene registradas las directivas builtin if, for, ref', () => {
      expect(registry.has('if')).toBe(true);
      expect(registry.has('for')).toBe(true);
      expect(registry.has('ref')).toBe(true);
    });
  });

  describe('directiva *if', () => {
    function setupIfBinding(expr: string, data: Record<string, unknown>) {
      const parent = document.createElement('div');
      const el = document.createElement('p');
      el.textContent = 'contenido';
      parent.appendChild(el);

      const binding: Binding = {
        type: 'directive',
        directive: 'if',
        element: el,
        expr,
      };

      const ifDir = registry.get('if')!;
      const ctx = makeContext(data);
      ifDir.bind(binding, ctx);
      ifDir.update(binding, ctx);

      return { parent, el, binding, ctx };
    }

    it('muestra el elemento cuando la condición es true', () => {
      const { el } = setupIfBinding('show', { show: true });
      expect((el as HTMLElement).style.display).not.toBe('none');
    });

    it('oculta el elemento cuando la condición es false', () => {
      const { el } = setupIfBinding('show', { show: false });
      expect((el as HTMLElement).style.display).toBe('none');
    });

    it('alterna la visibilidad en actualizaciones sucesivas', () => {
      const parent = document.createElement('div');
      const el = document.createElement('p');
      parent.appendChild(el);

      const binding: Binding = {
        type: 'directive',
        directive: 'if',
        element: el,
        expr: 'show',
      };

      const ifDir = registry.get('if')!;

      ifDir.bind(binding, makeContext({ show: true }));
      ifDir.update(binding, makeContext({ show: true }));
      expect((el as HTMLElement).style.display).not.toBe('none');

      ifDir.update(binding, makeContext({ show: false }));
      expect((el as HTMLElement).style.display).toBe('none');

      ifDir.update(binding, makeContext({ show: true }));
      expect((el as HTMLElement).style.display).not.toBe('none');
    });

    it('evalúa expresión de negación !flag', () => {
      const { el } = setupIfBinding('!flag', { flag: false });
      expect((el as HTMLElement).style.display).not.toBe('none');
    });
  });

  describe('directiva *for', () => {
    function setupForBinding(expr: string, data: Record<string, unknown>) {
      const parent = document.createElement('ul');
      const template = document.createElement('li');
      template.textContent = 'item';
      parent.appendChild(template);

      const binding: Binding = {
        type: 'directive',
        directive: 'for',
        element: template,
        expr,
      };

      const forDir = registry.get('for')!;
      const ctx = makeContext(data);
      forDir.bind(binding, ctx);
      forDir.update(binding, ctx);

      return { parent, binding, forDir, ctx };
    }

    it('crea un elemento por ítem del array', () => {
      const { parent } = setupForBinding('item in items', {
        items: ['a', 'b', 'c'],
      });
      const lis = parent.querySelectorAll('li');
      expect(lis.length).toBe(3);
    });

    it('crea cero elementos para array vacío', () => {
      const { parent } = setupForBinding('item in items', { items: [] });
      expect(parent.querySelectorAll('li').length).toBe(0);
    });

    it('re-renderiza al actualizar el contexto con más items', () => {
      const { parent, binding, forDir } = setupForBinding('item in items', {
        items: [1, 2],
      });

      forDir.update(binding, makeContext({ items: [1, 2, 3, 4] }));

      expect(parent.querySelectorAll('li').length).toBe(4);
    });

    it('limpia los elementos previos antes de re-renderizar', () => {
      const { parent, binding, forDir } = setupForBinding('item in items', {
        items: [1, 2, 3],
      });

      forDir.update(binding, makeContext({ items: [1] }));

      expect(parent.querySelectorAll('li').length).toBe(1);
    });

    it('advierte si la expresión no es un array', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setupForBinding('item in notArray', { notArray: 'texto' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('requiere un array')
      );
      consoleSpy.mockRestore();
    });

    it('advierte si la sintaxis *for es inválida', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setupForBinding('syntax invalid here', {});
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sintaxis inválida')
      );
      consoleSpy.mockRestore();
    });

    it('evalúa interpolaciones de texto con contexto local', () => {
      const parent = document.createElement('ul');
      const template = document.createElement('li');
      template.textContent = '{{ item }}';
      parent.appendChild(template);

      const binding: Binding = {
        type: 'directive',
        directive: 'for',
        element: template,
        expr: 'item in items',
      };

      const forDir = registry.get('for')!;
      const ctx = makeContext({ items: ['primero', 'segundo'] });
      forDir.bind(binding, ctx);
      forDir.update(binding, ctx);

      const lis = parent.querySelectorAll('li');
      expect(lis[0].textContent).toBe('primero');
      expect(lis[1].textContent).toBe('segundo');
    });

    it('expone el índice cuando se usa "item, i in items"', () => {
      const parent = document.createElement('ul');
      const template = document.createElement('li');
      template.textContent = '{{ i }}';
      parent.appendChild(template);

      const binding: Binding = {
        type: 'directive',
        directive: 'for',
        element: template,
        expr: 'item, i in items',
      };

      const forDir = registry.get('for')!;
      const ctx = makeContext({ items: ['a', 'b', 'c'] });
      forDir.bind(binding, ctx);
      forDir.update(binding, ctx);

      const lis = parent.querySelectorAll('li');
      expect(lis[0].textContent).toBe('0');
      expect(lis[1].textContent).toBe('1');
      expect(lis[2].textContent).toBe('2');
    });
  });

  describe('directiva *ref', () => {
    it('guarda la referencia al elemento en el contexto', () => {
      const el = document.createElement('input');
      const data: Record<string, unknown> = {};

      const binding: Binding = {
        type: 'directive',
        directive: 'ref',
        element: el,
        expr: 'myInput',
      };

      const refDir = registry.get('ref')!;
      refDir.bind(binding, makeContext(data));

      expect(data['myInput']).toBe(el);
    });

    it('update() de ref no hace nada (no lanza)', () => {
      const el = document.createElement('div');
      const binding: Binding = {
        type: 'directive',
        directive: 'ref',
        element: el,
        expr: 'el',
      };

      const refDir = registry.get('ref')!;
      expect(() => refDir.update(binding, makeContext({}))).not.toThrow();
    });
  });
});
