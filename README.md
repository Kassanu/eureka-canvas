# eureka-canvas

A Vue 3 component for rendering interactive, zoomable maps with point-of-interest markers. Supports panning, pinch-to-zoom, click detection, and customizable icons/labels.

## Installation

```bash
npm install eureka-canvas
```

## Usage

```vue
<template>
  <EurekaCanvas
    :canvasImage="image"
    :positions="positions"
    :gridSizeInPixels="50"
    :coordinatesOffset="1"
    @click="onCanvasClick"
    @clickedElement="onElementClick"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EurekaCanvas from 'eureka-canvas'

const image = ref<HTMLImageElement | null>(null)
const positions = ref<Position[]>([])

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.src = url
  })
}

onMounted(async () => {
  image.value = await loadImage('/map.jpg')
  const icon = await loadImage('/icon.png')
  positions.value = [
    {
      id: 1,
      label: 'Point A',
      coordinates: { x: 5, y: 10 },
      icons: [{ image: icon }],
      textPosition: 'bottom'
    }
  ]
})

function onCanvasClick(e: { coordinates: { x: number; y: number } }) {
  console.log('clicked at', e.coordinates)
}

function onElementClick(position: Position) {
  console.log('clicked marker', position)
}
</script>
```

The component fills the size of its parent — make sure the parent has a defined width and height.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `canvasImage` | `HTMLImageElement` | required | The background map image |
| `positions` | `Position[]` | required | Array of markers to render |
| `gridSizeInPixels` | `number` | `100` | Pixel size of one coordinate unit |
| `coordinatesOffset` | `number` | `0` | Offset applied to all displayed coordinates |
| `minimumZoom` | `number` | `10` | Minimum zoom level (%) |
| `maximumZoom` | `number` | `100` | Maximum zoom level (%) |
| `positionsIdKey` | `string` | `'_index'` | Property name used to identify positions in `clickedElement` events; defaults to array index |

## Events

| Event | Payload | Description |
|---|---|---|
| `click` | `{ coordinates: { x: number, y: number } }` | Fires on any canvas click, with map coordinates |
| `clickedElement` | `Position` | Fires when a position marker is clicked |

## Types

```typescript
interface Position {
  label: string
  coordinates: { x: number; y: number }
  icons: { image: HTMLImageElement | null }[]
  drawStyle?: 'circle' | 'default'   // default: 'default'
  textPosition?: 'top' | 'bottom' | 'left' | 'right'  // default: 'right'
  [key: string]: any
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

Runs a test app (`src/App.vue`) with a sample map and 250 generated markers:

```bash
npm run dev
```

### Build the library

```bash
npm run build
```

Outputs to `dist/`:
- `dist/index.js` — ESM build
- `dist/index.umd.cjs` — UMD build
- `dist/index.d.ts` — TypeScript declarations

### Tests

```bash
npm run test
```

Tests live in `src/**/*.spec.ts`. The test setup uses Vitest + jsdom + `@vue/test-utils`.

### Local testing in another project

Use `npm link` to test changes against your consumer project without publishing:

```bash
# In this repo — builds and registers the package globally
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
