import type { RendererFunction } from '../types'
import { renderDefault } from './default'
import { renderCircle } from './circle'
import { renderPolygon } from './polygon'

export const builtInRenderers: Record<string, RendererFunction> = {
  default: renderDefault,
  circle: renderCircle,
  polygon: renderPolygon
}
