/* <scratch-caution> — caution-striped zone (diagonal hazard border).
 *
 *   <scratch-caution>…destructive / experimental zone content…</scratch-caution>
 *
 * Seals the 3px amber hazard stripe on the top edge; slotted content renders
 * below it, untouched. The stripe is position-dimmed against the viewport's
 * upper-third "read line" (y = vh/3): full strength exactly there, falling
 * off linearly with the element center's distance, floored at 70% by the
 * viewport bottom — intensity = max(0.7, 1 − 0.45·d/vh).
 *
 * Updates are rAF-throttled per instance (capture-phase document scroll —
 * scroll doesn't bubble, but capture descends to inner scrollers — plus
 * window resize; listeners attach on connect, detach on disconnect), skipped
 * while the element is fully offscreen, deduped to real value changes, and
 * written as inline opacity on the SHADOW stripe element only — style
 * invalidation stays contained inside the shadow root and the host's
 * light-DOM style attribute never churns. Position-driven, not time-animated
 * (scrolling itself is the smoothness), so the dimming — salience, not
 * motion — stays active under prefers-reduced-motion.
 */
const SCRATCH_CAUTION_CSS = `
  :host { display: block; position: relative; border-top: 3px solid transparent; }
  /* The stripe overlays the host's (transparent, layout-keeping) top border:
     height 0 + an own 3px border-top, so the border-image raster box is
     exactly W×3 — identical geometry to the .caution-stripe::before it
     replaced. Opacity is driven inline by the read-line updater below. */
  .stripe {
    position: absolute;
    top: -3px; left: 0; right: 0;
    height: 0;
    border-top: 3px solid transparent;
    border-image: repeating-linear-gradient(45deg, var(--accent, #ffae00) 0 6px, transparent 6px 12px) 3;
    pointer-events: none;
  }
`;
const SCRATCH_CAUTION_SHEET = new CSSStyleSheet();
SCRATCH_CAUTION_SHEET.replaceSync(SCRATCH_CAUTION_CSS);

class ScratchCaution extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_CAUTION_SHEET];
    this.shadowRoot.innerHTML = `<div class="stripe" part="stripe"></div><slot></slot>`;
    this._stripe = this.shadowRoot.firstElementChild;
    this._queued = false;
    this._last = -1;   // last applied intensity; inline style persists across detach
    this._schedule = () => {
      if (!this._queued) { this._queued = true; requestAnimationFrame(this._update); }
    };
    /* Allocation-free per frame beyond the unavoidable rect: arithmetic
       rounding, strict-equality dedupe, stringify only when writing. */
    this._update = () => {
      this._queued = false;
      if (!this.isConnected) return;
      const vh = window.innerHeight;
      const r = this.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;   // fully offscreen: invisible, skip
      let v = 1 - 0.45 * Math.abs((r.top + r.bottom) / 2 - vh / 3) / vh;
      v = v < 0.7 ? 0.7 : Math.round(v * 1000) / 1000;
      if (v === this._last) return;             // no-op frames write nothing
      this._last = v;
      this._stripe.style.opacity = String(v);
    };
  }
  connectedCallback() {
    document.addEventListener('scroll', this._schedule, { capture: true, passive: true });
    window.addEventListener('resize', this._schedule, { passive: true });
    this._update();   // initial placement before first paint — no intensity flash
  }
  disconnectedCallback() {
    document.removeEventListener('scroll', this._schedule, { capture: true });
    window.removeEventListener('resize', this._schedule);
  }
}
customElements.define('scratch-caution', ScratchCaution);
