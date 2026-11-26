# Changelog

Notable changes to the PostPilotR backend are recorded here. Entries are added under `Unreleased` for every substantive codebase change, including bug fixes, features, tests, infrastructure, documentation, and maintenance. Client release versions and release notes are generated from Conventional Commits by semantic-release.

## Unreleased

### Added

- Established a project-wide changelog policy and required release-note checks for backend changes and API/client changes.
- Added an OpenAPI placeholder and generated TypeScript client workspace for GitHub Packages.
- Excluded compiled client build output from version control while retaining generated TypeScript sources.
- Added production Docker image build and repository setup documentation for CI, client consumption, releases, and GHCR.

### Changed

- Updated the documented Vitest test filename conventions to `.test.ts`, `.integration-test.ts`, and `.e2e-test.ts`.

### Infrastructure

- Split unit, integration, and e2e test commands and added an application-module integration check.
- Added pull request policy checks, independent GitHub Actions test and quality jobs, Prettier pre-commit formatting, and DeepSource configuration.
- Required scopes on Conventional Commit pull request titles and tested client release rules so backend-only scopes never trigger a client release.
- Added Conventional Commit based private client releases on merged `preproduction`/`production` pull requests, plus GHCR backend image publishing. The preproduction npm dist-tag works before the production branch exists; production promotes versions to `latest`.
- Added deterministic Prettier formatting to generated SDK output and a CI check that generated sources match `API.yml`.
