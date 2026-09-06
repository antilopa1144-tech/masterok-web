// Run as root ON THE GHOST VPS. Never print configuration/key/DB errors.
// --inspect prints only existing Content integration names/IDs; no writes.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const ghostRequire = createRequire('/var/www/ghost/current/package.json');
const knex = ghostRequire('knex');

(async () => {
  let db;
  try {
    const config = JSON.parse(fs.readFileSync('/var/www/ghost/config.production.json', 'utf8'));
    db = knex({ ...config.database, client: 'mysql2', log: { error() {}, warn() {}, debug() {}, deprecate() {} } });
    const candidates = await db('api_keys').join('integrations', 'api_keys.integration_id', 'integrations.id')
      .where('api_keys.type', 'content').select('integrations.id', 'integrations.name', 'api_keys.secret');
    if (process.argv.includes('--inspect')) {
      console.log(JSON.stringify(candidates.map(({ id, name }) => ({ id, name }))));
      return;
    }
    const selected = candidates.find(row => row.id === process.argv[2]);
    if (!selected) throw new Error('selection');
    const output = '/etc/masterok-publication/config.json';
    if (fs.existsSync(output)) throw new Error('already configured');
    const key = fs.readFileSync(path.join(__dirname, 'indexnow-public-key.txt'), 'utf8').trim();
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('public key');
    fs.writeFileSync(output, JSON.stringify({
      site_url: 'https://getmasterok.ru', ghost_url: 'https://cms.getmasterok.ru',
      ghost_content_key: selected.secret, indexnow_key: key, mode: 'observe',
    }, null, 2) + '\n', { flag: 'wx', mode: 0o640 });
    console.log(JSON.stringify({ configured: true, mode: 'observe' }));
  } catch {
    console.error('publication_config_setup_failed');
    process.exitCode = 1;
  } finally {
    if (db) await db.destroy();
  }
})();
