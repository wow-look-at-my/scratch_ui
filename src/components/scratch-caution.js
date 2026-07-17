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
 * The dimming is driven by a CSS scroll-driven animation (animation-timeline:
 * view(block)) — compositor-side, zero per-frame JS — with keyframes mapping
 * the stripe's journey through the viewport to the same piecewise-linear
 * profile: 0% (entering at the viewport bottom) → 0.70, 66.667% (the read
 * line) → 1, 100% (leaving at the top) → 0.85; the timeline clamps outside.
 * Engines without view() (Firefox, as of writing) fall back to the rAF
 * updater below — the animation is declared inside a matching @supports
 * block so it can never half-apply (a timeline-less engine would otherwise
 * run it as an instantly-finished time animation whose fill pins the 100%
 * keyframe, and animations outrank inline styles in the cascade).
 *
 * Fallback updates are rAF-throttled per instance (capture-phase document
 * scroll — scroll doesn't bubble, but capture descends to inner scrollers —
 * plus window resize; listeners attach on connect, detach on disconnect),
 * skipped while the element is fully offscreen, deduped to real value
 * changes, and written as inline opacity on the SHADOW stripe element only —
 * style invalidation stays contained inside the shadow root and the host's
 * light-DOM style attribute never churns. Position-driven, not time-animated
 * (scrolling itself is the smoothness), so the dimming — salience, not
 * motion — stays active under prefers-reduced-motion.
 */
const SCRATCH_CAUTION_CSS = `
  :host { display: block; position: relative; border-top: 3px solid transparent; }
  /* The stripe overlays the host's (transparent, layout-keeping) top border:
     height 0 + an own 3px border-top, so the border-image raster box is
     exactly W×3 — identical geometry to the .caution-stripe::before it
     replaced. Opacity comes from the view-timeline animation below, or from
     the JS fallback's inline style where timelines are unsupported. */
  .stripe {
    position: absolute;
    top: -3px; left: 0; right: 0;
    height: 0;
    border-top: 3px solid transparent;
    border-image: repeating-linear-gradient(45deg, var(--accent, #ffae00) 0 6px, transparent 6px 12px) 3;
    pointer-events: none;
  }
  /* Same query the JS gates on — exactly one mechanism ever drives opacity. */
  @supports (animation-timeline: view()) {
    .stripe {
      animation-name: scratch-caution-dim;
      animation-duration: auto;              /* progress-based, not time-based */
      animation-timing-function: linear;     /* linear segments = the formula */
      animation-fill-mode: both;
      animation-timeline: view(block);       /* longhand AFTER the others — the
                                                animation shorthand resets it */
    }
  }
  /* max(0.7, 1 − 0.45·d/vh) expressed over the stripe's cover progress
     p = (vh − y)/vh: enter bottom 0.70 → read line (y = vh/3) 1 → top 0.85. */
  @keyframes scratch-caution-dim {
    0%      { opacity: 0.7; }
    66.667% { opacity: 1; }
    100%    { opacity: 0.85; }
  }
`;
const SCRATCH_CAUTION_SHEET = new CSSStyleSheet();
SCRATCH_CAUTION_SHEET.replaceSync(SCRATCH_CAUTION_CSS);

/* Same feature test as the stylesheet's @supports gate: where the engine runs
   the view-timeline animation, the JS updater must never run (its inline
   writes would be dead weight — animations outrank inline styles anyway). */
const SCRATCH_CAUTION_VIEW_TIMELINE = CSS.supports('animation-timeline', 'view()');

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
    if (SCRATCH_CAUTION_VIEW_TIMELINE) return;   // CSS timeline drives it — no JS
    document.addEventListener('scroll', this._schedule, { capture: true, passive: true });
    window.addEventListener('resize', this._schedule, { passive: true });
    this._update();   // initial placement before first paint — no intensity flash
  }
  disconnectedCallback() {
    if (SCRATCH_CAUTION_VIEW_TIMELINE) return;   // nothing was attached
    document.removeEventListener('scroll', this._schedule, { capture: true });
    window.removeEventListener('resize', this._schedule);
  }
}
customElements.define('scratch-caution', ScratchCaution);
