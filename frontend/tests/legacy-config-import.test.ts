import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('retired frontend API config imports without runtime secrets, actual use still refuses missing config', () => {
  const env = { ...process.env }
  for (const key of ['DATABASE_URL', 'NEXTAUTH_SECRET', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'SMTP_HOST', 'S3_ACCESS_KEY_ID']) delete env[key]
  const result = spawnSync(process.execPath, ['--experimental-transform-types', '--input-type=module', '-e', `
    const cfg = await import('./lib/packagepro/config/index.ts');
    const { logger } = await import('./lib/packagepro/utils/logger.ts');
    logger.info('Import-only regression: no integration secrets needed');
    let rejected = false;
    try { cfg.getConfig(); } catch(error) { rejected = String(error).includes('DATABASE_URL'); }
    if (!rejected) throw new Error('Actual config use must still reject missing runtime configuration');
    rejected = false;
    try { void cfg.config.database; } catch(error) { rejected = String(error).includes('DATABASE_URL'); }
    if (!rejected) throw new Error('Compatibility config export must also remain strict on use');
  `], { cwd: process.cwd(), env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
})
