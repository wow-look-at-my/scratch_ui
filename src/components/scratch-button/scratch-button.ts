/* <scratch-button> — the first true Scratch Proto component.
 *
 * Shadow-DOM custom element: its structure + styles are sealed so a button
 * can't be assembled wrong. Design tokens (--accent, --pad-control-*, --r-md,
 * fonts…) are inherited CSS custom properties, so they pierce the shadow
 * boundary and resolve from the page's :root — themeable, but not deformable.
 *
 *   <scratch-button>save</scratch-button>                 default (neutral)
 *   <scratch-button variant="accent">add</scratch-button> amber / primary
 *   <scratch-button variant="danger">remove</scratch-button>
 *   <scratch-button variant="link">details</scratch-button>
 *   <scratch-button variant="ghost">✎</scratch-button>    quiet borderless tier
 *   <scratch-button disabled>…</scratch-button>
 *
 * Form-associated: <scratch-button type="submit"> submits the owning <form>
 * (via ElementInternals.requestSubmit). Without the attribute a button never
 * submits — existing manual wiring keeps working.
 *
 * Fallbacks are baked in so it still renders coherently with no global theme.
 */

/* One stylesheet, parsed once, shared by reference across every instance's
   shadow root via adoptedStyleSheets — no per-button CSS duplication. */
import SCRATCH_BUTTON_CSS from './scratch-button.css';

const SCRATCH_BUTTON_SHEET = new CSSStyleSheet();
SCRATCH_BUTTON_SHEET.replaceSync(SCRATCH_BUTTON_CSS);

const SCRATCH_BUTTON_TPL = document.createElement('template');
SCRATCH_BUTTON_TPL.innerHTML = `<button part="button"><slot></slot></button>`;

class ScratchButton extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() { return ['disabled']; }
  private _internals: ElementInternals;
  private _root: ShadowRoot;
  constructor() {
    super();
    this._internals = this.attachInternals();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SCRATCH_BUTTON_SHEET];
    this._root.appendChild(SCRATCH_BUTTON_TPL.content.cloneNode(true));
    this.addEventListener('click', () => { this._confirm(); this._maybeSubmit(); });
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  private _sync() {
    const b = this._root.querySelector('button');
    if (b) b.disabled = this.hasAttribute('disabled');
  }
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v: boolean) { this.toggleAttribute('disabled', !!v); }
  /* type="submit" opts a button into submitting its owning form — the default
     (no type) never submits, so existing usage is untouched. */
  private _maybeSubmit() {
    if (this.hasAttribute('disabled')) return;
    if (this.getAttribute('type') !== 'submit') return;
    if (this._internals.form) this._internals.form.requestSubmit();
  }
  /* Click shockwave — delegated to the shared <scratch-ring> component so the
     effect is identical across every corner-marked surface. */
  private _confirm() {
    if (this.hasAttribute('disabled')) return;
    const v = this.getAttribute('variant');
    if (v === 'link' || v === 'ghost') return;   // quiet tiers don't shockwave
    const ring = window.ScratchRing;
    if (!ring) return;
    // colored variants burst vivid + at full strength; neutral default is soft.
    const cs = getComputedStyle(this);
    if (v === 'accent') ring.burst(this, { color: cs.getPropertyValue('--accent').trim() || '#ffae00', opacity: 1 });
    else if (v === 'danger') ring.burst(this, { color: cs.getPropertyValue('--danger').trim() || '#ff4444', opacity: 1 });
    else ring.burst(this, { opacity: 0.75 });
  }
}
customElements.define('scratch-button', ScratchButton);
