# PostPilotR API

NestJS 12 backend for PostPilotR. `API.yml` is currently a placeholder with no
operations; add and review real API operations there before distributing a
typed client for them.

## Development

```bash
npm ci
npm run start:dev
```

The application listens on port 3000 by default. Set `PORT` to override it.
Use `npm run build` and `npm run start:prod` for a production build.

## Checks and tests

| Command                          | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `npm run test:unit`              | Unit tests named `*.test.ts`                                |
| `npm run test:integration`       | Nest module integration tests named `*.integration-test.ts` |
| `npm run test:e2e`               | HTTP end-to-end tests named `*.e2e-test.ts` in `test/`      |
| `npm run test:policy`            | Tests for PR title/changelog policy                         |
| `npm run lint`                   | Oxlint checks                                               |
| `npm run format:check`           | Prettier check without writing files                        |
| `npm run build`                  | Backend TypeScript build                                    |
| `npm run client:build`           | Generate the TypeScript client and compile it               |
| `npm run client:check-generated` | Check that committed client sources match `API.yml`         |

`npm test` runs unit tests. Husky and lint-staged format staged supported files
before each commit. Pull requests must use a scoped Conventional Commit title and add
a new bullet under `Unreleased` in `CHANGELOG.md` for every substantive change.
Changes to `API.yml` or `packages/typescript-client/` require the `api` or
`client` title scope. Use squash merges so the pull request title becomes the
release commit message.

## TypeScript client releases

The generated workspace is `@tsanta22kyle/postpilotr-client`. Run
`npm run client:generate` after editing `API.yml`, and review the generated
changes along with the contract. The package is published to GitHub Packages
only after a PR is merged into `preproduction` or `production`:

- `feat(api):` / `feat(client):` creates a minor release.
- `fix(...)` and `perf(...)` with either scope create a patch release.
- A breaking change (`!` or `BREAKING CHANGE`) creates a major release.
- Other scopes do not publish the client.

`preproduction` publishes SemVer versions on npm dist-tag `preproduction`;
`production` publishes/promotes versions on `latest`. This lets `preproduction`
release before the `production` branch exists. These are separate npm
channels, not `-preproduction.N` SemVer prereleases. GitHub Releases and tags
use `typescript-client-v<version>`.

Frontend setup for GitHub Packages (use a read-only token with access to this
package):

```ini
# .npmrc
@tsanta22kyle:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @tsanta22kyle/postpilotr-client
```

Then import `createPostPilotRClient` from the package. The token should be
provided through the developer's environment or CI secret, not committed.

## Backend image

Merged PRs to `preproduction` and `production` publish
`ghcr.io/tsanta22kyle/postpilotrapi` with an immutable commit SHA tag and a
moving `preproduction` or `latest` channel tag, after backend checks pass.

## Repository setup required

- Create `preproduction`; create `production` when ready. Both branch names are
  already configured in release workflows.
- Require the CI checks and DeepSource status in branch protection, and enable
  squash merging.
- Activate this repository in DeepSource and enable its JavaScript/TypeScript
  and Docker analyzers. The committed `.deepsource.toml` supplies analyzer
  configuration; the GitHub integration must be enabled by an owner.
- Give frontend developers or their CI a token with read access to the private
  GitHub package. Publishing uses the workflow's `GITHUB_TOKEN`.
- Grant repository Actions permission to create releases and publish packages.
  GHCR package visibility/access may need to be set to match the intended
  consumers.

## Observability

The app is instrumented with NestJS Observe. Run `npx @nestjs/observe link` and
approve the browser code to write `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` to
`.env`; production should receive them as environment variables.
