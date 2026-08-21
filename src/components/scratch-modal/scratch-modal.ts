/* <scratch-modal> — dialog surface shell.
 *
 *   <scratch-modal eyebrow="settings">
 *     <scratch-tabs> … </scratch-tabs>
 *   </scratch-modal>
 *
 * Owns the bordered/rounded surface, elevation, overflow clip, and the tiny
 * decorative "// eyebrow" line. Content (typically <scratch-tabs>) is slotted.
 * eyebrow: optional decorative label rendered as "// <text>".
 */

import { SHEET } from '../../styles.ts';

class ScratchModal extends HTMLElement {
  static get observedAttributes() { return ['eyebrow']; }
  private _root: ShadowRoot;
  private _eyebrow: HTMLElement;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SHEET];
    this._root.innerHTML =
      `<div class="surface"><div class="eyebrow" part="eyebrow"></div><slot></slot></div>`;
    this._eyebrow = this._root.querySelector('.eyebrow') as HTMLElement;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  private _sync() {
    this._eyebrow.textContent = this.getAttribute('eyebrow') || '';
  }
}
customElements.define('scratch-modal', ScratchModal);
