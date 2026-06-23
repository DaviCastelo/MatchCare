# Implementation Plan — Locality Proximity Matching (ZIP-based)

**Spec:** [2026-06-23-locality-proximity-matching-design.md](../specs/2026-06-23-locality-proximity-matching-design.md)
**Branch:** `feature/locality-proximity-matching`

Ordered, testable steps. Each step should leave the build green.

---

## Phase 1 — ZIP reference data & table

**1.1 Build the ZIP centroid seed (nationwide, re-runnable)**
- Re-runnable script `supabase/seed/build_zip_codes.*` (Node or Python) that:
  - downloads the US Census Gazetteer ZCTA file (public domain — no attribution),
  - emits all rows `zip, state, lat, lng` (state derived per ZCTA; `city` optional/blank — display only) to a committed CSV `supabase/seed/zip_codes.csv`.
- **All states**, not CA-only → adding/scoping other states later needs no schema or migration change.
- ⚠️ Needs network **once** to download (build-time, not runtime). Offline fallback: seed only the ~58 ZIPs seen in current data + clinic ZIP, then re-run the script later to backfill the rest.

**1.2 Migration A — create `zip_codes`**
- `create table zip_codes (zip text primary key, city text, state text, lat double precision not null, lng double precision not null)`.
- Load the seed CSV.
- Apply via Supabase (project `pcugkjrocilpvutvsfot`). **Prefer a Supabase dev branch first**, verify, then merge.

## Phase 2 — Schema columns

**2.1 Migration B — add columns (all nullable)**
- `clients`: `zip_code text references zip_codes(zip) on delete set null`, `street_address text`, `state text default 'CA'`, `school_zip_code text references zip_codes(zip) on delete set null`.
- `therapists`: `zip_code text references zip_codes(zip) on delete set null`, `street_address text`, `state text default 'CA'`.
- Keep `city text` untouched.

**2.2 Regenerate types**
- Update [`lib/types/database.ts`](../../../lib/types/database.ts) to include `zip_codes` + new columns (via `generate_typescript_types` or manual edit matching the file's style).

## Phase 3 — Pure geo module (no DB, no engine coupling)

**3.1** Create [`lib/matching/geo.ts`](../../../lib/matching/geo.ts):
- `haversineMiles(a: Coords, b: Coords): number`
- `proximityPoints(miles: number): number` — bands 3/7/12/20 → 20/15/10/5/0
- `proximityBand(miles: number): 1|2|3|4|5`
- consts: `HOME_MAX_MILES = 20`, band thresholds.

**3.2** `lib/matching/__tests__/geo.test.ts`: haversine known pairs (same point = 0; a known CA pair within tolerance), band boundaries, monotonicity.

## Phase 4 — Types

**4.1** [`lib/types/matching.ts`](../../../lib/types/matching.ts):
- `MatchRuleName` += `'proximity'`
- `MatchFlag` += `'MISSING_LOCATION'` | `'LONG_COMMUTE'`
- `MatchResult` += `distanceMiles: number | null`

## Phase 5 — Engine & rules (pure)

**5.1** [`rules.ts`](../../../lib/matching/rules.ts):
- Add `export const CLINIC_ZIP = '95112'` near `CLINIC_HOURS` (operator-configurable).
- `computeScore(client, therapist, slots, currentHours, distanceMiles)`: remove the `+15` same-city block; add `proximityPoints(distanceMiles)` (null → 0 + push `MISSING_LOCATION`); push `LONG_COMMUTE` when `Home` and band ≤ 2.
- Note the new ceiling = 75 in the comment.

**5.2** [`engine.ts`](../../../lib/matching/engine.ts):
- `findEligibleTherapists(client, therapists, hoursMap, busyByTherapist, distanceByTherapist)`.
- New hard check (`Home` only): `distance != null && distance > HOME_MAX_MILES` → `disqualified` with `failedRule: 'proximity'`.
- Pass distance into `computeScore`; set `distanceMiles` on each `MatchResult`.

**5.3** Update `lib/matching/__tests__/rules.test.ts` & `engine.test.ts`:
- `Home` blocked > 20 mi; allowed ≤ 20.
- `Clinic`/`School` never blocked by distance; far → lower score.
- score rises as distance falls.
- unknown ZIP → `MISSING_LOCATION`, 0 pts, no block.
- Update `fixtures.ts` (add `zip_code` etc. so types compile; add CA coords for proximity cases).

## Phase 6 — Server action wiring

**6.1** [`app/actions/match.ts`](../../../app/actions/match.ts):
- After loading client + therapists, gather needed ZIPs (client/clinic/school + each therapist), fetch their `zip_codes` rows.
- Determine session-location ZIP from `preferred_session_location` (Home→client.zip; School→school_zip ?? client.zip + flag; Clinic→`CLINIC_ZIP`).
- Build `distanceByTherapist: Record<string, number | null>` via `haversineMiles`.
- Pass into `findEligibleTherapists`. Mirror in `getScheduleForTherapists` only if needed (scheduling doesn't score, so likely no change).

## Phase 7 — Forms & domain actions

**7.1** Forms: [`clients/new`](../../../app/[locale]/(admin)/admin/clients/new/page.tsx), `clients/[id]`, [`therapists/new`](../../../app/[locale]/(admin)/admin/therapists/new/page.tsx), `therapists/[id]`:
- Replace the free-text `city` `<Input>` with: street, city, state (default CA), **ZIP (required)**. Clients: optional **school ZIP** (shown for `School`).
- Any new dropdown must use the portaled `Select` primitive (project UI rule).

**7.2** Domain actions (`app/actions/clients.ts`, `therapists.ts`): accept new fields; validate ZIP against `zip_codes`; unknown ZIP → store + flag for review (no hard fail).

## Phase 8 — Match Tool UI

**8.1** [`match-tool.tsx`](../../../app/[locale]/(admin)/admin/match/match-tool.tsx): show `~X mi` and/or proximity band + `MISSING_LOCATION`/`LONG_COMMUTE` flags per eligible therapist. Keep the weekly-hours bar visually distinct from the score.

## Phase 9 — Verify

**9.1** `npm run build` + test suite green.
**9.2** Per [`AGENTS.md`](../../../AGENTS.md): read `node_modules/next/dist/docs/` for any Next.js API used in forms before writing.
**9.3** Manual: create/edit a client + therapists with ZIPs, run a match, confirm score rises for closer therapists and a far `Home` therapist is disqualified.

---

## Decisions to confirm before executing
1. **DB:** apply migrations on a **Supabase dev branch** first (recommended), or directly to prod `pcugkjrocilpvutvsfot`?
2. **Clinic ZIP:** what is the real clinic ZIP (replaces the `95112` placeholder)?
3. ~~**ZIP dataset**~~ — **Resolved:** download the full US Census Gazetteer once via a re-runnable seed script; seed all states (nationwide), `state` column for scoping. Adding states later = no schema change.
