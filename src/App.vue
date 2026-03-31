<template>
  <EurekaCanvas
    v-if="!loading"
    :canvasImage="image!"
    :gridSizeInPixels="50"
    :coordinatesOffset="1"
    :positions="positions"
    :positionsIdKey="'id'"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import EurekaCanvas from './components/EurekaCanvas.vue'
import type { Icon, Position } from './types'

const loading = ref(true)
const image = ref<HTMLImageElement | null>(null)
import imagePath from './assets/test.jpg'
const icons = ref<Icon[]>([
  {
    path: new URL('./assets/testIconRed.png', import.meta.url).href,
    image: null
  }
])
const positions = ref<Position[]>([])

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.src = url
  })
}

async function loadIcons() {
  for (const icon of icons.value) {
    icon.image = await loadImage(icon.path)
  }
}

function loadPositions(): Position[] {
  const positionsArr: Position[] = []
  const baseObj = {
    id: 0,
    label: '',
    icons: [],
    coordinates: { x: 1, y: 1 }
  }
  for (let index = 0; index < 250; index++) {
    positionsArr.push({
      ...baseObj,
      id: index,
      label: `Test-${index + 1}`,
      coordinates: {
        x: Math.floor(Math.random() * (75 - 1 + 1)) + 1,
        y: Math.floor(Math.random() * (75 - 1 + 1)) + 1
      },
      icons: [
        icons.value[Math.floor(Math.random() * icons.value.length)]
      ]
    })
  }
  return positionsArr
}

onMounted(async () => {
  image.value = await loadImage(imagePath)
  await loadIcons()
  positions.value = loadPositions()
  loading.value = false
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
