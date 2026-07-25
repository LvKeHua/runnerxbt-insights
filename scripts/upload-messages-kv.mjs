import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CF_API = 'https://api.cloudflare.com/client/v4';
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const API_TOKEN = process.env.CF_API_TOKEN;
const KV_NS = process.env.CF_KV_NAMESPACE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !KV_NS) {
  console.error('Missing required env vars: CF_ACCOUNT_ID, CF_API_TOKEN, CF_KV_NAMESPACE_ID');
  process.exit(1);
}

const raw = readFileSync(resolve(ROOT, 'data', 'messages_enriched.json'), 'utf-8');
const msgs = JSON.parse(raw);
const wrapped = JSON.stringify({ data: msgs, total: msgs.length });

console.log(`Uploading messages_response (${(wrapped.length / 1024).toFixed(1)} KB, ${msgs.length} items)...`);

const res = await fetch(`${CF_API}/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NS}/values/messages_response`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json; charset=utf-8',
  },
  body: wrapped,
});

const json = await res.json();
console.log('Result:', json.success ? 'SUCCESS' : 'FAILED', JSON.stringify(json.errors));
if (!json.success) process.exit(1);
