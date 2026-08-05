/* <scratch-progress> — thin instrument progress bar.
 *
 *   <scratch-progress value="72"></scratch-progress>                  amber (accent)
 *   <scratch-progress state="signal" value="100" max="100"></scratch-progress>
 *   <scratch-progress state="danger" value="31"></scratch-progress>
 *   <scratch-progress indeterminate></scratch-progress>               sweeping segment
 *
 * value/max drive the fill width (max defaults to 100). `state` picks the
 * semantic fill color: accent (default) · signal · danger. `indeterminate`
 * loops a sweeping segment on the system curve instead; under
 * prefers-reduced-motion the sweep is replaced by a static dim 40% fill —
 * no motion, same meaning.
 *
 * The update path is deliberately cheap — attribute changes mutate the fill's
 * style.width, never rebuild DOM — so consumers can set `value` every frame.
 * Bar height is a component token: --progress-height (default 6px).
 * A11y: reflects role="progressbar" + aria-valuemin/max/now on the host
 * (aria-valuenow is dropped while indeterminate).
 */
const SCRATCH_PROGRESS_CSS = `
  :host {
    display: block;
    /* default (accent) fill colors */
    --fill: var(--accent, #ffae00);
    --fill-glow: var(--accent-glow, rgba(255, 174, 0, 0.12));
  }
  :host([state="signal"]) {
    --fill: var(--signal, #00e47a);
    --fill-glow: var(--signal-glow, rgba(0, 228, 122, 0.08));
  }
  :host([state="danger"]) {
    --fill: var(--danger, #ff4444);
    --fill-glow: var(--danger-glow, rgba(255, 68, 68, 0.10));
  }

  .track {
    height: var(--progress-height, 6px);
    box-sizing: border-box;
    background: var(--bg-elevated, #181c26);
    border: 1px solid var(--border, #2a2e3a);
    border-radius: var(--r-sm, 0);
    overflow: hidden;
    position: relative;
  }
  .fill {
    height: 100%;
    width: 0%;
    background: var(--fill);
    /* subtle glow edge in the state color */
    box-shadow: 0 0 8px var(--fill-glow);
  }

  /* Indeterminate — a 30%-wide segment sweeps the track on the system
     ease/duration tokens (loop period = 8 × --dur-slow). */
  :host([indeterminate]) .fill {
    width: 30%;
    animation: scratch-progress-sweep calc(var(--dur-slow, 0.19s) * 8) var(--ease-out, cubic-bezier(0.16,1,0.3,1)) infinite;
  }
  @keyframes scratch-progress-sweep {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(334%); }
  }
  @media (prefers-reduced-motion: reduce) {
    :host([indeterminate]) .fill {
      animation: none;
      width: 40%;
      opacity: 0.5;
    }
  }
`;

const SCRATCH_PROGRESS_SHEET = new CSSStyleSheet();
SCRATCH_PROGRESS_SHEET.replaceSync(SCRATCH_PROGRESS_CSS);

const SCRATCH_PROGRESS_TPL = document.createElement('template');
SCRATCH_PROGRESS_TPL.innerHTML = `<div class="track" part="track"><div class="fill" part="fill"></div></div>`;

class ScratchProgress extends HTMLElement {
  static get observedAttributes() { return ['value', 'max', 'indeterminate', 'state']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_PROGRESS_SHEET];
    root.appendChild(SCRATCH_PROGRESS_TPL.content.cloneNode(true));
    this._fill = root.querySelector('.fill');
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuemin', '0');
    this._sync();
  }
  attributeChangedCallback() { this._sync(); }

  _sync() {
    if (!this._fill) return;
    let max = parseFloat(this.getAttribute('max'));
    if (!isFinite(max) || max <= 0) max = 100;
    this.setAttribute('aria-valuemax', String(max));
    if (this.hasAttribute('indeterminate')) {
      this._fill.style.width = '';          // CSS (sweep / reduced-motion) takes over
      this.removeAttribute('aria-valuenow');
      return;
    }
    let value = parseFloat(this.getAttribute('value'));
    if (!isFinite(value)) value = 0;
    value = Math.min(Math.max(value, 0), max);
    this._fill.style.width = (value / max) * 100 + '%';
    this.setAttribute('aria-valuenow', String(value));
  }

  get value() { const v = parseFloat(this.getAttribute('value')); return isFinite(v) ? v : 0; }
  set value(v) { this.setAttribute('value', String(v)); }
  get max() { const m = parseFloat(this.getAttribute('max')); return isFinite(m) && m > 0 ? m : 100; }
  set max(v) { this.setAttribute('max', String(v)); }
  get indeterminate() { return this.hasAttribute('indeterminate'); }
  set indeterminate(v) { this.toggleAttribute('indeterminate', !!v); }
  get state() { return this.getAttribute('state') || 'accent'; }
  set state(v) { if (v == null) this.removeAttribute('state'); else this.setAttribute('state', v); }
}
customElements.define('scratch-progress', ScratchProgress);
