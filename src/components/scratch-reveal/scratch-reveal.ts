/* scratch-reveal — proximity edge-light for the bordered controls.
 *
 * A cursor near a control brightens its 1px border, brightest at the point on
 * the edge closest to the pointer, fading to nothing at 512px. Fluent's
 * "reveal" highlight in the system's own palette: the boxes stop being flat
 * outlines and read as lit surfaces the cursor sweeps across.
 *
 *   <script src="scratch-reveal.js" defer></script>
 *
 * Defines no element. Optional, like scratch-ring — without this file every
 * control renders exactly as it did before. There is nothing to call: the
 * module finds the controls itself (light DOM and open shadow roots) and
 * adopts one shared stylesheet into each, so no component carries a copy of
 * the effect and none of them import this one.
 *
 * MOUSE ONLY. A finger has no hover position, so a tap would light an edge
 * with no cursor on screen to explain it. Two independent gates:
 *   - the CSS sits behind `@media (hover: hover) and (pointer: fine)`, so on a
 *     phone or tablet the ring never renders at all;
 *   - the tracker ignores any event whose `pointerType` isn't `mouse`, which
 *     is what covers a hybrid laptop — the media query passes there, and a
 *     touch still lights nothing and douses anything the mouse left lit.
 *
 * REDUCED MOTION gets nothing either: a light that chases the cursor is
 * motion. Gated the same two ways — the ring is never generated, and the
 * tracker stops (live, so switching the preference on goes dark immediately).
 *
 * Escape hatch for controls this can't see (a closed shadow root, or a host
 * built after its subtree was scanned):
 *   ScratchReveal.track(el) / ScratchReveal.untrack(el) / ScratchReveal.scan(root)
 */

/* How close the cursor comes before an edge lights, and how bright the ring
   gets directly under it. RADIUS is published to the CSS as --rv-r rather than
   written there too: the JS falloff and the gradient have to agree, and two
   knobs that must match are one knob. PEAK scales the whole effect (--rv-o is
   PEAK * t^2, and the tint is the only other term). */
import { SHEET } from '../../styles.ts';

const SCRATCH_REVEAL_RADIUS = 512;
const SCRATCH_REVEAL_PEAK = 0.275;

const ScratchReveal = (() => {
  /* Bordered AND interactive — both conditions, or the glow means nothing.
     scratch-card is in: it wears the registration corner-marks the spec page
     defines as the cue for an interactive surface, and it bursts a click ring.
     Out: messages and previews (bordered, inert), tabs and nav items
     (interactive, borderless). */
  const SELECTOR = 'scratch-button, scratch-card, scratch-field, scratch-select, scratch-toggle';
  const RADIUS_PX = `${SCRATCH_REVEAL_RADIUS}px`;

  const tracked = new Set<HTMLElement>();   // adopted the sheet, observed for visibility
  const onscreen = new Set<HTMLElement>();  // subset worth measuring this frame
  const lit = new Set<HTMLElement>();       // subset currently carrying --rv-* properties

  /* Elements just off-screen still light as the cursor approaches the edge of
     the viewport, so the margin matches the reveal distance. */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      if (e.isIntersecting) onscreen.add(el);
      else { onscreen.delete(el); douse(el); }
    }
    schedule();
  }, { rootMargin: RADIUS_PX });

  /* A disabled control wears the dashed border — it is not a target, and
     lighting it would advertise otherwise. The link and ghost button tiers are
     deliberately borderless. */
  function revealable(el: HTMLElement): boolean {
    if (el.hasAttribute('disabled')) return false;
    const v = el.getAttribute('variant');
    return v !== 'link' && v !== 'ghost';
  }

  function track(el: HTMLElement): void {
    if (tracked.has(el)) return;
    // No sheet to adopt: every component adopts the one shared stylesheet in
    // its own constructor, and the reveal rules live in it. This only has to
    // start WATCHING the element -- the ring is drawn by the --rv-* custom
    // properties written in the pointer loop below.
    if (!el.shadowRoot) return;
    tracked.add(el);
    io.observe(el);
  }

  function untrack(el: HTMLElement): void {
    if (!tracked.delete(el)) return;
    io.unobserve(el);
    onscreen.delete(el);
    douse(el);
  }

  function douse(el: HTMLElement): void {
    if (!lit.delete(el)) return;
    el.style.removeProperty('--rv-o');
    el.style.removeProperty('--rv-x');
    el.style.removeProperty('--rv-y');
    el.style.removeProperty('--rv-r');
  }

  function extinguish(): void { for (const el of [...lit]) douse(el); }

  /* Walks light DOM and open shadow roots alike, because scratch-composer
     builds its field and button inside its own shadow root — a document-only
     query would light the standalone controls and miss those two. An element
     whose definition hasn't loaded yet has no shadow root to descend into, so
     it gets revisited once the definition lands. */
  function visit(el: Element): void {
    if (el.matches(SELECTOR)) track(el as HTMLElement);
    if (el.shadowRoot) descend(el.shadowRoot);
    else if (el.localName.includes('-') && !customElements.get(el.localName)) {
      customElements.whenDefined(el.localName)
        .then(() => { if (el.isConnected) visit(el); });
    }
  }

  function scan(root: Document | ShadowRoot | Element | null): void {
    if (!root || !('querySelectorAll' in root)) return;
    if (root.nodeType === Node.ELEMENT_NODE) visit(root as Element);
    for (const el of root.querySelectorAll('*')) visit(el);
  }

  const observed = new WeakSet<ShadowRoot>();
  function descend(shadowRoot: ShadowRoot): void {
    if (!observed.has(shadowRoot)) {
      observed.add(shadowRoot);
      mo.observe(shadowRoot, { childList: true, subtree: true });
    }
    scan(shadowRoot);
  }

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) if (n.nodeType === Node.ELEMENT_NODE) scan(n as Element);
      for (const n of r.removedNodes) {
        if (n.nodeType !== Node.ELEMENT_NODE) continue;
        const el = n as Element;
        if (el.matches(SELECTOR)) untrack(el as HTMLElement);
        for (const inner of el.querySelectorAll(SELECTOR)) untrack(inner as HTMLElement);
      }
    }
  });

  /* Live, not read once: someone can turn reduced-motion on mid-session, and
     anything already lit has to go dark then rather than at the next redraw. */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) stop(); });

  let px = 0, py = 0, queued = false, tracking = false;

  function schedule(): void {
    if (queued || !tracking) return;
    queued = true;
    requestAnimationFrame(update);
  }

  function update(): void {
    queued = false;
    if (!tracking) return;
    /* Measure everything first, write everything after: interleaving
       getBoundingClientRect with style writes would force a layout per
       control instead of one for the frame. */
    const els: HTMLElement[] = [], rects: DOMRect[] = [];
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
      el.style.setProperty('--rv-r', RADIUS_PX);
      lit.add(el);
    }
  }

  function onMove(e: PointerEvent): void {
    if (e.pointerType !== 'mouse' || reduceMotion.matches) { stop(); return; }
    px = e.clientX;
    py = e.clientY;
    tracking = true;
    schedule();
  }

  function stop(): void {
    tracking = false;
    extinguish();
  }

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', (e: PointerEvent) => { if (e.pointerType !== 'mouse') stop(); }, { passive: true });
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

declare global {
  interface Window {
    /* Optional on purpose: a page that never loads this module has no reveal,
       and every control renders exactly as it would without it. */
    ScratchReveal?: typeof ScratchReveal;
  }
}
