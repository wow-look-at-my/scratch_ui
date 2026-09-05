# scratch_ui

The **Scratch Proto** design language: design tokens + native web components. No dependencies and no framework, only plain CSS custom properties and vanilla custom elements (shadow DOM), written in TypeScript.

Aesthetic: exposed wireframe, dot-grid substrate, monospace typography, amber caution accents, registration marks, build-stamp metadata.

## Layout

- `src/components/<name>/` — one folder per component, holding its `<name>.ts` and `<name>.css`.
- `src/index.ts` — the bundle entry. It imports every component for its registration side effect. A component missing from here is not in the build.
- `src/styles.ts` — imports the built stylesheet as a CSS module script and exports the one `CSSStyleSheet` every component adopts.
- `src/css/` — the stylesheets that are not a component's own: `scratch-tokens.css` (the design tokens) and `scratch-proto.css` (demo-only).
- `src/demo/` — the demo/spec site: the landing page and the two spec pages.
- `src/lib/` — helpers shared by more than one component.
- `pages-manifest.json` (repo root) — the input→output map that drives the site deploy to buildhost (see Hosting below).

Build output is two files: `dist/scratch-ui.js` (every component, one ES module) and `src/scratch-ui.css` (tokens plus every component stylesheet). Both are gitignored.

## Build

```
pnpm build       # scripts + bundle -> stylesheet (type-check strict)
pnpm site        # build, then assemble _site/ from pages-manifest.json
```

`ts0` is not an npm dependency. Install it however you like locally, where it is on `PATH`, and CI gets it from the `wow-look-at-my/ts0` action. No separate install step is needed for `@types/node` either, because ts0 ships its own copy.

`pnpm build` is one `ts0 build` followed by `scripts/build-css.ts`. That single `ts0 build` also builds `scripts/`, a nested ts0 project, alongside the root bundle. `build-css.ts` concatenates every stylesheet into `src/scratch-ui.css`, **scoping each one to the element it styles**: `:host` becomes `:host(scratch-badge)`, and `.box` becomes `:host(scratch-badge) .box`. One sheet is adopted by every shadow root, so an unscoped rule applies to every component. Sources stay written the natural way, and the scoping happens at concat time.

`build-css.ts` does not need to run before the bundle. `css.d.ts`'s wildcard `declare module '*.css'` type-checks `src/styles.ts`'s import of the file it produces either way. The import stays external and unresolved rather than being read from disk.

`dist/` and `_site/` are generated and gitignored. To view the spec pages locally, run `pnpm site` and serve `_site/` with any static server. The demo pages resolve components at the site root, the same layout master deploys.

## Files

### CSS

- `src/css/scratch-tokens.css` — every design token, in one `:root` block of custom properties: surfaces, text, accent/signal/danger, borders, fonts, type scale, spacing, radius, motion, elevation. **The consumable contract**: the only file an app needs to import to adopt the design language. Tokens are inherited custom properties, so they pierce shadow DOM and theme all the components. Every component also carries baked-in `var(..., fallback)` defaults, so a missing token degrades gracefully instead of breaking.
- `src/css/scratch-proto.css` — the demo pages' reset, element-level base styles, and style-guide scaffolding. An app must NOT import this, because it restyles elements globally. It exists for the spec pages.
- `src/components/<name>/<name>.css` — a component's own shadow-DOM stylesheet, imported as text and adopted via `CSSStyleSheet.replaceSync`.

### Components (`src/components/`)

One custom element per folder, all of them cooked into the single `scratch-ui.js` module. Each registers itself via a top-level `customElements.define(...)` side effect, so importing the bundle is all it takes. There is nothing to pick and nothing to order.

| element(s) | notes |
|---|---|
| `<scratch-ring>` | + `window.ScratchRing` (click-burst ring; buttons/cards use it) |
| — | `window.ScratchReveal` — no element. Proximity edge-light: bordered interactive controls brighten the edge nearest the cursor, out to 512px. Mouse only, and off under reduced motion |
| `<scratch-button>` | |
| `<scratch-badge>` | composes `<scratch-led>` |
| `<scratch-card>` | |
| `<scratch-caution>` | hazard-striped zone; the stripe self-dims by viewport position (full at the upper-third read line, 70% floor at the bottom), contained in its shadow so slotted content never dims |
| `<scratch-composer>` | composes `<scratch-field>` + `<scratch-button>` |
| `<scratch-field>` | |
| `<scratch-led>` | |
| `<scratch-message>` | |
| `<scratch-modal>` | |
| `<scratch-nav>`, `<scratch-nav-item>` | composes `<scratch-button>` for the header × |
| `<scratch-preview>` | |
| `<scratch-progress>` | |
| `<scratch-select>` | |
| `<scratch-tabs>`, `<scratch-tab>` | |
| `<scratch-toggle>` | |

Some components render others in their shadow DOM, as marked above. That used to be the consumer's problem. Every dependency had to be loaded alongside by hand, or the inner elements stayed unresolved and inert. With one bundle they are all present, so composition is invisible from the outside.

API quick notes, covering the newer controls and the upgraded attributes:

- `<scratch-progress>` — `value` / `max` (default 100) / `indeterminate` / `state="accent|signal|danger"`, the fill color, which defaults to accent. It reflects `role="progressbar"` and `aria-value*` on the host. Bar height comes from the `--progress-height` component token (6px). A value update only mutates the fill's `style.width`, so per-frame updates are cheap. The indeterminate sweep degrades to a static dim 40% fill under `prefers-reduced-motion`.
- `<scratch-select>` — form-associated dropdown. Light-DOM `<option>` children are the options source, mirrored into the shadow control and kept live by a MutationObserver. The current value survives a rebuild while it still names an option. Attributes: `value` (a seed, after which the property or the user pick is authoritative), `placeholder` (a disabled and hidden first option), and `disabled`. `focus()` delegates, and it fires composed bubbling `input` and `change`. Option text renders verbatim, with no uppercase.
- `<scratch-toggle>` — form-associated checkbox, with `checked` and `disabled` attributes, the `checked` property reflected both ways, and `"on"` submitted. Label text is slotted, a click anywhere toggles, and keyboard and a11y come from a hidden native checkbox. It fires composed bubbling `change` and `input` on a user toggle.
- `<scratch-button>` — new `variant="ghost"`, the quiet borderless tier: no box, no corner-marks, no ring, muted to bright on hover, and disabled dims only. It is now form-associated. `type="submit"` submits the owning form, and no `type` never submits. `disabled` is also a property accessor. `aria-label` on the host is forwarded to the inner `<button>`, the focusable element, so an icon-only button can carry a name.
- `<scratch-field>` — new `type` for the single-line mode (`text|password|number|search|email|url`, which `multiline` ignores). It adds `min`/`max`/`step` passthrough for number use, and `inputmode` passthrough in both modes. `inputmode` is the virtual-keyboard hint, such as `inputmode="numeric"` on a free-text field that expects digits without number-input semantics.
- `<scratch-badge>` — `variant="off"` is the neutral dim or inactive chip: muted text, dashed border, no LED. `variant="accent"` and `variant="signal"` are the colour-only chips, proto's shape without the dot, for labelling a verdict or an outcome. Proto's LED reports a *state*, and a static amber dot already means "stale" in the LED language. Every variant shares one chip geometry, and a variant carries colour only, `key` aside.
- `<scratch-message>` — `author="user|assistant"` picks the label color, amber or green. It was renamed from `role`, which collided with the ARIA global `role` attribute.
- `<scratch-preview>` — the "visual above a caption" tile: `label` and `sub`, plus `note` (a third caption line) and `index` (a catalogue number pinned top-right). An empty one renders nothing. It is the **non-interactive** tile, with no role, no tabindex and no click ring, where `<scratch-card>` is the clickable one. Restyle the caption with `::part(title|sub|note|index)` instead of rebuilding the tile.

### Living spec (`src/demo/`)

- `index.html` — a small landing page linking the spec pages.
- `Scratch Proto.html` — the full style guide: every token, component, and rule.
- `Icon Language.html` — the icon language spec.

Run `pnpm site` and serve `_site/` with any static server. `_site/index.html` forwards to `demo/`. The shipped design language is dependency-free, spec pages included: no framework, no runtime dependency, and no external scripts. The pages' only external requests are the Google Fonts stylesheets. The build is a dev-time step only, and a consumer fetches plain `.js` and `.css`.

## Hosting (buildhost)

[buildhost](https://github.com/wow-look-at-my/buildhost) is the canonical host for external consumers. GitHub Pages is retired. The repo's Pages site went off, so the old `wow-look-at-my.github.io/scratch_ui/` URLs are gone.

On every push to master, `.github/workflows/ci.yml` builds the components and assembles `_site/` from **`pages-manifest.json`**. That manifest is a checked-in list of `{"from": "<repo file or dir>", "to": "<site path>"}` copies. CI then publishes the result as a public static site via buildhost's own `buildhost-publish-site` action, which authenticates over GitHub OIDC with no static secrets.

The manifest, not the workflow, decides what gets published. Change the site by editing the manifest. CI validates it against its JSON Schema, `pages-manifest.schema.json`, checked by the org's json-validator action.

The manifest publishes the two library files at the **site root**:

```
https://sites.pazer.build/scratch_ui/branch/master/scratch-ui.css
https://sites.pazer.build/scratch_ui/branch/master/scratch-ui.js
```

To add a component, import it in `src/index.ts`. The assembly script fails when a `src/components/<name>/` is not imported there. No component can be left out of the bundle in silence.

The spec site is served under `/demo/`, and the site root's `index.html` forwards there. The spec pages cannot live at the root itself, because their relative `../` references then escape the site's base path.

## Previews

The same workflow deploys every pull request, so each PR gets its own copy of the full site, in the same assembled layout as master:

- master (canonical): <https://sites.pazer.build/scratch_ui/branch/master/>
- pull requests: `https://sites.pazer.build/scratch_ui/branch/pr-<number>/`

## Consuming

Two files, always both, which is what the demo pages do:

```html
<link rel="stylesheet" href="scratch-ui.css" />
<script type="module" src="scratch-ui.js"></script>
```

The stylesheet is loaded twice, for two different jobs, and the browser fetches it once. The `<link>` puts the **tokens** on the page's `:root`, where they inherit into every shadow root. That is what themes the components. It is also why a consumer can override any token in their own CSS. The module imports the same file again as a CSS module script, to get the **component rules** inside each shadow root. A linked stylesheet cannot reach past a shadow boundary.

The module also links the three webfonts the tokens name, so they work with no setup. If your page sets a Content-Security-Policy, allow `style-src https://fonts.googleapis.com` and `font-src https://fonts.gstatic.com`. If you serve the faces yourself, the module notices and adds nothing. Depth: `docs/webfonts.md`.

Both files are required. The stylesheet is not optional styling on top of working components. Without it they render unstyled.

### As a pnpm git dependency (bundlers)

```
pnpm add "git+https://github.com/wow-look-at-my/scratch_ui.git"
```

```ts
import "scratch-ui";           // registers every component
```

```css
@import "scratch-ui/scratch-ui.css";
```

Notes:

- The package `exports` map resolves `scratch-ui` to `dist/scratch-ui.js`, and `scratch-ui/scratch-ui.css` to the built stylesheet. The imports above therefore work regardless of the repo layout. Neither file is committed, so build before consuming from a git checkout.
- The components register themselves as a **top-level side effect** of being imported. The package deliberately does not declare `"sideEffects": false`. Keep it that way, or a bundler tree-shakes the registrations away.
- `scratch-ring` and `scratch-reveal` are in the bundle, so the click ring and the proximity edge-light are on by default.
- Import `scratch-reveal.js` for the proximity edge-light. It finds the controls itself, in the light DOM and in open shadow roots, so there is nothing to call. `ScratchReveal.track(el)` exists only for a closed shadow root it cannot see. Without the file, controls render unchanged. It is off entirely for touch pointers and under `prefers-reduced-motion`, because a light that chases the cursor is motion. Both the CSS and the tracker gate it.
- An override of a token on `:root` re-themes every component, because inherited custom properties cross shadow boundaries.

## License

MIT
