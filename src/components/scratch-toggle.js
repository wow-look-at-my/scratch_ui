/* <scratch-toggle> — checkbox toggle.
 *
 *   <scratch-toggle checked>stream responses</scratch-toggle>
 *   <scratch-toggle>auto-title</scratch-toggle>
 *   <scratch-toggle disabled>not in this build</scratch-toggle>   ← dashed box
 *
 * Form-associated checkbox semantics: a hidden native <input type="checkbox">
 * supplies keyboard + a11y for free; the visible box is a hard-edged square
 * that fills with an inset amber square when checked (LED-adjacent — never
 * rounded). Label text is slotted; clicking anywhere on the label toggles.
 * Submits "on" when checked (ElementInternals.setFormValue).
 *
 * `checked` reflects attribute <-> property both ways, so framework-controlled
 * usage works: a user toggle updates the property/attribute and fires composed
 * bubbling `change` (+`input`), and a same-value attribute re-set is a no-op —
 * it can never clobber the control's state.
 */
const SCRATCH_TOGGLE_CSS = `
  :host { display: inline-flex; vertical-align: middle; }

  label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    position: relative;
    cursor: pointer;
    user-select: none;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    font-size: var(--fs-small, 12px);
    color: var(--text, #c8cdd8);
  }

  /* the native checkbox: invisible but real — keyboard, focus, a11y */
  input {
    position: absolute;
    opacity: 0;
    width: 1px; height: 1px;
    margin: 0;
    pointer-events: none;
  }

  .box {
    width: 14px; height: 14px;
    box-sizing: border-box;
    flex: none;
    position: relative;
    background: var(--bg-deep, #08090c);
    border: 1px solid var(--border, #2a2e3a);
    border-radius: 0;   /* hard-edged, always — never a pill */
    transition: border-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), box-shadow 250ms var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  /* the inset amber square — the "LED" fill */
  .box::after {
    content: '';
    position: absolute;
    inset: 3px;
    background: var(--accent, #ffae00);
    opacity: 0;
    transition: opacity var(--dur-fast, 0.09s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }

  label:hover .box { border-color: color-mix(in srgb, var(--border, #2a2e3a), white 30%); }
  input:checked ~ .box { border-color: var(--accent-dim, #7d6939); box-shadow: 0 0 6px var(--accent-glow, rgba(255, 174, 0, 0.12)); }
  input:checked ~ .box::after { opacity: 1; }
  input:focus-visible ~ .box { outline: 2px solid var(--accent, #ffae00); outline-offset: 2px; box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }

  /* DISABLED — dashed box + dimmed label, inert. */
  :host([disabled]) { pointer-events: none; }
  :host([disabled]) label { cursor: not-allowed; color: var(--text-disabled, #565b69); }
  :host([disabled]) .box {
    border-style: dashed;
    border-color: var(--border-dashed, #333844);
    background: none;
    box-shadow: none;
  }
  :host([disabled]) .box::after { background: var(--text-disabled, #565b69); }
`;

const SCRATCH_TOGGLE_SHEET = new CSSStyleSheet();
SCRATCH_TOGGLE_SHEET.replaceSync(SCRATCH_TOGGLE_CSS);

const SCRATCH_TOGGLE_TPL = document.createElement('template');
SCRATCH_TOGGLE_TPL.innerHTML =
  `<label class="root" part="root"><input type="checkbox"><span class="box" part="box"></span><slot></slot></label>`;

class ScratchToggle extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['checked', 'disabled']; }

  constructor() {
    super();
    this._internals = this.attachInternals ? this.attachInternals() : null;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_TOGGLE_SHEET];
    root.appendChild(SCRATCH_TOGGLE_TPL.content.cloneNode(true));
    this._input = root.querySelector('input');
    this._input.addEventListener('change', () => {
      // user toggle: reflect into the attribute (the !== guard in _sync makes
      // the resulting callback a no-op), record the form value, and announce.
      this.toggleAttribute('checked', this._input.checked);
      this._setFormValue();
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
    // native input is composed — mute it so the host fires exactly one
    this._input.addEventListener('input', (e) => e.stopPropagation());
  }

  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }

  _sync() {
    if (!this._input) return;
    const want = this.hasAttribute('checked');
    // same-value re-sets are no-ops — a controlled re-render can't clobber us
    if (this._input.checked !== want) this._input.checked = want;
    this._input.disabled = this.hasAttribute('disabled');
    this._setFormValue();
  }

  _setFormValue() {
    if (this._internals) this._internals.setFormValue(this._input.checked ? 'on' : null);
  }

  get checked() { return this._input ? this._input.checked : this.hasAttribute('checked'); }
  set checked(v) { this.toggleAttribute('checked', !!v); }
}
customElements.define('scratch-toggle', ScratchToggle);
