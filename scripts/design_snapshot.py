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

A route cell begins with the path in backticks (`/`); what follows it is
prose. The app has no URL routes, so a change whose states are reached by
driving the UI registers a driver per state name in LIVE_DRIVERS below (008:
the twelve learner-leads rows — the mode words, the start circle, the sheet,
and the microphone fed by scripts/design-shots-page.mjs, shared with
design-shots.mjs). A row with no driver is opened at its path and shot as is.

Needs Playwright for Python (pip install playwright; playwright install
chromium). Stdlib otherwise. A row with no design file (wireframes) or no
route (live/reference) is skipped with a note, not an error.
"""
import re, sys, pathlib, argparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
# The State cell is the state's name in backticks, optionally followed by prose
# (`idle-i-lead` — 02: I lead underlined …).
ROW = re.compile(r"^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`[^|]*\|([^|]*)\|([^|]*)\|")


def route_path(cell):
    """The path a Route cell opens: its leading backticked token, else the
    cell itself when it has no backticks (rows written before routes carried
    prose), else empty."""
    cell = cell.strip()
    token = re.match(r"`([^`]*)`", cell)
    if token:
        return token.group(1).strip()
    return cell if cell.startswith("/") else ""


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
        route = route_path(m.group(3))
        design = m.group(4).strip().strip("`")
        out.append((screen, state, route, design))
    return out


# ---------------------------------------------------------------------------
# Live drivers. A driver takes the page (the app open at the row's path, the
# panel already on the stave) and the attempt number (0, 1, 2 …) and leaves
# the app in the row's state. `needs_mic` rows run in a browser that auto-
# accepts the microphone prompt and has getUserMedia replaced by
# harness-lib.mjs's override, with scripts/design-shots-page.mjs injected;
# `refused` rows in one that was never granted it. `verify(page)` (optional)
# says a time-boxed state was up; the row is re-driven on a fresh page while it
# says no. `full_page=False` is for overlays fixed to the viewport (the sheet).
# ---------------------------------------------------------------------------
PAGE_HELPERS = ROOT / "scripts" / "design-shots-page.mjs"
HARNESS_LIB = ROOT / "scripts" / "harness-lib.mjs"
VERIFY_ATTEMPTS = 4
SETTLE_MS = 500
# See design-shots.mjs: the advance is the burst's last reading, so the burst's
# length is the whole trick; the others are the retries' jitter.
ADVANCE_BURST_MS_BY_ATTEMPT = [650, 646, 654, 642]
BURST_WARMUP_MS = 300
AFTER_BURST_MS = 120
HOLDING_BEATS = 4
HOLDING_AFTER_ONSET_MS = 1450
COUNT_IN_WAIT_MS = 15_000


def tones(page, call, *args):
    return page.evaluate(f"(a) => window.__shotTones.{call}(...a)", list(args))


def choose_i_lead(page):
    page.get_by_test_id("mode-word-me").click()


def open_sheet(page):
    page.get_by_text("edit ›").click()
    page.get_by_test_id("sheet-close").wait_for()


def start_lead_run(page):
    page.get_by_test_id("start-circle").click()
    page.get_by_test_id("stop-circle").wait_for()


def hold_in_tune(page):
    tones(page, "setSettings", {"lead": {"holdBeats": HOLDING_BEATS}})
    start_lead_run(page)
    tones(page, "feed", 0)
    page.wait_for_timeout(HOLDING_AFTER_ONSET_MS)


def drive_playing_play_along(page, attempt):
    page.get_by_test_id("start-circle").click()
    page.get_by_text(re.compile(r"· 1 of 15")).wait_for(timeout=COUNT_IN_WAIT_MS)


def drive_listening_silent(page, attempt):
    choose_i_lead(page); start_lead_run(page); tones(page, "feed", None)


def drive_heard_out_of_tune(page, attempt):
    choose_i_lead(page); start_lead_run(page); tones(page, "feed", -18)


def drive_holding(page, attempt):
    choose_i_lead(page); hold_in_tune(page)


def drive_holding_meter_off(page, attempt):
    choose_i_lead(page)
    open_sheet(page)
    page.get_by_text("meter", exact=True).click()
    page.get_by_test_id("sheet-close").click()
    page.get_by_test_id("sheet-close").wait_for(state="hidden")
    hold_in_tune(page)


def drive_advanced(page, attempt):
    duration = ADVANCE_BURST_MS_BY_ATTEMPT[attempt]
    choose_i_lead(page)
    tones(page, "setSettings", {"lead": {"holdBeats": 1}})
    start_lead_run(page)
    page.wait_for_timeout(BURST_WARMUP_MS)
    tones(page, "burst", duration)
    page.wait_for_timeout(duration + AFTER_BURST_MS)


def verify_advanced(page):
    return tones(page, "leadSnapshot")["justHeld"] is not None


def drive_complete(page, attempt):
    choose_i_lead(page); start_lead_run(page)
    tones(page, "playRunToComplete", 30_000)


def drive_no_microphone(page, attempt):
    choose_i_lead(page)
    page.get_by_test_id("start-circle").click()
    page.get_by_test_id("no-mic-card").wait_for()


def drive_sheet_i_lead(page, attempt):
    choose_i_lead(page); open_sheet(page)


# state -> dict(driver, mic: None | "fed" | "refused", verify, full_page, settle_ms)
LIVE_DRIVERS = {
    "008-learner-leads": {
        "idle-play-along": dict(driver=lambda page, attempt: None),
        "idle-i-lead": dict(driver=lambda page, attempt: choose_i_lead(page)),
        "playing-play-along": dict(driver=drive_playing_play_along),
        "listening-silent": dict(driver=drive_listening_silent, mic="fed"),
        "heard-out-of-tune": dict(driver=drive_heard_out_of_tune, mic="fed"),
        "holding": dict(driver=drive_holding, mic="fed", settle_ms=0),
        "holding-meter-off": dict(driver=drive_holding_meter_off, mic="fed", settle_ms=0),
        "advanced": dict(driver=drive_advanced, mic="fed", settle_ms=0, verify=verify_advanced),
        "complete": dict(driver=drive_complete, mic="fed"),
        "no-microphone": dict(driver=drive_no_microphone, mic="refused"),
        "sheet-play-along": dict(driver=lambda page, attempt: open_sheet(page), full_page=False),
        "sheet-i-lead": dict(driver=drive_sheet_i_lead, full_page=False),
    },
}


# What a refused permission looks like to the app, whatever the browser build
# does with an unanswered prompt in headless.
MICROPHONE_REFUSED_SCRIPT = (
    "navigator.mediaDevices.getUserMedia = () => "
    "Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));"
)


def microphone_override_script():
    """harness-lib.mjs's installMicrophoneOverride, as an expression the page
    runs before its own scripts — read from the one place it is written."""
    text = HARNESS_LIB.read_text(encoding="utf-8")
    m = re.search(r"export function installMicrophoneOverride\(\) \{.*?\n\}\n", text, re.S)
    if not m:
        raise SystemExit("error: installMicrophoneOverride not found in scripts/harness-lib.mjs")
    return "(" + m.group(0).replace("export ", "", 1).rstrip() + ")()"


class LiveShooter:
    """Opens each live row in a fresh context (stored state is per context, and
    a row that chose I lead must not leak it into the next)."""

    def __init__(self, playwright, viewport):
        self.pw, self.viewport = playwright, viewport
        self.browsers = {}

    def browser(self, mic):
        if mic not in self.browsers:
            args = []
            if mic == "fed":
                args = ["--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]
            self.browsers[mic] = self.pw.chromium.launch(args=args)
        return self.browsers[mic]

    def close(self):
        for b in self.browsers.values():
            b.close()

    def shoot(self, url, target, spec, attempt):
        context = self.browser(spec.get("mic")).new_context(viewport=self.viewport, device_scale_factor=2, ignore_https_errors=True)
        page = context.new_page()
        if spec.get("mic") == "fed":
            page.add_init_script(microphone_override_script())
            page.add_init_script(path=str(PAGE_HELPERS))
        if spec.get("mic") == "refused":
            page.add_init_script(MICROPHONE_REFUSED_SCRIPT)
        page.goto(url, wait_until="networkidle")
        page.wait_for_function("() => window.__session !== undefined")
        # The canvas draws the panel as the stave (the app opens on names).
        page.get_by_text("stave", exact=True).click()
        try:
            spec["driver"](page, attempt)
        except Exception as error:  # a failing driver is a bug to fix, not to hide
            print(f"  ! {target.name}: driver failed — {str(error).splitlines()[0]}", file=sys.stderr)
        page.wait_for_timeout(spec.get("settle_ms", SETTLE_MS))
        verify = spec.get("verify")
        before = verify(page) if verify else True
        page.screenshot(path=str(target), full_page=spec.get("full_page", True))
        reached = before and (verify(page) if verify else True)
        context.close()
        return reached



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

    drivers = LIVE_DRIVERS.get(cid, {}) if a.mode != "wireframes" else {}
    jobs = []
    for screen, state, route, design in rows(change):
        name = f"{screen}--{state}"
        if a.mode == "wireframes":
            if not design or not design.split("?")[0].endswith(".html"):
                print(f"  · {name}: no wireframe file, skipped"); continue
            path, _, qs = design.partition("?")
            url = (change / path).resolve().as_uri() + ("?" + qs if qs else "")
            jobs.append((name, url, None))
        else:
            if not route:
                print(f"  · {name}: no route yet, skipped"); continue
            url = a.base.rstrip("/") + route
            jobs.append((name, url, drivers.get(state)))
            for v in variants:
                sep = "&" if "?" in url else "?"
                jobs.append((f"{name}--{v}", f"{url}{sep}variant={v}", drivers.get(state)))
    if not jobs:
        print("nothing to screenshot"); return 0

    def report(target, url):
        print(f"  {target.relative_to(ROOT) if target.is_relative_to(ROOT) else target}  ← {url}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
        shooter = LiveShooter(p, {"width": w, "height": h})
        for name, url, spec in jobs:
            target = out / f"{name}.png"
            if spec is None:
                page.goto(url, wait_until="networkidle")
                page.screenshot(path=str(target), full_page=True)
                report(target, url)
                continue
            for attempt in range(VERIFY_ATTEMPTS):
                if shooter.shoot(url, target, spec, attempt):
                    break
                print(f"  ! {name}: shot {attempt + 1}/{VERIFY_ATTEMPTS} missed the moment — retrying", file=sys.stderr)
            else:
                print(f"  ! {name}: the last shot did not catch the state", file=sys.stderr)
            report(target, url)
        shooter.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
