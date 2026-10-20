import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultSource = path.join(os.homedir(), '.codex', 'private-sites', 'startup-progress');
const aad = Buffer.from('startup-progress/v1');
const payloadPattern = /(<script id="payload" type="application\/json">)([\s\S]*?)(<\/script>)/;
const dataPattern = /(<script id="dataset" type="application\/json">)([\s\S]*?)(<\/script>)/;

function assert(value, message) { if (!value) throw new Error(message); }
function payloadHash(wrapper) { return crypto.createHash('sha256').update(wrapper.match(payloadPattern)?.[2] || '').digest('hex'); }
function outsideRepo(directory) {
  const relative = path.relative(repo, path.resolve(directory));
  assert(relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'Keep decrypted source outside the public repository.');
}
function decode(wrapper, password) {
  const match = wrapper.match(payloadPattern);
  assert(match, 'Encrypted payload is missing.');
  const payload = JSON.parse(match[2]);
  assert(payload.version === 1 && payload.iterations === 600000, 'Unsupported encryption format.');
  const salt = Buffer.from(payload.salt, 'base64');
  const iv = Buffer.from(payload.iv, 'base64');
  const bytes = Buffer.from(payload.data, 'base64');
  assert(salt.length === 16 && iv.length === 12 && bytes.length > 16, 'Invalid encryption parameters.');
  const key = crypto.pbkdf2Sync(password, salt, payload.iterations, 32, 'sha256');
  try {
    const cipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    cipher.setAuthTag(bytes.subarray(-16));
    return { html: Buffer.concat([cipher.update(bytes.subarray(0, -16)), cipher.final()]).toString('utf8'), payload };
  } catch { throw new Error('Could not decrypt the site. Check the password and file integrity.'); }
  finally { key.fill(0); }
}
function readDataset(html) {
  const match = html.match(dataPattern);
  assert(match, 'Source dataset is missing.');
  return JSON.parse(match[2]);
}
function unique(values, label) {
  assert(values.every(v => typeof v === 'string' && v.length), `${label} must have nonempty IDs.`);
  assert(new Set(values).size === values.length, `${label} contain duplicate IDs.`);
}
function validate(html, data) {
  assert((html.match(/__INITIAL_HASH__/g) || []).length === 1, 'The source needs exactly one initial-route placeholder.');
  assert((html.match(new RegExp(dataPattern.source, 'g')) || []).length === 1, 'The source needs exactly one dataset script.');
  assert(Array.isArray(data.chapters) && data.chapters.length, 'Source chapters are missing.');
  unique(data.chapters.map(c => c.id), 'Chapters');
  const records = data.chapters.flatMap(c => c.items || []);
  unique(records.map(r => r.id), 'Records');
  const ids = new Set(records.map(r => r.id));
  for (const record of records) {
    assert(typeof record.title === 'string' && typeof record.body === 'string', 'Each record needs a title and body.');
    assert(Array.isArray(record.tags) && Array.isArray(record.sources), 'Each record needs tags and source references.');
    assert(record.sources.every(s => data.sources?.[s]), `A record has an unresolved source reference: ${record.id}.`);
  }
  if (data.thesis) {
    const groups = data.thesis.groups || [];
    const views = data.thesis.views || [];
    unique(groups.map(g => g.id), 'Thesis groups');
    unique(views.map(v => v.id), 'Thesis views');
    const groupIds = new Set(groups.map(g => g.id));
    const bases = new Set(['user-direction', 'source-position', 'working-hypothesis', 'open-decision']);
    for (const view of views) {
      assert(groupIds.has(view.group) && bases.has(view.basis), `A thesis view has an invalid group or basis: ${view.id}.`);
      for (const field of ['title', 'position', 'why', 'evidence', 'uncertainty', 'wouldChange', 'next']) {
        assert(typeof view[field] === 'string' && view[field].trim(), `A thesis view needs ${field}: ${view.id}.`);
      }
      assert(Array.isArray(view.sources) && view.sources.length, `A thesis view needs provenance: ${view.id}.`);
      for (const source of view.sources) {
        assert(source && typeof source === 'object' && ['label', 'kind', 'date'].every(field => typeof source[field] === 'string' && source[field].trim()), `A thesis view has incomplete provenance: ${view.id}.`);
      }
    }
    for (const entry of [...views, ...(data.thesis.decisions || []), ...(data.thesis.questions || [])]) {
      assert((entry.recordIds || []).every(id => ids.has(id)), 'A thesis entry references a missing record.');
    }
    for (const revision of data.thesis.revisions || []) {
      assert(views.some(v => v.id === revision.viewId), 'A thesis revision references a missing view.');
      assert(revision.date && revision.previousPosition && revision.reason, 'A thesis revision needs its date, previous position and reason.');
    }
  }
  if (data.directionAssessments) {
    const items = data.directionAssessments.items || [];
    unique(items.map(item => item.id), 'Direction assessments');
    for (const item of items) {
      assert(['research', 'product'].includes(item.kind) && item.title && item.stage, 'A direction needs its kind, title and evidence stage.');
      assert(Array.isArray(item.recordIds) && item.recordIds.length && item.recordIds.every(id => ids.has(id)), 'A direction references a missing record.');
      for (const field of ['priority', 'practicality', 'feasibility', 'impact', 'commercial']) {
        assert(item[field] && typeof item[field].label === 'string' && typeof item[field].reason === 'string', `A direction needs a ${field} assessment.`);
      }
      assert(item.alignment && ['label', 'property', 'remaining', 'claimBoundary'].every(field => typeof item.alignment[field] === 'string' && item.alignment[field].trim()), 'A direction needs a bounded alignment assessment.');
      assert(item.evidence && item.evidence.status && item.evidence.summary && Array.isArray(item.evidence.sources) && item.evidence.sources.length, 'A direction needs its evidence and provenance.');
      for (const source of item.evidence.sources) assert(source && ['label', 'date', 'kind', 'note'].every(field => typeof source[field] === 'string' && source[field].trim()), 'A direction has incomplete evidence provenance.');
    }
  }
  if (data.projectMap) {
    const map = data.projectMap, tracks = map.tracks || [], nodes = map.nodes || [];
    assert(/^\d{4}-\d{2}-\d{2}$/.test(map.asOf || '') && map.summary, 'The project map needs its date and summary.');
    unique([...tracks, ...nodes].map(item => item.id), 'Project map routes');
    const trackIds = new Set(tracks.map(track => track.id)), nodeIds = new Set(nodes.map(node => node.id));
    const statuses = new Set(['active', 'proposed', 'blocked', 'failed', 'historical']);
    const relations = new Set(['requires', 'supports', 'informs', 'alternative', 'blocks', 'tests', 'proposed-funding', 'role-discussion']);
    assert([...tracks, ...nodes].every(item => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)), 'Map route IDs must be lowercase words separated by single hyphens.');
    for (const track of tracks) {
      assert(track.title && track.description && Array.isArray(track.nodeIds) && track.nodeIds.length, 'Each map track needs its description and nodes.');
      assert(track.nodeIds.every(id => nodes.some(node => node.id === id && node.track === track.id)), 'A map track contains an unresolved or misassigned node.');
    }
    for (const node of nodes) {
      assert(trackIds.has(node.track) && statuses.has(node.statusCategory), 'A map node has an invalid track or status category.');
      assert(tracks.find(track => track.id === node.track).nodeIds.includes(node.id), 'A map node is missing from its track.');
      assert(/^\d{4}-\d{2}-\d{2}$/.test(node.date || ''), 'A map node needs a dated status.');
      for (const field of ['title', 'description', 'status', 'uncertainty', 'next']) assert(typeof node[field] === 'string' && node[field].trim(), `A map node needs ${field}.`);
      assert(node.evidence?.status && node.evidence.summary && Array.isArray(node.evidence.sources) && node.evidence.sources.length, 'A map node needs evidence and provenance.');
      for (const source of node.evidence.sources) assert(['label', 'date', 'kind', 'note'].every(field => typeof source[field] === 'string' && source[field].trim()), 'A map evidence source has incomplete provenance.');
      for (const dependency of node.dependencies || []) assert(nodeIds.has(dependency.target) && relations.has(dependency.type) && dependency.label, 'A map dependency needs a valid target and meaning.');
      for (const link of node.links || []) {
        assert(link.label && typeof link.target === 'string', 'A map link needs a label and target.');
        if (link.type === 'record') assert(ids.has(link.target), 'A map link references a missing record.');
        else if (link.type === 'thesis') assert(data.thesis?.views?.some(view => view.id === link.target), 'A map link references a missing thesis view.');
        else if (link.type === 'direction') assert(data.directionAssessments?.items?.some(item => item.id === link.target), 'A map link references a missing direction assessment.');
        else if (link.type === 'page') assert(/^(thesis|directions(?:\/(?:research|product))?|binder|alignment|updates|map(?:\/[a-z0-9-]+)?|chapter\/[a-z0-9-]+|record\/[a-zA-Z0-9-]+)$/.test(link.target), 'A map page link has an invalid route.');
        else if (link.type === 'url') { const url = new URL(link.target); assert(url.protocol === 'https:' && !url.username && !url.password, 'Map external links must use HTTPS without credentials.'); }
        else throw new Error('Unknown map link type.');
      }
    }
    for (const edge of map.edges || []) assert(nodeIds.has(edge.from) && nodeIds.has(edge.to) && relations.has(edge.type) && edge.label, 'A map edge needs valid endpoints and an explicit meaning.');
  }
  unique((data.updates || []).map(u => u.id), 'Updates');
  for (const update of data.updates || []) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(update.date || '') && update.summary && update.source, 'An update needs an ISO date, summary and source.');
    for (const target of update.targets || []) {
      if (target.kind === 'record') assert(ids.has(target.id), 'An update references a missing record.');
      else if (target.kind === 'thesis') assert(data.thesis?.views?.some(v => v.id === target.id), 'An update references a missing thesis view.');
      else if (target.kind === 'section') assert(['thesis', 'directions', 'alignment', 'updates', 'map', 'binder'].includes(target.id), 'An update references an unknown section.');
      else throw new Error('Unknown update target kind.');
    }
  }
  if (data.meta) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(data.meta.updatedAt || ''), 'Use an ISO date for the site update date.');
    assert(data.meta.sourceReviewedAt && data.meta.sourceCoverage, 'Keep the source-review date and coverage separate from the site update date.');
    assert(Number.isInteger(data.meta.revision) && data.meta.revision > 0, 'Use a positive site revision.');
  }
  return { chapters: data.chapters.length, records: records.length, thesisViews: data.thesis?.views?.length || 0, updates: data.updates?.length || 0, mapTracks: data.projectMap?.tracks?.length || 0, mapNodes: data.projectMap?.nodes?.length || 0 };
}
async function credentials() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { throw new Error('Provide a JSON object with password through stdin.'); }
  assert(typeof input.password === 'string' && input.password.length, 'Provide the existing site password through stdin.');
  return input.password;
}
async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);
  if (command === 'help') {
    console.log('Usage: node tools/site.mjs unpack|pack|validate [--source PRIVATE_DIRECTORY] [--site INDEX_HTML] [--check]\nUnpack and pack read {"password":"..."} from stdin. Passwords are never command-line options.');
    return;
  }
  assert(['unpack', 'pack', 'validate'].includes(command), 'Unknown command.');
  let source = defaultSource, site = path.join(repo, 'index.html'), check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source') { assert(args[i + 1], 'Missing source directory.'); source = path.resolve(args[++i]); }
    else if (args[i] === '--site') { assert(args[i + 1], 'Missing site file.'); site = path.resolve(args[++i]); }
    else if (args[i] === '--check') check = true;
    else throw new Error('Unknown option.');
  }
  outsideRepo(source);
  const htmlPath = path.join(source, 'site.html'), dataPath = path.join(source, 'content.json'), statePath = path.join(source, 'source-state.json');
  if (command === 'unpack') {
    const password = await credentials();
    const wrapper = await fs.readFile(site, 'utf8');
    const { html } = decode(wrapper, password);
    const data = readDataset(html), summary = validate(html, data);
    if (!check) {
      await fs.mkdir(source, { recursive: true });
      // Refresh source only when it matches the encrypted version. Preserve unfinished edits.
      for (const [target, text] of [[htmlPath, html], [dataPath, JSON.stringify(data, null, 2) + '\n']]) {
        let previous;
        try { previous = await fs.readFile(target, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        assert(previous === undefined || previous === text, 'Private source has local changes. Preserve them or choose a fresh source directory.');
      }
      await fs.writeFile(htmlPath, html, { mode: 0o600 });
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
      await fs.writeFile(statePath, JSON.stringify({ payloadHash: payloadHash(wrapper) }) + '\n', { mode: 0o600 });
    }
    console.log(JSON.stringify({ command, checkedOnly: check, source, ...summary }));
    return;
  }
  const sourceHtml = await fs.readFile(htmlPath, 'utf8');
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const summary = validate(sourceHtml, data);
  const html = sourceHtml.replace(dataPattern, (_, open, old, close) => open + JSON.stringify(data).replace(/</g, '\\u003c') + close);
  if (command === 'validate') {
    console.log(JSON.stringify({ command, source, ...summary }));
    return;
  }
  const password = await credentials();
  const wrapper = await fs.readFile(site, 'utf8');
  let state;
  try { state = JSON.parse(await fs.readFile(statePath, 'utf8')); } catch { throw new Error('Source base is missing. Unpack the current site into a fresh source directory first.'); }
  assert(state.payloadHash === payloadHash(wrapper), 'The encrypted site changed after this source was opened. Preserve local edits and merge against a fresh unpack.');
  const original = decode(wrapper, password);
  if (html === original.html) { console.log(JSON.stringify({ command, changed: false, ...summary })); return; }
  if (check) { console.log(JSON.stringify({ command, changed: true, checkedOnly: true, ...summary })); return; }
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, original.payload.iterations, 32, 'sha256');
  let encrypted;
  try {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    encrypted = Buffer.concat([cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  } finally { key.fill(0); }
  const payload = { ...original.payload, salt: salt.toString('base64'), iv: iv.toString('base64'), data: encrypted.toString('base64') };
  const output = wrapper.replace(payloadPattern, (_, open, old, close) => open + JSON.stringify(payload) + close);
  assert(decode(output, password).html === html, 'Encryption round-trip failed.');
  assert(!output.includes(password), 'Password appeared in the output.');
  const pending = site + '.pending-' + crypto.randomBytes(6).toString('hex');
  await fs.writeFile(pending, output);
  await fs.rename(pending, site);
  // Keep the private working copy synchronized with the exact encrypted source.
  await fs.writeFile(htmlPath, html, { mode: 0o600 });
  await fs.writeFile(statePath, JSON.stringify({ payloadHash: payloadHash(output) }) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ command, changed: true, ...summary }));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
