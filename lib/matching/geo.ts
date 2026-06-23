// Pure geographic helpers for proximity-based matching.
// No DB, no I/O — coordinates are passed in by the caller (action layer),
// keeping the matching engine pure.

export type Coords = { lat: number; lng: number }

const EARTH_RADIUS_MILES = 3958.8

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

// Great-circle (straight-line) distance between two points, in miles.
export function haversineMiles(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Distance bands (miles). Closer = better. Tunable in one place.
export const PROXIMITY_BANDS = [
  { maxMiles: 3, points: 20, stars: 5 },
  { maxMiles: 7, points: 15, stars: 4 },
  { maxMiles: 12, points: 10, stars: 3 },
  { maxMiles: 20, points: 5, stars: 2 },
] as const

// Beyond this, a Home session is blocked entirely (hard rule, engine-side).
export const HOME_MAX_MILES = 20

// Distance below which a Home session is NOT flagged as a long commute.
export const LONG_COMMUTE_MILES = 12

// Score contribution from proximity (0–20). Replaces the old binary +15 "same city".
export function proximityPoints(miles: number): number {
  for (const band of PROXIMITY_BANDS) {
    if (miles <= band.maxMiles) return band.points
  }
  return 0
}

// 1–5 proximity band, for display.
export function proximityBand(miles: number): 1 | 2 | 3 | 4 | 5 {
  for (const band of PROXIMITY_BANDS) {
    if (miles <= band.maxMiles) return band.stars
  }
  return 1
}
