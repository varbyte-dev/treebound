/**
 * TreeBound - Motor de binding para Custom Elements
 * Definiciones de tipos
 */

export interface Binding {
  type: 'text' | 'attribute' | 'event' | 'directive';
  node?: Node;
  element?: Element;
  property?: string;
  expr: string;
  event?: string;
  handler?: string;
  directive?: string;
  template?: DocumentFragment;
  parentNode?: Node;
  anchor?: Comment;
}

export interface DirectiveConfig {
  name: string;
  bind: (binding: Binding, context: ReactiveContext) => void;
  update: (binding: Binding, context: ReactiveContext) => void;
  unbind?: (binding: Binding) => void;
}

export interface ReactiveContext {
  data: Record<string, unknown>;
  update: () => void;
  evaluate: (expr: string) => unknown;
}

export interface TreeBoundConfig {
  prefix?: string;
  attributePrefix?: string;
  eventPrefix?: string;
  directivePrefix?: string;
}

export type ExpressionEvaluator = (expr: string, context: Record<string, unknown>) => unknown;

export interface ParsedExpression {
  dependencies: string[];
  evaluate: (context: Record<string, unknown>) => unknown;
}
