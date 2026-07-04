# scratch_ui

The **Scratch Proto** design language: design tokens + native web components.
No build step, no dependencies, no framework — plain CSS custom properties and
vanilla custom elements (shadow DOM).

Aesthetic: exposed wireframe, dot-grid substrate, monospace typography, amber
caution accents, registration marks, build-stamp metadata.

## Files

### CSS

- `scratch-tokens.css` — every design token (one `:root` block of custom
  properties: surfaces, text, accent/signal/danger, borders, fonts, type scale,
  spacing, radius, motion, elevation). **The consumable contract**: the only
  file an app needs to import to adopt the design language. Tokens are
  inherited custom properties, so they pierce shadow DOM and theme all the
  components; every component also carries baked-in `var(..., fallback)`
  defaults, so a missing token degrades gracefully instead of breaking.
- `scratch-proto.css` — the demo pages' reset, element-level base styles, and
  style-guide scaffolding. Apps generally should NOT import this (it restyles
  elements globally); it exists for the spec pages below.

### Components

One custom element per file. Classic scripts (loadable via `<script defer>`)
that are also import-safe as modules — each registers itself via a top-level
`customElements.define(...)` side effect.

| file | element(s) |
|---|---|
| `scratch-ring.js` | `<scratch-ring>` + `window.ScratchRing` (click-burst ring; buttons/cards use it when present) |
| `scratch-button.js` | `<scratch-button>` |
| `scratch-badge.js` | `<scratch-badge>` |
| `scratch-card.js` | `<scratch-card>` |
| `scratch-composer.js` | `<scratch-composer>` |
| `scratch-field.js` | `<scratch-field>` |
| `scratch-led.js` | `<scratch-led>` |
| `scratch-message.js` | `<scratch-message>` |
| `scratch-modal.js` | `<scratch-modal>` |
| `scratch-nav.js` | `<scratch-nav>`, `<scratch-nav-item>` |
| `scratch-preview.js` | `<scratch-preview>` |
| `scratch-tabs.js` | `<scratch-tabs>`, `<scratch-tab>` |

### Living spec

- `Scratch Proto.html` — the full style guide: every token, component, and rule.
- `Icon Language.html` — the icon language spec.

Open the pages in a browser, or serve the repo root with any static server. The
design language is fully dependency-free, spec pages included: no framework, no
build step, no external scripts (the pages' only external requests are the
Google Fonts stylesheets).

## Consuming

### Plain script tags (what the demo pages do)

```html
<link rel="stylesheet" href="scratch-tokens.css" />
<link rel="stylesheet" href="scratch-proto.css" /> <!-- demo reset/scaffolding; skip if you only want tokens -->
<script src="scratch-ring.js" defer></script>
<script src="scratch-button.js" defer></script>
<!-- ...one tag per component you use -->
```

### As a pnpm git dependency (bundlers)

```
pnpm add "git+https://github.com/wow-look-at-my/scratch_ui.git"
```

```ts
// register the components you use (side-effect imports)
import "scratch-ui/scratch-ring.js";
import "scratch-ui/scratch-button.js";
```

```css
@import "scratch-ui/scratch-tokens.css";
```

Notes:

- The repo is private, so git-based installs need credentials. In CI, use a git
  `insteadOf` token rewrite:
  `git config --global url."https://x-access-token:${TOKEN}@github.com/wow-look-at-my/".insteadOf "https://github.com/wow-look-at-my/"`.
- The components register themselves as a **top-level side effect** of being
  imported/loaded. The package deliberately does not declare
  `"sideEffects": false` — keep it that way, or bundlers will tree-shake the
  registrations away.
- Import `scratch-ring.js` alongside the components if you want the click
  ring: `scratch-button`/`scratch-card` burst rings only when
  `window.ScratchRing` exists, and degrade gracefully without it.
- Overriding a token on `:root` re-themes every component (inherited custom
  properties cross shadow boundaries).

## License

MIT
