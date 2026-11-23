import { beforeAll, afterAll } from 'vitest';
import { connectRedis, disconnectRedis } from './src/lib/redis';
// Tests exercise real auth storage, just like startup, never a fail-open fallback.
beforeAll(async () => { await connectRedis(); });
afterAll(async () => { await disconnectRedis(); });
