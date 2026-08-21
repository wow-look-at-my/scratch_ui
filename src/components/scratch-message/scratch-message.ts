/* <scratch-message> — a chat message row.
 *
 *   <scratch-message author="user">…body…</scratch-message>
 *   <scratch-message author="assistant" stats="312 tok · 1.4s" streaming>…</scratch-message>
 *
 * author: user (amber label) | assistant (green label). stats: optional right-
 * aligned meta. streaming: appends the blinking caret to the body.
 * (`author`, not `role` — `role` is the ARIA global attribute, and
 * "user"/"assistant" are not valid ARIA role tokens.)
 */

import { SHEET } from '../../styles.ts';

class ScratchMessage extends HTMLElement {
  static get observedAttributes() { return ['author', 'stats']; }
  private _root: ShadowRoot;
  private _author: HTMLElement;
  private _stats: HTMLElement;
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.adoptedStyleSheets = [SHEET];
    this._root.innerHTML =
      `<div class="head"><span class="author"></span><span class="stats"></span></div>` +
      `<div class="body"><slot></slot></div>`;
    this._author = this._root.querySelector('.author') as HTMLElement;
    this._stats = this._root.querySelector('.stats') as HTMLElement;
  }
  connectedCallback() { this._sync(); }
  attributeChangedCallback() { this._sync(); }
  private _sync() {
    const author = this.getAttribute('author') || '';
    this._author.textContent = author ? author.charAt(0).toUpperCase() + author.slice(1) : '';
    this._stats.textContent = this.getAttribute('stats') || '';
  }
}
customElements.define('scratch-message', ScratchMessage);
