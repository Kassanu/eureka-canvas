<template>
  <div class="eureka-canvas-container">
    <template v-if="imageLoading">
      <slot name="loading">
        <div class="eureka-canvas-loading">
          <div class="eureka-canvas-spinner" />
        </div>
      </slot>
    </template>
    <template v-else-if="imageError">
      <slot name="error" :error="imageError">
        <div class="eureka-canvas-error">{{ imageError }}</div>
      </slot>
    </template>
    <template v-else>
      <canvas ref="canvasRef" class="eureka-canvas"></canvas>
      <div v-show="showCoordinates" class="eureka-canvas-mouse-coordinates">
        {{ mouseCoordinates.x ?? '' }}, {{ mouseCoordinates.y ?? '' }}
      </div>
      <ZoomContainer
        :minimumZoom="minimumZoom"
        :maximumZoom="maximumZoom"
        :zoomLevel="zoomLevel"
        @scaleToFit="scaleToFit"
        @zoomTo="zoomTo"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import ZoomContainer from './ZoomContainer.vue'
import type { Position, Coordinates, CanvasStyle, RendererFunction, DrawParams } from '../types'
import { useImageLoader } from '../composables/useImageLoader'
import {
  isCoordinateInView,
  coordinatesToFullPoint,
  fullPointToScaledPoint,
  pointIsOnImage,
  relativePointOnImage
} from '../utils/coordinates'
import { Quadtree } from '../utils/spatial'
import { resolveStyle } from '../utils/style'
import { builtInRenderers } from '../renderers'
import { useCanvasZoom } from '../composables/useCanvasZoom'
import { useCanvasPan } from '../composables/useCanvasPan'
import { useCanvasInput } from '../composables/useCanvasInput'
import { useIconCache } from '../composables/useIconCache'

const props = defineProps<{
  canvasImage: string | HTMLImageElement
  gridSizeInPixels?: number
  coordinatesOffset?: number
  positions: Position[]
  minimumZoom?: number
  maximumZoom?: number
  positionsIdKey?: string
  canvasStyle?: CanvasStyle
  renderers?: Record<string, RendererFunction>
}>()

const { image: loadedImage, isLoading: imageLoading, error: imageError } = useImageLoader(() => props.canvasImage)

const emit = defineEmits(['click', 'clickedElement', 'hover', 'zoomChange', 'panChange', 'viewportChange'])

const gridSizeInPixels = computed(() => props.gridSizeInPixels ?? 100)
const coordinatesOffset = computed(() => props.coordinatesOffset ?? 0)
const minimumZoom = computed(() => props.minimumZoom ?? 10)
const maximumZoom = computed(() => props.maximumZoom ?? 100)
const positionsIdKey = computed(() => props.positionsIdKey ?? '_index')

const activeRenderers = computed(() => ({ ...builtInRenderers, ...props.renderers }))
const iconCache = useIconCache()
iconCache.setOnLoad(() => draw())

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const canvasElementWidth = ref(0)
const canvasElementHeight = ref(0)
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const canvasImageWidth = ref(0)
const canvasImageHeight = ref(0)
const canvasImagePos = reactive({ x: 0, y: 0 })
const shouldRecalcBoundingBoxes = ref(true)
const debugBoundingBoxes = ref(false)

let positionBoundingBoxes = new Quadtree({ x: 0, y: 0, width: 0, height: 0 })
const lastHoveredId = ref<number | string | null>(null)

function emitViewportChange() {
  emit('viewportChange', {
    bounds: {
      x: -canvasImagePos.x / scaleMultiplier.value,
      y: -canvasImagePos.y / scaleMultiplier.value,
      width: canvasElementWidth.value / scaleMultiplier.value,
      height: canvasElementHeight.value / scaleMultiplier.value,
    },
    zoom: zoomLevel.value
  })
}

let viewportChangeTimer: ReturnType<typeof setTimeout> | null = null
function debouncedViewportChange() {
  if (viewportChangeTimer) clearTimeout(viewportChangeTimer)
  viewportChangeTimer = setTimeout(emitViewportChange, 150)
}

const {
  zoomLevel, scaledImageWidth, scaledImageHeight,
  scaleMultiplier, clampedZoomLevel,
  zoomImage, zoomTo, scaleToFit
} = useCanvasZoom({
  canvasImageWidth, canvasImageHeight,
  canvasElementWidth, canvasElementHeight,
  canvasImagePos, canvasElement,
  minimumZoom, maximumZoom,
  onAfterZoom: () => {
    resetSpatialIndex()
    draw()
    emit('zoomChange', { level: zoomLevel.value, scale: scaleMultiplier.value })
    debouncedViewportChange()
  }
})

const { dragging, startDrag, stopDrag, dragEvent } = useCanvasPan({
  canvasImagePos,
  canvasElementWidth, canvasElementHeight,
  scaledImageWidth, scaledImageHeight,
  onAfterPan: () => {
    draw()
    emit('panChange', { x: canvasImagePos.x, y: canvasImagePos.y })
    debouncedViewportChange()
  }
})

const { showCoordinates, mouseCoordinates, setUpListeners } = useCanvasInput({
  canvasElement, canvasImagePos,
  scaleMultiplier, scaledImageWidth, scaledImageHeight,
  gridSizeInPixels, coordinatesOffset,
  zoomImage, dragging, startDrag, stopDrag, dragEvent,
  onResize: () => { resizeCanvas(); draw() },
  onClick: (coordinates) => emit('click', { coordinates }),
  onClickElement: checkIntersections,
  onMouseMove: handleMouseMove
})

watch(() => props.positions, () => {
  resetSpatialIndex()
  draw()
})

watch(loadedImage, (img) => {
  if (!img) return
  nextTick(() => {
    canvasImageWidth.value = img.naturalWidth
    canvasImageHeight.value = img.naturalHeight
    scaledImageWidth.value = canvasImageWidth.value
    scaledImageHeight.value = canvasImageHeight.value
    canvasElement.value = canvasRef.value
    if (!canvasElement.value) return
    resizeCanvas()
    canvasContext.value = canvasElement.value.getContext('2d')
    setUpListeners()
    scaleToFit()
  })
})

function resizeCanvas() {
  if (!canvasElement.value) return
  canvasElementWidth.value = canvasElement.value.getBoundingClientRect().width
  canvasElementHeight.value = canvasElement.value.getBoundingClientRect().height
  canvasElement.value.width = canvasElement.value.offsetWidth
  canvasElement.value.height = canvasElement.value.offsetHeight
}

function resetSpatialIndex() {
  positionBoundingBoxes = new Quadtree({
    x: 0, y: 0,
    width: scaledImageWidth.value,
    height: scaledImageHeight.value
  })
  shouldRecalcBoundingBoxes.value = true
}

function checkIntersections(point: Coordinates) {
  if (!pointIsOnImage(point, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value)) return
  const relPoint = relativePointOnImage(point, canvasImagePos)
  const hit = positionBoundingBoxes.queryPoint(relPoint)
  if (hit) {
    if (hit.idKey === '_index') {
      emit('clickedElement', props.positions[hit.id as number])
    } else {
      emit('clickedElement', props.positions.find(position => position[hit.idKey] === hit.id))
    }
  }
}

function handleMouseMove(point: Coordinates) {
  if (!pointIsOnImage(point, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value)) {
    if (lastHoveredId.value !== null) {
      lastHoveredId.value = null
      emit('hover', null)
      if (canvasElement.value) canvasElement.value.style.cursor = ''
    }
    return
  }
  const relPoint = relativePointOnImage(point, canvasImagePos)
  const hit = positionBoundingBoxes.queryPoint(relPoint)
  const hitId = hit ? hit.id : null
  if (hitId !== lastHoveredId.value) {
    lastHoveredId.value = hitId
    if (hit) {
      const position = hit.idKey === '_index'
        ? props.positions[hit.id as number]
        : props.positions.find(p => p[hit.idKey] === hit.id)
      emit('hover', position ?? null)
      if (canvasElement.value) canvasElement.value.style.cursor = 'pointer'
    } else {
      emit('hover', null)
      if (canvasElement.value) canvasElement.value.style.cursor = ''
    }
  }
}

function draw() {
  if (!canvasContext.value || !canvasElement.value || !loadedImage.value) return
  canvasContext.value.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height)
  canvasContext.value.drawImage(
    loadedImage.value,
    canvasImagePos.x,
    canvasImagePos.y,
    scaledImageWidth.value,
    scaledImageHeight.value
  )
  drawPositions()
  if (debugBoundingBoxes.value) {
    const allBoxes = positionBoundingBoxes.queryArea({ x: 0, y: 0, width: scaledImageWidth.value, height: scaledImageHeight.value })
    for (const box of allBoxes) {
      canvasContext.value!.strokeStyle = 'red'
      canvasContext.value!.lineWidth = 1
      canvasContext.value!.strokeRect(box.x, box.y, box.width, box.height)
    }
  }
}

function drawPositions() {
  if (!canvasContext.value) return
  const ctx = canvasContext.value

  props.positions.forEach((position, index) => {
    const isInView = isCoordinateInView(
      position.coordinates,
      canvasElementWidth.value, canvasElementHeight.value,
      canvasImagePos, scaleMultiplier.value,
      gridSizeInPixels.value, coordinatesOffset.value
    )
    const fullPoint = coordinatesToFullPoint(position.coordinates, gridSizeInPixels.value, coordinatesOffset.value)
    const drawPosition = fullPointToScaledPoint(fullPoint, scaleMultiplier.value)
    const offsetDrawPosition = {
      x: drawPosition.x + canvasImagePos.x,
      y: drawPosition.y + canvasImagePos.y,
    }

    const style = resolveStyle(props.canvasStyle, position.style)
    const resolvedIcons = iconCache.resolveAll(
      position.icons.map((icon: any) => (icon && typeof icon === 'object' && 'image' in icon) ? icon.image : icon)
        .filter((img: any): img is string | HTMLImageElement => img !== null)
    )

    const params: DrawParams = {
      ctx,
      position,
      index,
      offsetDrawPosition,
      scaleMultiplier: scaleMultiplier.value,
      clampedZoomLevel: clampedZoomLevel.value,
      canvasImagePos: { x: canvasImagePos.x, y: canvasImagePos.y },
      isInView,
      shouldRecalcBoundingBoxes: shouldRecalcBoundingBoxes.value,
      style,
      gridSizeInPixels: gridSizeInPixels.value,
      coordinatesOffset: coordinatesOffset.value,
      resolvedIcons
    }

    const rendererName = position.drawStyle ?? 'default'
    const renderer = activeRenderers.value[rendererName] ?? activeRenderers.value['default']
    const result = renderer(params)

    if (shouldRecalcBoundingBoxes.value) {
      positionBoundingBoxes.insert({
        id: positionsIdKey.value === '_index' ? index : position[positionsIdKey.value],
        idKey: positionsIdKey.value,
        x: result.x - canvasImagePos.x,
        y: result.y - canvasImagePos.y,
        width: result.width,
        height: result.height,
        ...(result.hitTest ? { hitTest: result.hitTest } : {})
      })
    }
  })
  shouldRecalcBoundingBoxes.value = false
}
</script>

<style scoped>
.eureka-canvas-container,
.eureka-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.eureka-canvas-mouse-coordinates {
  position: absolute;
  top: 1%;
  right: 1%;
  background-color: rgba(50, 50, 50, 1);
  border: 1px solid rgba(25, 25, 25, 0.8);
  color: #eee;
  padding: 5px;
}

.eureka-canvas-loading,
.eureka-canvas-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(30, 30, 30, 1);
  color: #ccc;
  font-family: sans-serif;
}

.eureka-canvas-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: eureka-spin 0.8s linear infinite;
}

@keyframes eureka-spin {
  to { transform: rotate(360deg); }
}
</style>
