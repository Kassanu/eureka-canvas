import type { CanvasStyle, PositionStyle, ResolvedCanvasStyle } from '../types'

const DEFAULT_STYLE: ResolvedCanvasStyle = {
  text: {
    fontFamily: 'sans-serif',
    fontSize: 18,
    fill: 'rgba(255, 255, 255, 1)',
    stroke: 'rgba(0, 0, 0, 1)',
    strokeWidth: 4,
    miterLimit: 2
  },
  circle: {
    fill: 'rgba(111, 155, 201, 0.5)',
    stroke: 'rgba(111, 155, 201, 1)',
    strokeWidth: 1,
    radiusFactor: 50
  },
  polygon: {
    fill: 'rgba(111, 155, 201, 0.3)',
    stroke: 'rgba(111, 155, 201, 1)',
    strokeWidth: 2
  }
}

export function resolveStyle(
  globalStyle?: CanvasStyle,
  positionStyle?: PositionStyle
): ResolvedCanvasStyle {
  return {
    text: { ...DEFAULT_STYLE.text, ...globalStyle?.text, ...positionStyle?.text },
    circle: { ...DEFAULT_STYLE.circle, ...globalStyle?.circle, ...positionStyle?.circle },
    polygon: { ...DEFAULT_STYLE.polygon, ...globalStyle?.polygon, ...positionStyle?.polygon }
  }
}
