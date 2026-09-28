#!/usr/bin/env python3
"""Build products.js for the Good Turn Studio MCP layer from each connector's live OpenAPI spec.

Run: python3 build.py            (fetches specs, writes products.js)
     python3 build.py --offline  (uses specs/*.json already downloaded)
"""
import json, re, sys, urllib.request, os

HERE = os.path.dirname(os.path.abspath(__file__))

# slug, name, spec url, privacy, terms, support email, group
PRODUCTS = [
    ("mizan", "Mizan", "https://askmizan.com/openapi.json", "https://askmizan.com/privacy", "https://askmizan.com/terms", "hello@askmizan.com"),
    ("halalornot", "Halal or Not", "https://halalornot.pages.dev/api/v1/openapi.json", "https://halalornot.pages.dev/privacy", "https://halalornot.pages.dev/terms", "hello@askmizan.com"),
    ("faredeals", "Fare Deals", "https://faredeals.pages.dev/openapi.json", None, None, None),
    ("cheapestprice", "Cheapest Price", "https://cheapestprice.pages.dev/openapi.json", None, None, None),
    ("spinmyday", "Spin My Day", "https://spinmyday.pages.dev/openapi.json", None, None, None),
    ("cancelmysub", "Cancel My Sub", "https://cancelmysub.pages.dev/openapi.json", None, None, None),
    ("lowermybill", "Lower My Bill", "https://lowermybill.pages.dev/openapi.json", None, None, None),
    ("pricedropback", "Price Drop Back", "https://pricedropback.pages.dev/openapi.json", None, None, None),
    ("findmymoney", "Find My Money", "https://findmymoney.pages.dev/openapi.json", None, None, None),
    ("supplementcheck", "Supplement Check", "https://supplementcheck.pages.dev/openapi.json", None, None, None),
    ("platepal", "Plate Pal", "https://platepal.pages.dev/openapi.json", None, None, None),
    ("planmyworkout", "Plan My Workout", "https://planmyworkout.pages.dev/openapi.json", None, None, None),
    ("medbillcheck", "Med Bill Check", "https://medbillcheck.pages.dev/openapi.json", None, None, None),
    ("appealmyclaim", "Appeal My Claim", "https://appealmyclaim.pages.dev/openapi.json", None, None, None),
    ("jobspotter", "Job Spotter", "https://jobspotter.pages.dev/openapi.json", None, None, None),
    ("syncmycycle", "Sync My Cycle", "https://syncmycycle.pages.dev/openapi.json", None, None, None),
    ("wardrobeconnect", "Wardrobe Connect", "https://wardrobeconnect.pages.dev/openapi.json", None, None, None),
    ("formguide", "Form Guide", "https://formguide.pages.dev/openapi.json", None, None, None),
    ("bookslikethis", "Books Like This", "https://bookslikethis.pages.dev/openapi.json", None, None, None),
    ("talmud", "Talmud Scroller", "https://scripturescroller.pages.dev/talmud/openapi.json", "https://scripturescroller.pages.dev/privacy", "https://scripturescroller.pages.dev/terms", "scriptureappshelp@outlook.com"),
    ("gurbani", "Scroll the Gurbani", "https://scripturescroller.pages.dev/gurbani/openapi.json", "https://scripturescroller.pages.dev/privacy", "https://scripturescroller.pages.dev/terms", "scriptureappshelp@outlook.com"),
    ("gita", "Gita Scroller", "https://scripturescroller.pages.dev/gita/openapi.json", "https://scripturescroller.pages.dev/privacy", "https://scripturescroller.pages.dev/terms", "scriptureappshelp@outlook.com"),
    ("lore", "Scroll the Lore", "https://scripturescroller.pages.dev/lore/openapi.json", "https://scripturescroller.pages.dev/privacy", "https://scripturescroller.pages.dev/terms", "scriptureappshelp@outlook.com"),
    ("stoics", "Stoic Scroller", "https://scripturescroller.pages.dev/stoics/openapi.json", "https://scripturescroller.pages.dev/privacy", "https://scripturescroller.pages.dev/terms", "scriptureappshelp@outlook.com"),
    ("bible", "Bible Swipe", "https://scripturescroller.pages.dev/bible/openapi.json", "https://scripturescroller.pages.dev/privacy", "https://scripturescroller.pages.dev/terms", "scriptureappshelp@outlook.com"),
]

SKIP_OPS = {"health", "listEndpoints"}
# getJob only works in the same worker instance as the search that listed the job; search results already carry the details.
SKIP_TOOLS = set()  # jobspotter getJob restored 28 Sept (works across instances since 1.2.0)

# Hand-written titles where the spec's summary is too long to shorten cleanly.
TITLES = {
    ("mizan", "calculateZakat"): "Zakat owed on cash, gold, silver, shares and business stock",
    ("halalornot", "getPrayerTimes"): "Today's prayer times for a place, with Ramadan suhoor and iftar",
    ("supplementcheck", "getSupplement"): "A supplement's label, dose check and halal status",
    ("supplementcheck", "getNutrient"): "What a vitamin, mineral or supplement does and how much adults need",
    ("supplementcheck", "checkStack"): "Add up everything someone takes and check the daily totals",
}


# Plain descriptions for inputs the product specs leave undescribed (tool-quality scores and the Docker catalog check every input).
PARAM_DESC = {
    ("halalornot", "q"): "A product, brand or barcode to look up, for example Haribo Starmix or 5000159484695.",
    ("halalornot", "name"): "The ingredient or E-number, for example E471, carmine, gelatin or alcohol denat.",
    ("halalornot", "context"): "Whether the ingredient is in food or a cosmetic. Defaults to food.",
    ("halalornot", "ticker"): "A US stock ticker, for example AAPL or TSLA.",
    ("halalornot", "lat"): "Latitude of the place, in decimal degrees. Use with lon instead of city.",
    ("halalornot", "lon"): "Longitude of the place, in decimal degrees. Use with lat instead of city.",
    ("halalornot", "date"): "The day, YYYY-MM-DD. Defaults to today.",
    ("halalornot", "method"): "Calculation method: isna (North America), mwl (Muslim World League), umm_al_qura, egypt, karachi or moonsighting.",
    ("halalornot", "category"): "Only topics in this area: money, crypto, medicine, food or life.",
    ("halalornot", "city"): "City name, for example London or Chicago, IL.",
    ("faredeals", "one_way"): "True for one-way fares only.",
    ("faredeals", "nonstop"): "True for direct flights only.",
    ("faredeals", "limit"): "How many deals to return, 1 to 20.",
    ("faredeals", "q"): "A city or airport name or code, for example Lisbon or LIS.",
    ("spinmyday", "city"): "The city to plan the day in, for example Manchester or Austin, TX. Leave out with lat and lon for a random city.",
    ("spinmyday", "lat"): "Latitude, in decimal degrees, instead of city.",
    ("spinmyday", "lon"): "Longitude, in decimal degrees, instead of city.",
    ("spinmyday", "vibe"): "The feel of the day: chill, adventure, date, family, culture or foodie.",
    ("spinmyday", "budget"): "any, or free for free things only.",
    ("supplementcheck", "nutrient"): "The vitamin, mineral or supplement, for example vitamin D, magnesium or melatonin.",
    ("supplementcheck", "amount"): "The amount taken per day, in the unit given.",
    ("platepal", "goal"): "high protein, low carb, budget, quick or high fibre.",
    ("platepal", "diet"): "vegetarian, vegan, pescatarian or halal.",
    ("platepal", "meal"): "breakfast, lunch, dinner or snack.",
    ("planmyworkout", "name"): "The exercise, for example Romanian deadlift or push-up.",
    ("wardrobeconnect", "size"): "Clothing or shoe size to match, for example M, 10 or UK 8.",
    ("wardrobeconnect", "max_price"): "Highest price, in the local currency.",
    ("wardrobeconnect", "condition"): "any, new or used.",
    ("wardrobeconnect", "country"): "Two-letter country code for the eBay site and currency, for example US or GB.",
    ("formguide", "team"): "A club name, for example Liverpool or Real Madrid.",
    ("formguide", "home"): "The home club, for example Arsenal.",
    ("bookslikethis", "author"): "The author's name, to pin down the right book or list their books.",
    ("bookslikethis", "same_author"): "True to include more books by the same author.",
    ("bookslikethis", "country"): "Two-letter country code for the shop links, for example US or GB.",
    ("talmud", "q"): "Words to search for, for example kindness or Shabbat.",
    ("gurbani", "q"): "Words or a bani's name to search for, for example Japji or humility.",
    ("gurbani", "ang"): "The Ang (page) of Sri Guru Granth Sahib, 1 to 1430.",
    ("gurbani", "id"): "A BaniDB shabad ID.",
    ("gita", "q"): "Words to search for, for example duty or fear.",
    ("gita", "chapter"): "Chapter number, 1 to 18.",
    ("lore", "q"): "Words or a name to search for, for example Loki or Persephone.",
    ("stoics", "q"): "Words to search for, for example anger or death.",
    ("bible", "q"): "Words to search for, for example forgiveness or shepherd.",
}

def snake(op):
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", op)
    return re.sub(r"[^a-z0-9_]", "_", s.lower())


def clean(text):
    text = (text or "").replace("Meta Muse", "the assistant")
    text = re.sub(r"(?<!The )\bMuse\b", "the assistant", text)
    text = text.replace("—", ", ").replace("–", "-")
    text = re.sub(r"Read the say field aloud\.?", "The say field is a ready-made answer.", text)
    text = re.sub(r";\s*share the link rather than calling it yourself", "", text)
    text = re.sub(r";\s*always read the `note`", ", with a note", text)
    text = re.sub(r";\s*never give betting advice from it", ", not betting advice", text)
    text = re.sub(r",\s*so do not say it has not been adapted", ", so the film and TV status is unknown", text)
    text = re.sub(r"Do not use this for, and politely decline, questions about getting pregnant, fertile days, ovulation timing, contraception or pregnancy:", "Not for getting pregnant, fertile days, ovulation timing, contraception or pregnancy:", text)
    text = re.sub(r"Decline questions about conception, fertile days, contraception or pregnancy:", "Not for conception, fertile days, contraception or pregnancy:", text)
    text = re.sub(r";\s*always say the live price is on the booking page", ". The live price is on the booking page", text)
    # Drop sentences that steer the model towards shop or affiliate links (directory rules on promotion).
    keep = []
    for sent in re.split(r"(?<=[.!?])\s+", text):
        low = sent.lower()
        if re.search(r"\boffer\b", low) and re.search(r"\b(link|links|buy|shop|kit|extras|options)\b", low):
            continue
        if "kit links are suggestions" in low:
            continue
        # Drop sentences that tell the model how to behave (directory rule); keep ones about inputs and outputs.
        if re.match(r"(read|offer|present|always|never|ask for|say next|share (the|this|it|a) )\b", low):
            continue
        sent = re.sub(r":\s*read out the say line and offer[^.]*", ".", sent)
        keep.append(sent)
    text = " ".join(keep)
    return re.sub(r"\s+", " ", text).strip()


def short_title(t, limit=80):
    t = t.split(". ")[0].rstrip(". ")
    if len(t) <= limit:
        return t
    cut = t[:limit - 3]
    return cut[: cut.rfind(" ")].rstrip(",;: ") + "..."


def first_sentences(text, limit=300):
    text = clean(text)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    dot = cut.rfind(". ")
    return cut[: dot + 1] if dot > 80 else cut.rstrip() + "..."


def load(slug, url, offline):
    path = os.path.join(HERE, "specs", slug + ".json")
    if not offline:
        req = urllib.request.Request(url, headers={"user-agent": "goodturn-mcp-build"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        json.loads(data)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, "wb").write(data)
    return json.load(open(path))


def build(offline):
    out = []
    for slug, name, url, privacy, terms, email in PRODUCTS:
        spec = load(slug, url, offline)
        info = spec.get("info", {})
        base = spec["servers"][0]["url"].rstrip("/")
        origin = re.match(r"https?://[^/]+", url).group(0)
        about = clean(info.get("description", ""))
        tools = []
        for path, item in spec["paths"].items():
            for method, op in item.items():
                if method != "get":
                    continue
                oid = op.get("operationId")
                if not oid or oid in SKIP_OPS or (slug, oid) in SKIP_TOOLS:
                    continue
                desc = clean((op.get("summary", "") + ". " + op.get("description", "")).strip(". "))
                if len(desc) < 90:
                    desc = (desc + ". " if desc else "") + first_sentences(about, 240)
                desc = desc[:1500]
                props, required, where = {}, [], {}
                for p in op.get("parameters", []):
                    pname = p["name"]
                    schema = dict(p.get("schema", {"type": "string"}))
                    for k in list(schema):
                        if k not in ("type", "enum", "default", "minimum", "maximum", "format", "items"):
                            schema.pop(k)
                    pdesc = clean(p.get("description") or "")[:600]
                    if pdesc:
                        schema["description"] = pdesc
                    elif (slug, pname) in PARAM_DESC:
                        schema["description"] = PARAM_DESC[(slug, pname)]
                    elif p.get("example") is not None:
                        schema["description"] = "For example: " + str(p["example"])
                    props[pname] = schema
                    where[pname] = p.get("in", "query")
                    if p.get("required") or p.get("in") == "path":
                        required.append(pname)
                tools.append({
                    "name": snake(oid),
                    "title": TITLES.get((slug, oid)) or short_title(clean(op.get("summary") or oid)),
                    "description": desc,
                    "path": path,
                    "where": where,
                    "inputSchema": {"type": "object", "properties": props, "required": required, "additionalProperties": False},
                })
        names = [t["name"] for t in tools]
        assert len(names) == len(set(names)), (slug, names)
        out.append({
            "slug": slug,
            "name": name,
            "version": info.get("version", "1.0.0"),
            "about": first_sentences(about, 600),
            "base": base,
            "website": origin if slug not in ("talmud", "gurbani", "gita", "lore", "stoics", "bible") else origin + "/" + slug + "/",
            "privacy": privacy or origin + "/privacy",
            "terms": terms or origin + "/terms",
            "email": email or (info.get("contact", {}) or {}).get("email") or f"{slug}@goodturnstudio.com",
            "tools": tools,
        })
    js = "// Generated by build.py from each connector's OpenAPI spec. Do not edit by hand.\nexport const PRODUCTS = " + json.dumps(out, indent=1, ensure_ascii=False) + ";\n"
    os.makedirs(os.path.join(HERE, "site"), exist_ok=True)
    open(os.path.join(HERE, "products.js"), "w").write(js)
    total = sum(len(p["tools"]) for p in out)
    print(f"{len(out)} products, {total} tools")
    for p in out:
        print(f"  {p['slug']:16} {len(p['tools']):2} tools  {p['base']}")


if __name__ == "__main__":
    build("--offline" in sys.argv)
