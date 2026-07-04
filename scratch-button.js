/* <scratch-button> — the first true Scratch Proto component.
 *
 * Shadow-DOM custom element: its structure + styles are sealed so a button
 * can't be assembled wrong. Design tokens (--accent, --pad-control-*, --r-md,
 * fonts…) are inherited CSS custom properties, so they pierce the shadow
 * boundary and resolve from the page's :root — themeable, but not deformable.
 *
 *   <scratch-button>save</scratch-button>                 default (neutral)
 *   <scratch-button variant="accent">add</scratch-button> amber / primary
 *   <scratch-button variant="danger">remove</scratch-button>
 *   <scratch-button variant="link">details</scratch-button>
 *   <scratch-button disabled>…</scratch-button>
 *
 * Fallbacks are baked in so it still renders coherently with no global theme.
 */
const SCRATCH_BUTTON_CSS = `
  :host {
    display: inline-flex;
    position: relative;
    vertical-align: middle;
    /* typographic props live here so the slotted label inherits them */
    font-family: var(--font-mono, "JetBrains Mono", "SF Mono", monospace);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--btn-fg);
    /* default (neutral) variant colors */
    --btn-fg: var(--text, #c8cdd8);
    --btn-edge: var(--border, #2a2e3a);
    --btn-tint: var(--bg-elevated, #181c26);
  }
  :host([variant="accent"]) {
    --btn-fg: var(--accent, #ffae00);
    --btn-edge: var(--accent-dim, #7d6939);
    --btn-tint: var(--accent-glow, rgba(255, 174, 0, 0.12));
  }
  :host([variant="danger"]) {
    --btn-fg: var(--danger, #ff4444);
    --btn-edge: var(--danger, #ff4444);
    --btn-tint: var(--danger-glow, rgba(255, 68, 68, 0.10));
  }

  button {
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: relative;
    cursor: pointer;
    padding: var(--pad-control-y, 8px) var(--pad-control-x, 12px);
    background: var(--btn-tint);
    border: 1px solid var(--btn-edge);
    border-radius: var(--r-md, 0);
    /* corner-mark color = the button's own edge, brightened */
    --corner: color-mix(in srgb, var(--btn-edge), white 18%);
    transition: background-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), border-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), transform var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                box-shadow 250ms var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }

  /* Registration corner-marks — the interactive-surface cue, sealed in. */
  button::before,
  button::after {
    content: '';
    position: absolute;
    width: 5px; height: 5px;
    border-color: var(--corner);
    border-style: solid;
    pointer-events: none;
    transition: border-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  button::before { top: 3px; left: 3px; border-width: 1px 0 0 1px; }
  button::after { bottom: 3px; right: 3px; border-width: 0 1px 1px 0; }

  /* Hover — neutral lightens; colored variants fill. */
  button:hover { background: var(--bg-hover, #1e2330); border-color: var(--text-muted, #6b7280); }
  :host(:hover) { color: var(--text-bright, #e8ecf4); }
  button:hover::before, button:hover::after { border-color: var(--accent-dim, #7d6939); }

  :host([variant="accent"]:hover) button,
  :host([variant="danger"]:hover) button {
    background: var(--btn-fg);
    border-color: var(--btn-fg);
  }
  :host([variant="accent"]:hover),
  :host([variant="danger"]:hover) { color: var(--bg-deep, #08090c); }
  :host([variant="accent"]:hover) button::before, :host([variant="accent"]:hover) button::after,
  :host([variant="danger"]:hover) button::before, :host([variant="danger"]:hover) button::after {
    border-color: var(--bg-deep, #08090c);
  }

  button:focus-visible { outline: 2px solid var(--accent, #ffae00); outline-offset: 2px; box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }

  /* Link variant — inline text link, no box, no brackets. */
  :host([variant="link"]) { text-transform: none; letter-spacing: normal; font-weight: 400;
    font-size: var(--fs-small, 12px); color: var(--accent, #ffae00); }
  :host([variant="link"]) button {
    background: none; border: none; padding: 0; text-decoration: underline;
  }
  :host([variant="link"]) button::before,
  :host([variant="link"]) button::after { display: none; }
  :host([variant="link"]) button:hover { background: none; color: var(--accent-hover, #ffc64d); }
  :host([variant="link"]:hover) { color: var(--accent-hover, #ffc64d); }

  /* Disabled — dashed border (the system's disabled signal) + dithered out
     with a 2×2px checkerboard. Squares alternate between 75% and 25%
     visibility (a soft screen, not hard holes). No corner-marks: those signal
     an interactive surface, and a disabled button isn't clickable. */
  :host([disabled]) button { border-style: dashed; }
  :host([disabled]) button::before,
  :host([disabled]) button::after { display: none; }
  :host([disabled]) {
    pointer-events: none;
    -webkit-mask-image: conic-gradient(rgba(0,0,0,0.75) 90deg, rgba(0,0,0,0.25) 0 180deg, rgba(0,0,0,0.75) 0 270deg, rgba(0,0,0,0.25) 0);
            mask-image: conic-gradient(rgba(0,0,0,0.75) 90deg, rgba(0,0,0,0.25) 0 180deg, rgba(0,0,0,0.75) 0 270deg, rgba(0,0,0,0.25) 0);
    -webkit-mask-size: 4px 4px;
            mask-size: 4px 4px;
  }
`;

/* One stylesheet, parsed once, shared by reference across every instance's
   shadow root via adoptedStyleSheets — no per-button CSS duplication. */
const SCRATCH_BUTTON_SHEET = new CSSStyleSheet();
SCRATCH_BUTTON_SHEET.replaceSync(SCRATCH_BUTTON_CSS);

const SCRATCH_BUTTON_TPL = document.createElement('template');
SCRATCH_BUTTON_TPL.innerHTML = `<button part="button"><slot></slot></button>`;

class ScratchButton extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_BUTTON_SHEET];
    root.appendChild(SCRATCH_BUTTON_TPL.content.cloneNode(true));
    this.addEventListener('click', () => this._confirm());
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    const b = this.shadowRoot.querySelector('button');
    if (b) b.disabled = this.hasAttribute('disabled');
  }
  /* Click shockwave — delegated to the shared <scratch-ring> component so the
     effect is identical across every corner-marked surface. */
  _confirm() {
    if (this.hasAttribute('disabled')) return;
    const v = this.getAttribute('variant');
    if (v === 'link') return;   // text links don't shockwave
    if (!window.ScratchRing) return;
    // colored variants burst vivid + at full strength; neutral default is soft.
    const cs = getComputedStyle(this);
    if (v === 'accent') ScratchRing.burst(this, { color: cs.getPropertyValue('--accent').trim() || '#ffae00', opacity: 1 });
    else if (v === 'danger') ScratchRing.burst(this, { color: cs.getPropertyValue('--danger').trim() || '#ff4444', opacity: 1 });
    else ScratchRing.burst(this, { opacity: 0.75 });
  }
}
customElements.define('scratch-button', ScratchButton);
