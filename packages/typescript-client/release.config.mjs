export const clientReleaseRules = [
  { breaking: true, scope: 'api', release: 'major' },
  { breaking: true, scope: 'client', release: 'major' },
  { type: 'feat', scope: 'api', release: 'minor' },
  { type: 'feat', scope: 'client', release: 'minor' },
  { type: 'fix', scope: 'api', release: 'patch' },
  { type: 'fix', scope: 'client', release: 'patch' },
  { type: 'perf', scope: 'api', release: 'patch' },
  { type: 'perf', scope: 'client', release: 'patch' },
  { scope: '!{api,client}', release: false },
];

export default {
  // A release branch permits preproduction publication before production
  // exists. Production later promotes versions to npm's default channel.
  branches: [
    { name: 'preproduction', channel: 'preproduction' },
    { name: 'production', channel: false },
  ],
  tagFormat: 'typescript-client-v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { releaseRules: clientReleaseRules }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/npm', { npmPublish: true }],
    ['@semantic-release/github', { successComment: false, failComment: false }],
  ],
};
