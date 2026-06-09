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
 */
const SCRATCH_FIELD_CSS = `
  :host { display: block; }
  :host([inline]) { display: inline-block; }

  .control {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    color: var(--text, #c8cdd8);
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    font-size: var(--fs-small, 12px);
    background: var(--bg-deep, #08090c);
    border: 1px solid var(--border, #2a2e3a);
    border-radius: var(--r-md, 0);
    padding: var(--pad-control-y, 8px) var(--pad-control-x, 12px);
    outline: none;
    transition: border-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), box-shadow 250ms var(--ease-out, cubic-bezier(0.16,1,0.3,1)), background-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  .control::placeholder { color: var(--text-disabled, #565b69); }
  .control:hover:not(:focus) { border-color: color-mix(in srgb, var(--border, #2a2e3a), white 30%); }
  .control:focus { border-color: var(--accent-dim, #7d6939); box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }

  /* DISABLED — dashed border is the system's single "disabled" signal;
     dashed/dotted borders appear nowhere else. */
  :host([disabled]) .control {
    border-style: dashed;
    border-color: var(--border-dashed, #333844);
    opacity: 0.55;
    cursor: not-allowed;
  }

  textarea.control { resize: vertical; min-height: 64px; display: block; }
`;

const SCRATCH_FIELD_SHEET = new CSSStyleSheet();
SCRATCH_FIELD_SHEET.replaceSync(SCRATCH_FIELD_CSS);

class ScratchField extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['placeholder', 'value', 'multiline', 'rows', 'disabled']; }

  constructor() {
    super();
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_FIELD_SHEET];
    this._render();
  }

  connectedCallback() { this._sync(); }
  attributeChangedCallback(name) {
    if (name === 'multiline') this._render();
    this._sync();
  }

  _render() {
    const multiline = this.hasAttribute('multiline');
    this.shadowRoot.innerHTML = '';
    this._el = document.createElement(multiline ? 'textarea' : 'input');
    this._el.className = 'control';
    this._el.part = 'control';
    this._el.addEventListener('input', () => {
      this._value = this._el.value;
      if (this._internals) this._internals.setFormValue(this._value);
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    this._el.addEventListener('change', () => {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
    this.shadowRoot.appendChild(this._el);
    this._sync();
  }

  _sync() {
    if (!this._el) return;
    const ph = this.getAttribute('placeholder');
    if (ph != null) this._el.setAttribute('placeholder', ph);
    if (this.hasAttribute('rows') && this._el.tagName === 'TEXTAREA') {
      this._el.rows = parseInt(this.getAttribute('rows'), 10) || 3;
    }
    this._el.disabled = this.hasAttribute('disabled');
    const v = this.getAttribute('value');
    if (v != null && this._value == null) { this._el.value = v; this._value = v; }
  }

  get value() { return this._el ? this._el.value : (this._value ?? ''); }
  set value(v) {
    this._value = v;
    if (this._el) this._el.value = v;
    if (this._internals) this._internals.setFormValue(v);
  }

  focus() { if (this._el) this._el.focus(); }
}

customElements.define('scratch-field', ScratchField);
