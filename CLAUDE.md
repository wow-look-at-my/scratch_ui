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

## CI and the org merge gate (`all-builds`)

- PRs merge into master only when the **`all-builds` commit status** on the
  head SHA is green. That status is posted automatically by an org app
  (**required-builds-manager**), which aggregates every build on the SHA
  itself — no job naming or aggregator wiring in this repo is needed to
  satisfy it.
- **Never name a workflow job (or check) `all-builds`.** A job with that name
  only shadows the real gate in the GitHub UI, and the buildhost publish
  guard rejects any deploy on a SHA carrying one — this repo hit it directly
  (PR #17, 2026-07-20; the guard's error instructs a rename). Use a neutral
  fan-in name: `ci.yml`'s aggregator job is `aggregate`.

## Deploy workflow (`preview.yml`) permissions

The `buildhost-publish-site@master` action front-runs the org's publish guard
(since 2026-07-20), which scans the run's jobs and the head commit's check
runs. The **calling job's token must grant `actions: read` + `checks: read`**,
or the guard fails closed with an error naming the missing grants (PR #17
added them); `preview.yml`'s workflow-level `permissions:` block carries both.
Two gotchas:

- A job-level `permissions:` block **replaces** the workflow-level one — if a
  job ever gets its own block, re-grant both reads there.
- If the deploy is ever switched to an org **reusable workflow** (e.g.
  `buildhost-preview.yml`), the caller must grant every permission the
  reusable declares, or the run fails as `startup_failure` with **zero
  jobs** — the error annotation exists only in the GitHub web UI; the API
  shows no jobs and no logs to pull.

Keep `preview.yml` minimal: checkout → assemble `_site/` from
`pages-manifest.json` → the stock `buildhost-publish-site` action. A version
that wrapped the publish step in custom code was reverted (#15) before the
minimal form re-landed (#16). The manifest, not the workflow, decides what
gets published — change the site by editing the manifest.
