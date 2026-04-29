/**
 * Clase base para Custom Elements con TreeBound
 * Proporciona binding reactivo, directivas y two-way binding
 */

import { TreeBoundEngine } from './engine';
import { TreeBoundConfig } from './types';

export interface TreeBoundElementOptions {
  shadow?: boolean;
  config?: TreeBoundConfig;
}

export abstract class TreeBoundElement extends HTMLElement {
  protected engine?: TreeBoundEngine;
  protected _data: Record<string, unknown> = {};
  private options: TreeBoundElementOptions;
  private root: ShadowRoot | HTMLElement;

  // Referencias a los métodos nativos capturadas antes de cualquier override,
  // necesarias cuando shadow=false y root===this para evitar recursión infinita.
  private readonly _nativeQS: typeof HTMLElement.prototype.querySelector;
  private readonly _nativeQSA: typeof HTMLElement.prototype.querySelectorAll;

  constructor(options: TreeBoundElementOptions = {}) {
    super();

    // Capturar métodos nativos antes de que el override entre en la cadena
    this._nativeQS  = HTMLElement.prototype.querySelector.bind(this);
    this._nativeQSA = HTMLElement.prototype.querySelectorAll.bind(this);

    this.options = {
      shadow: true,
      ...options
    };

    if (this.options.shadow) {
      this.attachShadow({ mode: 'open' });
      this.root = this.shadowRoot as ShadowRoot;
    } else {
      this.root = this;
    }
  }

  // Getter/Setter para datos reactivos
  get data(): Record<string, unknown> {
    return this._data;
  }

  set data(value: Record<string, unknown>) {
    this._data = value;
    if (this.engine) {
      Object.assign(this.engine.data, value);
    }
  }

  // Lifecycle de Custom Elements
  connectedCallback(): void {
    this.render();
    // Recoger datos iniciales antes de crear el engine
    const initial = this.initialState();
    if (Object.keys(initial).length > 0) {
      this._data = initial;
    }
    this.setupBindings();    // engine arranca con _data ya poblado
    this.onConnected();      // hook post-engine: this.engine ya existe aquí
  }

  disconnectedCallback(): void {
    this.engine?.destroy();
    this.onDisconnected();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    this.onAttributeChanged(name, oldValue, newValue);
  }

  // Métodos abstractos/hooks
  protected abstract render(): void;

  /**
   * Retorna el estado inicial del componente.
   * Se llama ANTES de crear el engine — úsalo para declarar datos reactivos.
   * No tiene acceso a this.engine.
   */
  protected initialState(): Record<string, unknown> {
    return {};
  }

  protected onConnected(): void {}

  protected onDisconnected(): void {}

  protected onAttributeChanged(_name: string, _oldValue: string | null, _newValue: string | null): void {}

  // Getter del nodo raíz del template (shadow root o el propio elemento)
  protected get templateRoot(): ShadowRoot | HTMLElement {
    return this.root;
  }

  // Overrides de querySelector/querySelectorAll que delegan al root correcto.
  // Cuando shadow=false, root===this, por lo que usamos los métodos nativos
  // capturados en el constructor para evitar recursión infinita.
  public querySelector<K extends keyof HTMLElementTagNameMap>(
    selectors: K
  ): HTMLElementTagNameMap[K] | null;
  public querySelector<E extends Element = Element>(
    selectors: string
  ): E | null {
    if (this.root instanceof ShadowRoot) {
      return this.root.querySelector<E>(selectors);
    }
    return this._nativeQS(selectors) as E | null;
  }

  public querySelectorAll<K extends keyof HTMLElementTagNameMap>(
    selectors: K
  ): NodeListOf<HTMLElementTagNameMap[K]>;
  public querySelectorAll<E extends Element = Element>(
    selectors: string
  ): NodeListOf<E> {
    if (this.root instanceof ShadowRoot) {
      return this.root.querySelectorAll<E>(selectors);
    }
    return this._nativeQSA(selectors) as NodeListOf<E>;
  }

  private setupBindings(): void {
    this.engine = new TreeBoundEngine(
      this.root,
      this._data,
      this.options.config
    );
  }
}

// Decorador para definir custom elements
export function define(tagName: string) {
  return function<T extends CustomElementConstructor>(constructor: T) {
    customElements.define(tagName, constructor);
    return constructor;
  };
}

type CustomElementConstructor = new (...args: any[]) => HTMLElement;
