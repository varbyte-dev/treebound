import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveState } from '../proxy';

describe('ReactiveState', () => {
  describe('constructor y data', () => {
    it('inicializa con datos vacíos', () => {
      const state = new ReactiveState();
      expect(state.data).toEqual({});
    });

    it('inicializa con datos provistos', () => {
      const state = new ReactiveState({ count: 0, name: 'test' });
      expect(state.data['count']).toBe(0);
      expect(state.data['name']).toBe('test');
    });

    it('devuelve un proxy, no el objeto original', () => {
      const initial = { count: 0 };
      const state = new ReactiveState(initial);
      // Son referencias distintas (uno es Proxy)
      expect(state.data).not.toBe(initial);
    });
  });

  describe('subscribe / notify', () => {
    it('llama al callback cuando cambia una propiedad', () => {
      const state = new ReactiveState({ count: 0 });
      const cb = vi.fn();
      state.subscribe(cb);

      state.data['count'] = 1;

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith('count', 1);
    });

    it('no llama al callback si el valor no cambia', () => {
      const state = new ReactiveState({ count: 5 });
      const cb = vi.fn();
      state.subscribe(cb);

      state.data['count'] = 5; // mismo valor

      expect(cb).not.toHaveBeenCalled();
    });

    it('llama a múltiples subscribers', () => {
      const state = new ReactiveState({ x: 0 });
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      state.subscribe(cb1);
      state.subscribe(cb2);

      state.data['x'] = 1;

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('el unsubscribe detiene las notificaciones', () => {
      const state = new ReactiveState({ count: 0 });
      const cb = vi.fn();
      const unsub = state.subscribe(cb);

      unsub();
      state.data['count'] = 1;

      expect(cb).not.toHaveBeenCalled();
    });

    it('notifica con el path correcto para propiedades anidadas', () => {
      const state = new ReactiveState({ user: { name: 'Ana' } });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['user'] as Record<string, unknown>)['name'] = 'Luis';

      expect(cb).toHaveBeenCalledWith('user.name', 'Luis');
    });

    it('notifica con path correcto para objetos profundamente anidados', () => {
      const state = new ReactiveState({ a: { b: { c: 1 } } });
      const cb = vi.fn();
      state.subscribe(cb);

      const a = state.data['a'] as Record<string, unknown>;
      const b = a['b'] as Record<string, unknown>;
      b['c'] = 99;

      expect(cb).toHaveBeenCalledWith('a.b.c', 99);
    });

    it('notifica deleteProperty', () => {
      const state = new ReactiveState({ key: 'value' });
      const cb = vi.fn();
      state.subscribe(cb);

      delete (state.data as Record<string, unknown>)['key'];

      expect(cb).toHaveBeenCalledWith('key', undefined);
    });
  });

  describe('proxy de arrays', () => {
    it('notifica en push', () => {
      const state = new ReactiveState({ items: [1, 2] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as unknown[]).push(3);

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('notifica en pop', () => {
      const state = new ReactiveState({ items: [1, 2, 3] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as unknown[]).pop();

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('notifica en shift', () => {
      const state = new ReactiveState({ items: [1, 2, 3] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as unknown[]).shift();

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('notifica en unshift', () => {
      const state = new ReactiveState({ items: [2, 3] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as unknown[]).unshift(1);

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('notifica en splice', () => {
      const state = new ReactiveState({ items: [1, 2, 3] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as unknown[]).splice(1, 1);

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('notifica en sort', () => {
      const state = new ReactiveState({ items: [3, 1, 2] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as number[]).sort();

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('notifica en reverse', () => {
      const state = new ReactiveState({ items: [1, 2, 3] });
      const cb = vi.fn();
      state.subscribe(cb);

      (state.data['items'] as unknown[]).reverse();

      expect(cb).toHaveBeenCalledWith('items', expect.any(Array));
    });

    it('mantiene los valores tras push', () => {
      const state = new ReactiveState({ items: [1, 2] });
      (state.data['items'] as unknown[]).push(3);
      expect((state.data['items'] as unknown[]).length).toBe(3);
    });

    it('splice sin deleteCount elimina hasta el final', () => {
      const state = new ReactiveState({ items: [1, 2, 3, 4] });
      (state.data['items'] as unknown[]).splice(2);
      expect((state.data['items'] as unknown[]).length).toBe(2);
    });
  });

  describe('error handling en callbacks', () => {
    it('no propaga errores de un callback al resto', () => {
      const state = new ReactiveState({ x: 0 });
      const badCb = vi.fn(() => { throw new Error('boom'); });
      const goodCb = vi.fn();

      state.subscribe(badCb);
      state.subscribe(goodCb);

      expect(() => { state.data['x'] = 1; }).not.toThrow();
      expect(goodCb).toHaveBeenCalled();
    });
  });
});
