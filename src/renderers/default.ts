import type { DrawParams, BoundingBox, RendererResult } from '../types'
import { rectBounds, calculateTextWidthAndHeight } from '../utils/geometry'

export function renderDefault(params: DrawParams): RendererResult {
  const { ctx, position, offsetDrawPosition, clampedZoomLevel, isInView, style, resolvedIcons } = params
  const zoomScale = clampedZoomLevel / 100

  let firstIconWidth = 0
  let lastIconWidth = 0
  let totalIconWidth = 0
  let iconHeight = 0
  const iconsBoundingBox: BoundingBox = { x: 0, y: 0, width: 0, height: 0 }

  resolvedIcons.forEach((icon, idx) => {
    const scaledWidth = icon.naturalWidth * zoomScale
    const scaledHeight = icon.naturalHeight * zoomScale
    const iconPosition = {
      x: (offsetDrawPosition.x - (scaledWidth / 2)) + totalIconWidth,
      y: offsetDrawPosition.y - (scaledHeight / 2)
    }
    lastIconWidth = scaledWidth
    if (idx === 0) {
      firstIconWidth = lastIconWidth
      iconsBoundingBox.x = iconPosition.x
      iconsBoundingBox.y = iconPosition.y
    }
    totalIconWidth += lastIconWidth
    iconsBoundingBox.width = totalIconWidth
    if (isInView) {
      ctx.drawImage(icon, iconPosition.x, iconPosition.y, scaledWidth, scaledHeight)
    }
    if (scaledHeight > iconHeight) {
      iconHeight = scaledHeight
    }
    iconsBoundingBox.height = iconHeight
  })

  const { text } = style
  const fontSize = text.fontSize * zoomScale
  ctx.textBaseline = 'middle'
  ctx.font = `${fontSize}pt ${text.fontFamily}`
  ctx.strokeStyle = text.stroke
  ctx.lineWidth = text.strokeWidth
  ctx.miterLimit = text.miterLimit
  ctx.fillStyle = text.fill

  const textWidthAndHeight = calculateTextWidthAndHeight(ctx, position.label, fontSize)

  const textDrawPosition = { x: offsetDrawPosition.x, y: offsetDrawPosition.y }
  const anchor = position.labelAnchor ?? position.textPosition ?? 'right'
  switch (anchor) {
    case 'top':
      textDrawPosition.x -= (textWidthAndHeight.width / 2)
      textDrawPosition.y -= iconHeight
      break
    case 'bottom':
      textDrawPosition.x -= (textWidthAndHeight.width / 2)
      textDrawPosition.y += iconHeight
      break
    case 'left':
      textDrawPosition.x -= (textWidthAndHeight.width + (firstIconWidth / 2))
      break
    case 'center':
      textDrawPosition.x -= (textWidthAndHeight.width / 2)
      break
    case 'right':
    default:
      textDrawPosition.x += totalIconWidth - (lastIconWidth / 2)
      break
  }

  if (position.labelOffset) {
    textDrawPosition.x += position.labelOffset.x * zoomScale
    textDrawPosition.y += position.labelOffset.y * zoomScale
  }

  const textBoundingBox: BoundingBox = {
    x: textDrawPosition.x,
    y: textDrawPosition.y - (textWidthAndHeight.height / 2),
    width: textWidthAndHeight.width,
    height: textWidthAndHeight.height
  }

  if (isInView) {
    ctx.strokeText(position.label, textDrawPosition.x, textDrawPosition.y)
    ctx.fillText(position.label, textDrawPosition.x, textDrawPosition.y)
  }

  return rectBounds(iconsBoundingBox, textBoundingBox)
}
