<template>
  <EurekaCanvas
    :canvasImage="imagePath"
    :gridSizeInPixels="50"
    :coordinatesOffset="1"
    :positions="positions"
    :positionsIdKey="'id'"
    :canvasStyle="canvasStyle"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EurekaCanvas from './components/EurekaCanvas.vue'
import type { Position, CanvasStyle } from './types'
import imagePath from './assets/test.jpg'

const iconUrl = new URL('./assets/testIconRed.png', import.meta.url).href

const canvasStyle: CanvasStyle = {
  circle: { fill: 'rgba(100, 180, 220, 0.4)', stroke: 'rgba(100, 180, 220, 1)' }
}

const positions = ref<Position[]>([])

function loadPositions(): Position[] {
  const positionsArr: Position[] = []
  for (let index = 0; index < 200; index++) {
    const mod = index % 10
    if (mod === 0) {
      // Circle positions
      positionsArr.push({
        id: index,
        label: `Circle-${index + 1}`,
        icons: [iconUrl],
        drawStyle: 'circle',
        coordinates: {
          x: Math.floor(Math.random() * 74) + 1,
          y: Math.floor(Math.random() * 74) + 1
        }
      })
    } else if (mod === 5) {
      // Polygon positions — small diamond shapes in image pixel coords
      const cx = Math.floor(Math.random() * 3500) + 100
      const cy = Math.floor(Math.random() * 3500) + 100
      const size = 80
      positionsArr.push({
        id: index,
        label: `Zone-${index + 1}`,
        icons: [],
        drawStyle: 'polygon',
        coordinates: { x: 0, y: 0 },
        polygon: [
          { x: cx, y: cy - size },
          { x: cx + size, y: cy },
          { x: cx, y: cy + size },
          { x: cx - size, y: cy }
        ],
        style: index % 20 === 5
          ? { polygon: { fill: 'rgba(220, 100, 100, 0.3)', stroke: 'rgba(220, 100, 100, 1)' } }
          : undefined
      })
    } else {
      // Default label positions
      positionsArr.push({
        id: index,
        label: `Test-${index + 1}`,
        icons: [iconUrl],
        drawStyle: 'default',
        coordinates: {
          x: Math.floor(Math.random() * 74) + 1,
          y: Math.floor(Math.random() * 74) + 1
        },
        labelAnchor: index % 3 === 0 ? 'top' : undefined,
        labelOffset: index % 7 === 0 ? { x: 5, y: -3 } : undefined
      })
    }
  }
  // Complex polygon — irregular region outline like tracing a settlement on a map
  positionsArr.push({
    id: 9999,
    label: 'Contested Territory',
    icons: [],
    drawStyle: 'polygon',
    coordinates: { x: 0, y: 0 },
    polygon: [
      { x: 1200, y: 800 },
      { x: 1350, y: 750 },
      { x: 1500, y: 780 },
      { x: 1620, y: 850 },
      { x: 1680, y: 1000 },
      { x: 1720, y: 1180 },
      { x: 1650, y: 1320 },
      { x: 1580, y: 1400 },
      { x: 1450, y: 1450 },
      { x: 1300, y: 1420 },
      { x: 1180, y: 1350 },
      { x: 1100, y: 1220 },
      { x: 1050, y: 1080 },
      { x: 1080, y: 950 },
      { x: 1150, y: 860 },
    ],
    style: {
      polygon: { fill: 'rgba(180, 140, 60, 0.25)', stroke: 'rgba(180, 140, 60, 0.9)', strokeWidth: 3 }
    }
  })

  return positionsArr
}

onMounted(() => {
  positions.value = loadPositions()
})
</script>

<style>
body,
html {
  height: 100vh;
  width: 100vw;
  padding: 0;
  margin: 0;
}

#app {
  width: 100%;
  height: 100%;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
