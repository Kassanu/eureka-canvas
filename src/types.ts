export type DrawStyle = 'default' | 'circle' | 'polygon' | (string & {})

export type LabelAnchor = 'center' | 'top' | 'bottom' | 'left' | 'right'

export interface TextStyle {
  fontFamily?: string
  fontSize?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  miterLimit?: number
}

export interface CircleStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  radiusFactor?: number
}

export interface PolygonStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export interface CanvasStyle {
  text?: TextStyle
  circle?: CircleStyle
  polygon?: PolygonStyle
  [key: string]: any
}

export type PositionStyle = CanvasStyle

export interface ResolvedCanvasStyle {
  text: Required<TextStyle>
  circle: Required<CircleStyle>
  polygon: Required<PolygonStyle>
  [key: string]: any
}

export interface DrawParams {
  ctx: CanvasRenderingContext2D
  position: Position
  index: number
  offsetDrawPosition: Coordinates
  scaleMultiplier: number
  clampedZoomLevel: number
  canvasImagePos: Coordinates
  isInView: boolean
  shouldRecalcBoundingBoxes: boolean
  style: ResolvedCanvasStyle
  gridSizeInPixels: number
  coordinatesOffset: number
  resolvedIcons: HTMLImageElement[]
}

export interface RendererResult extends BoundingBox {
  hitTest?: (point: Coordinates) => boolean
}

export type RendererFunction = (params: DrawParams) => RendererResult

export interface Coordinates {
  x: number
  y: number
}

export interface Position {
  id: number
  label: string
  icons: (string | HTMLImageElement)[]
  coordinates: Coordinates
  drawStyle?: DrawStyle
  labelAnchor?: LabelAnchor
  labelOffset?: Coordinates
  polygon?: Coordinates[]
  style?: PositionStyle
  [key: string]: any
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface BoundingBoxEntry extends BoundingBox {
  id: number | string
  idKey: string
  hitTest?: (point: Coordinates) => boolean
}
