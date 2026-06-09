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
const SCRATCH_PREVIEW_CSS = `
  :host {
    display: block;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    color: var(--text-muted, #6b7280);
    font-size: var(--fs-micro, 10px);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .wrap {
    border: 1px solid var(--border, #2a2e3a);
    border-radius: var(--r-md, 0);
    overflow: hidden;
    background: var(--bg-surface, #12151c);
  }
  .body {
    min-height: 72px;
    border-bottom: 1px solid var(--border, #2a2e3a);
    position: relative;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .body::after {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    display: none;
    background-image: radial-gradient(circle, var(--grid-dot, rgba(200,205,216,0.08)) 1px, transparent 1px);
    background-size: var(--grid-size, 24px) var(--grid-size, 24px);
  }
  :host([grid]) .body::after { display: block; }
  .caption { padding: var(--sp-2, 8px) var(--sp-3, 12px); }
  .title {
    font-size: var(--fs-tiny, 11px);
    color: var(--text-bright, #e8ecf4);
    text-transform: none;
    letter-spacing: normal;
  }
  .title:empty { display: none; }
  .sub {
    font-size: var(--fs-micro, 10px);
    color: var(--text-muted, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .sub:empty { display: none; }
`;

/* Single shared stylesheet (parsed once) adopted by every instance —
   no per-preview CSS duplication. */
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
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_PREVIEW_SHEET];
    root.appendChild(SCRATCH_PREVIEW_TPL.content.cloneNode(true));
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    const r = this.shadowRoot;
    r.querySelector('.title').textContent = this.getAttribute('label') || '';
    r.querySelector('.sub').textContent = this.getAttribute('sub') || '';
  }
}
customElements.define('scratch-preview', ScratchPreview);
