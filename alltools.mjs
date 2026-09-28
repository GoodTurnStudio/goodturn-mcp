// Calls every tool once through the live MCP endpoints with the official SDK client.
// NODE_USE_ENV_PROXY=1 node alltools.mjs [base]
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const BASE = process.argv[2] || 'https://goodturn-mcp.pages.dev';
const R = 't1';
const ARGS = {
  mizan: { screen_company: { ticker: 'AAPL' }, purify_dividend: { ticker: 'AAPL', dividend: 120 }, screen_portfolio: { holdings: 'AAPL:5000,MSFT:3000' }, calculate_zakat: { cash: 8000, gold_grams: 50 } },
  halalornot: { check_ingredients: { ingredients: 'sugar, gelatin' }, check_product_by_barcode: { barcode: '5000159484695' }, search_products: { q: 'Haribo Starmix' }, explain_ingredient: { name: 'E471' }, screen_stock: { ticker: 'NVDA' }, ask_is_it_halal: { q: 'Is Klarna halal?' }, check_fund: { ticker: 'VOO' }, check_crypto: { coin: 'bitcoin' }, check_medicine: { name: 'Creon' }, get_prayer_times: { city: 'London' } },
  faredeals: { find_deals: { from: 'Chicago' }, cheapest_dates: { from: 'Dallas', to: 'Cancun', month: '2026-12' }, look_up_place: { q: 'Birmingham' } },
  cheapestprice: { check_price: { q: 'Nintendo Switch OLED' } },
  spinmyday: { spin_my_day: { city: 'Chicago' } },
  cancelmysub: { get_cancel_steps: { service: 'Spotify' }, identify_charge: { text: 'APPLE.COM/BILL' }, get_cancel_reminder: { service: 'Netflix', renews_on: '2026-10-20' } },
  lowermybill: { get_bill_script: { bill: 'internet', provider: 'Spectrum' }, get_call_reminder: { bill: 'internet', provider: 'Xfinity', deal_ends: '2026-12-01' }, get_bill_help: { bill: 'internet', state: 'OH' } },
  pricedropback: { get_store_policy: { store: 'Best Buy' }, check_price_drop_claim: { store: 'Target', days_since_purchase: 5 }, get_claim_reminder: { store: 'Costco', purchase_date: '2026-09-20' } },
  findmymoney: { get_state_search: { state: 'Texas' }, get_sources: {} },
  supplementcheck: { get_supplement: { q: 'Nature Made Vitamin D3' }, get_nutrient: { name: 'zinc' }, check_dose: { nutrient: 'vitamin D', amount: 5000, unit: 'IU' }, check_stack: { items: 'vitamin D 2000 IU, zinc 50 mg' } },
  platepal: { get_food_nutrition: { q: 'chicken breast', grams: 150 }, get_barcode_nutrition: { code: '5000159484695' }, get_meal_ideas: { goal: 'high protein', diet: 'vegetarian' } },
  planmyworkout: { get_workout_plan: { goal: 'strength', days: 3 }, get_exercise: { name: 'Romanian deadlift' }, list_exercises: { muscle: 'glutes' } },
  medbillcheck: { check_price: { code: '99213', state: 'TX', charged: 450 }, search_services: { q: 'MRI knee' }, check_whole_bill: { lines: '99213:450, 80053:120' , state: 'TX' }, look_up_hospital: { name: 'Mayo Clinic' }, draft_bill_letter: { type: 'dispute', provider: 'City Hospital', amount: 120 } },
  appealmyclaim: { get_appeal_rights: { state: 'CA' }, get_appeal_deadlines: { plan_type: 'employer' }, explain_denial_code: { code: 'CO-50' }, draft_appeal_letter: { reason: 'medical_necessity', service: 'MRI' } },
  jobspotter: { search_jobs: { what: 'data analyst', where: 'Chicago' }, },
  syncmycycle: { get_todays_phase: { last_period: '2026-09-15' }, get_week_ahead: { last_period: '2026-09-15' } },
  wardrobeconnect: { find_clothes: { q: 'black denim jacket', max_price: 60 }, find_clothes_by_image: { image_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jean_jacket.jpg?width=400' } },
  formguide: { get_team: { team: 'Arsenal' }, get_fixtures: { team: 'Liverpool' }, get_results: { team: 'Chelsea' }, get_table: { league: 'premier league' }, compare_teams: { home: 'Arsenal', away: 'Chelsea' } },
  bookslikethis: { get_book: { title: 'Project Hail Mary' }, find_similar_books: { title: 'The Martian' }, get_author_books: { author: 'Andy Weir' } },
  talmud: { get_reading: { id: R }, search_readings: { q: 'kindness' }, get_talmud_text: { ref: 'Berakhot 2a' }, read_book: { book: 'pirkei-avot' } },
  gurbani: { get_reading: { id: R }, search_readings: { q: 'naam' }, get_ang: { ang: 1 }, get_shabad: { id: '1' }, read_book: { book: 'japji' } },
  gita: { get_reading: { id: R }, search_readings: { q: 'duty' }, get_verse: { chapter: 2, verse: 47 }, get_chapter: { chapter: 2 }, read_book: { book: 'gita' } },
  lore: { get_reading: { id: R }, search_readings: { q: 'Loki' }, read_book: { book: 'odyssey' } },
  stoics: { get_reading: { id: R }, search_readings: { q: 'anger' }, read_book: { book: 'enchiridion' } },
  bible: { get_reading: { id: R }, search_readings: { q: 'forgiveness' }, get_passage: { ref: 'John 3:16' } },
};

let ok = 0, bad = []; const aff = {};
for (const slug of Object.keys(ARGS)) {
  const c = new Client({ name: 'alltools', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/${slug}/mcp`)));
  const { tools } = await c.listTools();
  for (const t of tools) {
    const args = ARGS[slug][t.name] || {};
    let r;
    try { r = await c.callTool({ name: t.name, arguments: args }); } catch (e) { r = { isError: true, content: [{ text: String(e) }] }; }
    const text = (r.structuredContent?.say || r.content?.[0]?.text || '').replace(/\s+/g, ' ');
    const full = JSON.stringify(r); const hit = full.match(/(tag=halalornot|campid=|marker=|tp\.media|travelpayouts|affiliate|disclosure|buy\.stripe|adzuna\.com\/land|careerjet)/i); if (hit) (aff[slug] ||= new Set()).add(hit[1].toLowerCase());
    if (r.isError) bad.push(`${slug}.${t.name} ${JSON.stringify(args)} -> ${text.slice(0, 160)}`); else ok++;
  }
  await c.close();
}
console.log(`ok ${ok}, errors ${bad.length}`); for (const [k,v] of Object.entries(aff)) console.log('AFF', k, [...v].join(','));
bad.forEach((b) => console.log('  ' + b));
