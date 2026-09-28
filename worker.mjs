// Good Turn Studio MCP layer: one MCP endpoint per connector, generated from each connector's OpenAPI spec.
// Stateless Streamable HTTP (JSON responses). Read-only: every tool is a GET on the product's public API.
import { PRODUCTS } from './products.js';

const VERSION = '1.0.0';
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const BY_SLUG = Object.fromEntries(PRODUCTS.map((p) => [p.slug, p]));
const MAX_TEXT = 60000;
const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version, last-event-id',
  'access-control-expose-headers': 'mcp-session-id, mcp-protocol-version',
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra } });
}
function html(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...CORS } });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Tools for a server: one product, or every product with the slug as a prefix (the /all server).
function toolsFor(slug) {
  if (slug !== 'all') return BY_SLUG[slug].tools.map((t) => ({ product: BY_SLUG[slug], tool: t, name: t.name }));
  return PRODUCTS.flatMap((p) => p.tools.map((t) => ({ product: p, tool: t, name: `${p.slug}_${t.name}` })));
}

function listTools(slug) {
  return toolsFor(slug).map(({ product, tool, name }) => ({
    name,
    title: slug === 'all' ? `${product.name}: ${tool.title}` : tool.title,
    description: slug === 'all' ? `${product.name}. ${tool.description}` : tool.description,
    inputSchema: tool.inputSchema,
    annotations: { title: tool.title, ...ANNOTATIONS },
  }));
}

function serverInfo(slug) {
  if (slug === 'all') {
    return {
      info: { name: 'goodturn-all', title: 'Good Turn Studio', version: VERSION },
      instructions: 'Everyday helpers from Good Turn Studio: ' + PRODUCTS.map((p) => p.name).join(', ') +
        '. Each tool name starts with its product. Every tool is read-only and nothing about the user is stored. Where an answer has a "say" field, it is a ready-to-read summary.',
    };
  }
  const p = BY_SLUG[slug];
  return {
    info: { name: `goodturn-${slug}`, title: p.name, version: p.version },
    instructions: `${p.about} Every tool is read-only and nothing about the user is stored. Where an answer has a "say" field, it is a ready-to-read summary. More at ${p.website}`,
  };
}

function buildUrl(product, tool, args) {
  let path = tool.path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) {
    if (v === undefined || v === null || v === '') continue;
    if (!(k in tool.inputSchema.properties)) continue;
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (tool.where[k] === 'path') path = path.replace(`{${k}}`, encodeURIComponent(val));
    else qs.append(k, val);
  }
  return product.base + path + (qs.toString() ? `?${qs}` : '');
}

async function callTool(slug, name, args) {
  const hit = toolsFor(slug).find((t) => t.name === name);
  if (!hit) return { rpcError: { code: -32602, message: `Unknown tool: ${name}` } };
  const { product, tool } = hit;
  const missing = tool.inputSchema.required.filter((k) => args?.[k] === undefined || args?.[k] === null || args?.[k] === '');
  if (missing.length) return { result: { isError: true, content: [{ type: 'text', text: `Missing required input: ${missing.join(', ')}.` }] } };

  const url = buildUrl(product, tool, args);
  let res;
  try {
    res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'GoodTurnMCP/' + VERSION }, signal: AbortSignal.timeout(25000) });
  } catch (e) {
    return { result: { isError: true, content: [{ type: 'text', text: `${product.name} did not answer in time. Please try again.` }] } };
  }
  const type = res.headers.get('content-type') || '';
  if (!type.includes('json')) {
    // Calendar files and other downloads: hand the user the link rather than the file.
    if (res.ok) {
      const kind = type.includes('calendar') ? 'calendar file' : 'file';
      const body = { link: url, kind };
      return { result: { content: [{ type: 'text', text: `Here is the ${kind}. Share this link with the user: ${url}` }], structuredContent: body } };
    }
    return { result: { isError: true, content: [{ type: 'text', text: `${product.name} returned an error (${res.status}).` }] } };
  }
  let data;
  try { data = await res.json(); } catch { return { result: { isError: true, content: [{ type: 'text', text: `${product.name} sent an answer that could not be read.` }] } }; }
  let text = JSON.stringify(data, null, 1);
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT) + '\n... (answer shortened)';
  const structured = Array.isArray(data) ? { results: data } : (data && typeof data === 'object' ? data : { value: data });
  const out = { content: [{ type: 'text', text }] };
  if (text.length <= MAX_TEXT) out.structuredContent = structured;
  if (!res.ok) out.isError = true;
  return { result: out };
}

async function handleRpc(slug, msg, protocol) {
  const { id, method, params } = msg || {};
  const isNote = id === undefined || id === null;
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id: isNote ? null : id, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof method !== 'string') return fail(-32600, 'Invalid request');
  if (isNote) return null; // notifications/initialized, notifications/cancelled and so on
  switch (method) {
    case 'initialize': {
      const asked = params?.protocolVersion;
      const s = serverInfo(slug);
      return reply({
        protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: s.info,
        instructions: s.instructions,
      });
    }
    case 'ping': return reply({});
    case 'tools/list': return reply({ tools: listTools(slug) });
    case 'tools/call': {
      const r = await callTool(slug, params?.name, params?.arguments || {});
      return r.rpcError ? fail(r.rpcError.code, r.rpcError.message) : reply(r.result);
    }
    case 'resources/list': return reply({ resources: [] });
    case 'resources/templates/list': return reply({ resourceTemplates: [] });
    case 'prompts/list': return reply({ prompts: [] });
    default: return fail(-32601, `Method not found: ${method}`);
  }
}

async function mcp(request, slug) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method === 'DELETE') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST for this MCP endpoint (Streamable HTTP, no event stream).' } }, 405, { allow: 'POST, DELETE, OPTIONS' });
  let body;
  try { body = await request.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  const protocol = request.headers.get('mcp-protocol-version') || PROTOCOLS[0];
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleRpc(slug, m, protocol)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202, headers: CORS });
  }
  const out = await handleRpc(slug, body, protocol);
  return out ? json(out) : new Response(null, { status: 202, headers: CORS });
}

const STYLE = `<style>:root{--bg:#fbfaf7;--fg:#1d1d1b;--mute:#5d5b55;--line:#e4e1d8;--acc:#2f6f5e}
@media(prefers-color-scheme:dark){:root{--bg:#161614;--fg:#eceae4;--mute:#a19e95;--line:#2e2d29;--acc:#7fc4b0}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}h1{font-size:28px;margin:0 0 6px}h2{font-size:18px;margin:28px 0 8px}
p,li{color:var(--mute)}a{color:var(--acc)}code{background:var(--line);padding:1px 5px;border-radius:4px;font-size:14px;word-break:break-all}
ul{padding-left:20px}.row{padding:10px 0;border-top:1px solid var(--line)}.row b{color:var(--fg)}</style>`;

function page(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${STYLE}</head><body><main>${inner}</main></body></html>`;
}

function home(origin) {
  const rows = PRODUCTS.map((p) => `<div class="row"><b><a href="/${p.slug}">${esc(p.name)}</a></b>: <code>${origin}/${p.slug}/mcp</code></div>`).join('');
  return page('Good Turn Studio MCP', `<h1>Good Turn Studio connectors</h1>
<p>Read-only MCP servers for everyday helpers. Add one to any assistant that supports remote MCP servers (Streamable HTTP, no sign-in). Nothing about you is stored.</p>
<h2>All in one</h2><div class="row"><b>Everything</b>: <code>${origin}/all/mcp</code></div>
<h2>One per product</h2>${rows}
<h2>More</h2><p><a href="/privacy">Privacy</a> · Support: hello@goodturnstudio.com</p>`);
}

function productPage(p, origin) {
  const tools = p.tools.map((t) => `<li><b>${esc(t.name)}</b>: ${esc(t.description.slice(0, 220))}${t.description.length > 220 ? '...' : ''}</li>`).join('');
  return page(`${p.name} MCP`, `<h1>${esc(p.name)}</h1><p>${esc(p.about)}</p>
<h2>MCP server</h2><p><code>${origin}/${p.slug}/mcp</code><br>Streamable HTTP, no sign-in, read-only.</p>
<h2>Tools</h2><ul>${tools}</ul>
<h2>Links</h2><p><a href="${esc(p.website)}">Website</a> · <a href="${esc(p.privacy)}">Privacy</a> · <a href="${esc(p.terms)}">Terms</a> · Support: ${esc(p.email)}</p>`);
}

function privacyPage() {
  return page('Privacy | Good Turn Studio MCP', `<h1>Privacy</h1>
<p>This service passes each request from your assistant to the product's own public API and returns the answer. It needs no account and sets no cookies.</p>
<h2>What we keep</h2><p>Nothing about you. Requests are not stored or logged by this service beyond Cloudflare's standard short-lived request logs used to keep it running. We don't sell or share data.</p>
<h2>What we receive</h2><p>Only the inputs a tool needs, such as a city, a product name, a store or a date. Don't put personal details in a request unless a tool asks for them (for example a name on a draft letter); those are used once to write the answer and are not kept.</p>
<h2>Each product</h2><ul>${PRODUCTS.map((p) => `<li>${esc(p.name)}: <a href="${esc(p.privacy)}">privacy</a>, <a href="${esc(p.terms)}">terms</a>, ${esc(p.email)}</li>`).join('')}</ul>
<p>Questions: hello@goodturnstudio.com. Last updated 28 September 2026.</p>`);
}

const __app = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/icons/') && env?.ASSETS) return env.ASSETS.fetch(request);
    if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') return env?.ASSETS ? env.ASSETS.fetch(new Request(url.origin + '/icons/goodturn.png')) : new Response(null, { status: 404 });
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const origin = url.origin;
    if (parts.length === 0) return html(home(origin));
    if (parts[0] === 'privacy') return html(privacyPage());
    if (parts[0] === 'health') return json({ ok: true, version: VERSION, products: PRODUCTS.length, tools: PRODUCTS.reduce((n, p) => n + p.tools.length, 0) });
    const slug = parts[0];
    if (slug !== 'all' && !BY_SLUG[slug]) return json({ error: 'Not found' }, 404);
    if (parts.length === 2 && parts[1] === 'mcp') return mcp(request, slug);
    if (parts.length === 1) return slug === 'all' ? Response.redirect(origin + '/', 302) : html(productPage(BY_SLUG[slug], origin));
    return json({ error: 'Not found' }, 404);
  },
};

// ---- Fair use (added 28 Sept 2026): a per-visitor limit on API calls so nobody can bulk-harvest or resell the API.
// Counts per visitor IP inside each running copy of the worker; normal use never gets near it.
const __FAIR = { perMinute: 300, perHour: 6000, seen: new Map() };
function __fairUse(request) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS" || !/^\/(v1|api)\/|\/mcp$/.test(url.pathname)) return null;
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!ip) return null;
  const now = Date.now();
  let e = __FAIR.seen.get(ip);
  if (!e || now - e.hourStart >= 3600000) e = { hourStart: now, hour: 0, minStart: now, min: 0 };
  if (now - e.minStart >= 60000) { e.minStart = now; e.min = 0; }
  e.min++; e.hour++;
  __FAIR.seen.set(ip, e);
  if (__FAIR.seen.size > 5000) { for (const [k, v] of __FAIR.seen) { if (now - v.hourStart >= 3600000) __FAIR.seen.delete(k); } }
  if (e.min <= __FAIR.perMinute && e.hour <= __FAIR.perHour) return null;
  const wait = e.min > __FAIR.perMinute ? Math.ceil((60000 - (now - e.minStart)) / 1000) : Math.ceil((3600000 - (now - e.hourStart)) / 1000);
  const say = "That's a lot of requests in a short time, so this one was paused. Please try again in " + (wait > 90 ? Math.ceil(wait / 60) + " minutes" : wait + " seconds") + ".";
  return new Response(JSON.stringify({ error: say, say, retry_after: wait }, null, 2), { status: 429, headers: { "content-type": "application/json; charset=utf-8", "retry-after": String(wait), "access-control-allow-origin": "*" } });
}

export default {
  ...__app,
  async fetch(request, env, ctx) {
    const limited = __fairUse(request);
    if (limited) return limited;
    return __app.fetch(request, env, ctx);
  },
};
