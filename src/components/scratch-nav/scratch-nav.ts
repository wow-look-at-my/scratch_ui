/* <scratch-nav> + <scratch-nav-item> — vertical navigation.
 *
 * One sealed implementation for BOTH the overlay product nav and this guide's
 * own left rail. Items are auto-numbered (decimal-leading-zero); each carries
 * the connected left-edge indicator (half-strength --text-bright idle → full
 * on hover → accent when active). The yellow active-item background is a
 * single strip in the container that glides (translateY + height, --dur-slow)
 * from the previous selection to the new one — snapping without a slide on
 * first paint, resize, and item-set rebuilds, and honoring
 * prefers-reduced-motion.
 *
 *   <scratch-nav label="Scratch">                  ← header "// Scratch" + ×
 *     <scratch-nav-item label="Location History Map"
 *                       desc="Real-time GPS position"></scratch-nav-item>
 *     <scratch-nav-item label="Microphone Diagnostics" active
 *                       desc="Audio visualization"></scratch-nav-item>
 *   </scratch-nav>
 *
 * Omit `desc` → the shorter single-line button (the rail style):
 *   <scratch-nav>
 *     <scratch-nav-item href="#color" label="Color"></scratch-nav-item>
 *   </scratch-nav>
 *
 * Attributes:
 *   <scratch-nav> label   optional header title (rendered "// label" + close)
 *                 boxed   border + surface + dot-grid wrapper (overlay use)
 *   <scratch-nav-item> label  (required)  desc (optional)  href (optional link)
 *                      active                number (auto unless set)
 * Clicking a non-link item makes it active (siblings cleared) and fires
 * `nav-select` (detail: { index, label }). Link items leave active to you
 * (e.g. scroll-spy toggles the `active` attribute).
 */

import { escapeHtml } from '../../lib/escape-html.ts';
import SCRATCH_NAV_ITEM_CSS from './scratch-nav-item.css';
import SCRATCH_NAV_CSS from './scratch-nav.css';

/* ---- item ----------------------------------------------------------- */
const SCRATCH_NAV_ITEM_SHEET = new CSSStyleSheet();
SCRATCH_NAV_ITEM_SHEET.replaceSync(SCRATCH_NAV_ITEM_CSS);

class ScratchNavItem extends HTMLElement {
  static get observedAttributes() { return ['label', 'desc', 'href', 'number']; }
  private _root: ShadowRoot;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SCRATCH_NAV_ITEM_SHEET];
  }
  connectedCallback() { this._render(); }
  attributeChangedCallback() { if (this._root.childElementCount) this._render(); }
  private _render() {
    const esc = escapeHtml;
    const href = this.getAttribute('href');
    const tag = href ? 'a' : 'div';
    const num = this.getAttribute('number') || '';
    this._root.innerHTML =
      `<${tag} class="item" part="item"${href ? ` href="${esc(href)}"` : ' role="button" tabindex="0"'}>` +
        `<span class="row"><span class="num">${esc(num)}</span><span class="name">${esc(this.getAttribute('label') || '')}</span></span>` +
        `<span class="desc">${esc(this.getAttribute('desc') || '')}</span>` +
      `</${tag}>`;
  }
  setIndex(n: number) {
    this.setAttribute('number', String(n).padStart(2, '0'));
  }
}
customElements.define('scratch-nav-item', ScratchNavItem);

/* ---- container ------------------------------------------------------ */
const SCRATCH_NAV_SHEET = new CSSStyleSheet();
SCRATCH_NAV_SHEET.replaceSync(SCRATCH_NAV_CSS);

class ScratchNav extends HTMLElement {
  static get observedAttributes() { return ['label']; }
  private _root: ShadowRoot;
  private _head: HTMLElement;
  private _title: HTMLElement;
  private _indicator: HTMLElement;
  private _indicatorOn = false;
  private _mo: MutationObserver;
  private _ro: ResizeObserver;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SCRATCH_NAV_SHEET];
    this._root.innerHTML =
      `<div class="head"><span class="title"></span><button class="close" aria-label="Close">×</button></div>` +
      `<div class="list"><div class="indicator"></div><slot></slot></div>`;
    this._head = this._root.querySelector('.head') as HTMLElement;
    this._title = this._root.querySelector('.title') as HTMLElement;
    this._indicator = this._root.querySelector('.indicator') as HTMLElement;
    (this._root.querySelector('.close') as HTMLElement).addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('nav-close', { bubbles: true })));
    this.addEventListener('click', (e) => {
      const item = (e.target as Element | null)?.closest('scratch-nav-item');
      if (!item || item.hasAttribute('href')) return;   // links manage their own active
      this._activate(item as ScratchNavItem);
    });
    /* [active] moves via _activate here, but also from outside (the guide's
       scroll-spy toggles it on link items) — follow both. A childList change
       means the item set rebuilt: snap instead of slide. */
    this._mo = new MutationObserver((muts) =>
      this._position(muts.some((m) => m.type === 'childList')));
    /* Re-measure when layout shifts under us (viewport resize, font swap). */
    this._ro = new ResizeObserver(() => this._position(true));
  }
  connectedCallback() {
    this._mo.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['active'] });
    this._ro.observe(this);
    queueMicrotask(() => this._build());
  }
  disconnectedCallback() { this._mo.disconnect(); this._ro.disconnect(); }
  attributeChangedCallback() { this._build(); }
  private get _items() { return Array.from(this.querySelectorAll<ScratchNavItem>(':scope > scratch-nav-item')); }
  private _build() {
    const label = this.getAttribute('label');
    this._head.classList.toggle('show', label != null);
    this._title.textContent = label || '';
    // 00-based, matching the design language's decimal-leading-zero counter
    // (the "Index prefix" type specimen and the card demos both start at 00).
    this._items.forEach((item, i) => item.setIndex(i));
    this._position(true);
  }
  /* Place the sliding highlight behind the active item. `snap` skips the
     glide (first paint, resizes, rebuilds); appearing from hidden never
     slides in from a stale position. */
  private _position(snap = false) {
    const ind = this._indicator;
    const active = this._items.find((n) => n.hasAttribute('active'));
    if (!active) {
      ind.style.opacity = '0';
      this._indicatorOn = false;
      return;
    }
    if (!this._indicatorOn) snap = true;
    if (snap) ind.classList.remove('slide');
    ind.style.opacity = '1';
    ind.style.transform = `translateY(${active.offsetTop}px)`;
    ind.style.height = `${active.offsetHeight}px`;
    this._indicatorOn = true;
    if (snap) {
      // enable the glide only after this position has been committed
      requestAnimationFrame(() => requestAnimationFrame(() =>
        ind.classList.add('slide')));
    }
  }
  private _activate(item: ScratchNavItem) {
    const items = this._items;
    items.forEach(n => n.removeAttribute('active'));
    item.setAttribute('active', '');
    this.dispatchEvent(new CustomEvent('nav-select', {
      bubbles: true,
      detail: { index: items.indexOf(item), label: item.getAttribute('label') }
    }));
  }
}
customElements.define('scratch-nav', ScratchNav);
