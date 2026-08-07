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
import { escapeHtml } from '../../lib/escape-html.ts';
import SCRATCH_CARD_CSS from './scratch-card.css';

const SCRATCH_CARD_SHEET = new CSSStyleSheet();
SCRATCH_CARD_SHEET.replaceSync(SCRATCH_CARD_CSS);

class ScratchCard extends HTMLElement {
  static get observedAttributes() { return ['index', 'name', 'desc', 'href']; }
  private _root: ShadowRoot;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SCRATCH_CARD_SHEET];
    this.addEventListener('click', () => {
      window.ScratchRing?.burst(this);
    });
  }
  connectedCallback() { this._render(); }
  attributeChangedCallback() { if (this._root.childElementCount) this._render(); }
  private _render() {
    const esc = escapeHtml;
    const href = this.getAttribute('href');
    const tag = href ? 'a' : 'div';
    this._root.innerHTML =
      `<${tag} class="card" part="card"${href ? ` href="${esc(href)}"` : ' role="button" tabindex="0"'}>` +
        `<span class="index">${esc(this.getAttribute('index') || '')}</span>` +
        `<div class="name">${esc(this.getAttribute('name') || '')}</div>` +
        `<div class="desc">${esc(this.getAttribute('desc') || '')}</div>` +
        `<slot></slot>` +
      `</${tag}>`;
  }
}
customElements.define('scratch-card', ScratchCard);
