/**
 * Parser de expresiones seguro
 * No utiliza eval() ni Function()
 * Solo permite acceso a propiedades del contexto
 */

import { ParsedExpression } from './types';

// Tokens válidos en expresiones
const TOKEN_REGEX = /(\s+|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%()?:.,!<>]|\b(?:true|false|null|undefined|typeof|instanceof|in)\b|\d+\.?\d*|[a-zA-Z_$][a-zA-Z0-9_$]*)/g;

// Palabras reservadas permitidas
const ALLOWED_KEYWORDS = new Set([
  'true', 'false', 'null', 'undefined',
  'typeof', 'instanceof', 'in'
]);

// Operadores permitidos (excluye '?' y ':' — se manejan aparte como ternario)
const ALLOWED_OPERATORS = new Set([
  '+', '-', '*', '/', '%',
  '===', '!==', '==', '!=',
  '<=', '>=', '<', '>',
  '&&', '||', '!',
  '(', ')', '.', ',',
  'typeof', 'instanceof', 'in'
]);

export class SafeExpressionParser {
  private static instance: SafeExpressionParser;
  private cache: Map<string, ParsedExpression> = new Map();

  static getInstance(): SafeExpressionParser {
    if (!SafeExpressionParser.instance) {
      SafeExpressionParser.instance = new SafeExpressionParser();
    }
    return SafeExpressionParser.instance;
  }

  parse(expr: string): ParsedExpression {
    // Cachear expresiones parseadas
    if (this.cache.has(expr)) {
      return this.cache.get(expr)!;
    }

    const tokens = this.tokenize(expr);
    const dependencies = this.extractDependencies(tokens);
    const evaluate = this.compile(tokens);

    const parsed: ParsedExpression = { dependencies, evaluate };
    this.cache.set(expr, parsed);
    return parsed;
  }

  private tokenize(expr: string): string[] {
    // Pre-procesar: extraer strings literales y reemplazarlos por placeholders
    // para evitar que el contenido de los strings interfiera con el tokenizer.
    const strings: string[] = [];
    const withPlaceholders = expr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, (match) => {
      strings.push(match);
      return `__STR${strings.length - 1}__`;
    });

    const tokens: string[] = [];
    let match: RegExpExecArray | null;

    TOKEN_REGEX.lastIndex = 0;

    while ((match = TOKEN_REGEX.exec(withPlaceholders)) !== null) {
      const token = match[0];
      if (/^\s+$/.test(token)) continue;

      // Restaurar el string original si es un placeholder
      if (/^__STR\d+__$/.test(token)) {
        const idx = parseInt(token.slice(5, -2), 10);
        tokens.push(strings[idx]);
      } else {
        tokens.push(token);
      }
    }

    return tokens;
  }

  private extractDependencies(tokens: string[]): string[] {
    const dependencies = new Set<string>();
    let expectProperty = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];

      // Si es un identificador válido
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
        // Si es keyword permitida, ignorar
        if (ALLOWED_KEYWORDS.has(token)) continue;

        // Si el siguiente token es '.', es acceso a propiedad anidada
        if (nextToken === '.') {
          // Construir la ruta completa
          let path = token;
          let j = i + 1;
          while (j < tokens.length && tokens[j] === '.') {
            j++;
            if (j < tokens.length && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(tokens[j])) {
              path += '.' + tokens[j];
              j++;
            } else {
              break;
            }
          }
          dependencies.add(path);
          i = j - 1;
        } else if (nextToken === '(') {
          // Es una llamada a función - no es dependencia directa
          // pero podría ser un método del contexto
          dependencies.add(token);
        } else {
          dependencies.add(token);
        }
      }
    }

    return Array.from(dependencies);
  }

  private compile(tokens: string[]): (context: Record<string, unknown>) => unknown {
    return (context: Record<string, unknown>): unknown => {
      try {
        return this.evaluateTokens(tokens, context);
      } catch (e) {
        console.warn(`[TreeBound] Error evaluando expresión: ${tokens.join(' ')}`, e);
        return undefined;
      }
    };
  }

  // ── Parser recursivo descendente ────────────────────────────────────────────
  //
  // Gramática (de menor a mayor precedencia):
  //   expr      = ternary
  //   ternary   = or ('?' ternary ':' ternary)?
  //   or        = and ('||' and)*
  //   and       = equality ('&&' equality)*
  //   equality  = relational (('==='|'!=='|'=='|'!=') relational)*
  //   relational= additive (('<'|'>'|'<='|'>=') additive)*
  //   additive  = multiplicative (('+'|'-') multiplicative)*
  //   multiplicative = unary (('*'|'/'|'%') unary)*
  //   unary     = ('!'|'-'|'typeof') unary | primary
  //   primary   = literal | identifier | '(' expr ')'
  //              | primary '.' identifier   (property access)

  private evaluateTokens(tokens: string[], context: Record<string, unknown>): unknown {
    let pos = 0;

    const peek  = (): string => tokens[pos] ?? '';
    const consume = (): string => tokens[pos++];

    const parseExpr = (): unknown => parseTernary();

    const parseTernary = (): unknown => {
      const cond = parseOr();
      if (peek() === '?') {
        consume(); // '?'
        const trueBranch  = parseTernary();
        if (peek() !== ':') throw new Error(`Expected ':' in ternary`);
        consume(); // ':'
        const falseBranch = parseTernary();
        return cond ? trueBranch : falseBranch;
      }
      return cond;
    };

    const parseOr = (): unknown => {
      let left = parseAnd();
      while (peek() === '||') { consume(); left = left || parseAnd(); }
      return left;
    };

    const parseAnd = (): unknown => {
      let left = parseEquality();
      while (peek() === '&&') { consume(); left = left && parseEquality(); }
      return left;
    };

    const parseEquality = (): unknown => {
      let left = parseRelational();
      for (;;) {
        const op = peek();
        if (op === '===' || op === '!==' || op === '==' || op === '!=') {
          consume();
          const right = parseRelational();
          if (op === '===') left = left === right;
          else if (op === '!==') left = left !== right;
          else if (op === '==')  left = left == right;  // eslint-disable-line eqeqeq
          else                   left = left != right;  // eslint-disable-line eqeqeq
        } else break;
      }
      return left;
    };

    const parseRelational = (): unknown => {
      let left = parseAdditive();
      for (;;) {
        const op = peek();
        if (op === '<' || op === '>' || op === '<=' || op === '>=') {
          consume();
          const right = parseAdditive();
          if      (op === '<')  left = (left as number) <  (right as number);
          else if (op === '>')  left = (left as number) >  (right as number);
          else if (op === '<=') left = (left as number) <= (right as number);
          else                  left = (left as number) >= (right as number);
        } else break;
      }
      return left;
    };

    const parseAdditive = (): unknown => {
      let left = parseMultiplicative();
      for (;;) {
        const op = peek();
        if (op === '+' || op === '-') {
          consume();
          const right = parseMultiplicative();
          left = op === '+' ? (left as number) + (right as number)
                            : (left as number) - (right as number);
        } else break;
      }
      return left;
    };

    const parseMultiplicative = (): unknown => {
      let left = parseUnary();
      for (;;) {
        const op = peek();
        if (op === '*' || op === '/' || op === '%') {
          consume();
          const right = parseUnary();
          if      (op === '*') left = (left as number) * (right as number);
          else if (op === '/') left = (left as number) / (right as number);
          else                 left = (left as number) % (right as number);
        } else break;
      }
      return left;
    };

    const parseUnary = (): unknown => {
      const op = peek();
      if (op === '!') { consume(); return !parseUnary(); }
      if (op === '-') { consume(); return -(parseUnary() as number); }
      if (op === 'typeof') { consume(); return typeof parseUnary(); }
      return parsePrimary();
    };

    const parsePrimary = (): unknown => {
      const token = peek();

      // Paréntesis
      if (token === '(') {
        consume();
        const val = parseExpr();
        if (peek() === ')') consume();
        return val;
      }

      // Número
      if (/^\d+\.?\d*$/.test(token)) {
        consume();
        return parseFloat(token);
      }

      // String literal
      if (token.startsWith("'") || token.startsWith('"')) {
        consume();
        return token.slice(1, -1);
      }

      // Booleanos y null
      if (token === 'true')      { consume(); return true; }
      if (token === 'false')     { consume(); return false; }
      if (token === 'null')      { consume(); return null; }
      if (token === 'undefined') { consume(); return undefined; }

      // Identificador: variable o acceso a propiedad encadenado
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
        consume();
        let value = this.resolvePath(token, context);

        // Acceso a propiedades: a.b.c
        while (peek() === '.') {
          consume(); // '.'
          const prop = consume();
          if (value != null && typeof value === 'object') {
            value = (value as Record<string, unknown>)[prop];
          } else {
            value = undefined;
          }
        }

        return value;
      }

      // Token desconocido — avanzar para evitar bucle infinito
      consume();
      return undefined;
    };

    return parseExpr();
  }

  private resolvePath(path: string, context: Record<string, unknown>): unknown {
    const parts = path.split('.');
    let current: unknown = context;
    for (const part of parts) {
      if (current != null && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  }
}

export const parser = SafeExpressionParser.getInstance();
