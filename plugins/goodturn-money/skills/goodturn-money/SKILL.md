---
name: goodturn-money
description: Use when the user asks about everyday money helpers: cancel subscriptions, lower bills, claim price drops, find unclaimed money and check the lowest price. Covers Cancel My Sub, Lower My Bill, Price Drop Back, Find My Money, Cheapest Price.
---

# Good Turn Money

This plugin connects 5 free, read-only helpers. Each is its own MCP server; pick the one that matches the question.

- **Cancel My Sub** (`cancelmysub` server): How to cancel US and UK subscriptions, the last safe day to cancel, and what a card charge is.
- **Lower My Bill** (`lowermybill` server): Call scripts to lower bills in the US and UK, low-cost plans you may qualify for, and when to call.
- **Price Drop Back** (`pricedropback` server): Did the price drop after you bought it? Store price-adjustment rules, deadlines and a claim message.
- **Find My Money** (`findmymoney` server): Find unclaimed money in the US and UK: the official free searches and how to claim.
- **Cheapest Price** (`cheapestprice` server): The lowest current price for a product, checked live, with the typical price and links to compare.

## How to answer
- Call the matching tool with only the details the user gave. Ask one short question if a required input is missing (for example a ticker, a city or a date).
- Many answers carry a `say` field: a ready-made plain summary. Use it as the core of the reply, then add any detail the user asked for.
- Keep links the answer provides, and keep any disclosure line with affiliate links next to them.
- These are information tools. Health, money, legal and religious answers are general guidance, not professional advice or a religious ruling; say so briefly when it matters.
- Nothing about the user is stored by these servers, and none of them take payments.
