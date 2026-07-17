/* <scratch-message> — a chat message row.
 *
 *   <scratch-message author="user">…body…</scratch-message>
 *   <scratch-message author="assistant" stats="312 tok · 1.4s" streaming>…</scratch-message>
 *
 * author: user (amber label) | assistant (green label). stats: optional right-
 * aligned meta. streaming: appends the blinking caret to the body.
 * (`author`, not `role` — `role` is the ARIA global attribute, and
 * "user"/"assistant" are not valid ARIA role tokens.)
 */
const SCRATCH_MESSAGE_CSS = `
  :host { display: flex; flex-direction: column; gap: 4px; max-width: 520px; }
  .head { display: flex; align-items: center; gap: 10px; }
  .author {
    font-family: var(--font-mono, monospace);
    font-size: var(--fs-micro, 10px); font-weight: 600;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--text-muted, #6b7280);
  }
  :host([author="user"]) .author { color: var(--accent, #ffae00); }
  :host([author="assistant"]) .author { color: var(--signal, #00e47a); }
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
    animation: msg-caret 0.9s var(--ease-out, cubic-bezier(0.16,1,0.3,1)) infinite;
  }
  /* Hold → fast fade → hold → fast fade. Each fade spans 10% of the cycle
     (90ms ≈ --dur-fast) so it still reads as a caret blink, not a slow pulse
     — but the on/off flips render as smooth opacity ramps. (The old
     steps(2, end) timing quantized each half-cycle into two hard jumps —
     opacity 1 → .5 → 0 → .5 → 1 — which read as a low-frame-rate stutter.) */
  @keyframes msg-caret {
    0%, 40%  { opacity: 1; }
    50%, 90% { opacity: 0; }
    100%     { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    :host([streaming]) .body::after { animation: none; }
  }
`;
const SCRATCH_MESSAGE_SHEET = new CSSStyleSheet();
SCRATCH_MESSAGE_SHEET.replaceSync(SCRATCH_MESSAGE_CSS);

class ScratchMessage extends HTMLElement {
  static get observedAttributes() { return ['author', 'stats']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_MESSAGE_SHEET];
    this.shadowRoot.innerHTML =
      `<div class="head"><span class="author"></span><span class="stats"></span></div>` +
      `<div class="body"><slot></slot></div>`;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    const author = this.getAttribute('author') || '';
    this.shadowRoot.querySelector('.author').textContent =
      author ? author.charAt(0).toUpperCase() + author.slice(1) : '';
    this.shadowRoot.querySelector('.stats').textContent = this.getAttribute('stats') || '';
  }
}
customElements.define('scratch-message', ScratchMessage);
