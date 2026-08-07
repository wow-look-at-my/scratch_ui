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
import SCRATCH_BADGE_CSS from './scratch-badge.css';

const SCRATCH_BADGE_SHEET = new CSSStyleSheet();
SCRATCH_BADGE_SHEET.replaceSync(SCRATCH_BADGE_CSS);

class ScratchBadge extends HTMLElement {
  static get observedAttributes() { return ['variant', 'live']; }
  private _root: ShadowRoot;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SCRATCH_BADGE_SHEET];
    this._root.innerHTML =
      `<span class="box" part="box"><scratch-led state="accent"></scratch-led><slot></slot></span>`;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  private _sync() {
    const led = this._root.querySelector('scratch-led');
    if (!led) return;
    if (this.hasAttribute('live')) led.setAttribute('live', '');
    else led.removeAttribute('live');
  }
}
customElements.define('scratch-badge', ScratchBadge);
