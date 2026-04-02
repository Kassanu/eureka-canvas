import { describe, it, expect } from 'vitest'
import { Quadtree } from '../spatial'

const bounds = { x: 0, y: 0, width: 200, height: 200 }

describe('Quadtree constructor', () => {
  it('creates a tree with given bounds', () => {
    const tree = new Quadtree(bounds)
    expect(tree.queryPoint({ x: 100, y: 100 })).toBeUndefined()
  })
})

describe('insert + queryPoint', () => {
  it('finds a single inserted item on hit', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30 })
    const hit = tree.queryPoint({ x: 20, y: 20 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(1)
  })

  it('returns undefined on miss', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30 })
    expect(tree.queryPoint({ x: 80, y: 80 })).toBeUndefined()
  })
})

describe('queryPoint bounds', () => {
  it('returns undefined for point outside root bounds', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30 })
    expect(tree.queryPoint({ x: -10, y: -10 })).toBeUndefined()
    expect(tree.queryPoint({ x: 250, y: 250 })).toBeUndefined()
  })
})

describe('queryPoint — topmost item on overlap', () => {
  it('returns the last-inserted item when two overlap', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 50, height: 50 })
    tree.insert({ id: 2, idKey: '_index', x: 20, y: 20, width: 30, height: 30 })
    const hit = tree.queryPoint({ x: 25, y: 25 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(2)
  })

  it('returns first item when second does not overlap point', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 50, height: 50 })
    tree.insert({ id: 2, idKey: '_index', x: 70, y: 70, width: 20, height: 20 })
    const hit = tree.queryPoint({ x: 20, y: 20 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(1)
  })
})

describe('insert — subdivision', () => {
  it('still finds items after subdivision is triggered', () => {
    const tree = new Quadtree(bounds, { maxItems: 2 })
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 5, height: 5 })
    tree.insert({ id: 2, idKey: '_index', x: 20, y: 10, width: 5, height: 5 })
    tree.insert({ id: 3, idKey: '_index', x: 10, y: 20, width: 5, height: 5 })

    expect(tree.queryPoint({ x: 12, y: 12 })?.id).toBe(1)
    expect(tree.queryPoint({ x: 22, y: 12 })?.id).toBe(2)
    expect(tree.queryPoint({ x: 12, y: 22 })?.id).toBe(3)
  })
})

describe('large items spanning multiple children', () => {
  it('item spanning child boundaries stays at parent and is still found', () => {
    const tree = new Quadtree(bounds, { maxItems: 1 })
    // This item spans all 4 quadrants (crosses both midpoints)
    tree.insert({ id: 99, idKey: '_index', x: 90, y: 90, width: 20, height: 20 })
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 5, height: 5 })
    tree.insert({ id: 2, idKey: '_index', x: 150, y: 10, width: 5, height: 5 })

    expect(tree.queryPoint({ x: 100, y: 100 })?.id).toBe(99)
    expect(tree.queryPoint({ x: 12, y: 12 })?.id).toBe(1)
  })
})

describe('queryArea', () => {
  it('returns all items intersecting a region', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 20, height: 20 })
    tree.insert({ id: 2, idKey: '_index', x: 15, y: 15, width: 20, height: 20 })
    tree.insert({ id: 3, idKey: '_index', x: 100, y: 100, width: 20, height: 20 })

    const results = tree.queryArea({ x: 5, y: 5, width: 40, height: 40 })
    const ids = results.map(r => r.id).sort()
    expect(ids).toEqual([1, 2])
  })

  it('returns empty array when no items in region', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 20, height: 20 })
    const results = tree.queryArea({ x: 100, y: 100, width: 10, height: 10 })
    expect(results).toEqual([])
  })
})

describe('clear', () => {
  it('empties the tree so subsequent queries return nothing', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 20, height: 20 })
    expect(tree.queryPoint({ x: 15, y: 15 })).toBeDefined()

    tree.clear()
    expect(tree.queryPoint({ x: 15, y: 15 })).toBeUndefined()
    expect(tree.queryArea(bounds)).toEqual([])
  })
})

describe('deep tree — max depth', () => {
  it('does not subdivide beyond maxDepth', () => {
    const tree = new Quadtree(bounds, { maxDepth: 1, maxItems: 1 })
    // Insert many items in same area — should not crash or infinitely recurse
    for (let i = 0; i < 20; i++) {
      tree.insert({ id: i, idKey: '_index', x: 5, y: 5, width: 2, height: 2 })
    }
    // Last inserted should be found (topmost)
    const hit = tree.queryPoint({ x: 6, y: 6 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(19)
  })
})

describe('queryPoint — hitTest narrow phase', () => {
  it('skips item when hitTest returns false', () => {
    const tree = new Quadtree(bounds)
    tree.insert({
      id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30,
      hitTest: () => false
    })
    expect(tree.queryPoint({ x: 20, y: 20 })).toBeUndefined()
  })

  it('returns item when hitTest returns true', () => {
    const tree = new Quadtree(bounds)
    tree.insert({
      id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30,
      hitTest: () => true
    })
    const hit = tree.queryPoint({ x: 20, y: 20 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(1)
  })

  it('falls through to earlier item when topmost hitTest fails', () => {
    const tree = new Quadtree(bounds)
    tree.insert({ id: 1, idKey: '_index', x: 10, y: 10, width: 30, height: 30 })
    tree.insert({
      id: 2, idKey: '_index', x: 10, y: 10, width: 30, height: 30,
      hitTest: () => false
    })
    const hit = tree.queryPoint({ x: 20, y: 20 })
    expect(hit).toBeDefined()
    expect(hit!.id).toBe(1)
  })
})
