#!/usr/bin/env python3
"""
Re-runnable seed builder for the `zip_codes` reference table.

Downloads the public GeoNames US postal-code dataset (CC BY 4.0, free, no API key)
and emits, for the requested state(s):
  - a committed CSV  (zip, city, state, lat, lng)
  - batched SQL files (INSERT ... ON CONFLICT (zip) DO NOTHING)

The table is state-agnostic: adding another state later is just re-running this
script with a different --states value (no schema change).

Usage:
  python build_zip_codes.py                 # California (default)
  python build_zip_codes.py --states CA,NV  # multiple states
  python build_zip_codes.py --states ALL    # entire US
  python build_zip_codes.py --batch-size 1000

Source: https://download.geonames.org/export/zip/US.zip  (GeoNames, CC BY 4.0)
"""
import argparse
import io
import os
import sys
import urllib.request
import zipfile

GEONAMES_URL = "https://download.geonames.org/export/zip/US.zip"
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache_US.zip")


def download() -> bytes:
    if os.path.exists(CACHE):
        with open(CACHE, "rb") as f:
            return f.read()
    req = urllib.request.Request(GEONAMES_URL, headers={"User-Agent": "matchcare-seed/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    with open(CACHE, "wb") as f:
        f.write(data)
    return data


def parse(zip_bytes: bytes, states: set[str] | None):
    rows = {}  # zip -> (zip, city, state, lat, lng); first occurrence wins
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        with zf.open("US.txt") as fh:
            for raw in io.TextIOWrapper(fh, encoding="utf-8"):
                c = raw.rstrip("\n").split("\t")
                if len(c) < 11:
                    continue
                zipc, city, state_code, lat, lng = c[1], c[2], c[4], c[9], c[10]
                if states is not None and state_code not in states:
                    continue
                if not zipc or not lat or not lng:
                    continue
                if zipc in rows:
                    continue
                try:
                    rows[zipc] = (zipc, city, state_code, float(lat), float(lng))
                except ValueError:
                    continue
    return [rows[k] for k in sorted(rows)]


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def write_outputs(rows, out_dir: str, tag: str, batch_size: int):
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, f"zip_codes_{tag}.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        f.write("zip,city,state,lat,lng\n")
        for zipc, city, state, lat, lng in rows:
            f.write(f'{zipc},"{city}",{state},{lat},{lng}\n')

    batch_paths = []
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        n = i // batch_size + 1
        path = os.path.join(out_dir, f"zip_codes_{tag}_{n:03d}.sql")
        with open(path, "w", encoding="utf-8") as f:
            f.write("insert into public.zip_codes (zip, city, state, lat, lng) values\n")
            values = [
                f"('{z}','{sql_escape(city)}','{state}',{lat},{lng})"
                for z, city, state, lat, lng in batch
            ]
            f.write(",\n".join(values))
            f.write("\non conflict (zip) do nothing;\n")
        batch_paths.append(path)
    return csv_path, batch_paths


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--states", default="CA", help="comma-separated state codes, or ALL")
    ap.add_argument("--batch-size", type=int, default=1000)
    ap.add_argument("--out-dir", default=HERE)
    args = ap.parse_args()

    states = None if args.states.strip().upper() == "ALL" else {
        s.strip().upper() for s in args.states.split(",") if s.strip()
    }
    tag = "ALL" if states is None else "_".join(sorted(states))

    print(f"Downloading GeoNames US dataset ... (cached at {CACHE})", file=sys.stderr)
    data = download()
    rows = parse(data, states)
    csv_path, batch_paths = write_outputs(rows, args.out_dir, tag, args.batch_size)

    print(f"states={args.states} rows={len(rows)} batches={len(batch_paths)}")
    print(f"csv={csv_path}")
    for p in batch_paths:
        print(f"batch={p}")


if __name__ == "__main__":
    main()
