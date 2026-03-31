import { describe, it, expect } from 'vitest'
import {
  relativePointOnImage,
  scaledPointToFullPoint,
  fullPointToScaledPoint,
  fullPointToCoordinates,
  coordinatesToFullPoint,
  isCoordinateInView,
  pointIsOnImage
} from '../coordinates'

describe('relativePointOnImage', () => {
  it('subtracts image position from point', () => {
    expect(relativePointOnImage({ x: 150, y: 200 }, { x: 50, y: 100 }))
      .toEqual({ x: 100, y: 100 })
  })

  it('returns negative values when point is before image', () => {
    expect(relativePointOnImage({ x: 10, y: 10 }, { x: 50, y: 50 }))
      .toEqual({ x: -40, y: -40 })
  })
})

describe('scaledPointToFullPoint', () => {
  it('divides by scale multiplier', () => {
    expect(scaledPointToFullPoint({ x: 50, y: 100 }, 0.5))
      .toEqual({ x: 100, y: 200 })
  })

  it('returns same point at scale 1', () => {
    expect(scaledPointToFullPoint({ x: 50, y: 100 }, 1))
      .toEqual({ x: 50, y: 100 })
  })
})

describe('fullPointToScaledPoint', () => {
  it('multiplies by scale multiplier', () => {
    expect(fullPointToScaledPoint({ x: 100, y: 200 }, 0.5))
      .toEqual({ x: 50, y: 100 })
  })

  it('is inverse of scaledPointToFullPoint', () => {
    const original = { x: 123, y: 456 }
    const scale = 0.75
    const scaled = fullPointToScaledPoint(original, scale)
    const restored = scaledPointToFullPoint(scaled, scale)
    expect(restored.x).toBeCloseTo(original.x)
    expect(restored.y).toBeCloseTo(original.y)
  })
})

describe('fullPointToCoordinates', () => {
  it('converts pixel position to grid coordinates', () => {
    const result = fullPointToCoordinates({ x: 500, y: 1000 }, 100, 0)
    expect(result).toEqual({ x: 5, y: 10 })
  })

  it('applies coordinate offset', () => {
    const result = fullPointToCoordinates({ x: 500, y: 1000 }, 100, 1)
    expect(result).toEqual({ x: 6, y: 11 })
  })

  it('rounds to one decimal place', () => {
    const result = fullPointToCoordinates({ x: 155, y: 0 }, 100, 0)
    expect(result.x).toBe(1.6)
  })
})

describe('coordinatesToFullPoint', () => {
  it('converts grid coordinates to pixel position', () => {
    const result = coordinatesToFullPoint({ x: 5, y: 10 }, 100, 0)
    expect(result).toEqual({ x: 500, y: 1000 })
  })

  it('applies coordinate offset', () => {
    const result = coordinatesToFullPoint({ x: 6, y: 11 }, 100, 1)
    expect(result).toEqual({ x: 500, y: 1000 })
  })

  it('is inverse of fullPointToCoordinates (within rounding)', () => {
    const original = { x: 500, y: 1000 }
    const coords = fullPointToCoordinates(original, 100, 0)
    const restored = coordinatesToFullPoint(coords, 100, 0)
    expect(restored).toEqual(original)
  })
})

describe('isCoordinateInView', () => {
  it('returns true for coordinate visible on canvas', () => {
    expect(isCoordinateInView(
      { x: 5, y: 5 },
      800, 600,
      { x: 0, y: 0 },
      1,
      100, 0
    )).toBe(true)
  })

  it('returns false for coordinate off-screen to the left', () => {
    expect(isCoordinateInView(
      { x: 5, y: 5 },
      800, 600,
      { x: -600, y: 0 },
      1,
      100, 0
    )).toBe(false)
  })

  it('returns false for coordinate off-screen below', () => {
    expect(isCoordinateInView(
      { x: 5, y: 10 },
      800, 600,
      { x: 0, y: -500 },
      1,
      200, 0
    )).toBe(false)
  })
})

describe('pointIsOnImage', () => {
  it('returns true for point within image bounds', () => {
    expect(pointIsOnImage({ x: 50, y: 50 }, { x: 0, y: 0 }, 100, 100)).toBe(true)
  })

  it('returns true for point on image edge', () => {
    expect(pointIsOnImage({ x: 0, y: 0 }, { x: 0, y: 0 }, 100, 100)).toBe(true)
    expect(pointIsOnImage({ x: 100, y: 100 }, { x: 0, y: 0 }, 100, 100)).toBe(true)
  })

  it('returns false for point outside image bounds', () => {
    expect(pointIsOnImage({ x: -1, y: 50 }, { x: 0, y: 0 }, 100, 100)).toBe(false)
    expect(pointIsOnImage({ x: 101, y: 50 }, { x: 0, y: 0 }, 100, 100)).toBe(false)
  })

  it('accounts for image position offset', () => {
    expect(pointIsOnImage({ x: 50, y: 50 }, { x: 100, y: 100 }, 200, 200)).toBe(false)
    expect(pointIsOnImage({ x: 150, y: 150 }, { x: 100, y: 100 }, 200, 200)).toBe(true)
  })
})
