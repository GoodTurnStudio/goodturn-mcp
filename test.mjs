// Local test: runs the worker in Node against the live connector APIs.
// NODE_USE_ENV_PROXY=1 node test.mjs [baseUrl]   (baseUrl tests a deployed copy instead)
import worker from './deploy/_worker.js';

const BASE = process.argv[2];
async function call(path, body, method = 'POST') {
  const init = { method, headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = BASE ? await fetch(BASE + path, init) : await worker.fetch(new Request('https://t.test' + path, init));
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, type: res.headers.get('content-type') };
}

const SAMPLES = {
  mizan: ['screen_company', { ticker: 'AAPL' }],
  halalornot: ['check_ingredients', { ingredients: 'sugar, gelatin, E471', context: 'food' }],
  faredeals: ['find_deals', { from: 'New York', to: 'anywhere' }],
  cheapestprice: ['check_price', { q: 'AirPods Pro 2' }],
  spinmyday: ['spin_my_day', { city: 'London' }],
  cancelmysub: ['get_cancel_steps', { service: 'Netflix' }],
  lowermybill: ['get_bill_script', { bill: 'internet', provider: 'Xfinity' }],
  pricedropback: ['check_price_drop_claim', { store: 'Target', days_since_purchase: 5 }],
  findmymoney: ['get_state_search', { state: 'Ohio' }],
  supplementcheck: ['get_nutrient', { name: 'vitamin D' }],
  platepal: ['get_food_nutrition', { q: 'banana' }],
  planmyworkout: ['get_workout_plan', { goal: 'strength', days: 3 }],
  medbillcheck: ['check_price', { code: '99213', state: 'TX' }],
  appealmyclaim: ['explain_denial_code', { code: 'CO-50' }],
  jobspotter: ['search_jobs', { what: 'nurse', where: 'Austin' }],
  syncmycycle: ['get_todays_phase', { last_period: '2026-09-15' }],
  wardrobeconnect: ['find_clothes', { q: 'black denim jacket' }],
  formguide: ['get_table', { league: 'premier league' }],
  bookslikethis: ['find_similar_books', { title: 'The Martian' }],
  talmud: ['get_today', {}],
  gurbani: ['get_card', { n: 1 }],
  gita: ['get_verse', { chapter: 2, verse: 47 }],
  lore: ['read_book', { book: 'odyssey' }],
  stoics: ['search_readings', { q: 'anger' }],
  bible: ['get_passage', { ref: 'John 3:16' }],
};

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL', m); } };

// protocol basics
{
  const r = await call('/cancelmysub/mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  ok(r.body.result.protocolVersion === '2025-06-18' && r.body.result.serverInfo.title === 'Cancel My Sub', 'initialize');
  const n = await call('/cancelmysub/mcp', { jsonrpc: '2.0', method: 'notifications/initialized' });
  ok(n.status === 202, 'notification 202');
  const g = await call('/cancelmysub/mcp', undefined, 'GET');
  ok(g.status === 405, 'GET 405');
  const u = await call('/cancelmysub/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'nope', arguments: {} } });
  ok(u.body.error?.code === -32602, 'unknown tool');
  const m = await call('/cancelmysub/mcp', { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_cancel_steps', arguments: {} } });
  ok(m.body.result?.isError === true, 'missing input is a tool error');
  const rem = await call('/cancelmysub/mcp', { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_cancel_reminder', arguments: { service: 'Netflix', renews_on: '2026-10-20' } } });
  ok(rem.body.result?.structuredContent?.kind === 'calendar file', 'calendar link');
  const all = await call('/all/mcp', { jsonrpc: '2.0', id: 5, method: 'tools/list' });
  console.log('all: tools', all.body.result.tools.length);
  const bad = await call('/nothing/mcp', { jsonrpc: '2.0', id: 6, method: 'ping' });
  ok(bad.status === 404, 'unknown product 404');
  const a2 = await call('/all/mcp', { jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'gita_get_verse', arguments: { chapter: 2, verse: 47 } } });
  ok(!a2.body.result?.isError && a2.body.result.content[0].text.length > 50, 'all server call');
}

for (const [slug, [tool, args]] of Object.entries(SAMPLES)) {
  const list = await call(`/${slug}/mcp`, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const tools = list.body.result.tools;
  ok(tools.every((t) => t.annotations.readOnlyHint === true && t.inputSchema.type === 'object'), `${slug} annotations`);
  ok(tools.some((t) => t.name === tool), `${slug} has ${tool} (has ${tools.map((t) => t.name).join(', ')})`);
  const t0 = Date.now();
  const r = await call(`/${slug}/mcp`, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: tool, arguments: args } });
  const res = r.body.result;
  const text = res?.content?.[0]?.text || JSON.stringify(r.body.error);
  const say = res?.structuredContent?.say;
  ok(res && !res.isError, `${slug} ${tool}: ${text.slice(0, 200)}`);
  console.log(`${res && !res.isError ? 'ok  ' : 'ERR '} ${slug.padEnd(16)} ${String(tools.length).padStart(2)} tools  ${tool} ${Date.now() - t0}ms  ${(say || text).replace(/\s+/g, ' ').slice(0, 110)}`);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
