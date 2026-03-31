<template>
  <div id="eurekaCanvasContainer">
    <canvas ref="canvasRef" id="eurekaCanvas"></canvas>
    <div v-show="showCoordinates" id="eurekaCanvasMouseCoordinates">
      {{ mouseCoordinates.x ?? '' }}, {{ mouseCoordinates.y ?? '' }}
    </div>
    <ZoomContainer
      :minimumZoom="minimumZoom"
      :maximumZoom="maximumZoom"
      :zoomLevel="zoomLevel"
      @scaleToFit="scaleToFit"
      @zoomTo="zoomTo"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import ZoomContainer from './ZoomContainer.vue'
import type { Position, Coordinates } from '../types'
import {
  isCoordinateInView,
  coordinatesToFullPoint,
  fullPointToScaledPoint,
  pointIsOnImage,
  relativePointOnImage
} from '../utils/coordinates'
import { rectBounds, arcBounds, calculateTextWidthAndHeight } from '../utils/geometry'
import {
  createQuadrantMap,
  resetQuadrants,
  addBoundingBox,
  findIntersection,
  type QuadrantMap
} from '../utils/spatial'
import { useCanvasZoom } from '../composables/useCanvasZoom'
import { useCanvasPan } from '../composables/useCanvasPan'
import { useCanvasInput } from '../composables/useCanvasInput'

const props = defineProps<{
  canvasImage: HTMLImageElement
  gridSizeInPixels?: number
  coordinatesOffset?: number
  positions: Position[]
  minimumZoom?: number
  maximumZoom?: number
  positionsIdKey?: string
}>()

const emit = defineEmits(['click', 'clickedElement'])

const gridSizeInPixels = computed(() => props.gridSizeInPixels ?? 100)
const coordinatesOffset = computed(() => props.coordinatesOffset ?? 0)
const minimumZoom = computed(() => props.minimumZoom ?? 10)
const maximumZoom = computed(() => props.maximumZoom ?? 100)
const positionsIdKey = computed(() => props.positionsIdKey ?? '_index')

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

const positionBoundingBoxes: QuadrantMap = createQuadrantMap()

const {
  zoomLevel, scaledImageWidth, scaledImageHeight,
  scaleMultiplier, clampedZoomLevel,
  zoomImage, zoomTo, scaleToFit
} = useCanvasZoom({
  canvasImageWidth, canvasImageHeight,
  canvasElementWidth, canvasElementHeight,
  canvasImagePos, canvasElement,
  minimumZoom, maximumZoom,
  onAfterZoom: () => { doResetQuadrants(); draw() }
})

const { dragging, startDrag, stopDrag, dragEvent } = useCanvasPan({
  canvasImagePos,
  canvasElementWidth, canvasElementHeight,
  scaledImageWidth, scaledImageHeight,
  onAfterPan: draw
})

const { showCoordinates, mouseCoordinates, setUpListeners } = useCanvasInput({
  canvasElement, canvasImagePos,
  scaleMultiplier, scaledImageWidth, scaledImageHeight,
  gridSizeInPixels, coordinatesOffset,
  zoomImage, dragging, startDrag, stopDrag, dragEvent,
  onResize: () => { resizeCanvas(); draw() },
  onClick: (coordinates) => emit('click', { coordinates }),
  onClickElement: checkIntersections
})

watch(() => props.positions, () => {
  doResetQuadrants()
  draw()
})

onMounted(() => {
  canvasImageWidth.value = props.canvasImage.naturalWidth
  canvasImageHeight.value = props.canvasImage.naturalHeight
  scaledImageWidth.value = canvasImageWidth.value
  scaledImageHeight.value = canvasImageHeight.value
  canvasElement.value = canvasRef.value
  if (!canvasElement.value) return
  resizeCanvas()
  canvasContext.value = canvasElement.value.getContext('2d')
  setUpListeners()
  scaleToFit()
})

function resizeCanvas() {
  if (!canvasElement.value) return
  canvasElementWidth.value = canvasElement.value.getBoundingClientRect().width
  canvasElementHeight.value = canvasElement.value.getBoundingClientRect().height
  canvasElement.value.width = canvasElement.value.offsetWidth
  canvasElement.value.height = canvasElement.value.offsetHeight
}

function doResetQuadrants() {
  resetQuadrants(positionBoundingBoxes, scaledImageWidth.value, scaledImageHeight.value)
  shouldRecalcBoundingBoxes.value = true
}

function checkIntersections(point: Coordinates) {
  if (!pointIsOnImage(point, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value)) return
  const relPoint = relativePointOnImage(point, canvasImagePos)
  const hit = findIntersection(positionBoundingBoxes, relPoint)
  if (hit) {
    if (hit.idKey === '_index') {
      emit('clickedElement', props.positions[hit.id as number])
    } else {
      emit('clickedElement', props.positions.find(position => position[hit.idKey] === hit.id))
    }
  }
}

function draw() {
  if (!canvasContext.value || !canvasElement.value) return
  canvasContext.value.clearRect(0, 0, canvasElement.value.width, canvasElement.value.height)
  canvasContext.value.drawImage(
    props.canvasImage,
    canvasImagePos.x,
    canvasImagePos.y,
    scaledImageWidth.value,
    scaledImageHeight.value
  )
  drawPositions()
  if (debugBoundingBoxes.value) {
    for (const key of Object.keys(positionBoundingBoxes) as (keyof QuadrantMap)[]) {
      for (const box of positionBoundingBoxes[key].children) {
        canvasContext.value!.strokeStyle = 'red'
        canvasContext.value!.lineWidth = 1
        canvasContext.value!.strokeRect(box.x, box.y, box.width, box.height)
      }
    }
  }
}

function drawPositions() {
  props.positions.forEach((position, index) => {
    switch (position.drawStyle) {
      case 'circle':
        drawCircle(position, index)
        break
      default:
        drawDefault(position, index)
        break
    }
  })
  shouldRecalcBoundingBoxes.value = false
}

function drawDefault(position: Position, index: number) {
  const coordInView = isCoordinateInView(
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
  let firstIconWidth = 0
  let lastIconWidth = 0
  let totalIconWidth = 0
  let iconHeight = 0
  const iconsBoundingBox = { x: 0, y: 0, width: 0, height: 0 }
  position.icons.forEach((icon, idx) => {
    if (icon.image !== null && canvasContext.value) {
      const scaledImageDimensions = {
        width: icon.image.naturalWidth * (clampedZoomLevel.value / 100),
        height: icon.image.naturalHeight * (clampedZoomLevel.value / 100)
      }
      const iconPosition = {
        x: (offsetDrawPosition.x - (scaledImageDimensions.width / 2)) + totalIconWidth,
        y: offsetDrawPosition.y - (scaledImageDimensions.height / 2)
      }
      lastIconWidth = scaledImageDimensions.width
      if (idx === 0) {
        firstIconWidth = lastIconWidth
        iconsBoundingBox.x = iconPosition.x
        iconsBoundingBox.y = iconPosition.y
      }
      totalIconWidth += lastIconWidth
      iconsBoundingBox.width = totalIconWidth
      if (coordInView) {
        canvasContext.value.drawImage(icon.image, iconPosition.x, iconPosition.y, scaledImageDimensions.width, scaledImageDimensions.height)
      }
      if (scaledImageDimensions.height > iconHeight) {
        iconHeight = scaledImageDimensions.height
      }
      iconsBoundingBox.height = iconHeight
    }
  })

  const textDrawPosition = { x: offsetDrawPosition.x, y: offsetDrawPosition.y }
  const fontSize = 18 * (clampedZoomLevel.value / 100)
  if (canvasContext.value) {
    canvasContext.value.textBaseline = 'middle'
    canvasContext.value.font = `${fontSize}pt sans-serif`
    canvasContext.value.strokeStyle = 'rgba(0, 0, 0, 1)'
    canvasContext.value.lineWidth = 4
    canvasContext.value.miterLimit = 2
    canvasContext.value.fillStyle = 'rgba(255, 255, 255, 1)'
  }
  const textWidthAndHeight = canvasContext.value
    ? calculateTextWidthAndHeight(canvasContext.value, position.label, fontSize)
    : { width: 0, height: fontSize }

  switch (position.textPosition) {
    case 'top':
      textDrawPosition.x -= (textWidthAndHeight.width / 2)
      textDrawPosition.y -= iconHeight
      break
    case 'bottom':
      textDrawPosition.x -= (textWidthAndHeight.width / 2)
      textDrawPosition.y += iconHeight
      break
    case 'left':
      textDrawPosition.x -= (textWidthAndHeight.width + (firstIconWidth / 2))
      break
    case 'right':
    default:
      textDrawPosition.x += totalIconWidth - (lastIconWidth / 2)
      break
  }

  const textBoundingBox = {
    x: textDrawPosition.x,
    y: textDrawPosition.y - (textWidthAndHeight.height / 2),
    width: textWidthAndHeight.width,
    height: textWidthAndHeight.height
  }

  if (coordInView && canvasContext.value) {
    canvasContext.value.strokeText(position.label, textDrawPosition.x, textDrawPosition.y)
    canvasContext.value.fillText(position.label, textDrawPosition.x, textDrawPosition.y)
  }

  const fullBoundingBox = rectBounds(iconsBoundingBox, textBoundingBox)
  if (shouldRecalcBoundingBoxes.value) {
    addBoundingBox(positionBoundingBoxes, {
      id: positionsIdKey.value === '_index' ? index : position[positionsIdKey.value],
      idKey: positionsIdKey.value,
      x: fullBoundingBox.x - canvasImagePos.x,
      y: fullBoundingBox.y - canvasImagePos.y,
      width: fullBoundingBox.width,
      height: fullBoundingBox.height,
    })
  }
}

function drawCircle(position: Position, index: number) {
  const coordInView = isCoordinateInView(
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
  const icon = position.icons[0]
  const radius = (50 * (clampedZoomLevel.value / 100)) * (clampedZoomLevel.value / 100)
  const arcBoundsObj = arcBounds(offsetDrawPosition.x, offsetDrawPosition.y, radius, 0, 2 * Math.PI)

  if (coordInView && canvasContext.value) {
    canvasContext.value.beginPath()
    canvasContext.value.arc(offsetDrawPosition.x, offsetDrawPosition.y, radius, 0, 2 * Math.PI, false)
    canvasContext.value.fillStyle = 'rgba(111, 155, 201, 0.5)'
    canvasContext.value.fill()
    canvasContext.value.lineWidth = 1
    canvasContext.value.strokeStyle = 'rgba(111, 155, 201, 1)'
    canvasContext.value.stroke()

    if (icon && icon.image !== null) {
      const scaledImageDimensions = {
        width: icon.image.naturalWidth * (clampedZoomLevel.value / 100),
        height: icon.image.naturalHeight * (clampedZoomLevel.value / 100)
      }
      const iconPosition = {
        x: (offsetDrawPosition.x - (scaledImageDimensions.width / 2)),
        y: offsetDrawPosition.y - (scaledImageDimensions.height / 2)
      }
      canvasContext.value.drawImage(icon.image, iconPosition.x, iconPosition.y, scaledImageDimensions.width, scaledImageDimensions.height)
    }
  }
  if (shouldRecalcBoundingBoxes.value) {
    addBoundingBox(positionBoundingBoxes, {
      id: positionsIdKey.value === '_index' ? index : position[positionsIdKey.value],
      idKey: positionsIdKey.value,
      x: arcBoundsObj.x - canvasImagePos.x,
      y: arcBoundsObj.y - canvasImagePos.y,
      width: arcBoundsObj.width,
      height: arcBoundsObj.height,
    })
  }
}
</script>

<style scoped>
#eurekaCanvasContainer,
#eurekaCanvas {
  width: 100%;
  height: 100%;
  display: block;
}

#eurekaCanvasMouseCoordinates {
  position: absolute;
  top: 1%;
  right: 1%;
  background-color: rgba(50, 50, 50, 1);
  border: 1px solid rgba(25, 25, 25, 0.8);
  color: #eee;
  padding: 5px;
}
</style>
