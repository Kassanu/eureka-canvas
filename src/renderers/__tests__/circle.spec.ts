import { describe, it, expect, vi } from 'vitest'
import { renderCircle } from '../circle'
import type { DrawParams, ResolvedCanvasStyle, Position } from '../../types'

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    fillStyle: '',
    fill: vi.fn(),
    lineWidth: 0,
    strokeStyle: '',
    stroke: vi.fn(),
    drawImage: vi.fn()
  } as unknown as CanvasRenderingContext2D
}

const defaultStyle: ResolvedCanvasStyle = {
  text: { fontFamily: 'sans-serif', fontSize: 18, fill: 'white', stroke: 'black', strokeWidth: 4, miterLimit: 2 },
  circle: { fill: 'rgba(111,155,201,0.5)', stroke: 'rgba(111,155,201,1)', strokeWidth: 1, radiusFactor: 50 },
  polygon: { fill: 'blue', stroke: 'blue', strokeWidth: 2 }
}

function makeParams(overrides: Partial<DrawParams> = {}): DrawParams {
  return {
    ctx: createMockCtx(),
    position: { id: 1, label: 'Test', icons: [], coordinates: { x: 1, y: 1 } } as Position,
    index: 0,
    offsetDrawPosition: { x: 100, y: 100 },
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

describe('renderCircle', () => {
  it('returns a bounding box', () => {
    const result = renderCircle(makeParams())
    expect(result).toHaveProperty('x')
    expect(result).toHaveProperty('width')
    expect(result.width).toBeGreaterThan(0)
  })

  it('draws circle when isInView is true', () => {
    const ctx = createMockCtx()
    renderCircle(makeParams({ ctx }))
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('skips drawing when isInView is false', () => {
    const ctx = createMockCtx()
    renderCircle(makeParams({ ctx, isInView: false }))
    expect(ctx.beginPath).not.toHaveBeenCalled()
  })

  it('still returns bounding box when isInView is false', () => {
    const result = renderCircle(makeParams({ isInView: false }))
    expect(result.width).toBeGreaterThan(0)
  })

  it('applies circle style values', () => {
    const ctx = createMockCtx()
    renderCircle(makeParams({ ctx }))
    expect(ctx.fillStyle).toBe('rgba(111,155,201,0.5)')
    expect(ctx.strokeStyle).toBe('rgba(111,155,201,1)')
  })

  it('draws icon when provided', () => {
    const ctx = createMockCtx()
    const icon = { naturalWidth: 32, naturalHeight: 32 } as HTMLImageElement
    renderCircle(makeParams({ ctx, resolvedIcons: [icon] }))
    expect(ctx.drawImage).toHaveBeenCalledOnce()
  })
})
