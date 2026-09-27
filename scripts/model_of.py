#!/usr/bin/env python3
"""Print the model behind the tool call a hook is looking at.

  scripts/model_of.py < hook-input.json

Reads the hook's JSON input on stdin (it carries `transcript_path` and, for
PreToolUse, `tool_use_id`) and prints the model id of the assistant message
that issued that tool call, e.g. `claude-fable-5-1`. If the tool_use_id is not
in the transcript yet, falls back to the most recent real assistant message.
Prints nothing when it cannot tell (no transcript, unreadable, first turn);
callers treat that as "unknown" and fail open with a warning.

Stdlib only. Reads only the tail of the transcript, so it stays fast on long
sessions.
"""
import json
import os
import sys

TAIL_BYTES = 512 * 1024


def tail_lines(path):
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        if size > TAIL_BYTES:
            f.seek(size - TAIL_BYTES)
            f.readline()  # drop the partial first line
        return f.read().decode("utf-8", "replace").splitlines()


def main():
    try:
        hook = json.load(sys.stdin)
    except Exception:
        return 0
    path = hook.get("transcript_path") or ""
    want = hook.get("tool_use_id") or ""
    if not path or not os.path.isfile(path):
        return 0
    try:
        lines = tail_lines(path)
    except OSError:
        return 0

    last = ""
    for line in reversed(lines):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get("type") != "assistant":
            continue
        msg = d.get("message") or {}
        model = msg.get("model") or ""
        if not model or model.startswith("<"):  # "<synthetic>" entries are not a model
            continue
        if want:
            for block in msg.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("id") == want:
                    print(model)
                    return 0
        if not last:
            last = model
            if not want:
                break
    if last:
        print(last)
    return 0


if __name__ == "__main__":
    sys.exit(main())
