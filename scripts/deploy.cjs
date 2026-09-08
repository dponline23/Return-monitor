const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEPLOYMENT_ID = process.env.RETURN_MONITOR_DEPLOYMENT_ID || '';

function runClasp(args) {
  const entry = require.resolve('@google/clasp');
  return execFileSync(process.execPath, [entry, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1' }
  }).trim();
}

function main() {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, '.clasp.json'), 'utf8'));
  if (config.scriptId !== '1kJJ4wr_MrxQm8gQWfM43uV5aVw2Pdvze2CFpr5hsoi6lsncI-qEF6dOi' || config.rootDir !== 'src') {
    throw new Error('Wrong Apps Script target.');
  }

  console.log(runClasp(['push', '--force']));

  if (!DEPLOYMENT_ID) {
    console.log('Source uploaded. RETURN_MONITOR_DEPLOYMENT_ID is not set, so /exec was not updated.');
    return;
  }
  if (!/^AKfycb[A-Za-z0-9_-]{20,}$/.test(DEPLOYMENT_ID)) {
    throw new Error('RETURN_MONITOR_DEPLOYMENT_ID must be the AKfycb... deployment ID.');
  }

  const description = `Return Monitor ${new Date().toISOString()} ${process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 12) : 'local'}`;
  console.log(runClasp(['update-deployment', DEPLOYMENT_ID, '--description', description, '--json']));
}

try { main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
