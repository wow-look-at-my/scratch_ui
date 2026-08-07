# scratch_ui

The **Scratch Proto** design language: design tokens + native web components.
No dependencies, no framework — plain CSS custom properties and vanilla custom
elements (shadow DOM), written in TypeScript.

Aesthetic: exposed wireframe, dot-grid substrate, monospace typography, amber
caution accents, registration marks, build-stamp metadata.

## Layout

- `src/components/<name>/` — one folder per component, holding its `<name>.ts`
  and `<name>.css`. `ts0 build` compiles each to `dist/<name>/<name>.js` with
  its stylesheet inlined, so a component ships as one self-contained file.
- `src/css/` — the stylesheets that are not a component's own:
  `scratch-tokens.css` (the consumable token contract) and `scratch-proto.css`
  (demo-only).
- `src/demo/` — the demo/spec site: the landing page and the two spec pages.
- `src/lib/` — helpers shared by more than one component, inlined at build
  time (no runtime import).
- `pages-manifest.json` (repo root) — the input→output map that drives the
  site deploy to buildhost (see Hosting below).

## Build

```
pnpm install     # also builds the components, via `prepare`
pnpm build       # ts0: type-check (strict) + compile src/ and scripts/
pnpm site        # build, then assemble _site/ from pages-manifest.json
```

`dist/` and `_site/` are generated and gitignored. To view the spec pages
locally, run `pnpm site` and serve `_site/` with any static server — the demo
pages resolve components at the site root, the same layout master deploys.

## Files

### CSS

- `src/css/scratch-tokens.css` — every design token (one `:root` block of
  custom properties: surfaces, text, accent/signal/danger, borders, fonts,
  type scale, spacing, radius, motion, elevation). **The consumable contract**:
  the only file an app needs to import to adopt the design language. Tokens are
  inherited custom properties, so they pierce shadow DOM and theme all the
  components; every component also carries baked-in `var(..., fallback)`
  defaults, so a missing token degrades gracefully instead of breaking.
- `src/css/scratch-proto.css` — the demo pages' reset, element-level base
  styles, and style-guide scaffolding. Apps generally should NOT import this
  (it restyles elements globally); it exists for the spec pages.
- `src/components/<name>/<name>.css` — a component's own shadow-DOM
  stylesheet, imported as text and adopted via `CSSStyleSheet.replaceSync`.

### Components (`src/components/`)

One custom element per folder. The compiled files are classic scripts
(loadable via `<script defer>`) that are also import-safe as modules — each
registers itself via a top-level `customElements.define(...)` side effect, and
none of them export anything, which is what keeps `<script defer>` working.
The table below names each component by its published file (`<name>.js`),
built from `src/components/<name>/<name>.ts`.

| file | element(s) |
|---|---|
| `scratch-ring.js` | `<scratch-ring>` + `window.ScratchRing` (click-burst ring; buttons/cards use it when present) |
| `scratch-button.js` | `<scratch-button>` |
| `scratch-badge.js` | `<scratch-badge>` — composes `<scratch-led>`: load `scratch-led.js` too |
| `scratch-card.js` | `<scratch-card>` |
| `scratch-caution.js` | `<scratch-caution>` — hazard-striped zone; the stripe self-dims by viewport position (full at the upper-third read line, 70% floor at the bottom), contained in its shadow so slotted content never dims |
| `scratch-composer.js` | `<scratch-composer>` — composes `<scratch-field>` + `<scratch-button>`: load both too |
| `scratch-field.js` | `<scratch-field>` |
| `scratch-led.js` | `<scratch-led>` |
| `scratch-message.js` | `<scratch-message>` |
| `scratch-modal.js` | `<scratch-modal>` |
| `scratch-nav.js` | `<scratch-nav>`, `<scratch-nav-item>` |
| `scratch-preview.js` | `<scratch-preview>` |
| `scratch-progress.js` | `<scratch-progress>` |
| `scratch-select.js` | `<scratch-select>` |
| `scratch-tabs.js` | `<scratch-tabs>`, `<scratch-tab>` |
| `scratch-toggle.js` | `<scratch-toggle>` |

Some components compose others in their shadow DOM (marked in the table):
`scratch-composer` renders a `<scratch-field>` and a `<scratch-button>`, and
`scratch-badge` renders a `<scratch-led>`. The files don't import each other
(that would break classic-script loading), so load/import the dependencies
alongside — otherwise the inner elements stay unresolved and inert.

API quick notes (the newer controls + upgraded attributes):

- `<scratch-progress>` — `value` / `max` (default 100) / `indeterminate` /
  `state="accent|signal|danger"` (fill color; accent default). Reflects
  `role="progressbar"` + `aria-value*` on the host; bar height via the
  `--progress-height` component token (6px). Value updates only mutate the
  fill's `style.width`, so per-frame updates are cheap. The indeterminate
  sweep degrades to a static dim 40% fill under `prefers-reduced-motion`.
- `<scratch-select>` — form-associated dropdown. Light-DOM `<option>` children
  are the options source (mirrored into the shadow control, kept live by a
  MutationObserver; the current value survives rebuilds while it still names
  an option). Attributes: `value` (seeds; the property / user pick is
  authoritative after), `placeholder` (disabled+hidden first option),
  `disabled`. `focus()` delegates; fires composed bubbling `input`/`change`.
  Option text renders verbatim (no uppercase).
- `<scratch-toggle>` — form-associated checkbox (`checked`/`disabled`
  attributes, `checked` property reflected both ways, submits `"on"`). Label
  text is slotted; clicking anywhere toggles; keyboard/a11y via a hidden
  native checkbox. Fires composed bubbling `change` (+`input`) on user toggle.
- `<scratch-button>` — new `variant="ghost"` (quiet borderless tier: no box,
  no corner-marks, no ring; muted → bright on hover; disabled = dimmed only).
  Now form-associated: `type="submit"` submits the owning form; no `type`
  never submits. `disabled` is also a property accessor.
- `<scratch-field>` — new `type` for the single-line mode
  (`text|password|number|search|email|url`; `multiline` ignores it) plus
  `min`/`max`/`step` passthrough for number use, and `inputmode` passthrough
  in both modes (the virtual-keyboard hint — e.g. `inputmode="numeric"` on a
  free-text field that expects digits without number-input semantics).
- `<scratch-badge>` — new `variant="off"`: the neutral dim/inactive chip
  (muted text, dashed border, no LED).
- `<scratch-message>` — `author="user|assistant"` picks the label color
  (amber/green). Renamed from `role`, which collided with the ARIA global
  `role` attribute.

### Living spec (`src/demo/`)

- `index.html` — a small landing page linking the spec pages.
- `Scratch Proto.html` — the full style guide: every token, component, and rule.
- `Icon Language.html` — the icon language spec.

Run `pnpm site` and serve `_site/` with any static server (`_site/index.html`
forwards to `demo/`). The shipped design language is dependency-free, spec
pages included: no framework, no runtime dependency, no external scripts (the
pages' only external requests are the Google Fonts stylesheets). The build is
a dev-time step only — a consumer fetches plain `.js` and `.css`.

## Hosting (buildhost)

[buildhost](https://github.com/wow-look-at-my/buildhost) is the canonical host
for external consumers. (GitHub Pages is retired — the repo's Pages site has
been switched off, so the old `wow-look-at-my.github.io/scratch_ui/` URLs are
gone.) On every push to master, `.github/workflows/preview.yml` builds the
components and assembles `_site/` from **`pages-manifest.json`** — a
checked-in list of `{"from": "<repo file or dir>", "to": "<site path>"}`
copies — then publishes it as a public static site via buildhost's own
`buildhost-publish-site` action (GitHub OIDC auth: no static secrets). The
manifest, not the workflow, decides what gets published; change the site by
editing the manifest. CI validates it against its JSON Schema
(`pages-manifest.schema.json`, checked by the org's json-validator action).

The manifest publishes the components and tokens at the **site root**, so
consumers embed bare root-relative file URLs — the same convention
`js-snippets` uses for its hosted modules:

```
https://sites.pazer.build/scratch_ui/branch/master/scratch-tokens.css
https://sites.pazer.build/scratch_ui/branch/master/scratch-button.js
```

Sources are nested per component (`dist/scratch-button/scratch-button.js`) but
the published surface is flat, so each component carries its own flattening
entry in the manifest. Adding a component means adding that entry: the
assembly script fails when a `src/components/<name>/` has no `/<name>.js`
entry, so a component cannot be silently left unpublished.

The spec site is served under `/demo/` (the site root's `index.html` forwards
there — the spec pages can't live at the root itself, because their relative
`../` references would escape the site's base path).

## Previews

The same workflow deploys every pull request, so each PR gets its own copy of
the full site (same assembled layout as master):

- master (canonical): <https://sites.pazer.build/scratch_ui/branch/master/>
- pull requests: `https://sites.pazer.build/scratch_ui/branch/pr-<number>/`

## Consuming

### Plain script tags (what the demo pages do)

```html
<link rel="stylesheet" href="scratch-tokens.css" />
<script src="scratch-ring.js" defer></script>
<script src="scratch-button.js" defer></script>
<!-- ...one tag per component you use (served from the buildhost site root) -->
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

- The package `exports` map resolves `scratch-ui/<name>.js` to the built
  `dist/<name>/<name>.js` and `scratch-ui/scratch-tokens.css` to
  `src/css/scratch-tokens.css`, so the bare subpath imports above keep working
  regardless of the repo layout. Installing from git runs the package's
  `prepare` script, which builds `dist/` — it is not committed.
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
