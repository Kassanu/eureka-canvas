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
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import ZoomContainer from './ZoomContainer.vue'
import type { Position, Coordinates } from '../types'
import {
  relativePointOnImage,
  scaledPointToFullPoint,
  fullPointToScaledPoint,
  fullPointToCoordinates,
  coordinatesToFullPoint,
  isCoordinateInView,
  pointIsOnImage
} from '../utils/coordinates'
import { rectBounds, arcBounds, calculateTextWidthAndHeight } from '../utils/geometry'
import {
  createQuadrantMap,
  resetQuadrants,
  addBoundingBox,
  findIntersection,
  type QuadrantMap
} from '../utils/spatial'

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
const dragging = ref(false)
const pinchZoom = ref(false)
const pinchDistance = ref(0)
const lastPinchDistance = ref(0)
const zoomLevel = ref(100)
const lastDragPosition = reactive({ x: 0, y: 0 })
const scaledImageWidth = ref(0)
const scaledImageHeight = ref(0)
const showCoordinates = ref(false)
const lastDragTime = ref(0)
const canvasMousePosition = reactive({ x: 0, y: 0 })
const shouldRecalcBoundingBoxes = ref(true)
const zoomFactor = ref(1)
const lastZoomTime = ref(0)
const debugBoundingBoxes = ref(false)

const positionBoundingBoxes: QuadrantMap = createQuadrantMap()

const scaleMultiplier = computed(() => zoomLevel.value === 100 ? 1 : (zoomLevel.value / 100))

const scaledImageMousePosition = computed(() =>
  relativePointOnImage(canvasMousePosition, canvasImagePos)
)
const fullImageMousePosition = computed(() =>
  scaledPointToFullPoint(scaledImageMousePosition.value, scaleMultiplier.value)
)
const mouseCoordinates = computed(() =>
  fullPointToCoordinates(fullImageMousePosition.value, gridSizeInPixels.value, coordinatesOffset.value)
)
const clampedZoomLevel = computed(() =>
  (((zoomLevel.value - minimumZoom.value) * (100 - 50)) / (maximumZoom.value - minimumZoom.value)) + 50
)

function getMousePoint(evt: MouseEvent | TouchEvent): Coordinates {
  if ('touches' in evt && evt.touches.length) {
    return { x: evt.touches[0].clientX, y: evt.touches[0].clientY }
  }
  return { x: (evt as MouseEvent).offsetX, y: (evt as MouseEvent).offsetY }
}

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

function scaleToFit() {
  if (!canvasElement.value) return
  const canvasRatio = canvasElementWidth.value / canvasElementHeight.value
  const imageRatio = canvasImageWidth.value / canvasImageHeight.value
  if (canvasRatio > imageRatio) {
    scaledImageWidth.value = canvasImageWidth.value * (canvasElementHeight.value / canvasImageHeight.value)
    scaledImageHeight.value = canvasElementHeight.value
  } else {
    scaledImageWidth.value = canvasElementWidth.value
    scaledImageHeight.value = canvasImageHeight.value * (canvasElementWidth.value / canvasImageWidth.value)
  }
  zoomLevel.value = parseFloat(((scaledImageWidth.value / canvasImageWidth.value) * 100).toFixed(2))
  canvasImagePos.x = (canvasElement.value.width / 2) - (scaledImageWidth.value / 2)
  canvasImagePos.y = (canvasElement.value.height / 2) - (scaledImageHeight.value / 2)
  doResetQuadrants()
  draw()
}

function doResetQuadrants() {
  resetQuadrants(positionBoundingBoxes, scaledImageWidth.value, scaledImageHeight.value)
  shouldRecalcBoundingBoxes.value = true
}

function onResize() {
  resizeCanvas()
  draw()
}

function onDragOver(e: Event) {
  e.preventDefault()
}

function setUpListeners() {
  window.addEventListener('resize', onResize, false)
  canvasElement.value?.addEventListener('click', clickEvent, false)
  canvasElement.value?.addEventListener('wheel', wheelEvent, { passive: false })
  canvasElement.value?.addEventListener('mousedown', mouseDownEvent, false)
  canvasElement.value?.addEventListener('touchstart', mouseDownEvent, false)
  canvasElement.value?.addEventListener('mouseup', mouseUpEvent, false)
  canvasElement.value?.addEventListener('touchend', mouseUpEvent, false)
  canvasElement.value?.addEventListener('mousemove', mouseMoveEvent, false)
  canvasElement.value?.addEventListener('touchmove', mouseMoveEvent, false)
  canvasElement.value?.addEventListener('mouseleave', mouseLeaveEvent, false)
  document.addEventListener('dragover', onDragOver, true)
}

function tearDownListeners() {
  window.removeEventListener('resize', onResize, false)
  canvasElement.value?.removeEventListener('click', clickEvent, false)
  canvasElement.value?.removeEventListener('wheel', wheelEvent)
  canvasElement.value?.removeEventListener('mousedown', mouseDownEvent, false)
  canvasElement.value?.removeEventListener('touchstart', mouseDownEvent, false)
  canvasElement.value?.removeEventListener('mouseup', mouseUpEvent, false)
  canvasElement.value?.removeEventListener('touchend', mouseUpEvent, false)
  canvasElement.value?.removeEventListener('mousemove', mouseMoveEvent, false)
  canvasElement.value?.removeEventListener('touchmove', mouseMoveEvent, false)
  canvasElement.value?.removeEventListener('mouseleave', mouseLeaveEvent, false)
  document.removeEventListener('dragover', onDragOver, true)
}

onUnmounted(() => {
  tearDownListeners()
})

function resizeCanvas() {
  if (!canvasElement.value) return
  canvasElementWidth.value = canvasElement.value.getBoundingClientRect().width
  canvasElementHeight.value = canvasElement.value.getBoundingClientRect().height
  canvasElement.value.width = canvasElement.value.offsetWidth
  canvasElement.value.height = canvasElement.value.offsetHeight
}

function clickEvent(evt: MouseEvent | TouchEvent) {
  const point = getMousePoint(evt)
  const relPoint = relativePointOnImage(point, canvasImagePos)
  const fullPoint = scaledPointToFullPoint(relPoint, scaleMultiplier.value)
  emit('click', {
    coordinates: fullPointToCoordinates(fullPoint, gridSizeInPixels.value, coordinatesOffset.value)
  })
  checkIntersections(point)
}

function wheelEvent(evt: WheelEvent) {
  evt.preventDefault()
  const point = { x: evt.offsetX, y: evt.offsetY }
  if (pointIsOnImage(point, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value)) {
    zoomImage(evt.deltaY, point)
  }
}

function dragEvent(evt: MouseEvent | TouchEvent) {
  const moved = { x: 0, y: 0 }
  if ('touches' in evt && evt.touches.length) {
    moved.x = evt.touches[0].clientX - lastDragPosition.x
    moved.y = evt.touches[0].clientY - lastDragPosition.y
    lastDragPosition.x = evt.touches[0].clientX
    lastDragPosition.y = evt.touches[0].clientY
  } else {
    const mouseEvt = evt as MouseEvent
    moved.x = mouseEvt.offsetX - lastDragPosition.x
    moved.y = mouseEvt.offsetY - lastDragPosition.y
    lastDragPosition.x = mouseEvt.offsetX
    lastDragPosition.y = mouseEvt.offsetY
  }
  const now = Date.now()
  const lastDragDelta = now - lastDragTime.value
  canvasImagePos.x += moved.x
  canvasImagePos.y += moved.y
  if (scaledImageWidth.value > canvasElementWidth.value) {
    if (canvasImagePos.x > 0 && canvasImagePos.x < canvasElementWidth.value * .05) canvasImagePos.x = 0
    if ((canvasImagePos.x + scaledImageWidth.value) < canvasElementWidth.value) canvasImagePos.x = canvasElementWidth.value - scaledImageWidth.value
  } else {
    if (canvasImagePos.x < 0 && canvasImagePos.x < canvasElementWidth.value - (canvasElementWidth.value * .05)) canvasImagePos.x = 0
    if ((canvasImagePos.x + scaledImageWidth.value) > canvasElementWidth.value) canvasImagePos.x = canvasElementWidth.value - scaledImageWidth.value
  }
  if (scaledImageHeight.value > canvasElementHeight.value) {
    if (canvasImagePos.y > 0 && canvasImagePos.y < canvasElementHeight.value * .05) canvasImagePos.y = 0
    if ((canvasImagePos.y + scaledImageHeight.value) < canvasElementHeight.value) canvasImagePos.y = canvasElementHeight.value - scaledImageHeight.value
  } else {
    if (canvasImagePos.y < 0 && canvasImagePos.y < canvasElementHeight.value - (canvasElementHeight.value * .05)) canvasImagePos.y = 0
    if ((canvasImagePos.y + scaledImageHeight.value) > canvasElementHeight.value) canvasImagePos.y = canvasElementHeight.value - scaledImageHeight.value
  }
  if (lastDragDelta >= 16 && (moved.x != 0 || moved.y != 0)) {
    lastDragTime.value = now
    draw()
  }
}

function pinchEvent(evt: TouchEvent) {
  if (evt.touches.length < 2) return
  pinchDistance.value = Math.sqrt(
    (evt.touches[0].clientX - evt.touches[1].clientX) ** 2 +
    (evt.touches[0].clientY - evt.touches[1].clientY) ** 2
  )
  const pinchPosition = {
    x: (evt.touches[0].clientX + evt.touches[1].clientX) / 2,
    y: (evt.touches[0].clientY + evt.touches[1].clientY) / 2
  }
  zoomImage(pinchDistance.value - lastPinchDistance.value > 0 ? -1 : 1, pinchPosition)
  lastPinchDistance.value = pinchDistance.value
}

function mouseDownEvent(evt: MouseEvent | TouchEvent) {
  dragging.value = true
  document.documentElement.style.cursor = 'move'
  if ('touches' in evt && evt.touches.length) {
    lastDragPosition.x = evt.touches[0].clientX
    lastDragPosition.y = evt.touches[0].clientY
    if (evt.touches.length === 2) {
      dragging.value = false
      pinchZoom.value = true
    }
  } else {
    const mouseEvt = evt as MouseEvent
    lastDragPosition.x = mouseEvt.offsetX
    lastDragPosition.y = mouseEvt.offsetY
  }
}

function mouseUpEvent() {
  document.documentElement.style.cursor = 'auto'
  dragging.value = false
  pinchZoom.value = false
}

function mouseMoveEvent(evt: MouseEvent | TouchEvent) {
  evt.preventDefault()
  const point = getMousePoint(evt)
  canvasMousePosition.x = point.x
  canvasMousePosition.y = point.y
  toggleCoordinates(pointIsOnImage(canvasMousePosition, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value))
  if (dragging.value) dragEvent(evt)
  if (pinchZoom.value) pinchEvent(evt as TouchEvent)
}

function mouseLeaveEvent() {
  toggleCoordinates(false)
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

function toggleCoordinates(show: boolean) {
  if (showCoordinates.value !== show) {
    showCoordinates.value = show
  }
}

function zoomImage(delta: number, point: Coordinates) {
  const oldZoom = zoomLevel.value
  const now = Date.now()
  if (!pinchZoom.value && now - lastZoomTime.value < 100) {
    if (zoomFactor.value < 5) zoomFactor.value += 1
  } else {
    zoomFactor.value = 1
  }
  lastZoomTime.value = now
  const changeAmount = 1 * zoomFactor.value
  if (delta > 0) {
    if (minimumZoom.value > (zoomLevel.value | 0) - changeAmount) {
      zoomLevel.value = minimumZoom.value
    } else {
      zoomLevel.value = (zoomLevel.value | 0) - changeAmount
    }
  } else {
    if (maximumZoom.value < (zoomLevel.value | 0) + changeAmount) {
      zoomLevel.value = maximumZoom.value
    } else {
      zoomLevel.value = (zoomLevel.value | 0) + changeAmount
    }
  }
  if (oldZoom !== zoomLevel.value) {
    const zoomChange = ((zoomLevel.value - oldZoom) / Math.abs(oldZoom))
    const oldRelativePoint = relativePointOnImage(point, canvasImagePos)
    const newRelativePoint = {
      x: oldRelativePoint.x + (oldRelativePoint.x * (Math.sign(delta) * zoomChange)),
      y: oldRelativePoint.y + (oldRelativePoint.y * (Math.sign(delta) * zoomChange))
    }
    const distance = {
      x: newRelativePoint.x - oldRelativePoint.x,
      y: newRelativePoint.y - oldRelativePoint.y
    }
    canvasImagePos.x -= Math.sign(delta) * distance.x
    canvasImagePos.y -= Math.sign(delta) * distance.y
    scaledImageWidth.value = canvasImageWidth.value * (zoomLevel.value / 100)
    scaledImageHeight.value = canvasImageHeight.value * (zoomLevel.value / 100)
    doResetQuadrants()
    draw()
  }
}

function zoomTo(level: number) {
  zoomLevel.value = level
  scaledImageWidth.value = canvasImageWidth.value * (zoomLevel.value / 100)
  scaledImageHeight.value = canvasImageHeight.value * (zoomLevel.value / 100)
  if (canvasElement.value) {
    canvasImagePos.x = (canvasElement.value.width / 2) - (scaledImageWidth.value / 2)
    canvasImagePos.y = (canvasElement.value.height / 2) - (scaledImageHeight.value / 2)
  }
  doResetQuadrants()
  draw()
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