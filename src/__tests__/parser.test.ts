import { describe, it, expect, beforeEach } from 'vitest';
import { SafeExpressionParser } from '../parser';

describe('SafeExpressionParser', () => {
  let parser: SafeExpressionParser;

  beforeEach(() => {
    // Usar instancia fresca para evitar contaminación de caché entre tests
    // @ts-expect-error — reset singleton for isolation
    SafeExpressionParser['instance'] = undefined;
    parser = SafeExpressionParser.getInstance();
  });

  describe('getInstance', () => {
    it('devuelve siempre la misma instancia (singleton)', () => {
      const a = SafeExpressionParser.getInstance();
      const b = SafeExpressionParser.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('literales', () => {
    it('evalúa números enteros', () => {
      expect(parser.parse('42').evaluate({})).toBe(42);
    });

    it('evalúa números decimales', () => {
      expect(parser.parse('3.14').evaluate({})).toBeCloseTo(3.14);
    });

    it('evalúa true', () => {
      expect(parser.parse('true').evaluate({})).toBe(true);
    });

    it('evalúa false', () => {
      expect(parser.parse('false').evaluate({})).toBe(false);
    });

    it('evalúa null', () => {
      expect(parser.parse('null').evaluate({})).toBe(null);
    });

    it('evalúa undefined', () => {
      expect(parser.parse('undefined').evaluate({})).toBe(undefined);
    });

    it('evalúa string con comillas simples', () => {
      expect(parser.parse("'hola'").evaluate({})).toBe('hola');
    });

    it('evalúa string con comillas dobles', () => {
      expect(parser.parse('"mundo"').evaluate({})).toBe('mundo');
    });

    it('evalúa string vacío', () => {
      expect(parser.parse("''").evaluate({})).toBe('');
    });
  });

  describe('acceso a variables', () => {
    it('resuelve variable simple del contexto', () => {
      expect(parser.parse('name').evaluate({ name: 'Ana' })).toBe('Ana');
    });

    it('resuelve propiedad anidada', () => {
      expect(parser.parse('user.name').evaluate({ user: { name: 'Luis' } })).toBe('Luis');
    });

    it('resuelve propiedad profundamente anidada', () => {
      expect(parser.parse('a.b.c').evaluate({ a: { b: { c: 42 } } })).toBe(42);
    });

    it('devuelve undefined para variable inexistente', () => {
      expect(parser.parse('missing').evaluate({})).toBeUndefined();
    });

    it('devuelve undefined para propiedad inexistente en objeto', () => {
      expect(parser.parse('user.missing').evaluate({ user: {} })).toBeUndefined();
    });

    it('resuelve array length', () => {
      expect(parser.parse('items.length').evaluate({ items: [1, 2, 3] })).toBe(3);
    });
  });

  describe('operadores aritméticos', () => {
    it('suma', () => {
      expect(parser.parse('a + b').evaluate({ a: 2, b: 3 })).toBe(5);
    });

    it('resta', () => {
      expect(parser.parse('a - b').evaluate({ a: 5, b: 3 })).toBe(2);
    });

    it('multiplicación', () => {
      expect(parser.parse('a * b').evaluate({ a: 4, b: 3 })).toBe(12);
    });

    it('división', () => {
      expect(parser.parse('a / b').evaluate({ a: 10, b: 2 })).toBe(5);
    });

    it('módulo', () => {
      expect(parser.parse('a % b').evaluate({ a: 7, b: 3 })).toBe(1);
    });

    it('i + 1 (índice de loop)', () => {
      expect(parser.parse('i + 1').evaluate({ i: 0 })).toBe(1);
    });

    it('negación unaria', () => {
      expect(parser.parse('-n').evaluate({ n: 5 })).toBe(-5);
    });
  });

  describe('operadores de comparación', () => {
    it('=== igualdad estricta verdadera', () => {
      expect(parser.parse('a === b').evaluate({ a: 1, b: 1 })).toBe(true);
    });

    it('=== igualdad estricta falsa', () => {
      expect(parser.parse('a === b').evaluate({ a: 1, b: 2 })).toBe(false);
    });

    it('!== desigualdad estricta', () => {
      expect(parser.parse('a !== b').evaluate({ a: 1, b: 2 })).toBe(true);
    });

    it('== igualdad débil', () => {
      expect(parser.parse('a == b').evaluate({ a: 1, b: '1' })).toBe(true);
    });

    it('!= desigualdad débil', () => {
      expect(parser.parse('a != b').evaluate({ a: 1, b: 2 })).toBe(true);
    });

    it('< menor que', () => {
      expect(parser.parse('a < b').evaluate({ a: 1, b: 2 })).toBe(true);
    });

    it('> mayor que', () => {
      expect(parser.parse('a > b').evaluate({ a: 3, b: 2 })).toBe(true);
    });

    it('<= menor o igual', () => {
      expect(parser.parse('a <= b').evaluate({ a: 2, b: 2 })).toBe(true);
    });

    it('>= mayor o igual', () => {
      expect(parser.parse('a >= b').evaluate({ a: 3, b: 2 })).toBe(true);
    });
  });

  describe('operadores lógicos', () => {
    it('&& ambos true', () => {
      expect(parser.parse('a && b').evaluate({ a: true, b: true })).toBe(true);
    });

    it('&& con false', () => {
      expect(parser.parse('a && b').evaluate({ a: true, b: false })).toBe(false);
    });

    it('|| con false y true', () => {
      expect(parser.parse('a || b').evaluate({ a: false, b: true })).toBe(true);
    });

    it('! negación', () => {
      expect(parser.parse('!flag').evaluate({ flag: true })).toBe(false);
    });

    it('! doble negación', () => {
      expect(parser.parse('!!flag').evaluate({ flag: 0 })).toBe(false);
    });
  });

  describe('operador ternario', () => {
    it('ternario simple — rama verdadera', () => {
      expect(parser.parse("show ? 'sí' : 'no'").evaluate({ show: true })).toBe('sí');
    });

    it('ternario simple — rama falsa', () => {
      expect(parser.parse("show ? 'sí' : 'no'").evaluate({ show: false })).toBe('no');
    });

    it('ternario con comparación antes del ?', () => {
      expect(parser.parse("count === 1 ? '' : 's'").evaluate({ count: 1 })).toBe('');
      expect(parser.parse("count === 1 ? '' : 's'").evaluate({ count: 3 })).toBe('s');
    });

    it('ternario anidado', () => {
      const expr = "n === 0 ? 'cero' : n > 0 ? 'positivo' : 'negativo'";
      expect(parser.parse(expr).evaluate({ n: 0 })).toBe('cero');
      expect(parser.parse(expr).evaluate({ n: 5 })).toBe('positivo');
      expect(parser.parse(expr).evaluate({ n: -1 })).toBe('negativo');
    });

    it('ternario con string vacío como rama', () => {
      expect(parser.parse("ok ? '' : 'error'").evaluate({ ok: true })).toBe('');
    });
  });

  describe('paréntesis y precedencia', () => {
    it('paréntesis altera precedencia', () => {
      expect(parser.parse('(a + b) * c').evaluate({ a: 2, b: 3, c: 4 })).toBe(20);
    });

    it('sin paréntesis respeta precedencia estándar', () => {
      expect(parser.parse('a + b * c').evaluate({ a: 2, b: 3, c: 4 })).toBe(14);
    });
  });

  describe('typeof', () => {
    it('typeof string', () => {
      expect(parser.parse("typeof name === 'string'").evaluate({ name: 'Ana' })).toBe(true);
    });

    it('typeof number', () => {
      expect(parser.parse("typeof n").evaluate({ n: 42 })).toBe('number');
    });
  });

  describe('extractDependencies', () => {
    it('extrae variable simple', () => {
      expect(parser.parse('count').dependencies).toEqual(['count']);
    });

    it('extrae propiedad anidada como ruta completa', () => {
      expect(parser.parse('user.name').dependencies).toContain('user.name');
    });

    it('extrae múltiples dependencias', () => {
      const deps = parser.parse('a + b').dependencies;
      expect(deps).toContain('a');
      expect(deps).toContain('b');
    });

    it('no incluye keywords como dependencias', () => {
      const deps = parser.parse('typeof x').dependencies;
      expect(deps).not.toContain('typeof');
      expect(deps).toContain('x');
    });

    it('no incluye literales como dependencias', () => {
      const deps = parser.parse("flag ? 'yes' : 'no'").dependencies;
      expect(deps).toContain('flag');
      expect(deps).not.toContain('yes');
      expect(deps).not.toContain('no');
    });
  });

  describe('caché', () => {
    it('devuelve el mismo objeto para la misma expresión', () => {
      const a = parser.parse('count');
      const b = parser.parse('count');
      expect(a).toBe(b);
    });

    it('devuelve objetos distintos para expresiones distintas', () => {
      const a = parser.parse('count');
      const b = parser.parse('total');
      expect(a).not.toBe(b);
    });
  });

  describe('manejo de errores', () => {
    it('devuelve undefined para expresión con token inválido', () => {
      // No debe lanzar — debe retornar undefined silenciosamente
      expect(() => parser.parse('!!!').evaluate({})).not.toThrow();
    });
  });
});
