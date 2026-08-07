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

import SCRATCH_LED_CSS from './scratch-led.css';

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
