"""Publish every server in servers.json to the official MCP Registry.

Run after `mcp-publisher login ...`. The namespace comes from MCP_NAMESPACE, or
io.github.<repository owner> when run in GitHub Actions. A server whose version
is already published is reported and skipped.
"""
import json, os, subprocess, sys, tempfile

ns = os.environ.get("MCP_NAMESPACE") or "io.github." + os.environ["GITHUB_REPOSITORY_OWNER"]
publisher = os.environ.get("MCP_PUBLISHER", "./mcp-publisher")
servers = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "servers.json")))
publisher = os.path.abspath(publisher)
ok, skipped, failed = [], [], []
for s in servers:
    s = dict(s, name=s["name"].replace("NAMESPACE", ns))
    with tempfile.TemporaryDirectory() as d:
        json.dump(s, open(os.path.join(d, "server.json"), "w"), indent=2)
        r = subprocess.run([publisher, "publish"], cwd=d, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip()
    if r.returncode == 0:
        ok.append(s["name"])
    elif "already" in out.lower() or "duplicate" in out.lower():
        skipped.append(s["name"])
    else:
        failed.append(s["name"])
        print("FAILED", s["name"], out[-400:], file=sys.stderr)
print(f"published {len(ok)}, already there {len(skipped)}, failed {len(failed)}")
for n in ok:
    print("  +", n)
sys.exit(1 if failed else 0)
