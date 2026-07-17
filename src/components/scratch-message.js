/* <scratch-message> — a chat message row.
 *
 *   <scratch-message role="user">…body…</scratch-message>
 *   <scratch-message role="assistant" stats="312 tok · 1.4s" streaming>…</scratch-message>
 *
 * role: user (amber label) | assistant (green label). stats: optional right-
 * aligned meta. streaming: appends the blinking caret to the body.
 */
const SCRATCH_MESSAGE_CSS = `
  :host { display: flex; flex-direction: column; gap: 4px; max-width: 520px; }
  .head { display: flex; align-items: center; gap: 10px; }
  .role {
    font-family: var(--font-mono, monospace);
    font-size: var(--fs-micro, 10px); font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--text-muted, #6b7280);
  }
  :host([role="user"]) .role { color: var(--accent, #ffae00); }
  :host([role="assistant"]) .role { color: var(--signal, #00e47a); }
  .stats {
    font-family: var(--font-mono, monospace);
    font-size: var(--fs-micro, 10px);
    color: var(--text-disabled, #565b69);
    margin-left: auto;
  }
  .stats:empty { display: none; }
  .body {
    font-family: var(--font-mono, monospace);
    font-size: var(--fs-body, 14px); line-height: 1.6;
    color: var(--text, #c8cdd8);
  }
  :host([streaming]) .body::after {
    content: '▍'; color: var(--accent, #ffae00);
    animation: msg-caret 0.9s steps(2, end) infinite;
  }
  @keyframes msg-caret { 0%,100%{opacity:1;} 50%{opacity:0;} }
  @media (prefers-reduced-motion: reduce) {
    :host([streaming]) .body::after { animation: none; }
  }
`;
const SCRATCH_MESSAGE_SHEET = new CSSStyleSheet();
SCRATCH_MESSAGE_SHEET.replaceSync(SCRATCH_MESSAGE_CSS);

class ScratchMessage extends HTMLElement {
  static get observedAttributes() { return ['role', 'stats']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_MESSAGE_SHEET];
    this.shadowRoot.innerHTML =
      `<div class="head"><span class="role"></span><span class="stats"></span></div>` +
      `<div class="body"><slot></slot></div>`;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    const role = this.getAttribute('role') || '';
    this.shadowRoot.querySelector('.role').textContent =
      role ? role.charAt(0).toUpperCase() + role.slice(1) : '';
    this.shadowRoot.querySelector('.stats').textContent = this.getAttribute('stats') || '';
  }
}
customElements.define('scratch-message', ScratchMessage);
