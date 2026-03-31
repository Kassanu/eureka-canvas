import type { BoundingBox, Coordinates } from '../types'

export function rectBounds(rect1: BoundingBox, rect2: BoundingBox): BoundingBox {
  const xMin = Math.min(rect1.x, rect2.x)
  const yMin = Math.min(rect1.y, rect2.y)
  const xMax = Math.max(rect1.x + rect1.width, rect2.x + rect2.width)
  const yMax = Math.max(rect1.y + rect1.height, rect2.y + rect2.height)
  return {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin
  }
}

export function arcBounds(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): BoundingBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const points: Coordinates[] = [
    { x: cx, y: cy },
    arcpoint(cx, cy, radius, startAngle),
    arcpoint(cx, cy, radius, endAngle)
  ]

  const cardinals = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2]
  for (const angle of cardinals) {
    if (angle >= startAngle && angle <= endAngle) {
      points.push(arcpoint(cx, cy, radius, angle))
    }
  }

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.x > maxX) maxX = pt.x
    if (pt.y > maxY) maxY = pt.y
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function arcpoint(cx: number, cy: number, radius: number, angle: number): Coordinates {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

export function calculateTextWidthAndHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number
): { width: number; height: number } {
  return {
    width: ctx.measureText(text).width,
    height: fontSize
  }
}
