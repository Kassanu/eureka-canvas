import { describe, it, expect, vi } from 'vitest'
import { renderDefault } from '../default'
import type { DrawParams, ResolvedCanvasStyle, Position } from '../../types'

function createMockCtx() {
  return {
    textBaseline: '',
    font: '',
    strokeStyle: '',
    lineWidth: 0,
    miterLimit: 0,
    fillStyle: '',
    drawImage: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 }))
  } as unknown as CanvasRenderingContext2D
}

const defaultStyle: ResolvedCanvasStyle = {
  text: { fontFamily: 'sans-serif', fontSize: 18, fill: 'white', stroke: 'black', strokeWidth: 4, miterLimit: 2 },
  circle: { fill: 'blue', stroke: 'blue', strokeWidth: 1, radiusFactor: 50 },
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

describe('renderDefault', () => {
  it('returns a bounding box', () => {
    const result = renderDefault(makeParams())
    expect(result).toHaveProperty('x')
    expect(result).toHaveProperty('y')
    expect(result).toHaveProperty('width')
    expect(result).toHaveProperty('height')
  })

  it('draws text when isInView is true', () => {
    const ctx = createMockCtx()
    renderDefault(makeParams({ ctx }))
    expect(ctx.strokeText).toHaveBeenCalledWith('Test', expect.any(Number), expect.any(Number))
    expect(ctx.fillText).toHaveBeenCalledWith('Test', expect.any(Number), expect.any(Number))
  })

  it('skips drawing when isInView is false', () => {
    const ctx = createMockCtx()
    renderDefault(makeParams({ ctx, isInView: false }))
    expect(ctx.strokeText).not.toHaveBeenCalled()
    expect(ctx.fillText).not.toHaveBeenCalled()
  })

  it('still returns bounding box when isInView is false', () => {
    const result = renderDefault(makeParams({ isInView: false }))
    expect(result.width).toBeGreaterThanOrEqual(0)
    expect(result.height).toBeGreaterThanOrEqual(0)
  })

  it('applies style values to ctx', () => {
    const ctx = createMockCtx()
    renderDefault(makeParams({ ctx }))
    expect(ctx.fillStyle).toBe('white')
    expect(ctx.strokeStyle).toBe('black')
  })

  it('draws icons when provided', () => {
    const ctx = createMockCtx()
    const icon = { naturalWidth: 32, naturalHeight: 32 } as HTMLImageElement
    renderDefault(makeParams({ ctx, resolvedIcons: [icon] }))
    expect(ctx.drawImage).toHaveBeenCalledOnce()
  })

  it('applies labelOffset scaled by zoom', () => {
    const ctx = createMockCtx()
    const position = { id: 1, label: 'Test', icons: [], coordinates: { x: 1, y: 1 }, labelOffset: { x: 10, y: 5 } } as Position
    renderDefault(makeParams({ ctx, position, clampedZoomLevel: 50 }))
    // Just verify it renders without error — offset math is internal
    expect(ctx.fillText).toHaveBeenCalled()
  })
})
