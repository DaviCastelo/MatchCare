import { describe, it, expect } from 'vitest'
import { filterClients, filterTherapists, paginate } from '../entity-list'
import { baseClient, therapistA } from '@/lib/matching/__tests__/fixtures'

describe('paginate', () => {
  it('returns 7 items per page', () => {
    const items = Array.from({ length: 15 }, (_, i) => i)
    const page1 = paginate(items, 1)
    expect(page1.items).toHaveLength(7)
    expect(page1.totalPages).toBe(3)
    expect(page1.from).toBe(1)
    expect(page1.to).toBe(7)
  })
})

describe('filterClients', () => {
  it('matches global search across fields', () => {
    const results = filterClients([baseClient], { q: 'lucas' })
    expect(results).toHaveLength(1)
  })

  it('filters by sex', () => {
    const female = { ...baseClient, id: 'f', sex: 'Female' as const }
    expect(filterClients([baseClient, female], { sex: 'Female' })).toHaveLength(1)
  })
})

describe('filterTherapists', () => {
  it('matches therapist email in search', () => {
    const results = filterTherapists([therapistA], { q: 'ana@clinic' })
    expect(results).toHaveLength(1)
  })

  it('filters therapists without sex', () => {
    const noSex = { ...therapistA, id: 'x', sex: null }
    expect(filterTherapists([therapistA, noSex], { sex: 'unset' })).toHaveLength(1)
  })
})
