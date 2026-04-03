import { describe, it, expect, vi } from 'vitest'
import { renderPolygon } from '../polygon'
import type { DrawParams, ResolvedCanvasStyle, Position } from '../../types'

function createMockCtx() {
  return {
    canvas: { width: 800, height: 600 },
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fillStyle: '',
    fill: vi.fn(),
    lineWidth: 0,
    strokeStyle: '',
    stroke: vi.fn(),
    textBaseline: '',
    textAlign: '',
    font: '',
    miterLimit: 0,
    strokeText: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 }))
  } as unknown as CanvasRenderingContext2D
}

const defaultStyle: ResolvedCanvasStyle = {
  text: { fontFamily: 'sans-serif', fontSize: 18, fill: 'white', stroke: 'black', strokeWidth: 4, miterLimit: 2 },
  circle: { fill: 'blue', stroke: 'blue', strokeWidth: 1, radiusFactor: 50 },
  polygon: { fill: 'rgba(111,155,201,0.3)', stroke: 'rgba(111,155,201,1)', strokeWidth: 2 }
}

const trianglePosition: Position = {
  id: 1,
  label: 'Area',
  icons: [],
  coordinates: { x: 0, y: 0 },
  drawStyle: 'polygon',
  polygon: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }]
}

function makeParams(overrides: Partial<DrawParams> = {}): DrawParams {
  return {
    ctx: createMockCtx(),
    position: trianglePosition,
    index: 0,
    offsetDrawPosition: { x: 50, y: 33 },
    scaleMultiplier: 1,
    clampedZoomLevel: 100,
    canvasImagePos: { x: 0, y: 0 },
    isInView: true,
    shouldRecalcBoundingBoxes: true,
    style: defaultStyle,
    gridSizeInPixels: 100,
    coordinatesOffset: 0,
    resolvedIcons: [],
    ...overrides
  }
}

describe('renderPolygon', () => {
  it('returns a bounding box', () => {
    const result = renderPolygon(makeParams())
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
  })

  it('draws polygon path when isInView is true', () => {
    const ctx = createMockCtx()
    renderPolygon(makeParams({ ctx }))
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.moveTo).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalledTimes(2)
    expect(ctx.closePath).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('skips drawing when polygon is off-screen', () => {
    const ctx = createMockCtx()
    // Shift image position so polygon vertices are far off-screen
    renderPolygon(makeParams({ ctx, canvasImagePos: { x: -5000, y: -5000 } }))
    expect(ctx.beginPath).not.toHaveBeenCalled()
  })

  it('still returns bounding box when polygon is off-screen', () => {
    const result = renderPolygon(makeParams({ canvasImagePos: { x: -5000, y: -5000 } }))
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
  })

  it('applies polygon style values', () => {
    // Position with no label so text drawing doesn't overwrite ctx state
    const position = { ...trianglePosition, label: '' }
    const ctx = createMockCtx()
    renderPolygon(makeParams({ ctx, position }))
    expect(ctx.fillStyle).toBe('rgba(111,155,201,0.3)')
    expect(ctx.strokeStyle).toBe('rgba(111,155,201,1)')
  })

  it('returns hitTest closure that detects points inside polygon', () => {
    const result = renderPolygon(makeParams())
    expect(result.hitTest).toBeDefined()
    // Point inside the triangle
    expect(result.hitTest!({ x: 50, y: 50 })).toBe(true)
    // Point outside the triangle
    expect(result.hitTest!({ x: 5, y: 90 })).toBe(false)
  })

  it('returns empty bounding box when polygon has no vertices', () => {
    const position = { ...trianglePosition, polygon: [] }
    const result = renderPolygon(makeParams({ position }))
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('scales vertices by scaleMultiplier and canvasImagePos', () => {
    const ctx = createMockCtx()
    renderPolygon(makeParams({ ctx, scaleMultiplier: 2, canvasImagePos: { x: 10, y: 20 } }))
    // First vertex (0,0) scaled: 0*2+10=10, 0*2+20=20
    expect(ctx.moveTo).toHaveBeenCalledWith(10, 20)
    // Second vertex (100,0) scaled: 100*2+10=210, 0*2+20=20
    expect(ctx.lineTo).toHaveBeenCalledWith(210, 20)
  })
})
