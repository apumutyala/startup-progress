import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const match = html.match(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/);
if (!match || /<script id="dataset"/.test(html)) {
  throw new Error('Build requires the encrypted public index.html, not decrypted source.');
}
const payload = JSON.parse(match[1]);
if (payload.version !== 1 || payload.iterations !== 600000 || !payload.data) {
  throw new Error('Unexpected encrypted payload format.');
}
const output = path.join(root, 'dist');
await fs.mkdir(output, { recursive: true });
const unexpected = (await fs.readdir(output)).filter(name => name !== 'index.html');
if (unexpected.length) throw new Error('dist contains unexpected files; inspect it before publishing.');
await fs.copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));
console.log('Built dist/index.html. Only the encrypted public website is included.');
