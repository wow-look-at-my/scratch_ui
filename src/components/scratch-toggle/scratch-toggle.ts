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


import { SHEET } from '../../styles.ts';

const SCRATCH_TOGGLE_TPL = document.createElement('template');
SCRATCH_TOGGLE_TPL.innerHTML =
  `<label class="root" part="root"><input type="checkbox"><span class="box" part="box"></span><slot></slot></label>`;

class ScratchToggle extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['checked', 'disabled']; }

  private _internals: ElementInternals;
  private _input: HTMLInputElement;

  constructor() {
    super();
    this._internals = this.attachInternals();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SHEET];
    root.appendChild(SCRATCH_TOGGLE_TPL.content.cloneNode(true));
    this._input = root.querySelector('input') as HTMLInputElement;
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

  private _sync() {
    if (!this._input) return;
    const want = this.hasAttribute('checked');
    // same-value re-sets are no-ops — a controlled re-render can't clobber us
    if (this._input.checked !== want) this._input.checked = want;
    this._input.disabled = this.hasAttribute('disabled');
    this._setFormValue();
  }

  private _setFormValue() {
    this._internals.setFormValue(this._input.checked ? 'on' : null);
  }

  get checked() { return this._input ? this._input.checked : this.hasAttribute('checked'); }
  set checked(v: boolean) { this.toggleAttribute('checked', !!v); }
}
customElements.define('scratch-toggle', ScratchToggle);
