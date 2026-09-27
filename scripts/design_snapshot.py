#!/usr/bin/env python3
"""Screenshot every screen/state in a change's Interface table.

  design_snapshot.py changes/NNN wireframes
      Render each row's design file (file://…?state=…) to
      .sdd/design/NNN/wireframes/<screen>--<state>.png

  design_snapshot.py changes/NNN live --base http://localhost:5173 [--out DIR]
                                        [--variants a,b,c] [--viewport 390x844]
      Open each row's Route on the running app and screenshot it to DIR
      (default .sdd/design/NNN/live/). With --variants, each route is also
      opened with ?variant=<v> appended and saved as <screen>--<state>--<v>.png:
      one round of the refinement loop in one command.

  design_snapshot.py changes/NNN reference --base URL
      Same as live, written to changes/NNN/design/reference/ — the exit of the
      refinement loop. The fidelity pass compares against these.

Needs Playwright for Python (pip install playwright; playwright install
chromium). Stdlib otherwise. A row with no design file (wireframes) or no
route (live/reference) is skipped with a note, not an error.
"""
import re, sys, pathlib, argparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|([^|]*)\|([^|]*)\|")


def rows(change_dir):
    text = (change_dir / "proposal.md").read_text(encoding="utf-8")
    sec, out = False, []
    for line in text.splitlines():
        if line.startswith("## Interface"):
            sec = True; continue
        if sec and line.startswith("## "):
            break
        if not sec:
            continue
        m = ROW.match(line)
        if not m or m.group(1) == "<screen>":
            continue
        screen, state = m.group(1), m.group(2)
        route = m.group(3).strip().strip("`")
        design = m.group(4).strip().strip("`")
        out.append((screen, state, route, design))
    return out


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("change"); ap.add_argument("mode", choices=["wireframes", "live", "reference"])
    ap.add_argument("--base", default=""); ap.add_argument("--out", default="")
    ap.add_argument("--variants", default=""); ap.add_argument("--viewport", default="390x844")
    a = ap.parse_args(argv[1:])
    change = ROOT / a.change.rstrip("/")
    if not (change / "proposal.md").exists():
        print(f"error: {change}/proposal.md not found", file=sys.stderr); return 1
    cid = change.name
    w, h = (int(x) for x in a.viewport.lower().split("x"))
    if a.mode == "wireframes":
        out = pathlib.Path(a.out) if a.out else ROOT / ".sdd" / "design" / cid / "wireframes"
    elif a.mode == "reference":
        out = change / "design" / "reference"
    else:
        out = pathlib.Path(a.out) if a.out else ROOT / ".sdd" / "design" / cid / "live"
    if a.mode != "wireframes" and not a.base:
        print("error: --base URL of the running app is required", file=sys.stderr); return 1
    variants = [v for v in a.variants.split(",") if v] if a.mode == "live" else []
    out.mkdir(parents=True, exist_ok=True)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("error: Playwright for Python not installed: pip install playwright && playwright install chromium", file=sys.stderr)
        return 1

    jobs = []
    for screen, state, route, design in rows(change):
        name = f"{screen}--{state}"
        if a.mode == "wireframes":
            if not design or not design.split("?")[0].endswith(".html"):
                print(f"  · {name}: no wireframe file, skipped"); continue
            path, _, qs = design.partition("?")
            url = (change / path).resolve().as_uri() + ("?" + qs if qs else "")
            jobs.append((name, url))
        else:
            if not route:
                print(f"  · {name}: no route yet, skipped"); continue
            url = a.base.rstrip("/") + route
            jobs.append((name, url))
            for v in variants:
                sep = "&" if "?" in url else "?"
                jobs.append((f"{name}--{v}", f"{url}{sep}variant={v}"))
    if not jobs:
        print("nothing to screenshot"); return 0

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
        for name, url in jobs:
            page.goto(url, wait_until="networkidle")
            target = out / f"{name}.png"
            page.screenshot(path=str(target), full_page=True)
            print(f"  {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}  ← {url}")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
