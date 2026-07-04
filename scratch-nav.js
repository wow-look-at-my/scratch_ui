/* <scratch-nav> + <scratch-nav-item> — vertical navigation.
 *
 * One sealed implementation for BOTH the overlay product nav and this guide's
 * own left rail. Items are auto-numbered (decimal-leading-zero); each carries
 * the connected left-edge indicator (half-strength --text-bright idle → full
 * on hover → accent when active).
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

  :host([active]) .item { background: var(--accent-glow, rgba(255,174,0,0.12)); }
  :host([active]) .name { color: var(--accent, #ffae00); }
  :host([active]) .num { color: var(--accent, #ffae00); }
  :host([active]) .item::before { width: 2px; background: var(--accent, #ffae00); }
  .item:focus-visible { outline: 2px solid var(--accent, #ffae00); outline-offset: -2px; box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }
`;
const SCRATCH_NAV_ITEM_SHEET = new CSSStyleSheet();
SCRATCH_NAV_ITEM_SHEET.replaceSync(SCRATCH_NAV_ITEM_CSS);

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
    const href = this.getAttribute('href');
    const tag = href ? 'a' : 'div';
    const num = this.getAttribute('number') || '';
    this.shadowRoot.innerHTML =
      `<${tag} class="item" part="item"${href ? ` href="${href}"` : ' role="button" tabindex="0"'}>` +
        `<span class="row"><span class="num">${num}</span><span class="name">${this.getAttribute('label') || ''}</span></span>` +
        `<span class="desc">${this.getAttribute('desc') || ''}</span>` +
      `</${tag}>`;
  }
  setIndex(n) {
    this.setAttribute('number', String(n).padStart(2, '0'));
  }
}
customElements.define('scratch-nav-item', ScratchNavItem);

/* ---- container ------------------------------------------------------ */
const SCRATCH_NAV_CSS = `
  :host { display: block; }
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
      `<div class="list"><slot></slot></div>`;
    this._head = this.shadowRoot.querySelector('.head');
    this._title = this.shadowRoot.querySelector('.title');
    this.shadowRoot.querySelector('.close').addEventListener('click', () =>
      this.dispatchEvent(new CustomEvent('nav-close', { bubbles: true })));
    this.addEventListener('click', (e) => {
      const item = e.target.closest('scratch-nav-item');
      if (!item || item.hasAttribute('href')) return;   // links manage their own active
      this._activate(item);
    });
  }
  connectedCallback() { queueMicrotask(() => this._build()); }
  attributeChangedCallback() { this._build(); }
  get _items() { return Array.from(this.querySelectorAll(':scope > scratch-nav-item')); }
  _build() {
    const label = this.getAttribute('label');
    this._head.classList.toggle('show', label != null);
    this._title.textContent = label || '';
    this._items.forEach((item, i) => item.setIndex(i + 1));
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
