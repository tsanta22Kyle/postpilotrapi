# PostPilotR Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Add reliable GitHub CI gates, private generated TypeScript client releases, and versioned backend image publishing for PostPilotR.

**Architecture:** GitHub Actions runs independent unit, integration, e2e, code-quality, formatting, and PR-policy jobs. Conventional Commit PR titles feed semantic-release, which publishes the client only after a merged PR targets `preproduction` or `production`; GHCR publishes backend images from those same validated merges. DeepSource runs as its GitHub-integrated PR check.

**Tech Stack:** NestJS 12, ESM TypeScript 6, Vitest 4, npm workspaces, `@hey-api/openapi-ts`, Husky, lint-staged, semantic-release, GitHub Actions, DeepSource, Docker, GHCR.

**Spec:** `docs/superpowers/specs/2026-11-25-postpilotr-ci-sdk-design.md`

## Global Constraints

- Preserve existing developer changes and do not commit or push.
- Test naming: unit `*.test.ts`; integration `*.integration-test.ts`; e2e `*.e2e-test.ts`.
- PR titles follow scoped Conventional Commits; public API/client changes use scope `api` or `client`.
- Update root `CHANGELOG.md` under `Unreleased` for every substantive repository change.
- Client publishing targets only merged PRs to exact branches `preproduction` and `production`; the workflow configuration must include `production` before that branch exists.
- `API.yml` begins as OpenAPI 3.1 metadata for PostPilotR and version `0.0.1`, with an empty `paths` object.
- Keep the client package registry-private through GitHub Packages permissions; do not set its package.json `private` field to true.
- No production deployment; publishing the backend image to GHCR is in scope.

## Review Focus

- A pull request closes without merging: no package/image publication job runs.
- A PR changes API/client paths but uses a non-`api`/`client` scope: CI rejects the mismatch before merge.
- A substantive PR forgets to add a new Unreleased changelog bullet: CI fails with a direct correction message.
- Preproduction releases use the isolated `preproduction` npm dist-tag; production promotes a version to `latest`.
- A private GitHub package is publishable with scoped auth but is not accidentally marked `private: true` in package metadata.

---

### Task 1: Separate Vitest categories and add a real integration check

**Files:**

- Modify: `package.json`
- Modify: `tsconfig.build.json`
- Modify: `vitest.config.ts`
- Create: `vitest.config.integration.ts`
- Modify: `vitest.config.e2e.ts` only if the current include is inconsistent
- Create: `test/app.integration-test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:** unit `npm run test:unit`; integration `npm run test:integration`; e2e `npm run test:e2e`.

- [x] Add distinct scripts/configs for the three test categories; keep `npm test` as the unit-test alias.
- [x] Exclude every `*.test.ts`, `*.integration-test.ts`, and `*.e2e-test.ts` from production compilation in `tsconfig.build.json`.
- [x] Add an integration test that compiles `AppModule`, initializes its Nest application, and resolves `AppService` from the real module graph; always close the app.
- [x] Update the changelog for the test-infrastructure change.
- [x] Run all three test commands and `npm run build`; each category must execute at least one test and pass.

### Task 2: Add changelog/PR-title policy and local formatting hooks

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json` through npm only
- Create: `.husky/pre-commit`
- Create: `lint-staged` config in `package.json`
- Create: `scripts/pr-policy.mjs`
- Create: `scripts/pr-policy.test.mjs`
- Create: `.github/workflows/ci.yml`
- Modify: `CHANGELOG.md`

**Interfaces:** PR-policy pure function `evaluatePullRequestPolicy({ title, changedFiles, previousUnreleased, currentUnreleased }) -> string[]`; CLI reads GitHub PR event JSON and base/head Git refs. `npm run test:policy` runs its node:test suite.

- [x] Write node:test cases for conventional syntax, API/client scope requirements, new changelog bullets, docs/changelog-only PR behavior, and invalid scope/title cases; run to observe failing expectations.
- [x] Implement the policy module and CLI so only added bullet entries beneath `## Unreleased` satisfy the changelog gate.
- [x] Add Husky `pre-commit` with lint-staged Prettier write rules for changed TS/JS/JSON/YAML/Markdown files.
- [x] Add CI PR jobs for PR title/policy, unit, integration, e2e, lint/type/build quality, and Prettier `--check`; test jobs use Node 24 and `npm ci`.
- [x] Ensure policy/title CI runs for all PRs, while publish workflows use a separate merged-PR event.
- [x] Run policy tests, formatting check, lint, and build.

### Task 3: Add OpenAPI placeholder and generated workspace client

**Files:**

- Modify: root `package.json` workspaces/scripts
- Modify: `package-lock.json` through npm only
- Create: `API.yml`
- Create: `packages/typescript-client/package.json`
- Create: `packages/typescript-client/tsconfig.json`
- Create: `packages/typescript-client/src/index.ts`
- Generate: `packages/typescript-client/src/generated/api.ts`
- Modify: `.npmrc`
- Modify: `CHANGELOG.md`

**Interfaces:** root `npm run client:generate`; package exports `createPostPilotRClient(baseUrl)` and generated OpenAPI `paths` types; package `build` emits ESM JavaScript and declarations to `dist/`.

- [x] Add an OpenAPI 3.1 placeholder containing title `PostPilotR API`, version `0.0.1`, and `paths: {}`.
- [x] Add the client as npm workspace `@tsanta22kyle/postpilotr-client` with GHPackages `publishConfig`, `@hey-api/openapi-ts`, public ESM exports, and declarations.
- [x] Generate TypeScript SDK types from `API.yml` and expose a typed client factory; no API operations are fabricated while the contract has no endpoints.
- [x] Configure root `.npmrc` for `@tsanta22kyle` against `https://npm.pkg.github.com` and read auth only from `NODE_AUTH_TOKEN`.
- [x] Update lockfile via `npm install`; never replace it manually.
- [x] Run client generation twice and confirm no second-run diff; run the client build and root build.

### Task 4: Add Conventional Commit semantic releases for the client

**Files:**

- Modify: root `package.json` release scripts/dev dependencies
- Modify: `package-lock.json` through npm only
- Create: `packages/typescript-client/release.config.mjs`
- Create: `.github/workflows/client-release.yml`
- Modify: `.github/workflows/ci.yml` to validate release scopes
- Modify: `scripts/pr-policy.mjs` and its node:test cases
- Modify: `CHANGELOG.md`

**Interfaces:** semantic-release branches: `{ name: 'preproduction', channel: 'preproduction' }` and `{ name: 'production', channel: false }`. Preproduction uses ordinary SemVer on an isolated npm dist-tag, allowing it to publish before production exists; production promotes versions to the default `latest` channel. Git tags: `typescript-client-v${version}`. Release rules: `feat(api|client)` → minor, `fix(api|client)` and `perf(api|client)` → patch, breaking changes with either scope → major, all other scopes → no release.

- [x] Add tests proving release-scope matching and that backend-only scopes do not release the package.
- [x] Add semantic-release and its commit-analyzer, notes-generator, npm, and GitHub plugins.
- [x] Configure npm publication to the package's GHPackages registry; prerelease versions use channel `preproduction`, stable releases use `latest`.
- [x] Trigger the workflow only on `pull_request.closed`, exact base branches `preproduction`/`production`, and `merged == true`; check out full Git history and run validation/build before release.
- [x] Grant only the release job `contents: write` and `packages: write`; pass the workflow token through `NODE_AUTH_TOKEN`.
- [x] Confirm that production is configured as a release branch even before it exists; do not enable publication on `infra/base` or arbitrary branches.
- [x] Run policy tests and semantic-release dry-run/config checks locally without publishing.

### Task 5: Add DeepSource configuration and backend GHCR image workflow

**Files:**

- Create: `.deepsource.toml`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `.github/workflows/container-publish.yml`
- Modify: `CHANGELOG.md`

- [x] Configure DeepSource JavaScript/TypeScript analysis for Node/Vitest, identify all three test suffixes, and exclude `node_modules`, `dist`, and coverage output. Document that repository activation and dashboard checks require owner setup.
- [x] Add a multi-stage Node 24 Alpine Docker build, production-only dependencies, non-root runtime, exposed port 3000, and the actual Nest build output entry path.
- [x] Trigger container publishing only after merged PRs to `preproduction` or `production`, and require CI success before building.
- [x] Publish to `ghcr.io/tsanta22kyle/postpilotrapi` with immutable SHA tags plus `preproduction` or `latest` channel tags, using a dedicated job with only `packages: write`.
- [x] Docker build not run because Docker is unavailable in this environment; publishing remains restricted to the configured merged-PR workflow.

### Task 6: Document operations, release conventions, and owner setup

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`
- Modify: design doc and this plan if implementation findings require a recorded ruling

- [x] Document local CI commands and test filename patterns, changelog policy, Conventional Commit title/scopes, squash-merge requirement, client registry install/auth, prerelease/stable dist-tags, and GHCR image tags.
- [x] Document owner-side setup: enable Actions PR creation if required, create/protect `preproduction` and later `production`, set production as default when ready, require CI/DeepSource statuses, enable squash merge, activate DeepSource, and grant frontend users/packages access.
- [x] Verify README instructions against actual scripts and configuration.

### Task 7: Whole-change verification

- [x] Run `npm ci`, policy/unit/integration/e2e tests, `npm run lint`, `npm run format:check`, `npm run build`, client generate/build, and package dry-run inspection.
- [x] Parse workflow YAML, DeepSource TOML, OpenAPI YAML, and semantic-release config; confirm registry workflows cannot publish from unmerged PRs or arbitrary branches.
- [x] Review `git diff` and confirm no unrelated changes or publication occurred; preserve any user-owned edits.
