/**
 * Sistema de reactividad basado en Proxy
 * Detecta cambios en el estado y notifica a los bindings
 */

import { SafeExpressionParser } from './parser';

export type ChangeCallback = (path: string, value: unknown) => void;

export class ReactiveState {
  private proxy: Record<string, unknown>;
  private callbacks: Set<ChangeCallback> = new Set();
  private parser = SafeExpressionParser.getInstance();

  constructor(initialData: Record<string, unknown> = {}) {
    this.proxy = this.createProxy(initialData, '');
  }

  get data(): Record<string, unknown> {
    return this.proxy;
  }

  subscribe(callback: ChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private createProxy(
    target: Record<string, unknown>,
    path: string
  ): Record<string, unknown> {
    const self = this;

    return new Proxy(target, {
      get(target, prop: string | symbol) {
        const value = target[prop as string];

        // Si es un objeto anidado, crear proxy recursivo
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          const currentPath = path ? `${path}.${String(prop)}` : String(prop);
          return self.createProxy(value as Record<string, unknown>, currentPath);
        }

        // Si es un array, crear proxy para el array
        if (Array.isArray(value)) {
          const currentPath = path ? `${path}.${String(prop)}` : String(prop);
          return self.createArrayProxy(value, currentPath);
        }

        return value;
      },

      set(target, prop: string | symbol, value: unknown) {
        const oldValue = target[prop as string];

        if (oldValue !== value) {
          target[prop as string] = value;
          const currentPath = path ? `${path}.${String(prop)}` : String(prop);
          self.notify(currentPath, value);
        }

        return true;
      },

      deleteProperty(target, prop: string | symbol) {
        const existed = prop in target;
        delete target[prop as string];

        if (existed) {
          const currentPath = path ? `${path}.${String(prop)}` : String(prop);
          self.notify(currentPath, undefined);
        }

        return true;
      }
    });
  }

  private createArrayProxy(array: unknown[], path: string): unknown[] {
    const self = this;

    return new Proxy(array, {
      get(target, prop: string | symbol) {
        const value = (target as unknown as Record<string | symbol, unknown>)[prop];

        // Interceptar métodos mutables
        if (prop === 'push') {
          return function(...items: unknown[]) {
            const result = target.push(...items);
            self.notify(path, target);
            return result;
          };
        }
        if (prop === 'pop') {
          return function() {
            const result = target.pop();
            self.notify(path, target);
            return result;
          };
        }
        if (prop === 'shift') {
          return function() {
            const result = target.shift();
            self.notify(path, target);
            return result;
          };
        }
        if (prop === 'unshift') {
          return function(...items: unknown[]) {
            const result = target.unshift(...items);
            self.notify(path, target);
            return result;
          };
        }
        if (prop === 'splice') {
          return function(start: number, deleteCount?: number, ...items: unknown[]) {
            const result = deleteCount !== undefined
              ? target.splice(start, deleteCount, ...items)
              : target.splice(start);
            self.notify(path, target);
            return result;
          };
        }
        if (prop === 'sort') {
          return function(compareFn?: (a: unknown, b: unknown) => number) {
            const result = target.sort(compareFn);
            self.notify(path, target);
            return result;
          };
        }
        if (prop === 'reverse') {
          return function() {
            const result = target.reverse();
            self.notify(path, target);
            return result;
          };
        }

        return value;
      },

      set(target, prop: string | symbol, value: unknown) {
        (target as unknown as Record<string | symbol, unknown>)[prop] = value;
        self.notify(`${path}.${String(prop)}`, value);
        self.notify(path, target); // Notificar también el array completo
        return true;
      }
    });
  }

  private notify(path: string, value: unknown): void {
    this.callbacks.forEach(callback => {
      try {
        callback(path, value);
      } catch (e) {
        console.error('[TreeBound] Error en callback de reactividad:', e);
      }
    });
  }
}
