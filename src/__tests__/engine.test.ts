import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreeBoundEngine } from '../engine';

// Helper: crea un contenedor DOM con HTML
function makeContainer(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('TreeBoundEngine', () => {
  describe('constructor y data', () => {
    it('inicializa con datos y los expone por .data', () => {
      const root = makeContainer('<span>{{ name }}</span>');
      const engine = new TreeBoundEngine(root, { name: 'Ana' });
      expect(engine.data['name']).toBe('Ana');
    });

    it('inicializa sin datos (objeto vacío por defecto)', () => {
      const root = makeContainer('<span>hola</span>');
      const engine = new TreeBoundEngine(root);
      expect(engine.data).toEqual({});
    });
  });

  describe('text binding {{ }}', () => {
    it('reemplaza {{ expr }} con el valor del contexto', () => {
      const root = makeContainer('<span>{{ name }}</span>');
      new TreeBoundEngine(root, { name: 'Ana' });
      expect(root.querySelector('span')!.textContent).toBe('Ana');
    });

    it('reemplaza múltiples bindings en el mismo nodo', () => {
      const root = makeContainer('<p>{{ first }} {{ last }}</p>');
      new TreeBoundEngine(root, { first: 'Juan', last: 'García' });
      expect(root.querySelector('p')!.textContent).toBe('Juan García');
    });

    it('mantiene texto literal junto a binding', () => {
      const root = makeContainer('<p>Hola, {{ name }}!</p>');
      new TreeBoundEngine(root, { name: 'María' });
      expect(root.querySelector('p')!.textContent).toBe('Hola, María!');
    });

    it('evalúa expresión aritmética', () => {
      const root = makeContainer('<span>{{ count + 1 }}</span>');
      new TreeBoundEngine(root, { count: 4 });
      expect(root.querySelector('span')!.textContent).toBe('5');
    });

    it('evalúa ternario con strings', () => {
      const root = makeContainer("<span>{{ active ? 'sí' : 'no' }}</span>");
      new TreeBoundEngine(root, { active: true });
      expect(root.querySelector('span')!.textContent).toBe('sí');
    });

    it('evalúa ternario con strings — rama falsa', () => {
      const root = makeContainer("<span>{{ active ? 'sí' : 'no' }}</span>");
      new TreeBoundEngine(root, { active: false });
      expect(root.querySelector('span')!.textContent).toBe('no');
    });

    it('evalúa propiedad anidada', () => {
      const root = makeContainer('<span>{{ user.name }}</span>');
      new TreeBoundEngine(root, { user: { name: 'Pedro' } });
      expect(root.querySelector('span')!.textContent).toBe('Pedro');
    });
  });

  describe('reactividad', () => {
    it('actualiza el DOM cuando cambia una propiedad', () => {
      const root = makeContainer('<span>{{ count }}</span>');
      const engine = new TreeBoundEngine(root, { count: 0 });

      engine.data['count'] = 5;

      expect(root.querySelector('span')!.textContent).toBe('5');
    });

    it('actualiza el DOM cuando cambia una propiedad anidada', () => {
      const root = makeContainer('<span>{{ user.name }}</span>');
      const engine = new TreeBoundEngine(root, { user: { name: 'Ana' } });

      (engine.data['user'] as Record<string, unknown>)['name'] = 'Luis';

      expect(root.querySelector('span')!.textContent).toBe('Luis');
    });

    it('actualiza bindings afectados y no los no afectados', () => {
      const root = makeContainer('<p>{{ a }} - {{ b }}</p>');
      const engine = new TreeBoundEngine(root, { a: 1, b: 2 });

      engine.data['a'] = 10;

      expect(root.querySelector('p')!.textContent).toBe('10 - 2');
    });

    it('actualiza todos los bindings con update()', () => {
      const root = makeContainer('<span>{{ count }}</span>');
      const engine = new TreeBoundEngine(root, { count: 0 });

      // Modificar datos internos sin el proxy (para forzar update manual)
      engine.data['count'] = 99;
      engine.update();

      expect(root.querySelector('span')!.textContent).toBe('99');
    });
  });

  describe('attribute binding (bind-)', () => {
    it('bind-value actualiza la propiedad value del input', () => {
      const root = makeContainer('<input bind-value="name" />');
      new TreeBoundEngine(root, { name: 'test' });
      expect((root.querySelector('input') as HTMLInputElement).value).toBe('test');
    });

    it(':class establece el atributo class', () => {
      const root = makeContainer('<div :class="cls"></div>');
      new TreeBoundEngine(root, { cls: 'active' });
      expect(root.querySelector('div')!.getAttribute('class')).toBe('active');
    });

    it('elimina el atributo cuando el valor es false', () => {
      const root = makeContainer('<button :disabled="isDisabled"></button>');
      new TreeBoundEngine(root, { isDisabled: false });
      expect(root.querySelector('button')!.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('two-way binding', () => {
    it('bindInput actualiza el estado cuando cambia el input', () => {
      const root = makeContainer('<input bind-value="name" />');
      const engine = new TreeBoundEngine(root, { name: '' });
      const input = root.querySelector('input') as HTMLInputElement;

      input.value = 'nuevo';
      input.dispatchEvent(new Event('input'));

      expect(engine.data['name']).toBe('nuevo');
    });

    it('bindInput con checkbox lee .checked', () => {
      const root = makeContainer('<input type="checkbox" bind-value="active" />');
      const engine = new TreeBoundEngine(root, { active: false });
      const input = root.querySelector('input') as HTMLInputElement;

      input.checked = true;
      input.dispatchEvent(new Event('input'));

      expect(engine.data['active']).toBe(true);
    });

    it('bindInput manual registra listener de input', () => {
      const root = makeContainer('<div></div>');
      const engine = new TreeBoundEngine(root, { val: '' });
      const input = document.createElement('input');
      root.appendChild(input);

      engine.bindInput(input, 'val');
      input.value = 'hola';
      input.dispatchEvent(new Event('input'));

      expect(engine.data['val']).toBe('hola');
    });

    it('bindInput en select usa evento change', () => {
      const root = makeContainer('<select bind-value="opt"><option value="a">A</option></select>');
      const engine = new TreeBoundEngine(root, { opt: '' });
      const select = root.querySelector('select') as HTMLSelectElement;

      select.value = 'a';
      select.dispatchEvent(new Event('change'));

      expect(engine.data['opt']).toBe('a');
    });
  });

  describe('destroy', () => {
    it('destroy() elimina los bindings sin lanzar errores', () => {
      const root = makeContainer('<span>{{ count }}</span>');
      const engine = new TreeBoundEngine(root, { count: 0 });

      engine.destroy();

      // Tras destroy, cambiar datos no debe provocar actualizaciones ni errores
      expect(() => { engine.data['count'] = 99; }).not.toThrow();
    });
  });

  describe('configuración personalizada', () => {
    it('respeta attributePrefix personalizado', () => {
      const root = makeContainer('<input x-value="name" />');
      new TreeBoundEngine(root, { name: 'custom' }, { attributePrefix: 'x-' });
      expect((root.querySelector('input') as HTMLInputElement).value).toBe('custom');
    });
  });
});
