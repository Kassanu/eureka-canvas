import { describe, it, expect } from 'vitest'
import {
  createQuadrantMap,
  resetQuadrants,
  addBoundingBox,
  getQuadrantsForBoundingBox,
  getPointQuadrant,
  findIntersection
} from '../spatial'

describe('createQuadrantMap', () => {
  it('creates 4 empty quadrants', () => {
    const map = createQuadrantMap()
    expect(Object.keys(map)).toEqual(['northwest', 'northeast', 'southeast', 'southwest'])
    for (const key of Object.keys(map) as (keyof typeof map)[]) {
      expect(map[key].children).toEqual([])
      expect(map[key].box).toEqual({ x: 0, y: 0, width: 0, height: 0 })
    }
  })
})

describe('resetQuadrants', () => {
  it('sets quadrant boxes based on image dimensions', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 100)

    expect(map.northwest.box).toEqual({ x: 0, y: 0, width: 100, height: 50 })
    expect(map.northeast.box).toEqual({ x: 100, y: 0, width: 100, height: 50 })
    expect(map.southeast.box).toEqual({ x: 100, y: 50, width: 100, height: 50 })
    expect(map.southwest.box).toEqual({ x: 0, y: 50, width: 100, height: 50 })
  })

  it('clears existing children', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 100)
    addBoundingBox(map, { id: 1, idKey: '_index', x: 10, y: 10, width: 20, height: 20 })
    expect(map.northwest.children.length).toBe(1)

    resetQuadrants(map, 200, 100)
    expect(map.northwest.children.length).toBe(0)
  })
})

describe('addBoundingBox', () => {
  it('adds box to the correct quadrant', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)

    addBoundingBox(map, { id: 1, idKey: '_index', x: 10, y: 10, width: 20, height: 20 })
    expect(map.northwest.children.length).toBe(1)
    expect(map.northeast.children.length).toBe(0)
  })

  it('adds box to multiple quadrants when it spans boundary', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)

    addBoundingBox(map, { id: 1, idKey: '_index', x: 90, y: 90, width: 20, height: 20 })
    expect(map.northwest.children.length).toBe(1)
    expect(map.northeast.children.length).toBe(1)
    expect(map.southeast.children.length).toBe(1)
    expect(map.southwest.children.length).toBe(1)
  })
})

describe('getQuadrantsForBoundingBox', () => {
  it('returns correct quadrant for box in northwest', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    const result = getQuadrantsForBoundingBox(map, { x: 10, y: 10, width: 20, height: 20 })
    expect(result).toEqual(['northwest'])
  })

  it('returns correct quadrant for box in southeast', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    const result = getQuadrantsForBoundingBox(map, { x: 110, y: 110, width: 20, height: 20 })
    expect(result).toEqual(['southeast'])
  })
})

describe('getPointQuadrant', () => {
  it('returns correct quadrant for point', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)

    expect(getPointQuadrant(map, { x: 10, y: 10 })).toBe('northwest')
    expect(getPointQuadrant(map, { x: 150, y: 10 })).toBe('northeast')
    expect(getPointQuadrant(map, { x: 150, y: 150 })).toBe('southeast')
    expect(getPointQuadrant(map, { x: 10, y: 150 })).toBe('southwest')
  })

  it('returns undefined for point outside all quadrants', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    expect(getPointQuadrant(map, { x: -10, y: -10 })).toBeUndefined()
  })
})

describe('findIntersection', () => {
  it('finds a hit when point is inside a bounding box', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    addBoundingBox(map, { id: 42, idKey: 'id', x: 10, y: 10, width: 30, height: 30 })

    const hit = findIntersection(map, { x: 20, y: 20 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(42)
    expect(hit!.idKey).toBe('id')
  })

  it('returns undefined when point misses all boxes', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    addBoundingBox(map, { id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30 })

    const hit = findIntersection(map, { x: 80, y: 80 })
    expect(hit).toBeUndefined()
  })

  it('returns topmost (last added) element when overlapping', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    addBoundingBox(map, { id: 1, idKey: '_index', x: 10, y: 10, width: 50, height: 50 })
    addBoundingBox(map, { id: 2, idKey: '_index', x: 20, y: 20, width: 30, height: 30 })

    const hit = findIntersection(map, { x: 25, y: 25 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(2)
  })

  it('returns undefined for point outside all quadrants', () => {
    const map = createQuadrantMap()
    resetQuadrants(map, 200, 200)
    const hit = findIntersection(map, { x: -10, y: -10 })
    expect(hit).toBeUndefined()
  })
})
