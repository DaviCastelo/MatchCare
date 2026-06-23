import { describe, it, expect } from 'vitest'
import {
  haversineMiles,
  proximityPoints,
  proximityBand,
  HOME_MAX_MILES,
} from '../geo'

describe('haversineMiles', () => {
  it('is 0 for the same point', () => {
    expect(haversineMiles({ lat: 37.35, lng: -121.89 }, { lat: 37.35, lng: -121.89 })).toBe(0)
  })

  it('≈ 69 miles for 1 degree of latitude', () => {
    const d = haversineMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeGreaterThan(68)
    expect(d).toBeLessThan(70)
  })

  it('is symmetric', () => {
    const a = { lat: 37.3536, lng: -121.8902 } // ~San Jose
    const b = { lat: 37.4188, lng: -122.1296 } // ~Palo Alto
    expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 6)
  })

  it('grows with distance', () => {
    const origin = { lat: 37.0, lng: -121.0 }
    const near = haversineMiles(origin, { lat: 37.05, lng: -121.0 })
    const far = haversineMiles(origin, { lat: 37.5, lng: -121.0 })
    expect(far).toBeGreaterThan(near)
  })
})

describe('proximityPoints', () => {
  it('gives the maximum (20) at or within 3 miles', () => {
    expect(proximityPoints(0)).toBe(20)
    expect(proximityPoints(3)).toBe(20)
  })

  it('steps down across the bands', () => {
    expect(proximityPoints(3.01)).toBe(15)
    expect(proximityPoints(7)).toBe(15)
    expect(proximityPoints(7.01)).toBe(10)
    expect(proximityPoints(12)).toBe(10)
    expect(proximityPoints(12.01)).toBe(5)
    expect(proximityPoints(20)).toBe(5)
  })

  it('is 0 beyond the last band', () => {
    expect(proximityPoints(20.01)).toBe(0)
    expect(proximityPoints(100)).toBe(0)
  })

  it('never increases as distance grows (monotonic)', () => {
    let prev = Infinity
    for (let m = 0; m <= 30; m += 0.5) {
      const p = proximityPoints(m)
      expect(p).toBeLessThanOrEqual(prev)
      prev = p
    }
  })
})

describe('proximityBand', () => {
  it('maps distance to 1–5 stars', () => {
    expect(proximityBand(0)).toBe(5)
    expect(proximityBand(3)).toBe(5)
    expect(proximityBand(7)).toBe(4)
    expect(proximityBand(12)).toBe(3)
    expect(proximityBand(20)).toBe(2)
    expect(proximityBand(21)).toBe(1)
  })
})

describe('HOME_MAX_MILES', () => {
  it('is the 20-mile block threshold', () => {
    expect(HOME_MAX_MILES).toBe(20)
  })
})
