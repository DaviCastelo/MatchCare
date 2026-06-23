# MatchCare — Locality Proximity Matching (ZIP-based) Design Spec

**Date:** 2026-06-23
**Status:** Approved (pending written-spec review)
**Supabase project:** `matchcare` — id: `pcugkjrocilpvutvsfot` — region: `sa-east-1`
**Related:** [2026-05-30-matchcare-design.md](2026-05-30-matchcare-design.md)

---

## 1. Problem

Today, locality in matching is a single free-text `city` field on `clients` and `therapists`. It is used as:
- a **hard rule** only for `Home` sessions (exact, case-insensitive city equality) — [`rules.ts:134`](../../../lib/matching/rules.ts)
- a **binary `+15`** soft-score bonus for non-`Home` sessions — [`rules.ts:172`](../../../lib/matching/rules.ts)

This is too coarse. The real client roster (reviewed from the operator's Google Sheet) is concentrated in **Santa Clara County, CA** — the majority of addresses are in **San Jose**, a city large enough that two points within it can be ~1h apart by car. City-level equality cannot distinguish "5 min away" from "1h away" inside the same city.

**Goal:** make the existing match score (the "média", max today = 70) **rise when the therapist is close and fall when far**, using real geographic distance — at **zero cost and with no runtime API dependency**.

---

## 2. Locality data actually available

From the operator's spreadsheet, the locality-bearing fields are:

| Field | Reliable / structured? | Use |
|---|---|---|
| **Home address with ZIP** (e.g. `1510 North 1st Street San Jose CA 95112`) | **ZIP yes** (5-digit, regex-extractable); street/city are free text | **Proximity key** |
| **School address** (when applicable) | ZIP yes when present | Proximity for `School` sessions |
| City / State | Inconsistent text | Display only |

**Conclusion:** the **5-digit ZIP code** is the only locality datum guaranteed to be structured and reliable. It is the basis for distance.

---

## 3. Decision & rejected alternatives

**Chosen: ZIP-centroid straight-line distance (Haversine).**

US ZIP→coordinate data is available as a **free, public-domain, offline** dataset (US Census Gazetteer / ZCTA centroids). Bundling the California subset (~2,600 rows) lets us compute real distance locally — **no API, no per-match cost, no network at runtime.**

| Alternative | Why rejected |
|---|---|
| Manual regions/zones | Was the right call when the context looked Brazilian/unknown. With real US ZIP-coded data, distance is more accurate **and** needs zero manual upkeep. |
| Geocoding street addresses | Free street-level geocoding requires an external API (rate limits / cost / network). Violates the zero-cost, offline constraint. |
| Live drive-time API (Google/OSRM) | Per-query cost + external dependency + latency. Explicitly excluded by the constraint. |

ZIP-centroid distance is a strong proxy for commute within a metro region; ZIP areas here are a few km across, so centroid-to-centroid error is small relative to the distances that matter.

---

## 4. Data model

### 4.1 New reference table `zip_codes`

| Column | Type | Notes |
|---|---|---|
| `zip` | `text` PK | 5-digit string |
| `city` | `text` | e.g. `San Jose` |
| `state` | `text` | 2-letter, e.g. `CA` |
| `lat` | `double precision` | centroid latitude |
| `lng` | `double precision` | centroid longitude |

- Seeded **once** from the public-domain US Census Gazetteer, filtered to `state = 'CA'`. License: public domain (no attribution required).
- Delivered as a seed migration (SQL `INSERT`s or `COPY` from a bundled CSV under `supabase/seed/`).

### 4.2 Column additions

`clients`:
- `zip_code text NULL` → FK `zip_codes(zip)` `ON DELETE SET NULL`
- `street_address text NULL` (display)
- `state text NULL` (display, default `'CA'`)
- `school_zip_code text NULL` → FK `zip_codes(zip)` `ON DELETE SET NULL` (used for `School` sessions)

`therapists`:
- `zip_code text NULL` → FK `zip_codes(zip)` `ON DELETE SET NULL`
- `street_address text NULL`
- `state text NULL` (default `'CA'`)

- The existing `city text` column is **retained for display / back-compat**; it is no longer used by matching.
- All new columns are nullable → no break for existing rows. Rows without a ZIP are treated as "location unknown" (see §6).

### 4.3 Clinic location

The clinic is a single fixed location. Model its ZIP as a configurable constant alongside the existing `CLINIC_HOURS` in [`rules.ts`](../../../lib/matching/rules.ts):

```ts
export const CLINIC_ZIP = '95112' // operator sets the real clinic ZIP
```

---

## 5. Distance & proximity logic

New **pure** module `lib/matching/geo.ts` (keeps the engine pure; rules separated):

```ts
export type Coords = { lat: number; lng: number }

// Great-circle distance in miles.
export function haversineMiles(a: Coords, b: Coords): number

// Distance → score contribution (the graded replacement for the old +15).
export function proximityPoints(miles: number): number

// Distance → 1..5 band (for display / "stars").
export function proximityBand(miles: number): 1 | 2 | 3 | 4 | 5

export const HOME_MAX_MILES = 20
```

**Distance bands** (configurable constants; miles):

| Distance | Band | `proximityPoints` | In `Home` sessions |
|---|---|---|---|
| same ZIP / ≤ 3 mi | ★★★★★ | **+20** | allowed |
| ≤ 7 mi | ★★★★ | +15 | allowed |
| ≤ 12 mi | ★★★ | +10 | allowed |
| ≤ 20 mi | ★★ | +5 | allowed (`LONG_COMMUTE` flag) |
| > 20 mi | ★ | 0 | **blocked** (hard rule) |

### Which ZIP is compared

The distance is **therapist's home ZIP ↔ the session location's ZIP** (we minimize the therapist's commute):

| `preferred_session_location` | Session-location ZIP |
|---|---|
| `Home` | `client.zip_code` |
| `School` | `client.school_zip_code` (fallback `client.zip_code` + flag) |
| `Clinic` | `CLINIC_ZIP` |

---

## 6. Matching changes

### 6.1 Architecture (preserve "engine puro")

The engine stays pure — it does **not** fetch ZIP coordinates. The server action [`app/actions/match.ts`](../../../app/actions/match.ts):
1. loads the relevant `zip_codes` rows for the client/clinic/school and all candidate therapists,
2. computes, per therapist, the **distance in miles to the session-location ZIP**,
3. passes a `distanceByTherapist: Record<string, number | null>` into the engine.

`null` = distance not computable (missing or unknown ZIP on either side).

### 6.2 `findEligibleTherapists`

New signature parameter:
```ts
findEligibleTherapists(client, therapists, therapistHoursMap, busyByTherapist, distanceByTherapist)
```
- **New hard rule (`'proximity'`)**: only for `Home` sessions — if `distance != null && distance > HOME_MAX_MILES` → disqualified with `failedRule: 'proximity'`. `null` does **not** block (avoid false negatives), but raises `MISSING_LOCATION`.
- `Clinic` / `School`: never blocked by distance — far simply scores lower.

### 6.3 `computeScore`

- **Remove** the binary `+15` same-city block ([`rules.ts:171-177`](../../../lib/matching/rules.ts)).
- **Add** `proximityPoints(distanceMiles)` (0–20). `distanceMiles == null` → `0` points + `MISSING_LOCATION` flag.
- Signature gains `distanceMiles: number | null`.

**New score ceiling = 75** (was 70): language 10 + **proximity 20** + hours 20 + score-proximity 10 + load 15. Documented so any normalization/stars uses 75.

### 6.4 Type changes ([`lib/types/matching.ts`](../../../lib/types/matching.ts))

- `MatchRuleName` += `'proximity'`
- `MatchFlag` += `'MISSING_LOCATION'` | `'LONG_COMMUTE'`
- `MatchResult` += `distanceMiles: number | null` (so the UI can show distance / band)

---

## 7. Forms (manual entry is the only data-entry path)

Update create + edit forms for clients and therapists:
- [`clients/new/page.tsx`](../../../app/[locale]/(admin)/admin/clients/new/page.tsx), `clients/[id]`
- [`therapists/new/page.tsx`](../../../app/[locale]/(admin)/admin/therapists/new/page.tsx), `therapists/[id]`

Replace the single free-text `city` `<Input>` with structured address fields: **street, city, state (default CA), ZIP (required)**. For clients, add an optional **school ZIP** shown when location = `School`.

- On submit, the server action validates the ZIP against `zip_codes`. **Unknown ZIP → store anyway + flag for review** (do not hard-fail; the operator may legitimately enter a ZIP not yet in the seed).
- Any new dropdown (e.g. a state selector) MUST use the portaled `Select` primitive, never an absolute element inside a `Card` (per project UI rule).

---

## 8. Match Tool UI

[`match-tool.tsx`](../../../app/[locale]/(admin)/admin/match/match-tool.tsx): the score already reflects distance (via §6). Additionally surface, per eligible therapist:
- approximate distance (e.g. `~6 mi`) and/or the proximity band,
- the `MISSING_LOCATION` / `LONG_COMMUTE` flags.

Keep the existing weekly-hours load bar distinct from proximity (avoid the current visual confusion where the bar is mistaken for the score).

---

## 9. Migration plan

1. **Migration A** — create `zip_codes`; seed CA rows from bundled CSV.
2. **Migration B** — add nullable columns + FKs to `clients` and `therapists`.
3. No backfill from the free-text `city` (unreliable). Existing rows stay "location unknown" until edited via the forms; matching degrades gracefully (0 proximity points, flagged).
4. Regenerate [`lib/types/database.ts`](../../../lib/types/database.ts) to include `zip_codes` and the new columns.

---

## 10. Testing

- **`geo.test.ts`** (new): `haversineMiles` against known pairs (same ZIP = 0; a known CA pair within tolerance); `proximityPoints` band boundaries (3 / 7 / 12 / 20); `proximityBand`.
- **`rules.test.ts` / `engine.test.ts`**: 
  - `Home` blocked when distance > 20 mi (`failedRule: 'proximity'`); allowed at ≤ 20.
  - `Clinic`/`School` never blocked by distance; far → lower score, not disqualified.
  - score increases monotonically as distance decreases.
  - unknown ZIP → `MISSING_LOCATION` flag, 0 proximity points, no block.
- **`fixtures.ts`**: add `zip_code` (+ school ZIP) to fixtures so types compile; add CA-based coordinates for proximity cases.

---

## 11. Scope

**In scope:** `zip_codes` reference table + seed; client/therapist ZIP columns; `geo.ts`; hard rule + `computeScore` proximity change; form updates; match-tool display; migrations; tests.

**Out of scope (explicitly):**
- ❌ **Bulk import of the spreadsheet** — dropped entirely. The sheet was reference only; all data entry is manual via forms.
- 🔜 **Minimum 1-hour buffer between a therapist's sessions** — separate short spec, next.

---

## 12. Implementation notes

- Per [`AGENTS.md`](../../../AGENTS.md): this project's Next.js may differ from training data — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.
- Conventions (per project memory): server actions in `app/actions/`, types in `lib/types/`, matching rules separated from the engine, the engine stays pure, `computeScore` isolated. This design fetches coordinates in the action and passes plain numbers into the pure engine.
