import { describe, it, expect } from 'vitest'
import { rectBounds, arcBounds, arcpoint } from '../geometry'

describe('rectBounds', () => {
  it('returns union of two non-overlapping rectangles', () => {
    const result = rectBounds(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 }
    )
    expect(result).toEqual({ x: 0, y: 0, width: 30, height: 30 })
  })

  it('returns union of two overlapping rectangles', () => {
    const result = rectBounds(
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 10, y: 10, width: 20, height: 20 }
    )
    expect(result).toEqual({ x: 0, y: 0, width: 30, height: 30 })
  })

  it('handles contained rectangle', () => {
    const result = rectBounds(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 10, y: 10, width: 20, height: 20 }
    )
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 100 })
  })

  it('handles negative positions', () => {
    const result = rectBounds(
      { x: -10, y: -10, width: 20, height: 20 },
      { x: 5, y: 5, width: 10, height: 10 }
    )
    expect(result).toEqual({ x: -10, y: -10, width: 25, height: 25 })
  })
})

describe('arcpoint', () => {
  it('returns point on circle at 0 radians', () => {
    const result = arcpoint(0, 0, 10, 0)
    expect(result.x).toBeCloseTo(10)
    expect(result.y).toBeCloseTo(0)
  })

  it('returns point on circle at PI/2 radians', () => {
    const result = arcpoint(0, 0, 10, Math.PI / 2)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(10)
  })

  it('returns point on circle at PI radians', () => {
    const result = arcpoint(0, 0, 10, Math.PI)
    expect(result.x).toBeCloseTo(-10)
    expect(result.y).toBeCloseTo(0)
  })

  it('accounts for center offset', () => {
    const result = arcpoint(50, 50, 10, 0)
    expect(result.x).toBeCloseTo(60)
    expect(result.y).toBeCloseTo(50)
  })
})

describe('arcBounds', () => {
  it('returns bounding box of full circle', () => {
    const result = arcBounds(100, 100, 50, 0, 2 * Math.PI)
    expect(result.x).toBeCloseTo(50)
    expect(result.y).toBeCloseTo(50)
    expect(result.width).toBeCloseTo(100)
    expect(result.height).toBeCloseTo(100)
  })

  it('includes center point in bounds', () => {
    const result = arcBounds(100, 100, 50, 0, Math.PI / 4)
    expect(result.x).toBeLessThanOrEqual(100)
    expect(result.y).toBeLessThanOrEqual(100)
    expect(result.x + result.width).toBeGreaterThanOrEqual(100)
    expect(result.y + result.height).toBeGreaterThanOrEqual(100)
  })
})
