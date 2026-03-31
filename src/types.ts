export type DrawStyle = 'default' | 'circle'

export type TextPosition = 'top' | 'bottom' | 'left' | 'right'

export interface Icon {
  path: string
  image: HTMLImageElement | null
}

export interface Coordinates {
  x: number
  y: number
}

export interface Position {
  id: number
  label: string
  icons: Icon[]
  coordinates: Coordinates
  drawStyle?: DrawStyle
  textPosition?: TextPosition
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
}

export interface Quadrant {
  box: BoundingBox
  children: BoundingBoxEntry[]
}
