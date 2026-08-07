/* <scratch-preview> — formalized "preview + caption" component.
 *
 * A sealed preview body (slot for ANY content — a color-fill div, a sample, an
 * image placeholder) above a caption. Like <scratch-button>, structure is
 * locked in shadow DOM while design tokens inherit through.
 *
 *   <scratch-preview label="--accent" sub="primary"><div class="fill" style="background:var(--accent)"></div></scratch-preview>
 *   <scratch-preview label="--bg" sub="#0d0f14" grid><div class="fill" style="background:var(--bg)"></div></scratch-preview>
 *   <scratch-preview label="sample" sub="shape"><span class="box"></span></scratch-preview>
 *
 * label : caption title (the token / name).
 * sub   : caption sub-line (hex / role).
 * grid  : boolean — overlays the dot-grid on the body.
 */

/* Single shared stylesheet (parsed once) adopted by every instance —
   no per-preview CSS duplication. */
import SCRATCH_PREVIEW_CSS from './scratch-preview.css';

const SCRATCH_PREVIEW_SHEET = new CSSStyleSheet();
SCRATCH_PREVIEW_SHEET.replaceSync(SCRATCH_PREVIEW_CSS);

const SCRATCH_PREVIEW_TPL = document.createElement('template');
SCRATCH_PREVIEW_TPL.innerHTML = `
<div class="wrap">
  <div class="body" part="body"><slot></slot></div>
  <div class="caption">
    <div class="title" part="title"></div>
    <div class="sub" part="sub"></div>
  </div>
</div>
`;

class ScratchPreview extends HTMLElement {
  static get observedAttributes() { return ['label', 'sub']; }
  private _title: HTMLElement;
  private _sub: HTMLElement;
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_PREVIEW_SHEET];
    root.appendChild(SCRATCH_PREVIEW_TPL.content.cloneNode(true));
    this._title = root.querySelector('.title') as HTMLElement;
    this._sub = root.querySelector('.sub') as HTMLElement;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  private _sync() {
    this._title.textContent = this.getAttribute('label') || '';
    this._sub.textContent = this.getAttribute('sub') || '';
  }
}
customElements.define('scratch-preview', ScratchPreview);
