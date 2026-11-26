import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePullRequestPolicy } from './pr-policy.mjs';

const baseChangelog = '# Changelog\n\n## Unreleased\n\n### Added\n\n';

test('accepts a conventional API change with a new Unreleased entry', () => {
  const errors = evaluatePullRequestPolicy({
    title: 'feat(api): add scheduled posts',
    changedFiles: ['API.yml', 'CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog: `${baseChangelog}- Add scheduled posts to the API contract.\n`,
  });

  assert.deepEqual(errors, []);
});

test('rejects non-conventional pull request titles', () => {
  const errors = evaluatePullRequestPolicy({
    title: 'Add scheduled posts',
    changedFiles: ['src/app.service.ts', 'CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog: `${baseChangelog}- Add scheduled posts.\n`,
  });

  assert.ok(errors.some((error) => error.includes('Conventional Commit')));
});

test('requires a scope so client release rules cannot fall back to defaults', () => {
  const errors = evaluatePullRequestPolicy({
    title: 'feat: add a route',
    changedFiles: ['src/app.service.ts', 'CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog: `${baseChangelog}- Add a route.\n`,
  });

  assert.ok(
    errors.some((error) => error.includes('scoped Conventional Commit')),
  );
});

test('requires api or client scope for public contract and client changes', () => {
  const errors = evaluatePullRequestPolicy({
    title: 'feat(backend): add a route',
    changedFiles: ['API.yml', 'CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog: `${baseChangelog}- Add a route.\n`,
  });

  assert.ok(errors.some((error) => error.includes('api or client')));
});

test('requires a new bullet under Unreleased for substantive changes', () => {
  const errors = evaluatePullRequestPolicy({
    title: 'fix(backend): handle empty input',
    changedFiles: ['src/app.service.ts', 'CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog: baseChangelog,
  });

  assert.ok(errors.some((error) => error.includes('new bullet')));
});

test('does not recursively require a changelog entry for a changelog-only PR', () => {
  const errors = evaluatePullRequestPolicy({
    title: 'docs(backend): correct changelog wording',
    changedFiles: ['CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog: baseChangelog,
  });

  assert.deepEqual(errors, []);
});

test('does not accept a new bullet outside the Unreleased section', () => {
  const currentChangelog = `${baseChangelog}\n## 0.0.1\n\n- Old release note.\n`;
  const errors = evaluatePullRequestPolicy({
    title: 'fix(backend): handle empty input',
    changedFiles: ['src/app.service.ts', 'CHANGELOG.md'],
    previousChangelog: baseChangelog,
    currentChangelog,
  });

  assert.ok(errors.some((error) => error.includes('new bullet')));
});
