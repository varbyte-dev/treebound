/**
 * Sistema de directivas para TreeBound
 * Implementa *if, *for, *ref como directivas nativas
 */

import { Binding, DirectiveConfig, ReactiveContext } from './types';
import { SafeExpressionParser } from './parser';

// Evaluador local para expresiones dentro de *for
function evaluateInContext(expr: string, data: Record<string, unknown>): unknown {
  return SafeExpressionParser.getInstance().parse(expr).evaluate(data);
}

export class DirectiveRegistry {
  private directives: Map<string, DirectiveConfig> = new Map();

  constructor() {
    this.registerBuiltins();
  }

  register(config: DirectiveConfig): void {
    this.directives.set(config.name, config);
  }

  get(name: string): DirectiveConfig | undefined {
    return this.directives.get(name);
  }

  has(name: string): boolean {
    return this.directives.has(name);
  }

  private registerBuiltins(): void {

    // ── *if ──────────────────────────────────────────────────────────────────
    // Estrategia: display:none en lugar de remover/insertar el elemento.
    // Esto garantiza que directivas anidadas (*for dentro de *if) conserven
    // sus referencias de anchor y parentNode intactas en el DOM en todo momento.
    this.register({
      name: 'if',
      bind: (binding, _context) => {
        binding.parentNode = binding.element!.parentNode as Node;
      },
      update: (binding, context) => {
        const condition = !!context.evaluate(binding.expr);
        (binding.element! as HTMLElement).style.display = condition ? '' : 'none';
      },
    });

    // ── *for ─────────────────────────────────────────────────────────────────
    // El walk del engine ordena los elementos de más profundo a menos profundo,
    // por lo que cuando *for procesa el <li>, el <ul> con *if aún no ha sido
    // tocado — el <li> sigue en el DOM y puede ser clonado correctamente.
    this.register({
      name: 'for',
      bind: (binding, _context) => {
        const element = binding.element!;
        const parent  = element.parentNode!;

        // Crear ancla DESPUÉS del elemento y guardar el template antes de removerlo.
        const anchor = document.createComment('treebound-for');
        parent.insertBefore(anchor, element.nextSibling);

        const template = document.createDocumentFragment();
        template.appendChild(element.cloneNode(true));
        parent.removeChild(element);

        binding.anchor    = anchor;
        binding.parentNode = parent;
        binding.template  = template;
      },
      update: (binding, context) => {
        const anchor = binding.anchor!;

        // Si el anchor no está en el DOM (caso raro), no hacer nada.
        if (!anchor.parentNode) return;

        const parent = anchor.parentNode as Node & ParentNode;

        // Parsear expresión: "item in items" o "item, i in items"
        const match = binding.expr.match(/^(?:(\w+),\s*(\w+)\s+in|(\w+)\s+in)\s+(.+)$/);
        if (!match) {
          console.warn(`[TreeBound] Sintaxis inválida para *for: ${binding.expr}`);
          return;
        }

        const itemName  = match[1] || match[3];
        const indexName = match[2] || null;
        const arrayExpr = match[4];

        const array = context.evaluate(arrayExpr) as unknown[];
        if (!Array.isArray(array)) {
          console.warn(`[TreeBound] *for requiere un array, recibió: ${typeof array}`);
          return;
        }

        // Limpiar nodos previos insertados antes del anchor
        let node: ChildNode | null = anchor.previousSibling;
        while (node !== null && node.nodeType !== Node.COMMENT_NODE) {
          const prev: ChildNode | null = node.previousSibling;
          parent.removeChild(node);
          node = prev;
        }

        // Crear un elemento por ítem con contexto local evaluado
        const textRegex = /\{\{\s*(.*?)\s*\}\}/g;

        array.forEach((item, index) => {
          const clone = binding.template!.cloneNode(true) as DocumentFragment;

          const localData: Record<string, unknown> = {
            ...context.data,
            [itemName]: item,
          };
          if (indexName) localData[indexName] = index;

          // Resolver interpolaciones en nodos de texto
          const textWalker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
          const textNodes: Text[] = [];
          let n: Node | null;
          while ((n = textWalker.nextNode()) !== null) textNodes.push(n as Text);

          textNodes.forEach(textNode => {
            const original = textNode.nodeValue || '';
            if (!original.includes('{{')) return;
            textNode.nodeValue = original.replace(textRegex, (_m, expr) =>
              String(evaluateInContext(expr.trim(), localData) ?? '')
            );
          });

          // Resolver interpolaciones en valores de atributos
          const elemWalker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
          const elements: Element[] = [];
          while ((n = elemWalker.nextNode()) !== null) elements.push(n as Element);

          elements.forEach(el => {
            Array.from(el.attributes).forEach(attr => {
              if (!attr.value.includes('{{')) return;
              el.setAttribute(attr.name, attr.value.replace(textRegex, (_m, expr) =>
                String(evaluateInContext(expr.trim(), localData) ?? '')
              ));
            });
          });

          parent.insertBefore(clone, anchor);
        });
      },
    });

    // ── *ref ─────────────────────────────────────────────────────────────────
    this.register({
      name: 'ref',
      bind: (binding, context) => {
        (context.data as Record<string, unknown>)[binding.expr] = binding.element!;
      },
      update: () => {
        // Las refs no necesitan actualización
      },
    });
  }
}

export const directives = new DirectiveRegistry();
