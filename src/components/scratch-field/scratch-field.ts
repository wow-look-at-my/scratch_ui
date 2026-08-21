/* <scratch-field> — text input / textarea.
 *
 * Sealed control: structure + states (hover-brighten, focus-glow) live in
 * shadow DOM; design tokens inherit through. Form-associated, so it behaves
 * like a native input inside a <form> and exposes .value.
 *
 *   <scratch-field placeholder="name"></scratch-field>
 *   <scratch-field placeholder="filter…"></scratch-field>
 *   <scratch-field placeholder="system prompt…" multiline rows="4"></scratch-field>
 *   <scratch-field value="preset" disabled></scratch-field>   ← dashed border
 *   <scratch-field type="password" placeholder="api key"></scratch-field>
 *   <scratch-field type="number" min="0" max="64" step="8"></scratch-field>
 *   <scratch-field inputmode="numeric" placeholder="tokens"></scratch-field>
 *
 * `type` picks the single-line input's type — text (default) · password ·
 * number · search · email · url; anything else falls back to text, and
 * `multiline` ignores it. min/max/step pass through when present (number use).
 * `inputmode` passes through in both modes — the virtual-keyboard hint for a
 * free-text field that expects e.g. digits without number-input semantics.
 */

import { SHEET } from '../../styles.ts';

const SCRATCH_FIELD_TYPES = new Set(['text', 'password', 'number', 'search', 'email', 'url']);

class ScratchField extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['placeholder', 'value', 'multiline', 'rows', 'disabled', 'type', 'min', 'max', 'step', 'inputmode']; }

  private _internals: ElementInternals;
  private _root: ShadowRoot;
  private _el!: HTMLInputElement | HTMLTextAreaElement;
  private _value: string | null = null;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SHEET];
    this._render();
  }

  connectedCallback() { this._sync(); }
  attributeChangedCallback(name: string) {
    if (name === 'multiline') this._render();
    this._sync();
  }

  private _render() {
    const multiline = this.hasAttribute('multiline');
    this._root.innerHTML = '';
    this._el = multiline ? document.createElement('textarea') : document.createElement('input');
    this._el.className = 'control';
    this._el.setAttribute('part', 'control');
    this._el.addEventListener('input', () => {
      this._value = this._el.value;
      this._internals.setFormValue(this._value);
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    this._el.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
    this._root.appendChild(this._el);
    this._sync();
  }

  private _sync() {
    if (!this._el) return;
    const ph = this.getAttribute('placeholder');
    if (ph != null) this._el.setAttribute('placeholder', ph);
    const el = this._el;
    if (this.hasAttribute('rows') && el instanceof HTMLTextAreaElement) {
      el.rows = parseInt(this.getAttribute('rows') ?? '', 10) || 3;
    }
    if (el instanceof HTMLInputElement) {
      const t = (this.getAttribute('type') || 'text').toLowerCase();
      el.type = SCRATCH_FIELD_TYPES.has(t) ? t : 'text';
      for (const a of ['min', 'max', 'step']) {
        const av = this.getAttribute(a);
        if (av != null) el.setAttribute(a, av);
        else el.removeAttribute(a);
      }
    }
    const im = this.getAttribute('inputmode');
    if (im != null) el.setAttribute('inputmode', im);
    else el.removeAttribute('inputmode');
    el.disabled = this.hasAttribute('disabled');
    const v = this.getAttribute('value');
    if (v != null && this._value == null) { el.value = v; this._value = v; }
    // Without this a value that arrived by ATTRIBUTE (never typed, never set
    // through .value) submits as empty — the control's own value and what the
    // form sees would disagree. scratch-select records it the same way.
    this._internals.setFormValue(el.value);
  }

  get value() { return this._el ? this._el.value : (this._value ?? ''); }
  set value(v: string) {
    this._value = v;
    if (this._el) this._el.value = v;
    this._internals.setFormValue(v);
  }

  override focus() { if (this._el) this._el.focus(); }
}

customElements.define('scratch-field', ScratchField);
