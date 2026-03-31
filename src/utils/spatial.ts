import type { BoundingBox, BoundingBoxEntry, Quadrant } from '../types'

export type QuadrantKey = 'northwest' | 'northeast' | 'southeast' | 'southwest'

export type QuadrantMap = Record<QuadrantKey, Quadrant>

export function createQuadrantMap(): QuadrantMap {
  return {
    northwest: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] },
    northeast: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] },
    southeast: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] },
    southwest: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] }
  }
}

export function resetQuadrants(
  quadrants: QuadrantMap,
  scaledImageWidth: number,
  scaledImageHeight: number
): void {
  const halfWidth = scaledImageWidth / 2
  const halfHeight = scaledImageHeight / 2

  for (const [key, quadrant] of Object.entries(quadrants) as [QuadrantKey, Quadrant][]) {
    quadrant.children.length = 0
    quadrant.box.width = halfWidth
    quadrant.box.height = halfHeight
    switch (key) {
      case 'northwest':
        quadrant.box.x = 0
        quadrant.box.y = 0
        break
      case 'northeast':
        quadrant.box.x = halfWidth
        quadrant.box.y = 0
        break
      case 'southeast':
        quadrant.box.x = halfWidth
        quadrant.box.y = halfHeight
        break
      case 'southwest':
        quadrant.box.x = 0
        quadrant.box.y = halfHeight
        break
    }
  }
}

export function addBoundingBox(
  quadrants: QuadrantMap,
  boundingBox: BoundingBoxEntry
): void {
  const keys = getQuadrantsForBoundingBox(quadrants, boundingBox)
  for (const key of keys) {
    quadrants[key].children.push(boundingBox)
  }
}

export function getQuadrantsForBoundingBox(
  quadrants: QuadrantMap,
  box: BoundingBox
): QuadrantKey[] {
  return (Object.keys(quadrants) as QuadrantKey[]).filter((key) => {
    const quadBox = quadrants[key].box
    return box.x < (quadBox.x + quadBox.width)
      && (box.x + box.width) > quadBox.x
      && box.y < (quadBox.y + quadBox.height)
      && (box.y + box.height) > quadBox.y
  })
}

export function getPointQuadrant(
  quadrants: QuadrantMap,
  point: { x: number; y: number }
): QuadrantKey | undefined {
  return (Object.keys(quadrants) as QuadrantKey[]).find((key) => {
    const box = quadrants[key].box
    return point.x >= box.x
      && point.x <= (box.x + box.width)
      && point.y >= box.y
      && point.y <= (box.y + box.height)
  })
}

export function findIntersection(
  quadrants: QuadrantMap,
  point: { x: number; y: number }
): BoundingBoxEntry | undefined {
  const quadrant = getPointQuadrant(quadrants, point)
  if (!quadrant) return undefined
  return quadrants[quadrant].children.slice().reverse().find(box =>
    point.x >= box.x
    && point.x <= (box.x + box.width)
    && point.y >= box.y
    && point.y <= (box.y + box.height)
  )
}
