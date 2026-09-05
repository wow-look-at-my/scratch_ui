# The webfonts the tokens name

`src/css/scratch-tokens.css` names three families and declares no `@font-face`:

```css
--font-mono:     'JetBrains Mono', 'SF Mono', ... , ui-monospace, monospace;
--font-display:  'Space Grotesk', 'JetBrains Mono', monospace;
--font-body:     'Quantico', 'Segoe UI', system-ui, sans-serif;
```

So until `src/webfonts.ts` existed, every stack fell through to its system
fallback on every consumer, and each app that wanted the real faces had to wire
them up itself. `loadWebFonts()` runs from the bundle entry and does it once,
for all of them.

## Why this is JavaScript and not a line of CSS

Both of the obvious CSS answers are dead ends, for separate reasons:

- **`@import` in `scratch-ui.css`.** That file is loaded as a CSS module script
  (`src/styles.ts`, `import ... with { type: 'css' }`) so every component can
  adopt one shared `CSSStyleSheet`. A **constructed stylesheet ignores
  `@import`** — the rule is dropped, not fetched.
- **`@font-face` in `scratch-ui.css`.** A font face is **document-scoped**. A
  face declared in a sheet that is adopted into a shadow root registers with
  nothing at all.

Nor can the faces be written out inline: the stylesheet Google serves for these
three families is 46 `@font-face` blocks split by `unicode-range`, over hashed
filenames under a per-family version directory (`/v24/`, `/v19/`, `/v22/`).
Those hashes move whenever a family is revised, so a copy pasted into this repo
goes stale silently. Referencing the stable `css2?family=...` URL is what keeps
that maintenance with Google.

Consumers also do not agree on how they load the CSS — `simple-llm-ui` links
`scratch-ui.css` in its document *and* loads the module, while the `scratch`
shell only imports the module and carries its own `:root` tokens. The bundle is
the one thing both of them load, which is why the faces are attached there.

## What it does, and when it declines

`loadWebFonts()` appends one `<link rel="stylesheet">` for the Google Fonts
stylesheet to `document.head`, fetched **anonymously** — `crossorigin="anonymous"`
sends no cookies, `referrerpolicy="no-referrer"` sends no page URL.

It first checks whether the document already declares the faces, and does
nothing if so:

- a stylesheet whose `href` names `fonts.googleapis.com` (the consumer already
  links it), or
- a same-origin sheet carrying an `@font-face` for one of the three families
  (the consumer self-hosts them).

That second check is what keeps an offline or airgapped consumer offline: an app
serving its own `@font-face` copies is left alone rather than handed an external
request. A cross-origin sheet refuses `.cssRules`, so it is skipped — matching on
`href` covers the case that matters.

## What a consumer has to allow

Nothing, unless it sets a Content-Security-Policy. One that does needs:

- `style-src https://fonts.googleapis.com` — the stylesheet itself.
- `font-src https://fonts.gstatic.com` — the woff2 files it names.

A CSP refusal is otherwise invisible: the page renders in a fallback face and
says nothing. `loadWebFonts()` therefore logs an error naming both directives
when the link fails, so the cause is on the console rather than left for
somebody to guess at.
