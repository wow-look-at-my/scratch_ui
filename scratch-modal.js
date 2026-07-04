/* <scratch-modal> — dialog surface shell.
 *
 *   <scratch-modal eyebrow="settings">
 *     <scratch-tabs> … </scratch-tabs>
 *   </scratch-modal>
 *
 * Owns the bordered/rounded surface, elevation, overflow clip, and the tiny
 * decorative "// eyebrow" line. Content (typically <scratch-tabs>) is slotted.
 * eyebrow: optional decorative label rendered as "// <text>".
 */
const SCRATCH_MODAL_CSS = `
  :host { display: block; width: 100%; max-width: 460px; }
  .surface {
    background: var(--bg-surface, #12151c);
    border: 1px solid var(--border-dashed, #333844);
    border-radius: var(--r-lg, 0);
    box-shadow: var(--shadow-modal, 0 18px 50px rgba(0,0,0,0.55));
    overflow: hidden;
  }
  .eyebrow {
    font-family: var(--font-mono, monospace);
    font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--text-disabled, #565b69);
    padding: var(--sp-2, 8px) var(--sp-3, 12px) 0;
  }
  .eyebrow::before { content: '// '; }
  .eyebrow:empty { display: none; padding: 0; }
`;
const SCRATCH_MODAL_SHEET = new CSSStyleSheet();
SCRATCH_MODAL_SHEET.replaceSync(SCRATCH_MODAL_CSS);

class ScratchModal extends HTMLElement {
  static get observedAttributes() { return ['eyebrow']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_MODAL_SHEET];
    this.shadowRoot.innerHTML =
      `<div class="surface"><div class="eyebrow" part="eyebrow"></div><slot></slot></div>`;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    this.shadowRoot.querySelector('.eyebrow').textContent = this.getAttribute('eyebrow') || '';
  }
}
customElements.define('scratch-modal', ScratchModal);
