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

/* ---- item ----------------------------------------------------------- */
const SCRATCH_NAV_ITEM_CSS = `
  :host { display: block; }
  .item {
    position: relative;
    display: block;
    padding: 11px 16px;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: background-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), box-shadow 250ms var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  /* shorter when there's no description (rail style) */
  :host(:not([desc])) .item { padding: var(--sp-2, 8px) var(--sp-3, 12px); }

  .row { display: flex; align-items: baseline; gap: 6px; }
  .num {
    color: var(--text-disabled, #565b69);
    font-size: var(--fs-tiny, 11px);
    font-variant-numeric: tabular-nums;
  }
  .name {
    font-size: 13px; font-weight: 500;
    color: var(--text, #c8cdd8);
    transition: color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  :host(:not([desc])) .name { font-size: var(--fs-small, 12px); font-weight: 400; color: var(--text-muted, #6b7280); }
  .desc {
    display: block;
    font-size: 11px; color: var(--text-muted, #6b7280);
    margin-top: 3px;
  }
  .desc:empty { display: none; }

  /* connected left-edge indicator */
  .item::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0;
    width: 1px;
    background: color-mix(in srgb, var(--text-bright, #e8ecf4) 50%, transparent);
    transition: width var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), background-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  .item:hover { background: var(--bg-surface, #12151c); }
  .item:hover .name { color: var(--text-bright, #e8ecf4); }
  .item:hover::before { width: 2px; background: var(--text-bright, #e8ecf4); }

  /* The active background is painted by the nav container's sliding
     .indicator so it can glide between selections. Transparent — not unset —
     so the hover surface never covers the indicator on the active item. */
  :host([active]) .item { background: transparent; }
  :host([active]) .name { color: var(--accent, #ffae00); }
  :host([active]) .num { color: var(--accent, #ffae00); }
  :host([active]) .item::before { width: 2px; background: var(--accent, #ffae00); }
  .item:focus-visible { outline: 2px solid var(--accent, #ffae00); outline-offset: -2px; box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }
`;
const SCRATCH_NAV_ITEM_SHEET = new CSSStyleSheet();
SCRATCH_NAV_ITEM_SHEET.replaceSync(SCRATCH_NAV_ITEM_CSS);

/* Escape attribute values before interpolating them into shadow innerHTML. */
const SCRATCH_NAV_ESC = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class ScratchNavItem extends HTMLElement {
  static get observedAttributes() { return ['label', 'desc', 'href', 'number']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_NAV_ITEM_SHEET];
  }
  connectedCallback() { this._render(); }
  attributeChangedCallback() { if (this.shadowRoot.childElementCount) this._render(); }
  _render() {
    const esc = SCRATCH_NAV_ESC;
    const href = this.getAttribute('href');
    const tag = href ? 'a' : 'div';
    const num = this.getAttribute('number') || '';
    this.shadowRoot.innerHTML =
      `<${tag} class="item" part="item"${href ? ` href="${esc(href)}"` : ' role="button" tabindex="0"'}>` +
        `<span class="row"><span class="num">${esc(num)}</span><span class="name">${esc(this.getAttribute('label') || '')}</span></span>` +
        `<span class="desc">${esc(this.getAttribute('desc') || '')}</span>` +
      `</${tag}>`;
  }
  setIndex(n) {
    this.setAttribute('number', String(n).padStart(2, '0'));
  }
}
customElements.define('scratch-nav-item', ScratchNavItem);

/* ---- container ------------------------------------------------------ */
const SCRATCH_NAV_CSS = `
  :host { display: block; position: relative; }
  :host([boxed]) {
    background: var(--bg-deep, #08090c);
    border: 1px solid var(--border, #2a2e3a);
    border-radius: var(--r-md, 0);
    overflow: hidden;
    background-image:
      var(--scanline, none),
      radial-gradient(circle, var(--grid-dot, rgba(200,205,216,0.08)) 1px, transparent 1px);
    background-size: auto, var(--grid-size, 24px) var(--grid-size, 24px);
    background-attachment: fixed, fixed;
  }
  .head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 16px 14px;
    border-bottom: 1px solid var(--border-dashed, #333844);
  }
  .head:not(.show) { display: none; }
  .title {
    font-family: var(--font-display, "Space Grotesk", sans-serif);
    font-size: 15px; font-weight: 600; color: var(--text-bright, #e8ecf4);
  }
  .title::before { content: '// '; color: var(--text-muted, #6b7280); font-weight: 400; }
  .close {
    background: none; border: none; cursor: pointer;
    color: var(--text-muted, #6b7280); font-size: 18px; line-height: 1;
  }
  .close:hover { color: var(--text-bright, #e8ecf4); }
  .list { padding: 8px 0; }
  :host([flush]) .list { padding: 0; }

  /* Sliding active-item highlight: one absolutely-positioned strip behind the
     slotted items (their .item is position:relative, so it paints above),
     moved with translateY + height so a selection change glides instead of
     jumping. Positioned against the host (offsetTop space of the items). */
  .indicator {
    position: absolute; left: 0; right: 0; top: 0;
    height: 0;
    background: var(--accent-glow, rgba(255,174,0,0.12));
    opacity: 0;
    pointer-events: none;
  }
  .indicator.slide {
    transition: transform var(--dur-slow, 0.19s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)),
                height var(--dur-slow, 0.19s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  @media (prefers-reduced-motion: reduce) {
    .indicator.slide { transition: none; }
  }
`;
const SCRATCH_NAV_SHEET = new CSSStyleSheet();
SCRATCH_NAV_SHEET.replaceSync(SCRATCH_NAV_CSS);

class ScratchNav extends HTMLElement {
  static get observedAttributes() { return ['label']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_NAV_SHEET];
    this.shadowRoot.innerHTML =
      `<div class="head"><span class="title"></span><button class="close" aria-label="Close">×</button></div>` +
      `<div class="list"><div class="indicator"></div><slot></slot></div>`;
    this._head = this.shadowRoot.querySelector('.head');
    this._title = this.shadowRoot.querySelector('.title');
    this._indicator = this.shadowRoot.querySelector('.indicator');
    this.shadowRoot.querySelector('.close').addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('nav-close', { bubbles: true })));
    this.addEventListener('click', (e) => {
      const item = e.target.closest('scratch-nav-item');
      if (!item || item.hasAttribute('href')) return;   // links manage their own active
      this._activate(item);
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
  get _items() { return Array.from(this.querySelectorAll(':scope > scratch-nav-item')); }
  _build() {
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
  _position(snap = false) {
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
  _activate(item) {
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
