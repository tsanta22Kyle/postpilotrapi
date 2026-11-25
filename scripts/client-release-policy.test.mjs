import assert from 'node:assert/strict';
import test from 'node:test';
import analyzeCommit from '../node_modules/@semantic-release/commit-analyzer/lib/analyze-commit.js';
import { clientReleaseRules } from '../packages/typescript-client/release.config.mjs';

function releaseFor({ type, scope, breaking = false }) {
  return analyzeCommit(clientReleaseRules, {
    type,
    scope,
    notes: breaking ? [{ title: 'BREAKING CHANGE', text: 'Change' }] : [],
  });
}

test('API and client scopes map Conventional Commits to SemVer releases', () => {
  assert.equal(releaseFor({ type: 'feat', scope: 'api' }), 'minor');
  assert.equal(releaseFor({ type: 'feat', scope: 'client' }), 'minor');
  assert.equal(releaseFor({ type: 'fix', scope: 'api' }), 'patch');
  assert.equal(releaseFor({ type: 'perf', scope: 'client' }), 'patch');
  assert.equal(
    releaseFor({ type: 'fix', scope: 'api', breaking: true }),
    'major',
  );
});

test('backend scopes never trigger a client release', () => {
  assert.equal(releaseFor({ type: 'feat', scope: 'backend' }), false);
  assert.equal(releaseFor({ type: 'fix', scope: 'ci' }), false);
  assert.equal(releaseFor({ type: 'docs', scope: 'api' }), undefined);
});
