/* scratch-reveal.js — proximity edge-light for the bordered controls.
 *
 * A cursor near a control brightens its 1px border, brightest at the point on
 * the edge closest to the pointer, fading to nothing at 120px. Fluent's
 * "reveal" highlight in the system's own palette: the boxes stop being flat
 * outlines and read as lit surfaces the cursor sweeps across.
 *
 *   <script src="scratch-reveal.js" defer></script>
 *
 * Optional, like scratch-ring.js — without this file every control renders
 * exactly as it did before. There is nothing to call: the module finds the
 * controls itself (light DOM and open shadow roots) and adopts one shared
 * stylesheet into each, so no component carries a copy of the effect.
 *
 * MOUSE ONLY. A finger has no hover position, so a tap would light an edge
 * with no cursor on screen to explain it. Two independent gates:
 *   - the CSS sits behind `@media (hover: hover) and (pointer: fine)`, so on a
 *     phone or tablet the ring never renders at all;
 *   - the tracker ignores any event whose `pointerType` isn't `mouse`, which
 *     is what covers a hybrid laptop — the media query passes there, and a
 *     touch still lights nothing and douses anything the mouse left lit.
 *
 * Escape hatch for controls this can't see (a closed shadow root, or a host
 * built after its subtree was scanned):
 *   ScratchReveal.track(el) / ScratchReveal.untrack(el) / ScratchReveal.scan(root)
 */

/* How close the cursor comes before an edge lights, and how bright the ring
   gets directly under it. RADIUS is baked into the gradient below rather than
   exposed as a token: the JS falloff and the gradient have to agree, and two
   knobs that must match are one knob. */
const SCRATCH_REVEAL_RADIUS = 120;
const SCRATCH_REVEAL_PEAK = 0.55;

const SCRATCH_REVEAL_CSS = `
@media (hover: hover) and (pointer: fine) {
  :host(:not(scratch-toggle)) { position: relative; }

  /* The lit edge: a full-box layer with a 1px-inset layer masked out of it,
     leaving a ring that traces the control's existing border instead of adding
     a second one. No transition — --rv-o is recomputed every frame from the
     cursor distance, so the tracking IS the fade.

     The inset layer is sized by mask-position/mask-size, NOT by padding or
     border. A host's ::before lives in the LIGHT tree, so a consuming page's
     reset (*, *::before { padding: 0 } — this repo's own demo has one) beats
     the :host rule here: outer-tree declarations win over shadow-tree ones.
     A padding-defined ring silently collapses to nothing under any such reset;
     nothing in a reset touches mask. The ring is square-cornered, which is
     exact at the system's --r-md of 0. */
  :host(:not(scratch-toggle))::before,
  :host(scratch-toggle) .box::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    border-radius: var(--r-md, 0);
    opacity: var(--rv-o, 0);
    pointer-events: none;
    --rv-tint: color-mix(in srgb, var(--text-bright, #e8ecf4) 85%, transparent);
    -webkit-mask: linear-gradient(#000 0 0) 1px 1px / calc(100% - 2px) calc(100% - 2px) no-repeat,
                  linear-gradient(#000 0 0) 0 0 / 100% 100% no-repeat;
            mask: linear-gradient(#000 0 0) 1px 1px / calc(100% - 2px) calc(100% - 2px) no-repeat,
                  linear-gradient(#000 0 0) 0 0 / 100% 100% no-repeat;
    -webkit-mask-composite: xor;
            mask-composite: exclude;
  }

  /* Positional light: the gradient centre follows the cursor — and sits
     OUTSIDE the box while the cursor is merely near it, which is what makes
     only the nearest stretch of edge brighten. */
  :host(:not(scratch-toggle))::before {
    background: radial-gradient(circle ${SCRATCH_REVEAL_RADIUS}px at var(--rv-x, 50%) var(--rv-y, 50%),
                var(--rv-tint), transparent 100%);
  }

  /* The toggle's box is 14px across — an order of magnitude under the falloff,
     so a gradient inside it would read as flat. Light its ring uniformly and
     let --rv-o alone carry the proximity. */
  :host(scratch-toggle) .box::before { background: var(--rv-tint); }
}
`;

const SCRATCH_REVEAL_SHEET = new CSSStyleSheet();
SCRATCH_REVEAL_SHEET.replaceSync(SCRATCH_REVEAL_CSS);

const ScratchReveal = (() => {
  /* Bordered AND interactive — both conditions, or the glow means nothing.
     scratch-card is in: it wears the registration corner-marks the spec page
     defines as the cue for an interactive surface, and it bursts a click ring.
     Out: messages and previews (bordered, inert), tabs and nav items
     (interactive, borderless). */
  const SELECTOR = 'scratch-button, scratch-card, scratch-field, scratch-select, scratch-toggle';

  const tracked = new Set();   // adopted the sheet, observed for visibility
  const onscreen = new Set();  // subset worth measuring this frame
  const lit = new Set();       // subset currently carrying --rv-* properties

  /* Elements just off-screen still light as the cursor approaches the edge of
     the viewport, so the margin matches the reveal distance. */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) onscreen.add(e.target);
      else { onscreen.delete(e.target); douse(e.target); }
    }
    schedule();
  }, { rootMargin: `${SCRATCH_REVEAL_RADIUS}px` });

  /* A disabled control wears the dashed border — it is not a target, and
     lighting it would advertise otherwise. The link and ghost button tiers are
     deliberately borderless. */
  function revealable(el) {
    if (el.hasAttribute('disabled')) return false;
    const v = el.getAttribute('variant');
    return v !== 'link' && v !== 'ghost';
  }

  function track(el) {
    if (tracked.has(el)) return;
    const sr = el.shadowRoot;
    if (!sr) return;
    if (!sr.adoptedStyleSheets.includes(SCRATCH_REVEAL_SHEET)) {
      sr.adoptedStyleSheets = [...sr.adoptedStyleSheets, SCRATCH_REVEAL_SHEET];
    }
    tracked.add(el);
    io.observe(el);
  }

  function untrack(el) {
    if (!tracked.delete(el)) return;
    io.unobserve(el);
    onscreen.delete(el);
    douse(el);
  }

  function douse(el) {
    if (!lit.delete(el)) return;
    el.style.removeProperty('--rv-o');
    el.style.removeProperty('--rv-x');
    el.style.removeProperty('--rv-y');
  }

  function extinguish() { for (const el of [...lit]) douse(el); }

  /* Walks light DOM and open shadow roots alike, because scratch-composer
     builds its field and button inside its own shadow root — a document-only
     query would light the standalone controls and miss those two. An element
     whose definition hasn't loaded yet has no shadow root to descend into, so
     it gets revisited once the definition lands. */
  function visit(el) {
    if (el.matches(SELECTOR)) track(el);
    if (el.shadowRoot) descend(el.shadowRoot);
    else if (el.localName.includes('-') && !customElements.get(el.localName)) {
      customElements.whenDefined(el.localName)
        .then(() => { if (el.isConnected) visit(el); });
    }
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.nodeType === Node.ELEMENT_NODE) visit(root);
    for (const el of root.querySelectorAll('*')) visit(el);
  }

  const observed = new WeakSet();
  function descend(shadowRoot) {
    if (!observed.has(shadowRoot)) {
      observed.add(shadowRoot);
      mo.observe(shadowRoot, { childList: true, subtree: true });
    }
    scan(shadowRoot);
  }

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) scan(n);
      for (const n of r.removedNodes) {
        if (n.nodeType !== Node.ELEMENT_NODE) continue;
        if (n.matches(SELECTOR)) untrack(n);
        for (const el of n.querySelectorAll(SELECTOR)) untrack(el);
      }
    }
  });

  let px = 0, py = 0, queued = false, tracking = false;

  function schedule() {
    if (queued || !tracking) return;
    queued = true;
    requestAnimationFrame(update);
  }

  function update() {
    queued = false;
    if (!tracking) return;
    /* Measure everything first, write everything after: interleaving
       getBoundingClientRect with style writes would force a layout per
       control instead of one for the frame. */
    const els = [], rects = [];
    for (const el of onscreen) {
      if (!el.isConnected) { untrack(el); continue; }
      if (!revealable(el)) { douse(el); continue; }
      els.push(el);
      rects.push(el.getBoundingClientRect());
    }
    for (let i = 0; i < els.length; i++) {
      const el = els[i], r = rects[i];
      // distance from the cursor to the box — zero anywhere inside it
      const dx = Math.max(r.left - px, 0, px - r.right);
      const dy = Math.max(r.top - py, 0, py - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d >= SCRATCH_REVEAL_RADIUS) { douse(el); continue; }
      const t = 1 - d / SCRATCH_REVEAL_RADIUS;
      el.style.setProperty('--rv-o', (SCRATCH_REVEAL_PEAK * t * t).toFixed(3));
      el.style.setProperty('--rv-x', `${(px - r.left).toFixed(1)}px`);
      el.style.setProperty('--rv-y', `${(py - r.top).toFixed(1)}px`);
      lit.add(el);
    }
  }

  function onMove(e) {
    if (e.pointerType !== 'mouse') { stop(); return; }
    px = e.clientX;
    py = e.clientY;
    tracking = true;
    schedule();
  }

  function stop() {
    tracking = false;
    extinguish();
  }

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') stop(); }, { passive: true });
  addEventListener('blur', stop);
  document.addEventListener('pointerleave', stop, { passive: true });
  // the cursor can sit still while the boxes move out from under it
  addEventListener('scroll', schedule, { passive: true, capture: true });
  addEventListener('resize', schedule, { passive: true });

  const start = () => {
    mo.observe(document.documentElement, { childList: true, subtree: true });
    scan(document);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  return { track, untrack, scan };
})();

window.ScratchReveal = ScratchReveal;
