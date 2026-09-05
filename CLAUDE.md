# CLAUDE.md — scratch_ui

Engineering conventions for this repo: the CI/deploy rules and the consumption
contract that aren't obvious from the tree. What the repo is and how to consume
it lives in `README.md` — keep that one short and skimmable.

## Master is live for consumers

Downstream apps (the scratch shell, among others) load the components and
tokens **at runtime** from the buildhost master deploy —
`https://sites.pazer.build/scratch_ui/branch/master/<file>` — always-latest.
The org convention is that consumers link these shared master URLs unpinned
(no version pins, no vendored copies), so **every merge to master ships
immediately to every consumer**. Treat changes to component APIs, tokens, and
published file names as production changes; verify anything risky on its PR
preview (`…/branch/pr-<number>/`) before merging.

GitHub Pages was switched off org-wide on 2026-07-20. Every
`wow-look-at-my.github.io` URL is dead — never reference or reintroduce one
(in docs, demo pages, or workflows).

## Shadow-DOM styling: `:host` loses to the consuming page

A host element lives in the LIGHT tree, so its `::before` / `::after` are also
matched by the page's own rules — and for normal declarations an outer tree
beats the shadow tree. A page reset (`*, *::before { padding: 0 }`, which
`src/css/scratch-proto.css` has) therefore overrides `:host::before { padding }`.
Never build host-pseudo geometry from box-model properties a reset touches
(`padding`, `margin`, `border`, `box-sizing`); `scratch-reveal` sizes its 1px
ring with `mask-position` / `mask-size` for exactly this reason. Styles on
elements *inside* the shadow root are unaffected.

## The library ships as two files

`scratch-ui.js` (every component, one ES module) and `scratch-ui.css` (tokens
plus every component stylesheet). There is no per-component file; consumers
load the whole library.

- A component is a folder: `src/components/<name>/<name>.ts` + `<name>.css`.
  Never write CSS into a template literal in the `.ts`.
- **The bundle supplies the webfonts the tokens name** (`src/webfonts.ts`,
  called from `src/index.ts`), because neither `@import` nor `@font-face` can
  live in `scratch-ui.css` — a constructed stylesheet drops the first, and a
  face adopted into a shadow root registers nothing. It declines when the
  document already declares the faces, so a self-hosting consumer stays
  offline. A consumer with a CSP needs `style-src https://fonts.googleapis.com`
  and `font-src https://fonts.gstatic.com`. Depth: `docs/webfonts.md`.
- **Add a component by importing it in `src/index.ts`.** `assemble-pages.ts`
  fails when a component under `src/components/` is not imported there, so one
  cannot be silently left out of the bundle.
- **One stylesheet is adopted by every shadow root**, so a component's rules
  must be scoped to it or they apply everywhere. `scripts/build-css.ts` does
  that as it concatenates: `:host` -> `:host(scratch-badge)`, `.box` ->
  `:host(scratch-badge) .box`, `:host(...)` merged into one compound. Write
  sources the natural way. This is not cosmetic — before scoping, 17 bare
  `:host` rules all matched every component and the last won, rendering
  `<scratch-badge>` 460px wide (from the modal) and 6px tall (from the LED).
- Two things the scoper must not touch: `@keyframes` bodies (offsets are not
  selectors) and `scratch-reveal.css`, whose selectors already name the hosts
  they decorate — scoping it yields `:host(scratch-reveal:not(scratch-toggle))`,
  which matches nothing. `UNSCOPED` in `build-css.ts` carries that exception.
- **No CSS text may end up in the JS.** `src/styles.ts` imports the stylesheet
  as a CSS module script (`with { type: 'css' }`) and `ts0.json` sets
  `external: ["*.css"]` to keep that import an external reference. Module
  evaluation runs once, so every root adopts the SAME `CSSStyleSheet` and the
  browser parses it once. An unsupported CSS-type import that is not external
  fails the build loudly rather than inlining — that hard failure is the
  guardrail.
- Components may `export` and may import each other: the bundle is a module.
  (The old ban existed only because each component loaded as a classic
  `<script defer>`, where a top-level `export` is a syntax error.)
- `dist/`, `dist-scripts/`, `_site/`, `src/scratch-ui.css` and the lockfile are
  gitignored.
- **ts0 is not an npm dependency.** It comes from `PATH` locally and from the
  `wow-look-at-my/ts0` action in CI, which downloads current ts0 instead of
  pinning one. A stale lockfile pinning it once cost real debugging time.
- **The ts0 action takes no command input.** One step type-checks, tests and
  builds, in that order. There is no `args:` to choose a cheaper subset — the
  action fails outright on one, because an arg like `--help` exits 0 having
  done none of the three.
- Type-checking is part of building, never a separate step. `pnpm build` runs
  a single `ts0 build`, which recurses into `scripts/`'s own nested project
  (`scripts/ts0.json`, node target) alongside the root's browser bundle
  (`ts0.json`, `src/index.ts` -> `dist/scratch-ui.js`), then `build-css.js`.
  The stylesheet does NOT need to exist yet for the bundle step: `css.d.ts`'s
  wildcard `declare module '*.css'` type-checks `src/styles.ts`'s import
  either way, since `external` keeps it an unresolved reference. Only
  `assemble-pages.js` needs the file on disk.
- **`scripts/` is a nested ts0 project, not a `--config` flag.** Its own
  `scripts/ts0.json` (entry `.`, target `node`) is what makes one root-level
  `ts0 build` cover both projects — see ts0's own "Nested projects" docs.
  Never reintroduce a second top-level config or a multi-invocation CI step
  to build it; that is the pattern this replaced.
- **Build scripts live in `scripts/`, never under `.github/`.** tsc's default
  include never descends into a dot-directory, so a `.ts` under `.github/`
  is bundled without being type-checked at all — and ts0 still reports a
  green build. Verified directly: the same file errors from `scripts/` and
  passes from `.github/scripts/`.

## CI and the org merge gate (`all-builds`)

- **One workflow, one job**: `.github/workflows/ci.yml` builds, verifies and
  publishes. Every step feeds the next — the build produces what the manifest
  publishes, and assembling `_site/` is also the check that every component IS
  published — so splitting them buys nothing and costs a second checkout and
  install. Its triggers (`push` to master + `pull_request`) are the deploy's:
  the PR number the preview site is named after only exists on the
  `pull_request` event, and keeping `push` pinned to master is what stops a
  PR update building twice.
- **A `concurrency` group serializes publish by ref** (`cancel-in-progress:
  true`) — without it, two close pushes to master can finish out of order and
  the slower, older commit's publish lands last, overwriting the newer one
  on the live site. This happened for real (#28's revert was clobbered by
  #26's own slower build) and needed a fresh push to fix.
- PRs merge into master only when the **`all-builds` commit status** on the
  head SHA is green. That status is posted automatically by an org app
  (**required-builds-manager**), which aggregates every build on the SHA
  itself — no job naming or aggregator wiring in this repo is needed to
  satisfy it. That is why there is no fan-in job.
- **Never name a workflow job (or check) `all-builds`.** A job with that name
  only shadows the real gate in the GitHub UI, and the buildhost publish
  guard rejects any deploy on a SHA carrying one — this repo hit it directly
  (PR #17, 2026-07-20; the guard's error instructs a rename).
- `runs-on` is `${{ vars.CI_RUNNER || 'ubuntu-latest' }}` — the org's
  self-hosted runner, with the fallback for forks and repos the org has not
  onboarded. A hardcoded `ubuntu-latest` burns paid minutes.

## Publish permissions

The `buildhost-publish-site@master` action front-runs the org's publish guard
(since 2026-07-20), which scans the run's jobs and the head commit's check
runs. The **calling job's token must grant `actions: read` + `checks: read`**,
or the guard fails closed with an error naming the missing grants (PR #17
added them); `ci.yml`'s workflow-level `permissions:` block carries both.
Two gotchas:

- A job-level `permissions:` block **replaces** the workflow-level one — if a
  job ever gets its own block, re-grant both reads there.
- The publish registers a **GitHub Deployment** — that is how a preview URL
  reaches a PR, since this repo posts no preview comment. It needs
  `deployments: write` plus two inputs, which are not interchangeable:
  `deployment_ref: ${{ github.head_ref || github.ref_name }}` (GitHub stores a
  deployment's ref verbatim, and a bare SHA belongs to no branch, so the branch
  and PR views read "This branch has not been deployed"), and
  `git_commit: ${{ github.event.pull_request.head.sha || github.sha }}` (the
  recorded commit, which must stay a real SHA — on a `pull_request` event
  `github.sha` is the merge commit and dies with the PR).
- If the deploy is ever switched to an org **reusable workflow** (e.g.
  `buildhost-preview.yml`), the caller must grant every permission the
  reusable declares, or the run fails as `startup_failure` with **zero
  jobs** — the error annotation exists only in the GitHub web UI; the API
  shows no jobs and no logs to pull.

Keep the publish path minimal: checkout → install → `pnpm build` → assemble
`_site/` from `pages-manifest.json` → the stock `buildhost-publish-site`
action. A version that wrapped the publish step in custom code was reverted
(#15) before the minimal form re-landed (#16). The manifest, not the workflow,
decides what gets published — change the site by editing the manifest.
