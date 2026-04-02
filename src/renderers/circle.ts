import type { DrawParams, RendererResult } from '../types'
import { arcBounds } from '../utils/geometry'

export function renderCircle(params: DrawParams): RendererResult {
  const { ctx, offsetDrawPosition, clampedZoomLevel, isInView, style, resolvedIcons } = params
  const zoomScale = clampedZoomLevel / 100
  const { circle } = style

  const radius = (circle.radiusFactor * zoomScale) * zoomScale
  const bounds = arcBounds(offsetDrawPosition.x, offsetDrawPosition.y, radius, 0, 2 * Math.PI)

  if (isInView) {
    ctx.beginPath()
    ctx.arc(offsetDrawPosition.x, offsetDrawPosition.y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = circle.fill
    ctx.fill()
    ctx.lineWidth = circle.strokeWidth
    ctx.strokeStyle = circle.stroke
    ctx.stroke()

    const icon = resolvedIcons[0]
    if (icon) {
      const scaledWidth = icon.naturalWidth * zoomScale
      const scaledHeight = icon.naturalHeight * zoomScale
      ctx.drawImage(
        icon,
        offsetDrawPosition.x - (scaledWidth / 2),
        offsetDrawPosition.y - (scaledHeight / 2),
        scaledWidth,
        scaledHeight
      )
    }
  }

  return bounds
}
