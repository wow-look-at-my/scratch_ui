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

## Sources are TypeScript; the published surface is flat

- A component is a folder: `src/components/<name>/<name>.ts` + `<name>.css`.
  The `.css` is imported as text (ts0's `.css: text` loader, declared by
  `css.d.ts`) and adopted via `CSSStyleSheet.replaceSync` — never write CSS
  into a template literal in the `.ts`.
- `ts0 build` compiles to `dist/<name>/<name>.js`, but consumers fetch
  `…/branch/master/<name>.js`. `pages-manifest.json` carries one flattening
  entry per component to bridge that; `assemble-pages.ts` fails when a
  component has no entry, so adding a component means adding its entry.
- **No component may `export` anything.** They are loaded as classic
  `<script defer>`, and a single `export` in the output is a syntax error
  there. That is also why components never import each other (compose by
  rendering the tag and telling consumers to load it too), and why `ts0.json`
  sets `esbuild.splitting: false` — splitting emits cross-file `import`s.
  Code genuinely shared between components lives in `src/lib/` and is inlined
  at build time.
- `dist/`, `dist-scripts/`, `_site/` and the lockfile are gitignored; ts0 is a
  branch dependency resolved to HEAD on every install (as in js-snippets).
- Type-checking is part of building, never a separate step. `pnpm build` runs
  ts0 twice: `ts0.json` (browser, `src/components/` -> `dist/`) and
  `ts0.scripts.json` (node, `scripts/` -> `dist-scripts/`).
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
