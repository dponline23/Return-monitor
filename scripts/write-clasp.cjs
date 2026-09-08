const fs = require('node:fs');
const path = require('node:path');

const SCRIPT_ID = '1kJJ4wr_MrxQm8gQWfM43uV5aVw2Pdvze2CFpr5hsoi6lsncI-qEF6dOi';
const file = path.resolve(__dirname, '..', '.clasp.json');
fs.writeFileSync(file, JSON.stringify({ scriptId: SCRIPT_ID, rootDir: 'src' }, null, 2) + '\n');
console.log('Configured .clasp.json for Return Monitor');
