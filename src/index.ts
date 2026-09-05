// Bundle entry: the whole library, cooked into one ES module.
//
// Consumers load exactly two files -- this bundle and the stylesheet:
//
//   <link rel="stylesheet" href="scratch-ui.css">
//   <script type="module" src="scratch-ui.js"></script>
//
// There is no per-component file any more. Importing a component individually
// was only ever useful for cherry-picking, and every consumer takes the whole
// library, so the flat published surface (and the load-order rules it forced
// on consumers -- "scratch-composer composes scratch-field: load both too")
// is gone.
//
// Order is irrelevant here: customElements.define() upgrades matching elements
// whenever it runs, so a component that renders another one in its shadow DOM
// does not need that one defined first. Listed alphabetically.
//
// Every component MUST be imported below. scripts/assemble-pages.ts enforces
// it, so a new component cannot be silently left out of the bundle.

import { loadWebFonts } from './webfonts.ts';

import './components/scratch-badge/scratch-badge.ts';
import './components/scratch-button/scratch-button.ts';
import './components/scratch-card/scratch-card.ts';
import './components/scratch-caution/scratch-caution.ts';
import './components/scratch-composer/scratch-composer.ts';
import './components/scratch-field/scratch-field.ts';
import './components/scratch-led/scratch-led.ts';
import './components/scratch-message/scratch-message.ts';
import './components/scratch-modal/scratch-modal.ts';
import './components/scratch-nav/scratch-nav.ts';
import './components/scratch-preview/scratch-preview.ts';
import './components/scratch-progress/scratch-progress.ts';
import './components/scratch-reveal/scratch-reveal.ts';
import './components/scratch-ring/scratch-ring.ts';
import './components/scratch-select/scratch-select.ts';
import './components/scratch-tabs/scratch-tabs.ts';
import './components/scratch-toggle/scratch-toggle.ts';

// The tokens name three faces and declare none, so the library supplies them.
loadWebFonts();
