import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const conventionalTitlePattern =
  /^(?<type>[a-z][a-z0-9-]*)\((?<scope>[a-z0-9][a-z0-9-]*)\)(?<breaking>!)?: .+\S$/;
const allowedTypes = new Set([
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
]);

function unreleasedBullets(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+Unreleased\s*$/i.test(line));
  if (start === -1) return new Set();

  const end = lines.findIndex(
    (line, index) => index > start && /^##\s+/.test(line),
  );
  const section = lines.slice(start + 1, end === -1 ? undefined : end);
  return new Set(
    section
      .filter((line) => /^\s*-\s+\S/.test(line))
      .map((line) => line.trim()),
  );
}

export function evaluatePullRequestPolicy({
  title,
  changedFiles,
  previousChangelog,
  currentChangelog,
}) {
  const errors = [];
  const match = conventionalTitlePattern.exec(title ?? '');
  if (!match || !allowedTypes.has(match.groups.type)) {
    errors.push(
      'Use a scoped Conventional Commit PR title, for example "feat(api): add endpoint" or "fix(backend): correct validation".',
    );
  }

  const publicClientChange = changedFiles.some(
    (file) =>
      file === 'API.yml' || file.startsWith('packages/typescript-client/'),
  );
  if (
    publicClientChange &&
    !['api', 'client'].includes(match?.groups.scope ?? '')
  ) {
    errors.push(
      'Changes to API.yml or packages/typescript-client require PR title scope api or client so semantic-release can version the client.',
    );
  }

  const substantiveFiles = changedFiles.filter(
    (file) => file !== 'CHANGELOG.md',
  );
  if (substantiveFiles.length > 0) {
    const previous = unreleasedBullets(previousChangelog ?? '');
    const addedEntries = [...unreleasedBullets(currentChangelog ?? '')].filter(
      (entry) => !previous.has(entry),
    );
    if (addedEntries.length === 0) {
      errors.push(
        'Add a new bullet under "## Unreleased" in CHANGELOG.md for this repository change.',
      );
    }
  }

  return errors;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
}

function readBaseChangelog(baseRef) {
  try {
    return git(['show', `${baseRef}:CHANGELOG.md`]);
  } catch {
    return '';
  }
}

function run() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const baseBranch = process.env.GITHUB_BASE_REF;
  if (!eventPath || !baseBranch) {
    console.error('This policy check requires a GitHub pull_request event.');
    process.exitCode = 2;
    return;
  }

  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const baseRef = process.env.GITHUB_BASE_SHA ?? `origin/${baseBranch}`;
  const headRef = process.env.GITHUB_HEAD_SHA ?? 'HEAD';
  const changedFiles = git(['diff', '--name-only', `${baseRef}...${headRef}`])
    .split(/\r?\n/)
    .filter(Boolean);
  const currentChangelog = readFileSync('CHANGELOG.md', 'utf8');
  const errors = evaluatePullRequestPolicy({
    title: event.pull_request?.title,
    changedFiles,
    previousChangelog: readBaseChangelog(baseRef),
    currentChangelog,
  });

  if (errors.length > 0) {
    console.error('Pull request policy check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    'Pull request title, API scope, and changelog requirements passed.',
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  run();
}
