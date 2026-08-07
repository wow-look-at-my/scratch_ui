/* <scratch-badge> — small status/label tag.
 *
 *   <scratch-badge>Prototype</scratch-badge>            proto: accent tag + static LED
 *   <scratch-badge variant="accent">fixed</scratch-badge>  amber chip, no LED
 *   <scratch-badge variant="signal">kept</scratch-badge>   green chip, no LED
 *   <scratch-badge variant="key">KEY</scratch-badge>    plain neutral tag (e.g. "has API key")
 *   <scratch-badge variant="off">OFF</scratch-badge>    dim chip: dashed, no LED (inactive)
 *
 * accent/signal are the colour-only chips: same shape as proto, no dot. Reach
 * for them to label a verdict or outcome — proto's LED reports a STATE, and a
 * static amber dot already means "stale" in the LED language.
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
  /* Every variant is the same chip; a variant carries COLOUR, nothing else.
     Keeping the geometry here is what stops the tiers drifting apart as the
     family grows. "key" is the one shape exception and says so. */
  .box {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    user-select: none;
    box-sizing: border-box;
    font-size: var(--fs-micro, 10px);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid transparent;
    border-radius: var(--r-sm, 0);
    padding: 5px 9px;
    line-height: 1;
  }
  /* proto (default) — the prototype tag: amber chip + status LED.
     accent is the same chip WITHOUT the dot, for labelling a thing rather than
     reporting a state (a static amber LED already means "stale"). */
  :host(:not([variant])) .box,
  :host([variant="proto"]) .box,
  :host([variant="accent"]) .box {
    color: var(--accent, #ffae00);
    background: var(--accent-glow, rgba(255,174,0,0.12));
    border-color: var(--accent-dim, #7d6939);
  }
  /* signal — the success/kept chip */
  :host([variant="signal"]) .box {
    color: var(--signal, #00e47a);
    background: var(--signal-glow, rgba(0,228,122,0.08));
    border-color: var(--signal-dim, #00b25f);
  }
  /* off — neutral DIM chip: the disabled/inactive tag. Dashed border (the
     system's disabled signal), muted text, no fill, no LED. */
  :host([variant="off"]) .box {
    color: var(--text-muted, #6b7280);
    background: none;
    border: 1px dashed var(--border-dashed, #333844);
  }
  /* key — plain neutral tag; the one variant with its own metrics */
  :host([variant="key"]) .box {
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.06em;
    color: var(--text-muted, #6b7280);
    background: var(--bg-elevated, #181c26);
    border-color: var(--border, #2a2e3a);
    padding: 4px 6px;
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
