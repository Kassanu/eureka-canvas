# eureka-canvas

A Vue 3 component for rendering interactive, zoomable maps with point-of-interest markers. Supports panning, pinch-to-zoom, click/hover detection, polygon regions, customizable styles, and pluggable renderers.

## Installation

```bash
npm install eureka-canvas
```

## Quick Start

```vue
<template>
  <EurekaCanvas
    :canvasImage="'/map.jpg'"
    :positions="positions"
    :gridSizeInPixels="50"
    :coordinatesOffset="1"
    :canvasStyle="canvasStyle"
    @click="onCanvasClick"
    @clickedElement="onElementClick"
    @hover="onHover"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { EurekaCanvas } from 'eureka-canvas'
import type { Position, CanvasStyle } from 'eureka-canvas'

const canvasStyle: CanvasStyle = {
  circle: { fill: 'rgba(100, 180, 220, 0.4)', stroke: 'rgba(100, 180, 220, 1)' }
}

const positions = ref<Position[]>([
  {
    id: 1,
    label: 'Point A',
    coordinates: { x: 5, y: 10 },
    icons: ['/icon.png'],
    drawStyle: 'default',
    labelAnchor: 'bottom'
  },
  {
    id: 2,
    label: 'Base Camp',
    coordinates: { x: 12, y: 8 },
    icons: [],
    drawStyle: 'circle'
  },
  {
    id: 3,
    label: 'Restricted Zone',
    icons: [],
    coordinates: { x: 0, y: 0 },
    drawStyle: 'polygon',
    polygon: [
      { x: 500, y: 300 },
      { x: 700, y: 300 },
      { x: 700, y: 500 },
      { x: 500, y: 500 }
    ],
    style: {
      polygon: { fill: 'rgba(220, 100, 100, 0.3)', stroke: 'rgba(220, 100, 100, 1)' }
    }
  }
])

function onCanvasClick(e: { coordinates: { x: number; y: number } }) {
  console.log('clicked at', e.coordinates)
}

function onElementClick(position: Position) {
  console.log('clicked marker', position)
}

function onHover(position: Position | null) {
  console.log('hovering', position?.label ?? 'nothing')
}
</script>
```

The component fills the size of its parent -- make sure the parent has a defined width and height.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `canvasImage` | `string \| HTMLImageElement` | required | The background map image (URL string or pre-loaded image) |
| `positions` | `Position[]` | required | Array of markers/regions to render |
| `gridSizeInPixels` | `number` | `100` | Pixel size of one coordinate unit on the source image |
| `coordinatesOffset` | `number` | `0` | Offset applied to all displayed coordinates |
| `minimumZoom` | `number` | `10` | Minimum zoom level (%) |
| `maximumZoom` | `number` | `100` | Maximum zoom level (%) |
| `positionsIdKey` | `string` | `'_index'` | Property name used to identify positions in events; defaults to array index |
| `canvasStyle` | `CanvasStyle` | `undefined` | Global style overrides for text, circles, and polygons |
| `renderers` | `Record<string, RendererFunction>` | `undefined` | Custom renderer functions keyed by `drawStyle` name |

## Events

| Event | Payload | Description |
|---|---|---|
| `click` | `{ coordinates: { x, y } }` | Fires on any canvas click with map coordinates |
| `clickedElement` | `Position` | Fires when a position marker or polygon is clicked |
| `hover` | `Position \| null` | Fires when the hovered position changes (cursor becomes pointer on hover) |
| `zoomChange` | `{ level: number, scale: number }` | Fires after a zoom operation completes |
| `panChange` | `{ x: number, y: number }` | Fires after a pan operation completes |
| `viewportChange` | `{ bounds: BoundingBox, zoom: number }` | Fires (debounced) after zoom or pan settles, with the visible image-space region |

## Types

### Position

```typescript
interface Position {
  id: number
  label: string
  icons: (string | HTMLImageElement)[]  // URL strings or pre-loaded images
  coordinates: Coordinates               // grid coordinates (used by default/circle renderers)
  drawStyle?: DrawStyle                  // 'default' | 'circle' | 'polygon' | custom string
  labelAnchor?: LabelAnchor             // 'center' | 'top' | 'bottom' | 'left' | 'right'
  labelOffset?: Coordinates             // pixel offset from anchor point (scales with zoom)
  polygon?: Coordinates[]               // vertices in raw image pixel coords (for polygon drawStyle)
  style?: PositionStyle                 // per-position style overrides
  [key: string]: any                    // additional custom data
}
```

- **`coordinates`** -- Grid coordinates, converted to image pixels via `x * gridSizeInPixels`. Used by `default` and `circle` renderers for positioning. For `polygon` positions, set to `{ x: 0, y: 0 }` (the polygon vertices determine position).
- **`icons`** -- Pass URL strings; the component loads and caches them internally. Icons appear progressively as they load. You can also pass pre-loaded `HTMLImageElement` instances.
- **`drawStyle`** -- Determines which renderer draws this position. Built-in: `'default'`, `'circle'`, `'polygon'`. Pass custom strings to use renderers provided via the `renderers` prop.
- **`polygon`** -- Array of `{ x, y }` vertices in **raw image pixel coordinates** (not grid coordinates). The polygon is drawn as a filled, stroked, closed path.
- **`labelAnchor`** -- Where to place the label relative to the position. Default varies by renderer (`'right'` for default, `'center'` for polygon).
- **`labelOffset`** -- Additional `{ x, y }` pixel offset from the anchor. Scales with zoom level.
- **`style`** -- Per-position style overrides (same shape as `CanvasStyle`). Merged on top of the global `canvasStyle` prop.

### Coordinates

```typescript
interface Coordinates {
  x: number
  y: number
}
```

### Style Types

Styles are resolved with a three-layer merge: **defaults < global `canvasStyle` prop < per-position `style`**.

```typescript
interface CanvasStyle {
  text?: TextStyle
  circle?: CircleStyle
  polygon?: PolygonStyle
  [key: string]: any       // custom renderer styles
}

// PositionStyle is the same shape, used on individual positions
type PositionStyle = CanvasStyle
```

#### TextStyle

Controls label rendering for all renderers.

```typescript
interface TextStyle {
  fontFamily?: string      // default: 'sans-serif'
  fontSize?: number        // default: 18 (pt, scales with zoom)
  fill?: string            // default: 'rgba(255, 255, 255, 1)'
  stroke?: string          // default: 'rgba(0, 0, 0, 1)'
  strokeWidth?: number     // default: 4
  miterLimit?: number      // default: 2
}
```

#### CircleStyle

Controls the circle renderer.

```typescript
interface CircleStyle {
  fill?: string            // default: 'rgba(111, 155, 201, 0.5)'
  stroke?: string          // default: 'rgba(111, 155, 201, 1)'
  strokeWidth?: number     // default: 1
  radiusFactor?: number    // default: 50
}
```

#### PolygonStyle

Controls the polygon renderer.

```typescript
interface PolygonStyle {
  fill?: string            // default: 'rgba(111, 155, 201, 0.3)'
  stroke?: string          // default: 'rgba(111, 155, 201, 1)'
  strokeWidth?: number     // default: 2
}
```

## Built-in Renderers

### `default`

Renders a text label with optional icons. Uses grid `coordinates` for positioning. Icons are drawn to the left of the label, label placement controlled by `labelAnchor` (default: `'right'`).

### `circle`

Renders a filled/stroked circle. Uses grid `coordinates` for positioning. Draws a single icon centered inside the circle if provided. No label rendering.

### `polygon`

Renders a closed, filled/stroked polygon path. Uses `polygon` vertices (raw image pixel coordinates) for shape and positioning. Label is placed at the polygon centroid by default. Supports precise point-in-polygon hit detection for click and hover events.

## Custom Renderers

You can provide custom renderers via the `renderers` prop. A renderer is a function that receives `DrawParams` and returns a `RendererResult`:

```typescript
import type { RendererFunction, DrawParams, RendererResult } from 'eureka-canvas'

const diamondRenderer: RendererFunction = (params: DrawParams): RendererResult => {
  const { ctx, offsetDrawPosition, style, isInView } = params

  // Compute bounding box
  const size = 20
  const box = {
    x: offsetDrawPosition.x - size,
    y: offsetDrawPosition.y - size,
    width: size * 2,
    height: size * 2
  }

  if (isInView) {
    ctx.beginPath()
    ctx.moveTo(offsetDrawPosition.x, offsetDrawPosition.y - size)
    ctx.lineTo(offsetDrawPosition.x + size, offsetDrawPosition.y)
    ctx.lineTo(offsetDrawPosition.x, offsetDrawPosition.y + size)
    ctx.lineTo(offsetDrawPosition.x - size, offsetDrawPosition.y)
    ctx.closePath()
    ctx.fillStyle = 'gold'
    ctx.fill()
  }

  return box
}
```

```vue
<EurekaCanvas
  :canvasImage="'/map.jpg'"
  :positions="positions"
  :renderers="{ diamond: diamondRenderer }"
/>
```

Then set `drawStyle: 'diamond'` on any position to use it.

### DrawParams

The full set of parameters passed to renderer functions:

```typescript
interface DrawParams {
  ctx: CanvasRenderingContext2D
  position: Position
  index: number
  offsetDrawPosition: Coordinates    // pre-computed canvas pixel position
  scaleMultiplier: number
  clampedZoomLevel: number
  canvasImagePos: Coordinates
  isInView: boolean                  // whether the grid coordinate is in the viewport
  shouldRecalcBoundingBoxes: boolean
  style: ResolvedCanvasStyle         // fully resolved styles (defaults + global + per-position)
  gridSizeInPixels: number
  coordinatesOffset: number
  resolvedIcons: HTMLImageElement[]   // pre-loaded icon images (strings resolved from cache)
}
```

### RendererResult

Renderers must return a bounding box. Optionally include a `hitTest` function for precise hit detection (used by polygon renderer for point-in-polygon checks):

```typescript
interface RendererResult extends BoundingBox {
  hitTest?: (point: Coordinates) => boolean
}
```

## Loading States

When `canvasImage` is a URL string, the component shows a loading spinner while the image loads. You can customize the loading and error states with slots:

```vue
<EurekaCanvas :canvasImage="'/map.jpg'" :positions="positions">
  <template #loading>
    <div>Loading map...</div>
  </template>
  <template #error="{ error }">
    <div>Failed to load: {{ error }}</div>
  </template>
</EurekaCanvas>
```

Icons passed as URL strings are loaded and cached automatically. They appear progressively as each icon finishes loading.

## Exported Utilities

### useImageLoader

A composable for loading images outside the component:

```typescript
import { useImageLoader } from 'eureka-canvas'

const { image, isLoading, error } = useImageLoader(() => '/map.jpg')
```

## CSS Customization

The component uses BEM-style class names for all elements:

| Class | Element |
|---|---|
| `.eureka-canvas-container` | Root wrapper |
| `.eureka-canvas` | The canvas element |
| `.eureka-canvas-mouse-coordinates` | Coordinate display overlay |
| `.eureka-canvas-zoom-buttons` | Zoom button container |
| `.eureka-canvas-zoom-input` | Zoom level input |
| `.eureka-canvas-loading` | Default loading overlay |
| `.eureka-canvas-spinner` | Loading spinner |
| `.eureka-canvas-error` | Default error display |

## Migration from v2.x

### Breaking Changes

- **Named export only** -- Use `import { EurekaCanvas } from 'eureka-canvas'` instead of a default import.
- **`canvasImage` prop accepts strings** -- Pass a URL string directly; the component handles loading. `HTMLImageElement` is still accepted for backward compatibility.
- **Icons are now `(string | HTMLImageElement)[]`** -- Pass URL strings instead of `{ image: HTMLImageElement }` objects. No need to pre-load icons.
- **`textPosition` removed** -- Use `labelAnchor` instead (`'top'`, `'bottom'`, `'left'`, `'right'`, `'center'`).
- **CSS IDs replaced with classes** -- All `#eurekaCanvas*` IDs are now `.eureka-canvas-*` classes. Update any custom CSS selectors.
- **Removed types** -- `Icon`, `Quadrant`, and `TextPosition` are no longer exported.

### Position Data Migration

v2.x:
```typescript
{
  id: 1,
  label: 'Point A',
  icons: [{ image: loadedImg }],
  coordinates: { x: 5, y: 10 },
  textPosition: 'bottom',
  drawStyle: 'default'
}
```

v3.0.0:
```typescript
{
  id: 1,
  label: 'Point A',
  icons: ['/icon.png'],
  coordinates: { x: 5, y: 10 },
  labelAnchor: 'bottom',
  drawStyle: 'default'
}
```

---

## Development

### Setup

```bash
git clone https://github.com/Kassanu/eureka-canvas.git
cd eureka-canvas
npm install
```

### Dev server

Runs a test app (`src/App.vue`) with a sample map and generated markers including circles, labels, and polygons:

```bash
npm run dev
```

### Build the library

```bash
npm run build
```

Outputs to `dist/`:
- `dist/index.js` -- ESM build
- `dist/index.d.ts` -- TypeScript declarations

### Tests

```bash
npm run test
```

Tests live in `src/**/*.spec.ts`. The test setup uses Vitest + jsdom + `@vue/test-utils`.

### Local testing in another project

Use `npm link` to test changes against your consumer project without publishing:

```bash
# In this repo -- builds and registers the package globally
npm link

# In your consumer project
npm link eureka-canvas
```

After making changes, run `npm run build` to rebuild the library. The consumer project will pick up the new `dist/` automatically.

To unlink when done:

```bash
# In your consumer project
npm unlink eureka-canvas

# In this repo
npm unlink
```
