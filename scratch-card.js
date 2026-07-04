/* <scratch-card> — clickable card surface.
 *
 *   <scratch-card index="06" name="GPU Benchmark"
 *     desc="WebGPU/WebGL fillrate, ALU, texture, vertex, and draw-call bench"
 *     href="#patterns"></scratch-card>
 *
 * Seals the dashed surface, dot-grid/scanline bg, registration corner-marks,
 * hover glow, and the index/name/desc layout. Clicking bursts a <scratch-ring>
 * (the shared shockwave). `href` makes the whole card a link.
 */
const SCRATCH_CARD_CSS = `
  :host { display: block; }
  .card {
    display: block; position: relative;
    background-color: var(--bg-surface, #12151c);
    background-image: var(--scanline, none);
    background-attachment: fixed;
    border: 1px solid var(--border-dashed, #333844);
    border-radius: var(--r-md, 0);
    padding: var(--pad-card, 18px);
    text-decoration: none; color: inherit;
    transition: background-color var(--dur-slow, 0.19s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                border-color var(--dur-slow, 0.19s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                box-shadow var(--dur-slow, 0.19s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
    overflow: hidden;
    cursor: pointer;
    --corner-color: color-mix(in srgb, var(--border-dashed, #333844), white 18%);
  }
  /* registration corner-marks */
  .card::before, .card::after {
    content: ''; position: absolute; width: 10px; height: 10px;
    border-color: var(--corner-color); border-style: solid;
    pointer-events: none;
    transition: border-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  .card::before { top: 4px; left: 4px; border-width: 1px 0 0 1px; }
  .card::after { bottom: 4px; right: 4px; border-width: 0 1px 1px 0; }
  .card:hover {
    background-color: var(--bg-elevated, #181c26);
    border-color: var(--accent-dim, #7d6939);
    box-shadow: 0 0 20px var(--accent-glow, rgba(255,174,0,0.12));
  }
  .card:hover::before, .card:hover::after { border-color: var(--accent-dim, #7d6939); }

  .index {
    position: absolute; top: 6px; right: 10px;
    font-family: var(--font-mono, monospace);
    font-size: var(--fs-micro, 10px);
    color: var(--text-disabled, #565b69);
    font-variant-numeric: tabular-nums;
    transition: color var(--dur-slow, 0.19s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  .index:empty { display: none; }
  .card:hover .index { color: var(--text-muted, #6b7280); }
  .name {
    font-family: var(--font-display, "Space Grotesk", sans-serif);
    font-size: 0.95rem; font-weight: 600;
    color: var(--text-bright, #e8ecf4);
    margin-bottom: 4px; letter-spacing: 0.01em;
  }
  .desc {
    font-family: var(--font-mono, monospace);
    font-size: var(--fs-small, 12px);
    color: var(--text-muted, #6b7280);
    line-height: 1.5;
  }
  .desc:empty { display: none; }
  .card:focus-visible { outline: 2px solid var(--accent, #ffae00); outline-offset: 2px; }
`;
const SCRATCH_CARD_SHEET = new CSSStyleSheet();
SCRATCH_CARD_SHEET.replaceSync(SCRATCH_CARD_CSS);

class ScratchCard extends HTMLElement {
  static get observedAttributes() { return ['index', 'name', 'desc', 'href']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_CARD_SHEET];
    this.addEventListener('click', () => {
      if (window.ScratchRing) window.ScratchRing.burst(this);
    });
  }
  connectedCallback() { this._render(); }
  attributeChangedCallback() { if (this.shadowRoot.childElementCount) this._render(); }
  _render() {
    const href = this.getAttribute('href');
    const tag = href ? 'a' : 'div';
    this.shadowRoot.innerHTML =
      `<${tag} class="card" part="card"${href ? ` href="${href}"` : ' role="button" tabindex="0"'}>` +
        `<span class="index">${this.getAttribute('index') || ''}</span>` +
        `<div class="name">${this.getAttribute('name') || ''}</div>` +
        `<div class="desc">${this.getAttribute('desc') || ''}</div>` +
        `<slot></slot>` +
      `</${tag}>`;
  }
}
customElements.define('scratch-card', ScratchCard);
