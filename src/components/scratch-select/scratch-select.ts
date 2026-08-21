/* <scratch-select> — dropdown select.
 *
 *   <scratch-select placeholder="pick a model">
 *     <option value="llama3.3:70b">llama3.3:70b</option>
 *     <option value="qwen2.5-coder:32b">qwen2.5-coder:32b</option>
 *   </scratch-select>
 *   <scratch-select disabled><option>locked</option></scratch-select>   ← dashed
 *
 * Light-DOM <option> children are the options source: they are mirrored into
 * a sealed shadow <select>, and a MutationObserver keeps the mirror live —
 * add/remove/edit options at any time and the control rebuilds, preserving
 * the current value while it still names an option. `placeholder` renders as
 * a disabled+hidden first option, shown until a value is chosen.
 *
 * Form-associated: exposes .value, participates in <form>. The `value`
 * attribute seeds; the property (and user picks) are authoritative after —
 * scratch-field's seed semantics. Fires composed bubbling `input`/`change`.
 * Option text renders verbatim (no uppercase) — model ids must read as-is.
 */


import { SHEET } from '../../styles.ts';

const SCRATCH_SELECT_TPL = document.createElement('template');
SCRATCH_SELECT_TPL.innerHTML =
  `<span class="wrap" part="wrap"><select part="control"></select><span class="chev" aria-hidden="true">▾</span></span>`;

class ScratchSelect extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['value', 'disabled', 'placeholder']; }

  private _internals: ElementInternals;
  private _value: string | null;
  private _select: HTMLSelectElement;
  private _mo: MutationObserver;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._value = null;   // authoritative once the user picks / property is set
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SHEET];
    root.appendChild(SCRATCH_SELECT_TPL.content.cloneNode(true));
    this._select = root.querySelector('select') as HTMLSelectElement;
    this._select.addEventListener('input', (e) => {
      e.stopPropagation();   // native input is composed — host fires exactly one
      this._value = this._select.value;
      this._internals.setFormValue(this._value);
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    this._select.addEventListener('change', () => {
      this._value = this._select.value;
      this._internals.setFormValue(this._value);
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    });
    /* Light-DOM options are the source of truth — watch them and rebuild. */
    this._mo = new MutationObserver((muts) => {
      // host-attribute changes are attributeChangedCallback's job
      if (muts.every((m) => m.target === this && m.type === 'attributes')) return;
      this._rebuild();
    });
  }

  connectedCallback() {
    this._mo.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
    this._rebuild();
  }
  disconnectedCallback() { this._mo.disconnect(); }
  attributeChangedCallback() { this._rebuild(); }

  private _rebuild() {
    if (!this._select) return;
    // desired value: user/property value wins; the attribute only seeds
    const attr = this.getAttribute('value');
    const want = this._value != null ? this._value : attr;

    const ph = this.getAttribute('placeholder');
    this._select.innerHTML = '';
    if (ph != null) {
      const o = document.createElement('option');
      o.value = '';
      o.disabled = true;
      o.hidden = true;
      o.textContent = ph;
      this._select.appendChild(o);
    }
    for (const src of this.querySelectorAll('option')) {
      const o = document.createElement('option');
      o.value = src.value;
      o.textContent = src.textContent;
      if (src.disabled) o.disabled = true;
      this._select.appendChild(o);
    }
    // keep the current value while it still names an option; else fall back to
    // the placeholder (when present) or the native default (first option).
    const has = want != null &&
      Array.from(this._select.options).some((o) => !o.hidden && o.value === want);
    if (has && want != null) this._select.value = want;
    else if (ph != null) this._select.value = '';
    this._select.disabled = this.hasAttribute('disabled');
    this._internals.setFormValue(this._select.value);
  }

  get value() { return this._select ? this._select.value : (this._value ?? ''); }
  set value(v: string) {
    this._value = v;
    if (this._select) this._select.value = v;
    this._internals.setFormValue(this._select ? this._select.value : v);
  }

  override focus() { if (this._select) this._select.focus(); }
}
customElements.define('scratch-select', ScratchSelect);
