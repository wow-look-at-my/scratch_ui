/* <scratch-badge> — small status/label tag.
 *
 *   <scratch-badge>Prototype</scratch-badge>          proto: accent tag + static LED
 *   <scratch-badge variant="key">KEY</scratch-badge>  plain neutral tag (e.g. "has API key")
 *   <scratch-badge variant="off">OFF</scratch-badge>  dim chip: dashed, no LED (inactive)
 *
 * The proto variant composes <scratch-led> internally (component-in-component),
 * so its dot is the same sealed indicator used everywhere else. Static by
 * default; add `live` to signal work in flight (running/queued only).
 *
 * The visual box (padding/border/bg) lives on an inner .box element — NOT on
 * :host — so the page's global `* { padding: 0 }` reset (which reaches the
 * host in light DOM but cannot pierce the shadow boundary) can never strip it.
 */
const SCRATCH_BADGE_CSS = `
  :host { display: inline-flex; vertical-align: middle; }
  .box {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    user-select: none;
    box-sizing: border-box;
  }
  /* proto (default) */
  :host(:not([variant])) .box, :host([variant="proto"]) .box {
    font-size: var(--fs-micro, 10px);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent, #ffae00);
    background: var(--accent-glow, rgba(255,174,0,0.12));
    border: 1px solid var(--accent-dim, #7d6939);
    border-radius: var(--r-sm, 0);
    padding: 5px 9px;
    line-height: 1;
  }
  /* off — neutral DIM chip: the disabled/inactive tag. Dashed border (the
     system's disabled signal), muted text, no fill, no LED. */
  :host([variant="off"]) .box {
    font-size: var(--fs-micro, 10px);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted, #6b7280);
    background: none;
    border: 1px dashed var(--border-dashed, #333844);
    border-radius: var(--r-sm, 0);
    padding: 5px 9px;
    line-height: 1;
  }
  /* key — plain neutral tag */
  :host([variant="key"]) .box {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted, #6b7280);
    background: var(--bg-elevated, #181c26);
    border: 1px solid var(--border, #2a2e3a);
    border-radius: var(--r-sm, 0);
    padding: 4px 6px;
    line-height: 1;
  }
  /* the LED only renders for proto */
  scratch-led { display: none; }
  :host(:not([variant])) scratch-led,
  :host([variant="proto"]) scratch-led { display: inline-block; }
`;
const SCRATCH_BADGE_SHEET = new CSSStyleSheet();
SCRATCH_BADGE_SHEET.replaceSync(SCRATCH_BADGE_CSS);

class ScratchBadge extends HTMLElement {
  static get observedAttributes() { return ['variant', 'live']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_BADGE_SHEET];
    this.shadowRoot.innerHTML =
      `<span class="box" part="box"><scratch-led state="accent"></scratch-led><slot></slot></span>`;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    const led = this.shadowRoot.querySelector('scratch-led');
    if (!led) return;
    if (this.hasAttribute('live')) led.setAttribute('live', '');
    else led.removeAttribute('live');
  }
}
customElements.define('scratch-badge', ScratchBadge);
