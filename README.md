# goodturn-mcp

Remote MCP servers for 25 free, read-only everyday helpers by Good Turn Studio: money, health, jobs, travel, shopping, halal checks, football and scripture reading. One Cloudflare Worker turns each product's public OpenAPI spec into an MCP server, so any assistant that speaks MCP (Claude, ChatGPT, Alexa+, Cursor, VS Code and others) can use them.

- One server per product: `https://goodturn-mcp.pages.dev/<slug>/mcp`
- All products in one: `https://goodturn-mcp.pages.dev/all/mcp` (tool names start with the product slug)
- Streamable HTTP, stateless JSON, MCP 2025-11-25 (and 2025-06-18, 2025-03-26), no sign-in
- Every tool is read-only, with a title and annotations (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`)
- Nothing about the user is stored. Privacy: https://goodturn-mcp.pages.dev/privacy

## Products

| Product | Slug | What it does |
|---|---|---|
| Mizan | `mizan` | Shariah screening of US stocks under four standards, halal alternatives, purification, zakat |
| Halal or Not | `halalornot` | Halal checks for food, ingredients, medicines, stocks, funds and crypto |
| Fare Deals | `faredeals` | Cheap flights from any city, and the cheapest days to fly |
| Cheapest Price | `cheapestprice` | The lowest current price for a product, checked live |
| Spin My Day | `spinmyday` | A whole day out in any city, matched to weather, mood and diet |
| Cancel My Sub | `cancelmysub` | How to cancel US and UK subscriptions, and what a card charge is |
| Lower My Bill | `lowermybill` | Call scripts and low-cost plans to lower household bills |
| Price Drop Back | `pricedropback` | Store price-adjustment rules, deadlines and a claim message |
| Find My Money | `findmymoney` | Official unclaimed money searches in the US and UK |
| Supplement Check | `supplementcheck` | Supplement labels and doses against official upper limits |
| Plate Pal | `platepal` | Calories and nutrition for foods, chain meals and barcodes |
| Plan My Workout | `planmyworkout` | Workout plans and how to do any exercise |
| Med Bill Check | `medbillcheck` | US medical bills against Medicare rates, with dispute letters |
| Appeal My Claim | `appealmyclaim` | US health insurance denials, rights, deadlines and appeal letters |
| Job Spotter | `jobspotter` | Current US and UK job listings |
| Sync My Cycle | `syncmycycle` | Likely cycle phase today, with food and workout ideas |
| Wardrobe Connect | `wardrobeconnect` | Clothes that match a description or a picture |
| Form Guide | `formguide` | Football form, fixtures, results and tables |
| Books Like This | `bookslikethis` | Books like one you enjoyed, and screen adaptations |
| Talmud Scroller | `talmud` | Daily Talmud with Daf Yomi, and tractates in English |
| Scroll the Gurbani | `gurbani` | Daily Gurbani with English, any Ang or shabad |
| Gita Scroller | `gita` | Daily Bhagavad Gita verses with English |
| Scroll the Lore | `lore` | Greek and Norse myth, Homer, Hesiod and the Poetic Edda |
| Stoic Scroller | `stoics` | Marcus Aurelius, Epictetus and Seneca |
| Bible Swipe | `bible` | Daily Bible readings and any passage |

## How it works

- `build.py` reads each product's live `openapi.json` and writes `products.js`: one tool per GET operation, named from its `operationId`, with inputs from its parameters. Descriptions are tidied into plain tool descriptions.
- `worker.mjs` is the MCP server: `initialize`, `tools/list` and `tools/call`, which calls the product's own API and returns its answer. Answers with a `say` field carry a ready-made summary.
- `servers.json` lists every server for the official MCP Registry (as `io.github.GoodTurnStudio/<slug>`). The **Publish to the MCP Registry** workflow logs in with GitHub OIDC and runs `publish.py`; `publish.ps1` does the same from Windows.

## Build and test

    npm install
    npm run build          # python3 build.py, then bundle to deploy/_worker.js
    npm test               # every product through the worker, against the live APIs
    npm run test:live      # every tool through the deployed servers with the MCP SDK client

Deploy `deploy/` as a Cloudflare Pages project in advanced mode (`_worker.js`).

## Licence

MIT for this code. Each product's API, data and answers belong to that product and are served under its own terms, linked from its page at `https://goodturn-mcp.pages.dev/<slug>`.
