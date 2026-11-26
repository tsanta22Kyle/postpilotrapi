import { createClient } from './generated/client/index.js';

export type { Client, ClientOptions } from './generated/client/index.js';
export type { Options } from './generated/index.js';

export function createPostPilotRClient(baseUrl: string) {
  return createClient({ baseUrl });
}
