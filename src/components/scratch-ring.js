/* <scratch-ring> — the click "shockwave".
 *
 * A transient, self-animating, self-removing element: a 1px accent ring that
 * starts at a target's border box, expands ~10px outward, and fades. It's the
 * single source for the click feedback on every corner-marked surface
 * (buttons + cards), so the effect can't drift between implementations.
 *
 * Usage — you rarely create the tag by hand; call the static helper:
 *   ScratchRing.burst(targetEl);           // ring over targetEl's rect
 *
 * <scratch-button> and <scratch-card> call ScratchRing.burst(this) from their
 * own click handlers when window.ScratchRing exists.
 */
const SCRATCH_RING_CSS = `
  :host {
    position: fixed;
    box-sizing: border-box;
    border: 1px solid var(--accent, #ffae00);
    border-radius: var(--r-md, 0);
    pointer-events: none;
    z-index: 90;
    opacity: 0;
  }
`;
const SCRATCH_RING_SHEET = new CSSStyleSheet();
SCRATCH_RING_SHEET.replaceSync(SCRATCH_RING_CSS);

class ScratchRing extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_RING_SHEET];
  }
  connectedCallback() {
    const r = this._rect;
    if (!r) { this.remove(); return; }
    if (this._color) this.style.borderColor = this._color;
    const o = this._opacity == null ? 1 : this._opacity;
    const a = this.animate(
      [
        { left: `${r.left}px`,      top: `${r.top}px`,      width: `${r.width}px`,      height: `${r.height}px`,      opacity: o,        offset: 0 },
        { left: `${r.left - 5}px`,  top: `${r.top - 5}px`,  width: `${r.width + 10}px`, height: `${r.height + 10}px`, opacity: o * 0.85, offset: 0.45 },
        { left: `${r.left - 10}px`, top: `${r.top - 10}px`, width: `${r.width + 20}px`, height: `${r.height + 20}px`, opacity: 0,        offset: 1 }
      ],
      { duration: 480, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
    a.onfinish = a.oncancel = () => this.remove();
  }

  /* Spawn a ring over an element's current bounding box.
     opts: { color, opacity } — default opacity tracks how vivid the surface is
     (colored buttons burst at full strength, neutral surfaces softer). */
  static burst(target, opts = {}) {
    if (!target || !target.getBoundingClientRect) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ring = document.createElement('scratch-ring');
    ring._rect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    ring._color = opts.color || null;
    ring._opacity = opts.opacity == null ? 0.45 : opts.opacity;
    ring.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
    document.body.appendChild(ring);
  }
}
customElements.define('scratch-ring', ScratchRing);
window.ScratchRing = ScratchRing;
