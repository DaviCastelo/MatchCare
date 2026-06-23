#!/usr/bin/env python3
"""
Loads a zip_codes CSV (produced by build_zip_codes.py) into the Supabase
`zip_codes` table via the PostgREST API, using the service-role key from
.env.local. Upserts in batches so re-runs are idempotent.

Usage:
  python load_zip_codes.py                       # loads zip_codes_CA.csv
  python load_zip_codes.py zip_codes_ALL.csv
"""
import csv
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BATCH = 500


def read_env(path: str) -> dict:
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def post_batch(url: str, key: str, rows: list[dict]):
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        f"{url}/rest/v1/zip_codes?on_conflict=zip",
        data=body,
        method="POST",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.status


def main():
    csv_name = sys.argv[1] if len(sys.argv) > 1 else "zip_codes_CA.csv"
    csv_path = csv_name if os.path.isabs(csv_name) else os.path.join(HERE, csv_name)

    env = read_env(os.path.join(ROOT, ".env.local"))
    url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = env["SUPABASE_SERVICE_ROLE_KEY"]

    rows = []
    with open(csv_path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append({
                "zip": r["zip"],
                "city": r["city"],
                "state": r["state"],
                "lat": float(r["lat"]),
                "lng": float(r["lng"]),
            })

    total = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        post_batch(url, key, batch)
        total += len(batch)
        print(f"upserted {total}/{len(rows)}")

    print(f"done: {total} rows from {os.path.basename(csv_path)}")


if __name__ == "__main__":
    main()
