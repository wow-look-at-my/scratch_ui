/* <scratch-composer> — message input + send, composed from the sealed
 * <scratch-field> and <scratch-button> components.
 *
 *   <scratch-composer placeholder="message …" send="Send"></scratch-composer>
 *
 * Fires `submit` (detail: { value }) on send-click or ⌘/Ctrl+Enter, then
 * clears. Read/scripted value via the `.value` property.
 */

import { SHEET } from '../../styles.ts';

class ScratchComposer extends HTMLElement {
  static get observedAttributes() { return ['placeholder', 'send', 'rows']; }
  private _root: ShadowRoot;
  /* <scratch-field> is a sibling module, not an import (that would break
     classic-script loading), so its .value is reached through this shape. */
  private _field: HTMLElement & { value: string };
  private _btn: HTMLElement;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SHEET];
    this._root.innerHTML =
      `<scratch-field multiline></scratch-field>` +
      `<scratch-button variant="accent"></scratch-button>`;
    this._field = this._root.querySelector('scratch-field') as HTMLElement & { value: string };
    this._btn = this._root.querySelector('scratch-button') as HTMLElement;
    this._btn.addEventListener('click', () => this._submit());
    this._field.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); this._submit(); }
    });
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  private _sync() {
    this._field.setAttribute('placeholder', this.getAttribute('placeholder') || '');
    this._field.setAttribute('rows', this.getAttribute('rows') || '2');
    this._btn.textContent = this.getAttribute('send') || 'Send';
  }
  get value() { return this._field.value; }
  set value(v: string) { this._field.value = v; }
  private _submit() {
    const value = this.value;
    this.dispatchEvent(new CustomEvent('submit', { bubbles: true, detail: { value } }));
    this.value = '';
  }
}
customElements.define('scratch-composer', ScratchComposer);
