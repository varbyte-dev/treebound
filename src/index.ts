/**
 * TreeBound - Motor de binding reactivo para Custom Elements
 * Exportaciones principales
 */

// Tipos
export type {
  Binding,
  DirectiveConfig,
  ReactiveContext,
  TreeBoundConfig,
  ParsedExpression,
  ExpressionEvaluator
} from './types';

// Clases principales
export { TreeBoundEngine } from './engine';
export { TreeBoundElement, define } from './element';
export { ReactiveState } from './proxy';
export { SafeExpressionParser } from './parser';
export { directives, DirectiveRegistry } from './directives';

// Instancia global del parser para uso directo
export { parser } from './parser';
