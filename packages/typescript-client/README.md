# PostPilotR TypeScript client

This package provides the generated TypeScript API types and typed fetch client for PostPilotR. The current `API.yml` is a placeholder with no operations; the typed request surface will grow as endpoints are added to the contract.

## Install from GitHub Packages

Configure the `@tsanta22kyle` scope in `.npmrc` and provide a GitHub token that can read the package:

```ini
@tsanta22kyle:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then install with `NODE_AUTH_TOKEN` available in the environment:

```sh
npm install @tsanta22kyle/postpilotr-client
```

## Use

```ts
import { createPostPilotRClient } from '@tsanta22kyle/postpilotr-client';

const client = createPostPilotRClient('https://api.example.com');
```

The API contract currently has no operations, so this initial package provides the typed HTTP client setup without endpoint methods. Add an operation to `API.yml` to generate corresponding typed SDK functions.

Run `npm run client:generate` from the repository root after editing `API.yml`. CI verifies the generated output and package build.
