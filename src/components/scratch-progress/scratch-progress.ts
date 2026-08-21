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


import { SHEET } from '../../styles.ts';

const SCRATCH_PROGRESS_TPL = document.createElement('template');
SCRATCH_PROGRESS_TPL.innerHTML = `<div class="track" part="track"><div class="fill" part="fill"></div></div>`;

class ScratchProgress extends HTMLElement {
  static get observedAttributes() { return ['value', 'max', 'indeterminate', 'state']; }
  private _fill: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SHEET];
    root.appendChild(SCRATCH_PROGRESS_TPL.content.cloneNode(true));
    this._fill = root.querySelector('.fill') as HTMLElement;
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'progressbar');
    this.setAttribute('aria-valuemin', '0');
    this._sync();
  }
  attributeChangedCallback() { this._sync(); }

  private _sync() {
    if (!this._fill) return;
    let max = parseFloat(this.getAttribute('max') ?? '');
    if (!isFinite(max) || max <= 0) max = 100;
    this.setAttribute('aria-valuemax', String(max));
    if (this.hasAttribute('indeterminate')) {
      this._fill.style.width = '';          // CSS (sweep / reduced-motion) takes over
      this.removeAttribute('aria-valuenow');
      return;
    }
    let value = parseFloat(this.getAttribute('value') ?? '');
    if (!isFinite(value)) value = 0;
    value = Math.min(Math.max(value, 0), max);
    this._fill.style.width = (value / max) * 100 + '%';
    this.setAttribute('aria-valuenow', String(value));
  }

  get value() { const v = parseFloat(this.getAttribute('value') ?? ''); return isFinite(v) ? v : 0; }
  set value(v: number) { this.setAttribute('value', String(v)); }
  get max() { const m = parseFloat(this.getAttribute('max') ?? ''); return isFinite(m) && m > 0 ? m : 100; }
  set max(v: number) { this.setAttribute('max', String(v)); }
  get indeterminate() { return this.hasAttribute('indeterminate'); }
  set indeterminate(v: boolean) { this.toggleAttribute('indeterminate', !!v); }
  get state() { return this.getAttribute('state') || 'accent'; }
  set state(v: string | null) { if (v == null) this.removeAttribute('state'); else this.setAttribute('state', v); }
}
customElements.define('scratch-progress', ScratchProgress);
