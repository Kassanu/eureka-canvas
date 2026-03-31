import type { Coordinates } from '../types'

export function relativePointOnImage(
  point: Coordinates,
  imagePos: Coordinates
): Coordinates {
  return { x: point.x - imagePos.x, y: point.y - imagePos.y }
}

export function scaledPointToFullPoint(
  scaledPoint: Coordinates,
  scaleMultiplier: number
): Coordinates {
  return { x: scaledPoint.x / scaleMultiplier, y: scaledPoint.y / scaleMultiplier }
}

export function fullPointToScaledPoint(
  fullPoint: Coordinates,
  scaleMultiplier: number
): Coordinates {
  return { x: fullPoint.x * scaleMultiplier, y: fullPoint.y * scaleMultiplier }
}

export function fullPointToCoordinates(
  fullPoint: Coordinates,
  gridSizeInPixels: number,
  coordinatesOffset: number
): Coordinates {
  return {
    x: (Math.round((fullPoint.x / gridSizeInPixels) * 10) / 10) + coordinatesOffset,
    y: (Math.round((fullPoint.y / gridSizeInPixels) * 10) / 10) + coordinatesOffset
  }
}

export function coordinatesToFullPoint(
  coordinates: Coordinates,
  gridSizeInPixels: number,
  coordinatesOffset: number
): Coordinates {
  return {
    x: (coordinates.x - coordinatesOffset) * gridSizeInPixels,
    y: (coordinates.y - coordinatesOffset) * gridSizeInPixels
  }
}

export function isCoordinateInView(
  coordinates: Coordinates,
  canvasWidth: number,
  canvasHeight: number,
  imagePos: Coordinates,
  scaleMultiplier: number,
  gridSizeInPixels: number,
  coordinatesOffset: number
): boolean {
  const fullPoint = coordinatesToFullPoint(coordinates, gridSizeInPixels, coordinatesOffset)
  const position = fullPointToScaledPoint(fullPoint, scaleMultiplier)
  const shiftedPosition = {
    x: position.x + imagePos.x,
    y: position.y + imagePos.y
  }
  return shiftedPosition.y >= 0
    && shiftedPosition.y <= canvasHeight
    && shiftedPosition.x >= 0
    && shiftedPosition.x <= canvasWidth
}

export function pointIsOnImage(
  point: Coordinates,
  imagePos: Coordinates,
  scaledWidth: number,
  scaledHeight: number
): boolean {
  return point.x >= imagePos.x
    && point.x <= (imagePos.x + scaledWidth)
    && point.y >= imagePos.y
    && point.y <= (imagePos.y + scaledHeight)
}
