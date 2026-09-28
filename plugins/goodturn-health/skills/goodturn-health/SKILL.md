---
name: goodturn-health
description: Use when the user asks about nutrition, supplements, workouts and cycle phases, plus help with US medical bills and insurance appeals. Covers Plate Pal, Supplement Check, Plan My Workout, Sync My Cycle, Med Bill Check, Appeal My Claim.
---

# Good Turn Health

This plugin connects 6 free, read-only helpers. Each is its own MCP server; pick the one that matches the question.

- **Plate Pal** (`platepal` server): Calories and nutrition for any food, chain meal or barcode, and meal ideas for a goal and diet.
- **Supplement Check** (`supplementcheck` server): Supplement labels, doses against official upper limits, and a whole-stack check for overlaps.
- **Plan My Workout** (`planmyworkout` server): A workout plan for your goal, level, days and equipment, and how to do any exercise.
- **Sync My Cycle** (`syncmycycle` server): Your likely menstrual cycle phase today and this week, with food and workout ideas.
- **Med Bill Check** (`medbillcheck` server): Is your US medical bill fair? Compares charges with Medicare rates and drafts a dispute letter.
- **Appeal My Claim** (`appealmyclaim` server): Appeal a denied US health insurance claim: denial codes, rights, deadlines and a draft letter.

## How to answer
- Call the matching tool with only the details the user gave. Ask one short question if a required input is missing (for example a ticker, a city or a date).
- Many answers carry a `say` field: a ready-made plain summary. Use it as the core of the reply, then add any detail the user asked for.
- Keep links the answer provides, and keep any disclosure line with affiliate links next to them.
- These are information tools. Health, money, legal and religious answers are general guidance, not professional advice or a religious ruling; say so briefly when it matters.
- Nothing about the user is stored by these servers, and none of them take payments.
