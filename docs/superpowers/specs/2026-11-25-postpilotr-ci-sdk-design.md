# PostPilotR CI and TypeScript Client Design

## Intent

Establish dependable pull request checks for the NestJS backend and provide the frontend with a privately published TypeScript client. The repository is currently a NestJS 12 ESM starter with Vitest, Supertest, Oxlint, Prettier, one controller unit test, and one HTTP e2e test. It has no integration-test category, CI workflows, DeepSource configuration, or identifiable client package. `package-lock.json` has a pre-existing uncommitted modification and must be preserved.

## Goals

- Run unit, integration, and e2e checks as separately visible CI jobs.
- Check code quality and formatting on pull requests.
- Format staged files automatically through Husky and lint-staged before they are committed.
- Maintain a root backend changelog for every substantive change and block pull requests that omit an entry.
- Add DeepSource static analysis, including security analysis, to pull request review.
- Build and publish a versioned private TypeScript client automatically for frontend consumers.
- Build and publish a versioned backend container image to GitHub Container Registry (GHCR).
- Keep local commands aligned with CI and document the release and package-consumption flow.

## Non-goals

- Deploy the backend or provision production infrastructure.
- Invent domain-level integration tests before the application has an integration boundary (database, external service, or substantive module).
- Publish the backend application as an npm package.
- Deploy the backend to a running production environment.
- Change the existing uncommitted lockfile edits.

## Constraints and Current State

- GitHub repository: `tsanta22Kyle/postpilotrapi`; active branch observed as `infra/base`.
- ESM TypeScript project using NodeNext and TypeScript 6.
- Existing scripts: `test`, `test:e2e`, `lint`, and write-mode `format`.
- The root `CHANGELOG.md` is the backend-wide history; client versions and release notes will be generated from Conventional Commits by semantic-release.
- `vitest.config.ts` selects `*.test.ts`; `vitest.config.e2e.ts` selects `*.e2e-test.ts`.
- Current test files are `src/app.controller.test.ts` and `test/app.e2e-test.ts`; both match their respective Vitest configuration patterns.
- The only current tests cover the starter greeting; there is no integration-specific configuration or test.
- DeepSource is an external GitHub repository integration; repository config alone cannot activate the service. Enable its supported JavaScript/TypeScript analyzers in the DeepSource account after repository activation.
- Proposed package location and registry are defaults pending owner confirmation: a workspace package in this repository published to GitHub Packages.

## Approaches

1. **One pull request workflow with independent jobs, plus a release workflow (recommended).** Unit, integration, e2e, quality, and formatting are distinct required checks while sharing workflow conventions. A separate package workflow publishes only after a release and successful validation. DeepSource reports its own PR status through its GitHub integration. This avoids duplicating setup across many YAML files while keeping the gates independently visible.
2. **One workflow file per gate.** Each check and package publishing flow is isolated in its own file. This is easy to navigate by subsystem but repeats Node setup, cache, permissions, and triggers, and can create redundant runs.
3. **One monolithic CI job.** All commands run sequentially in a single job, with DeepSource separately integrated. This minimizes YAML but hides which gate failed and prevents independent scheduling; it does not meet the desired visibility as well.

Recommendation: approach 1, using independent GitHub Actions jobs for the requested checks and DeepSource as a provider-managed PR check. Use Conventional Commit PR titles, squash merging, semantic-release with `api`/`client` release scopes, and grant package write permission only to the release publisher.

## Proposed Design

### Pull request validation

Create a GitHub Actions validation workflow for pull requests and pushes to the repository's default branch. It will use the lockfile with `npm ci`, a pinned Node LTS line, and caching. Independent jobs will cover:

- **Unit:** dedicated Vitest command/config that selects `*.test.ts` while excluding integration and e2e files.
- **Integration:** dedicated Vitest command/config selecting `*.integration-test.ts`. Because this suffix also matches the general `*.test.ts` pattern, the unit config must explicitly exclude it. Initially establish the category and command; add meaningful integration cases when a real module or boundary exists. Do not count an empty test suite as a passing integration gate.
- **E2E:** existing `test:e2e` command against the Nest application over HTTP, with files named `*.e2e-test.ts` to match the current config.
- **Quality:** Oxlint and TypeScript/build validation (exact division to avoid redundant expensive work is an implementation detail).
- **Format:** Prettier check mode, separate from the existing write-mode `format` script.
- **Changelog/release-note policy:** require a meaningful `CHANGELOG.md` diff for each substantive pull request. Validate Conventional Commit title syntax for all PRs and require scope `api` or `client` when `API.yml` or `packages/typescript-client/**` changes. The changelog check must require an added entry under `Unreleased`, not merely any edit to the file, and explain how to add missing information; changelog-only changes are exempt from recursively requiring another entry.

Each job should report independently. Branch protection/check requirements are a repository setting and need to be enabled after the workflow names exist.

### Local formatting hook

Add Husky and lint-staged. Configure a `pre-commit` hook to run Prettier in write mode only on staged supported files, so formatted content is included in the commit. Keep the pull request formatting job in check mode as the authoritative CI gate. A `pre-push` hook is not the chosen formatting hook: formatting at push time can modify files after they were committed, leaving the pushed commit unformatted while creating unrelated unstaged changes. If “à chaque push” means a specific push-time action rather than automatic formatting before commit, confirm that behavior before implementation.

### DeepSource SAST and code review

Add a `.deepsource.toml` enabling the applicable JavaScript/TypeScript static analysis and security analyzers, identifying test patterns and excluding generated output/dependencies. Activate the repository in DeepSource and confirm its PR status check. Document that activation and analyzer settings require account/repository setup; a committed config is not itself an executable GitHub Actions job.

### TypeScript client package

Add a workspace package (proposed path `packages/typescript-client`) with its own package metadata, public exports, TypeScript build output and declarations, and a narrowly scoped test/build command. Its initial public API should be derived from actual backend HTTP contracts; because none exist in this starter, the first implementation must identify the minimal useful contract or remain an explicit package scaffold until the first endpoint exists. Avoid generating a client for the sample greeting endpoint as a pretend stable API.

Publish the package to GitHub Packages under the repository owner scope only after a pull request has been merged into the exact target branch `preproduction` or `production`. Trigger on closed pull requests targeting either branch and require `pull_request.merged == true`; do not publish for PR updates, closures without merge, or merges to other branches. Configure both branch names now; the workflow must also work when `production` is created later.

Use Conventional Commit titles as the release input and semantic-release to compute SemVer, generate GitHub release notes, publish the package, and create a version tag. `feat(api):` / `feat(client):` requests a minor release; `fix(api):`, `fix(client):`, and matching `perf` commits request a patch; breaking `!` or `BREAKING CHANGE` with either scope requests a major. All other scopes are explicitly ignored so backend-only changes do not publish the client. PRs touching the API contract or generated client must use one of the two release scopes. Require squash merge so the PR title becomes the commit semantic-release analyzes.

Configure semantic-release with `preproduction` as a release branch using npm channel `preproduction`, and `production` as the default stable channel. This is deliberate: semantic-release requires at least one existing release branch, so a prerelease branch alone cannot publish while `production` is absent. The preproduction workflow therefore publishes ordinary SemVer versions to the isolated `preproduction` dist-tag; when the version reaches `production`, semantic-release promotes it to `latest`. Git tags use `typescript-client-v<version>` and the GitHub plugin creates GitHub Releases. Configure the package's `publishConfig.registry` as `https://npm.pkg.github.com`; do not set `private: true` on the publishable package. The client-release workflow must trigger only for merged PRs targeting either exact branch name and run validation/build first. It uses `GITHUB_TOKEN` with narrowly scoped `contents: write` and `packages: write` permissions. Document frontend `.npmrc` authentication, installation and release conventions. Publishing to npmjs.org is outside this proposal.

### Backend container publication to GHCR

Add a backend `Dockerfile` suitable for a production NestJS build, with a non-root runtime and only production runtime files/dependencies in the final image. Add a container workflow that builds and publishes to `ghcr.io/tsanta22kyle/postpilotrapi` after required validation, using immutable commit-SHA tags and moving `preproduction` or `latest` channel tags. Use the workflow `GITHUB_TOKEN` with package write permission only in the publishing job. Do not deploy or start the container in a production environment as part of this work.

Add a root `API.yml` as an explicitly placeholder OpenAPI contract. It must identify the application name and current application version in `info.title` and `info.version`, and define no endpoint paths. Include only the additional OpenAPI structure required for a valid document (`openapi` version and an empty `paths` object). Mark it as non-contractual until real endpoints are described. The container and client package version should derive from one documented source of truth, proposed as the root `package.json` version, avoiding hand-maintained drift with `API.yml`.

### Documentation

Update README with local check commands, test categories and naming conventions, private package installation/authentication, and release steps. Document which external settings/secrets are required and which are not (GitHub Packages uses the workflow token for publishing within the linked repository).

## Open Decisions / Proposed Defaults

- Client location: `packages/typescript-client` in this repository (default; confirm).
- Registry: GitHub Packages (default; confirm whether the frontend can authenticate to this registry).
- Client publish trigger: only after a PR is merged into `preproduction` or `production`; Conventional Commit titles scoped `api` or `client` determine whether and how semantic-release publishes a release. `preproduction` is a normal SemVer release on its isolated npm dist-tag so it can work before `production` exists; `production` promotes the version to `latest`.
- Backend image registry: GHCR at `ghcr.io/tsanta22kyle/postpilotrapi` (proposed from the repository owner/name).
- Image publish trigger: validated merged PRs to `preproduction`/`production`, tagged with immutable commit SHA and the matching moving channel tag.
- Hook timing: Husky `pre-commit` formats staged files with lint-staged; CI checks formatting in verify-only mode. This avoids a push hook changing files after commit.
- Integration-test target: define a separate `*.integration-test.ts` category now, but add substantive fixtures only when an actual integration boundary exists (default).
- Node runtime: use the currently supported LTS line and pin consistently; choose exact major during implementation based on the project's deployment runtime (currently unspecified).

## Acceptance Criteria

- Pull requests expose separate passing/failing unit, integration, e2e, quality, and formatting checks.
- The integration job fails if its designated test set is unintentionally empty; its useful test scope is explicitly documented.
- DeepSource reports configured TypeScript/SAST findings on pull requests after repository activation.
- A release publishes a built, versioned private client package only after validation, without granting package-write permissions to ordinary checks.
- A validated release publishes a production backend image to GHCR with its version tag.
- Root `API.yml` parses as OpenAPI and contains application title/version with no endpoint paths, clearly marked as a placeholder.
- The root `CHANGELOG.md` is updated for every substantive change; CI fails with a clear message when a pull request omits it.
- CI fails with a clear message when PR titles are not Conventional Commits, when API/client changes lack an `api`/`client` scope, or when release scope syntax would not produce the intended bump.
- Committing staged TypeScript or supported config files runs lint-staged Prettier formatting; CI still rejects unformatted content.
- A frontend contributor can authenticate, install, import, and build against the package using documented steps.
- Local README commands match CI behavior; existing developer edits in `package-lock.json` remain untouched.
