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
import SCRATCH_CAUTION_CSS from './scratch-caution.css';

const SCRATCH_CAUTION_SHEET = new CSSStyleSheet();
SCRATCH_CAUTION_SHEET.replaceSync(SCRATCH_CAUTION_CSS);

/* Same feature test as the stylesheet's @supports gate: where the engine runs
   the view-timeline animation, the JS updater must never run (its inline
   writes would be dead weight — animations outrank inline styles anyway). */
const SCRATCH_CAUTION_VIEW_TIMELINE = CSS.supports('animation-timeline', 'view()');

class ScratchCaution extends HTMLElement {
  private _root: ShadowRoot;
  private _stripe: HTMLElement;
  private _queued: boolean;
  private _last: number;
  private _schedule: () => void;
  private _update: () => void;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SCRATCH_CAUTION_SHEET];
    this._root.innerHTML = `<div class="stripe" part="stripe"></div><slot></slot>`;
    this._stripe = this._root.firstElementChild as HTMLElement;
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
