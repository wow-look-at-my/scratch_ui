/* <scratch-composer> — message input + send, composed from the sealed
 * <scratch-field> and <scratch-button> components.
 *
 *   <scratch-composer placeholder="message …" send="Send"></scratch-composer>
 *
 * Fires `submit` (detail: { value }) on send-click or ⌘/Ctrl+Enter, then
 * clears. Read/scripted value via the `.value` property.
 */
const SCRATCH_COMPOSER_CSS = `
  :host { display: grid; grid-template-columns: 1fr auto; gap: var(--gap-stack, 8px); align-items: stretch; }
  scratch-field { display: block; }
  scratch-button { display: inline-flex; align-items: stretch; }
`;
const SCRATCH_COMPOSER_SHEET = new CSSStyleSheet();
SCRATCH_COMPOSER_SHEET.replaceSync(SCRATCH_COMPOSER_CSS);

class ScratchComposer extends HTMLElement {
  static get observedAttributes() { return ['placeholder', 'send', 'rows']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [SCRATCH_COMPOSER_SHEET];
    this.shadowRoot.innerHTML =
      `<scratch-field multiline></scratch-field>` +
      `<scratch-button variant="accent"></scratch-button>`;
    this._field = this.shadowRoot.querySelector('scratch-field');
    this._btn = this.shadowRoot.querySelector('scratch-button');
    this._btn.addEventListener('click', () => this._submit());
    this._field.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); this._submit(); }
    });
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  _sync() {
    this._field.setAttribute('placeholder', this.getAttribute('placeholder') || '');
    this._field.setAttribute('rows', this.getAttribute('rows') || '2');
    this._btn.textContent = this.getAttribute('send') || 'Send';
  }
  get value() { return this._field.value; }
  set value(v) { this._field.value = v; }
  _submit() {
    const value = this.value;
    this.dispatchEvent(new CustomEvent('submit', { bubbles: true, detail: { value } }));
    this.value = '';
  }
}
customElements.define('scratch-composer', ScratchComposer);
