import type { DrawParams, RendererResult, Coordinates } from '../types'
import { polygonBounds, pointInPolygon, polygonCentroid } from '../utils/geometry'

export function renderPolygon(params: DrawParams): RendererResult {
  const {
    ctx, position, offsetDrawPosition, scaleMultiplier,
    clampedZoomLevel, canvasImagePos, style
  } = params
  const { polygon: polygonStyle, text } = style
  const zoomScale = clampedZoomLevel / 100

  const vertices = position.polygon ?? []
  if (vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // Scale vertices from image coords to canvas coords
  const scaledVertices: Coordinates[] = vertices.map(v => ({
    x: v.x * scaleMultiplier + canvasImagePos.x,
    y: v.y * scaleMultiplier + canvasImagePos.y
  }))

  // Polygon visibility is based on its own bounds, not position.coordinates
  const bounds = polygonBounds(scaledVertices)
  const canvasWidth = ctx.canvas.width
  const canvasHeight = ctx.canvas.height
  const polyInView = bounds.x + bounds.width >= 0
    && bounds.x <= canvasWidth
    && bounds.y + bounds.height >= 0
    && bounds.y <= canvasHeight

  if (polyInView) {
    ctx.beginPath()
    ctx.moveTo(scaledVertices[0].x, scaledVertices[0].y)
    for (let i = 1; i < scaledVertices.length; i++) {
      ctx.lineTo(scaledVertices[i].x, scaledVertices[i].y)
    }
    ctx.closePath()
    ctx.fillStyle = polygonStyle.fill
    ctx.fill()
    ctx.lineWidth = polygonStyle.strokeWidth
    ctx.strokeStyle = polygonStyle.stroke
    ctx.stroke()

    // Draw label at centroid or offsetDrawPosition
    if (position.label) {
      const centroid = position.coordinates.x === 0 && position.coordinates.y === 0
        ? polygonCentroid(scaledVertices)
        : offsetDrawPosition

      const fontSize = text.fontSize * zoomScale
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.font = `${fontSize}pt ${text.fontFamily}`
      ctx.strokeStyle = text.stroke
      ctx.lineWidth = text.strokeWidth
      ctx.miterLimit = text.miterLimit
      ctx.fillStyle = text.fill

      let labelX = centroid.x
      let labelY = centroid.y
      if (position.labelOffset) {
        labelX += position.labelOffset.x * zoomScale
        labelY += position.labelOffset.y * zoomScale
      }

      ctx.strokeText(position.label, labelX, labelY)
      ctx.fillText(position.label, labelX, labelY)
      ctx.textAlign = 'start' // reset
    }
  }

  // Image-relative scaled vertices for hitTest (subtract canvasImagePos)
  const hitTestVertices = scaledVertices.map(v => ({
    x: v.x - canvasImagePos.x,
    y: v.y - canvasImagePos.y
  }))

  return {
    ...bounds,
    hitTest: (point: Coordinates) => pointInPolygon(point, hitTestVertices)
  }
}
