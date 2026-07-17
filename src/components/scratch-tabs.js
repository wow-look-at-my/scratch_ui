/* <scratch-tabs> + <scratch-tab> — tab bar with paired label + panel.
 *
 * Each tab's label and its panel content live in ONE element, so they can
 * never desync. The clickable strip (connected-underline indicator) is
 * generated inside the shadow DOM from each child's `label`; the panels are
 * the slotted <scratch-tab> children, only the active one shown.
 *
 *   <scratch-tabs>
 *     <scratch-tab label="Favorites">…</scratch-tab>
 *     <scratch-tab label="Upstreams" selected>…</scratch-tab>
 *     <scratch-tab label="MCP">…</scratch-tab>
 *   </scratch-tabs>
 *
 * Fires `change` (detail: { index, label }) when the active tab changes.
 * Add `strip-only` to render just the bar (no panels) for manual wiring.
 */

/* --- panel child ------------------------------------------------------ */
class ScratchTab extends HTMLElement {
  static get observedAttributes() { return ['label']; }
  attributeChangedCallback() {
    this.dispatchEvent(new CustomEvent('tab-relabel', { bubbles: true }));
  }
}
customElements.define('scratch-tab', ScratchTab);

/* --- container -------------------------------------------------------- */
const SCRATCH_TABS_CSS = `
  :host { display: block; }
  .strip { display: flex; gap: 0; align-items: stretch; border-bottom: 1px solid var(--border, #2a2e3a); }
  .tabbtns { display: flex; }
  .lead { display: flex; align-items: center; }
  .trail { display: flex; align-items: center; margin-left: auto; }
  .tab {
    position: relative;
    background: none; border: none;
    color: var(--text-muted, #6b7280);
    padding: var(--pad-control-y, 8px) var(--pad-control-x, 12px);
    padding-bottom: calc(var(--pad-control-y, 8px) / 2);
    font: inherit;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    font-size: var(--fs-small, 12px);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), box-shadow 250ms var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  .tab::after {
    content: '';
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 1px;
    background: color-mix(in srgb, var(--text-bright, #e8ecf4) 50%, transparent);
    transition: height var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1)), background-color var(--dur, 0.11s) var(--ease-out, cubic-bezier(0.16,1,0.3,1));
  }
  .tab:hover { color: var(--text-bright, #e8ecf4); }
  .tab:hover::after { height: 2px; background: var(--text-bright, #e8ecf4); }
  .tab[aria-selected="true"] { color: var(--accent, #ffae00); }
  .tab[aria-selected="true"]::after { height: 2px; background: var(--accent, #ffae00); }
  .tab:focus-visible { outline: 2px solid var(--accent, #ffae00); outline-offset: -2px; box-shadow: 0 0 18px color-mix(in srgb, var(--accent, #ffae00) 38%, transparent); }

  .panels { padding-top: var(--sp-4, 16px); }
  :host([strip-only]) .panels { display: none; }
`;

const SCRATCH_TABS_SHEET = new CSSStyleSheet();
SCRATCH_TABS_SHEET.replaceSync(SCRATCH_TABS_CSS);

class ScratchTabs extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_TABS_SHEET];
    this.shadowRoot.innerHTML = `<div class="strip" part="strip" role="tablist"><slot name="lead" class="lead"></slot><span class="tabbtns"></span><slot name="trail" class="trail"></slot></div><div class="panels" part="panels"><slot></slot></div>`;
    this._strip = this.shadowRoot.querySelector('.tabbtns');
    this._active = 0;
    this.addEventListener('tab-relabel', () => this._build());
  }

  connectedCallback() {
    // wait a microtask so slotted children are parsed
    queueMicrotask(() => this._build());
  }

  get _tabs() { return Array.from(this.querySelectorAll(':scope > scratch-tab')); }

  _build() {
    const tabs = this._tabs;
    if (!tabs.length) return;
    // honor `selected` attribute on the FIRST build only — later rebuilds
    // (e.g. a `tab-relabel`) must not snap the user back to the default tab
    if (!this._built) {
      this._built = true;
      const sel = tabs.findIndex(t => t.hasAttribute('selected'));
      if (sel >= 0) this._active = sel;
    }
    if (this._active >= tabs.length) this._active = 0;

    this._strip.innerHTML = '';
    tabs.forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.type = 'button';
      btn.role = 'tab';
      btn.textContent = tab.getAttribute('label') || `Tab ${i + 1}`;
      btn.setAttribute('aria-selected', i === this._active ? 'true' : 'false');
      btn.addEventListener('click', () => this.select(i));
      this._strip.appendChild(btn);
    });
    this._reflect();
  }

  _reflect() {
    const tabs = this._tabs;
    const stripOnly = this.hasAttribute('strip-only');
    tabs.forEach((tab, i) => {
      const on = i === this._active;
      tab.hidden = stripOnly ? true : !on;
      tab.setAttribute('role', 'tabpanel');
    });
    Array.from(this._strip.children).forEach((btn, i) => {
      btn.setAttribute('aria-selected', i === this._active ? 'true' : 'false');
    });
  }

  select(i) {
    if (i === this._active) return;
    this._active = i;
    this._reflect();
    const tab = this._tabs[i];
    this.dispatchEvent(new CustomEvent('change', {
      bubbles: true,
      detail: { index: i, label: tab && tab.getAttribute('label') }
    }));
  }

  get activeIndex() { return this._active; }
  set activeIndex(i) { this.select(i); }
}

customElements.define('scratch-tabs', ScratchTabs);
