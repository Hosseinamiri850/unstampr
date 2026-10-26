# -*- coding: utf-8 -*-
"""Build messages/{locale}.json for locales whose translations live in
scripts/trans/<locale>.json (flat dot-keyed object). Validates key parity
against messages/en.json before writing."""
import io
import json
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def unflatten(flat):
    root = {}
    for k, v in flat.items():
        parts = k.split(".")
        node = root
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = v
    return root


def keys(d, p=""):
    out = set()
    for k, v in d.items():
        kk = f"{p}.{k}" if p else k
        if isinstance(v, dict):
            out |= keys(v, kk)
        else:
            out.add(kk)
    return out


def build(locale):
    with open(f"scripts/trans/{locale}.json", encoding="utf-8") as f:
        flat = json.load(f)
    data = unflatten(flat)

    with open("messages/en.json", encoding="utf-8") as f:
        en = json.load(f)

    ek, dk = keys(en), keys(data)
    missing, extra = ek - dk, dk - ek
    if missing or extra:
        print(f"{locale}: MISSING={sorted(missing)[:10]} EXTRA={sorted(extra)[:10]}")
        sys.exit(1)

    with open(f"messages/{locale}.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{locale}: ok ({len(ek)} keys)")


if __name__ == "__main__":
    for loc in sys.argv[1:]:
        build(loc)
