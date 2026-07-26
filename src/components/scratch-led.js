/* <scratch-led> — status indicator LED.
 *
 * Three color states only: good (green) · accent (amber) · bad (red).
 * The `live` attribute turns on the pulse.
 *
 * MOTION RULE (load-bearing, not decoration): a dot pulses ONLY while work is
 * actively happening — running or queued. `live` therefore means "in flight"
 * (e.g. the auto-reload poller checking for a new build), never ambient shine.
 *
 *   <scratch-led></scratch-led>                 good, static  (live/ready)
 *   <scratch-led live></scratch-led>            good, pulsing (running)
 *   <scratch-led state="accent" live></scratch-led>  amber, pulsing (queued)
 *   <scratch-led state="accent"></scratch-led>  amber, static (stale)
 *   <scratch-led state="bad"></scratch-led>     red, static   (error)
 *
 * Size is fixed via --dot-size (default 6px) so dots never render off-scale;
 * override the token deliberately for the rare larger indicator.
 */
const SCRATCH_LED_CSS = `
  :host {
    display: inline-block;
    width: var(--dot-size, 6px);
    height: var(--dot-size, 6px);
    border-radius: 50%;
    vertical-align: middle;
    background: var(--signal, #00e47a);
    --dot-glow: var(--signal-glow, rgba(0,228,122,0.08));
  }
  :host([state="accent"]) {
    background: var(--accent, #ffae00);
    --dot-glow: var(--accent-glow, rgba(255,174,0,0.12));
  }
  :host([state="bad"]) {
    background: var(--danger, #ff4444);
    --dot-glow: var(--danger-glow, rgba(255,68,68,0.10));
  }
  :host([live]) { animation: scratch-led-pulse 2.5s ease-in-out infinite; }
  @keyframes scratch-led-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 4px var(--dot-glow); }
    50%      { opacity: 0.4; box-shadow: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    :host([live]) { animation: none; }
  }
`;

const SCRATCH_LED_SHEET = new CSSStyleSheet();
SCRATCH_LED_SHEET.replaceSync(SCRATCH_LED_CSS);

class ScratchLed extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [SCRATCH_LED_SHEET];
  }
}
customElements.define('scratch-led', ScratchLed);
