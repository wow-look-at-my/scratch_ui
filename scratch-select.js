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
const SCRATCH_SELECT_CSS = `
  :host { display: block; }
  :host([inline]) { display: inline-block; }

  .wrap { position: relative; display: block; }

  select {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    color: var(--text, #c8cdd8);
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    font-size: var(--fs-small, 12px);
    background: var(--bg-elevated, #181c26);
    border: 1px solid var(--border, #2a2e3a);
    border-radius: var(--r-md, 0);
    padding: var(--pad-control-y, 8px) var(--pad-control-x, 12px);
    padding-right: calc(var(--pad-control-x, 12px) + 16px);  /* room for the ▾ */
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
            appearance: none;
    transition: border-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), box-shadow 250ms var(--ease-out, cubic-bezier(0.16,1,0.3,1)), background-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  select:hover:not(:focus) { border-color: color-mix(in srgb, var(--border, #2a2e3a), white 30%); }
  select:focus { border-color: var(--accent-dim, #7d6939); box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }

  /* the dropdown panel is OS-drawn; keep its rows on-theme where honored */
  option { background: var(--bg, #0d0f14); color: var(--text, #c8cdd8); }

  /* drawn ▾ affordance — replaces the native arrow killed by appearance:none */
  .chev {
    position: absolute;
    right: var(--pad-control-x, 12px);
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--accent, #ffae00);
    font-size: 9px;
    line-height: 1;
  }

  /* DISABLED — dashed border is the system's single "disabled" signal. */
  :host([disabled]) select {
    border-style: dashed;
    border-color: var(--border-dashed, #333844);
    opacity: 0.55;
    cursor: not-allowed;
  }
  :host([disabled]) .chev { color: var(--text-disabled, #565b69); }
`;

const SCRATCH_SELECT_SHEET = new CSSStyleSheet();
SCRATCH_SELECT_SHEET.replaceSync(SCRATCH_SELECT_CSS);

const SCRATCH_SELECT_TPL = document.createElement('template');
SCRATCH_SELECT_TPL.innerHTML =
  `<span class="wrap" part="wrap"><select part="control"></select><span class="chev" aria-hidden="true">▾</span></span>`;

class ScratchSelect extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['value', 'disabled', 'placeholder']; }

  constructor() {
    super();
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._value = null;   // authoritative once the user picks / property is set
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_SELECT_SHEET];
    root.appendChild(SCRATCH_SELECT_TPL.content.cloneNode(true));
    this._select = root.querySelector('select');
    this._select.addEventListener('input', (e) => {
      e.stopPropagation();   // native input is composed — host fires exactly one
      this._value = this._select.value;
      if (this._internals) this._internals.setFormValue(this._value);
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
    this._select.addEventListener('change', () => {
      this._value = this._select.value;
      if (this._internals) this._internals.setFormValue(this._value);
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

  _rebuild() {
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
    if (has) this._select.value = want;
    else if (ph != null) this._select.value = '';
    this._select.disabled = this.hasAttribute('disabled');
    if (this._internals) this._internals.setFormValue(this._select.value);
  }

  get value() { return this._select ? this._select.value : (this._value ?? ''); }
  set value(v) {
    this._value = v;
    if (this._select) this._select.value = v;
    if (this._internals) this._internals.setFormValue(this._select ? this._select.value : v);
  }

  focus() { if (this._select) this._select.focus(); }
}
customElements.define('scratch-select', ScratchSelect);
