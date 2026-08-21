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
import { SHEET } from '../../styles.ts';

class ScratchTab extends HTMLElement {
  static get observedAttributes() { return ['label']; }
  attributeChangedCallback() {
    this.dispatchEvent(new CustomEvent('tab-relabel', { bubbles: true }));
  }
}
customElements.define('scratch-tab', ScratchTab);

/* --- container -------------------------------------------------------- */

class ScratchTabs extends HTMLElement {
  private _root: ShadowRoot;
  private _strip: HTMLElement;
  private _active: number;
  private _built = false;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SHEET];
    this._root.innerHTML = `<div class="strip" part="strip" role="tablist"><slot name="lead" class="lead"></slot><span class="tabbtns"></span><slot name="trail" class="trail"></slot></div><div class="panels" part="panels"><slot></slot></div>`;
    this._strip = this._root.querySelector('.tabbtns') as HTMLElement;
    this._active = 0;
    this.addEventListener('tab-relabel', () => this._build());
  }

  connectedCallback() {
    // wait a microtask so slotted children are parsed
    queueMicrotask(() => this._build());
  }

  private get _tabs() { return Array.from(this.querySelectorAll<ScratchTab>(':scope > scratch-tab')); }

  private _build() {
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

  private _reflect() {
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

  select(i: number) {
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
  set activeIndex(i: number) { this.select(i); }
}

customElements.define('scratch-tabs', ScratchTabs);
