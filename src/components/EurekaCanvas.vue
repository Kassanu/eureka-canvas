<template>
  <div id="eurekaCanvasContainer">
    <canvas id="eurekaCanvas"></canvas>
    <div v-show="showCoordinates.value" id="eurekaCanvasMouseCoordinates">
      {{ mouseCoordinates.value?.x ?? '' }}, {{ mouseCoordinates.value?.y ?? '' }}
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

interface Icon {
  path: string
  image: HTMLImageElement | null
}

interface Coordinates {
  x: number
  y: number
}

interface Position {
  id: number
  label: string
  icons: Icon[]
  coordinates: Coordinates
  drawStyle?: string
  textPosition?: string
  [key: string]: any
}

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

const canvasElement = ref<HTMLCanvasElement | null>(null)
const canvasElementWidth = ref(0)
const canvasElementHeight = ref(0)
const canvasContext = ref<CanvasRenderingContext2D | null>(null)
const canvasImageWidth = ref(0)
const canvasImageHeight = ref(0)
const canvasImagePos = reactive({ x: 0, y: 0 })
const dragStart = ref<any>(null)
const dragging = ref(false)
const pinchZoom = ref(false)
const pinchDistance = ref(0)
const lastPinchDistance = ref(0)
const scaleFactor = ref(1.1)
const zoomLevel = ref(100)
const lastDragPosition = reactive({ x: 0, y: 0 })
const scaledImageWidth = ref(0)
const scaledImageHeight = ref(0)
const showCoordinates = ref(false)
const lastDragTime = ref(0)
const canvasMousePosition = reactive({ x: 0, y: 0 })
const calculateBoundingBoxes = ref(true)
const zoomFactor = ref(1)
const lastZoomTime = ref(0)
const debugBoundingBoxes = ref(false)

const positionBoundingBoxes = reactive({
  northwest: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] as any[] },
  northeast: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] as any[] },
  southeast: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] as any[] },
  southwest: { box: { x: 0, y: 0, width: 0, height: 0 }, children: [] as any[] }
})

const scaleMultiplier = computed(() => zoomLevel.value === 100 ? 1 : (zoomLevel.value / 100))

const scaledImageMousePosition = computed(() => relativePointOnImage(canvasMousePosition))
const fullImageMousePosition = computed(() => scaledPointToFullPoint(scaledImageMousePosition.value))
const mouseCoordinates = computed(() => fullPointToCoordinates(fullImageMousePosition.value))
const clampedZoomLevel = computed(() =>
  (((zoomLevel.value - minimumZoom.value) * (100 - 50)) / (maximumZoom.value - minimumZoom.value)) + 50
)
const pixelRatio = computed(() => {
  if (!canvasContext.value) return 1
  // @ts-ignore
  let dpr = window.devicePixelRatio || 1
  // @ts-ignore
  let bsr = canvasContext.value.webkitBackingStorePixelRatio ||
    canvasContext.value.mozBackingStorePixelRatio ||
    canvasContext.value.msBackingStorePixelRatio ||
    canvasContext.value.oBackingStorePixelRatio ||
    canvasContext.value.backingStorePixelRatio || 1
  return dpr / bsr
})

watch(() => props.positions, () => {
  resetUpBoundingBoxQuadrants()
  draw()
})

onMounted(() => {
  canvasImageWidth.value = props.canvasImage.naturalWidth
  canvasImageHeight.value = props.canvasImage.naturalHeight
  scaledImageWidth.value = canvasImageWidth.value
  scaledImageHeight.value = canvasImageHeight.value
  canvasElement.value = document.getElementById('eurekaCanvas') as HTMLCanvasElement
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
    Object.keys(positionBoundingBoxes).forEach(key => {
      positionBoundingBoxes[key].children.forEach(box => {
        canvasContext.value!.strokeStyle = 'red'
        canvasContext.value!.lineWidth = 1
        canvasContext.value!.strokeRect(box.x, box.y, box.width, box.height)
      })
    })
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
  calculateBoundingBoxes.value = false
}

function drawDefault(position: Position, index: number) {
  let coordInView = isCoordinateInView(position.coordinates)
  let drawPosition = fullPointToScaledPoint(coordinatesToFullPoint(position.coordinates))
  let offsetDrawPosition = {
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
  let fontSize = 18 * (clampedZoomLevel.value / 100)
  if (canvasContext.value) {
    canvasContext.value.textBaseline = 'middle'
    canvasContext.value.font = `${fontSize}pt sans-serif`
    canvasContext.value.strokeStyle = 'rgba(0, 0, 0, 1)'
    canvasContext.value.lineWidth = 4
    canvasContext.value.miterLimit = 2
    canvasContext.value.fillStyle = 'rgba(255, 255, 255, 1)'
  }
  let textWidthAndHeight = calculateTextWidthAndHeight(position.label, fontSize)

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
  addBoundingBox({
    id: positionsIdKey.value === '_index' ? index : position[positionsIdKey.value],
    idKey: positionsIdKey.value,
    x: fullBoundingBox.x - canvasImagePos.x,
    y: fullBoundingBox.y - canvasImagePos.y,
    width: fullBoundingBox.width,
    height: fullBoundingBox.height,
  })
}

function drawCircle(position: Position, index: number) {
  let coordInView = isCoordinateInView(position.coordinates)
  let drawPosition = fullPointToScaledPoint(coordinatesToFullPoint(position.coordinates))
  let offsetDrawPosition = {
    x: drawPosition.x + canvasImagePos.x,
    y: drawPosition.y + canvasImagePos.y,
  }
  let icon = position.icons[0]
  let radius = (50 * (clampedZoomLevel.value / 100)) * (clampedZoomLevel.value / 100)
  let arcBoundsObj = arcBounds(offsetDrawPosition.x, offsetDrawPosition.y, radius, 0, 2 * Math.PI)

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
  addBoundingBox({
    id: positionsIdKey.value === '_index' ? index : position[positionsIdKey.value],
    idKey: positionsIdKey.value,
    x: arcBoundsObj.x - canvasImagePos.x,
    y: arcBoundsObj.y - canvasImagePos.y,
    width: arcBoundsObj.width,
    height: arcBoundsObj.height,
  })
}

function calculateTextWidthAndHeight(text: string, fontSize: number) {
  if (!canvasContext.value) return { width: 0, height: fontSize }
  return {
    width: canvasContext.value.measureText(text).width,
    height: fontSize
  }
}

function rectBounds(rect1: any, rect2: any) {
  let xMin = Math.min(rect1.x, rect2.x)
  let yMin = Math.min(rect1.y, rect2.y)
  let xMax = Math.max(rect1.x + rect1.width, rect2.x + rect2.width)
  let yMax = Math.max(rect1.y + rect1.height, rect2.y + rect2.height)
  return {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin
  }
}

function arcBounds(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  let minX = 1000000
  let minY = 1000000
  let maxX = -1000000
  let maxY = -1000000
  let possibleBoundingPoints = []
  possibleBoundingPoints.push({ x: cx, y: cy })
  possibleBoundingPoints.push(arcpoint(cx, cy, radius, startAngle))
  possibleBoundingPoints.push(arcpoint(cx, cy, radius, endAngle))
  if (0 >= startAngle && 0 <= endAngle) possibleBoundingPoints.push(arcpoint(cx, cy, radius, 0))
  let angle = Math.PI / 2
  if (angle >= startAngle && angle <= endAngle) possibleBoundingPoints.push(arcpoint(cx, cy, radius, angle))
  angle = Math.PI
  if (angle >= startAngle && angle <= endAngle) possibleBoundingPoints.push(arcpoint(cx, cy, radius, angle))
  angle = Math.PI * 3 / 2
  if (angle >= startAngle && angle <= endAngle) possibleBoundingPoints.push(arcpoint(cx, cy, radius, angle))
  for (let i = 0; i < possibleBoundingPoints.length; i++) {
    let pt = possibleBoundingPoints[i]
    if (pt.x < minX) minX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.x > maxX) maxX = pt.x
    if (pt.y > maxY) maxY = pt.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function arcpoint(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

function addBoundingBox(boundingBox: any) {
  if (calculateBoundingBoxes.value) {
    const quadrants = getQuadrantsForBoundingBox(boundingBox)
    quadrants.forEach(quadrant => {
      positionBoundingBoxes[quadrant].children.push(boundingBox)
    })
  }
}

function scaleToFit() {
  if (!canvasElement.value) return
  let canvasRatio = canvasElementWidth.value / canvasElementHeight.value
  let imageRatio = canvasImageWidth.value / canvasImageHeight.value
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
  resetUpBoundingBoxQuadrants()
  draw()
}

function resetUpBoundingBoxQuadrants() {
  for (const [key, quadrant] of Object.entries(positionBoundingBoxes)) {
    quadrant.children.length = 0
    quadrant.box.width = scaledImageWidth.value / 2
    quadrant.box.height = scaledImageHeight.value / 2
    switch (key) {
      case 'northwest':
        quadrant.box.x = 0
        quadrant.box.y = 0
        break
      case 'northeast':
        quadrant.box.x = quadrant.box.width
        quadrant.box.y = 0
        break
      case 'southeast':
        quadrant.box.x = quadrant.box.width
        quadrant.box.y = quadrant.box.height
        break
      case 'southwest':
        quadrant.box.x = 0
        quadrant.box.y = quadrant.box.height
        break
    }
  }
  calculateBoundingBoxes.value = true
}

function setUpListeners() {
  window.addEventListener('resize', () => {
    resizeCanvas()
    draw()
  }, false)
  canvasElement.value?.addEventListener('click', clickEvent, false)
  canvasElement.value?.addEventListener('wheel', wheelEvent, false)
  canvasElement.value?.addEventListener('mousedown', mouseDownEvent, false)
  canvasElement.value?.addEventListener('touchstart', mouseDownEvent, false)
  canvasElement.value?.addEventListener('mouseup', mouseUpEvent, false)
  canvasElement.value?.addEventListener('touchend', mouseUpEvent, false)
  canvasElement.value?.addEventListener('mousemove', mouseMoveEvent, false)
  canvasElement.value?.addEventListener('touchmove', mouseMoveEvent, false)
  canvasElement.value?.addEventListener('mouseleave', mouseLeaveEvent, false)
  document.addEventListener('dragover', (e) => e.preventDefault(), true)
}

function resizeCanvas() {
  if (!canvasElement.value) return
  canvasElementWidth.value = canvasElement.value.getBoundingClientRect().width
  canvasElementHeight.value = canvasElement.value.getBoundingClientRect().height
  canvasElement.value.width = canvasElement.value.offsetWidth
  canvasElement.value.height = canvasElement.value.offsetHeight
}

function clickEvent(evt: MouseEvent | TouchEvent) {
  // @ts-ignore
  showZoomComboBoxDropdown = false
  const point = { x: 0, y: 0 }
  if ('touches' in evt && evt.touches.length) {
    point.x = evt.touches[0].clientX
    point.y = evt.touches[0].clientY
  } else if ('offsetX' in evt) {
    // @ts-ignore
    point.x = evt.offsetX
    // @ts-ignore
    point.y = evt.offsetY
  }
  emit('click', {
    coordinates: fullPointToCoordinates(scaledPointToFullPoint(relativePointOnImage(point)))
  })
  checkIntersections(point)
}

function wheelEvent(evt: WheelEvent) {
  const point = { x: evt.offsetX, y: evt.offsetY }
  if (pointIsOnImage(point)) {
    zoomImage(evt.deltaY, point)
  }
}

function dragEvent(evt: MouseEvent | TouchEvent) {
  const moved = { x: 0, y: 0 }
  if (evt.type === "touchmove" && 'touches' in evt && evt.touches.length) {
    moved.x = evt.touches[0].clientX - lastDragPosition.x
    moved.y = evt.touches[0].clientY - lastDragPosition.y
    lastDragPosition.x = evt.touches[0].clientX
    lastDragPosition.y = evt.touches[0].clientY
  } else if ('offsetX' in evt) {
    // @ts-ignore
    moved.x = evt.offsetX - lastDragPosition.x
    // @ts-ignore
    moved.y = evt.offsetY - lastDragPosition.y
    // @ts-ignore
    lastDragPosition.x = evt.offsetX
    // @ts-ignore
    lastDragPosition.y = evt.offsetY
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
  if (evt.type === "touchstart" && 'touches' in evt && evt.touches.length) {
    lastDragPosition.x = evt.touches[0].clientX
    lastDragPosition.y = evt.touches[0].clientY
    if (evt.touches.length === 2) {
      dragging.value = false
      pinchZoom.value = true
    }
  } else if ('offsetX' in evt) {
    // @ts-ignore
    lastDragPosition.x = evt.offsetX
    // @ts-ignore
    lastDragPosition.y = evt.offsetY
  }
}

function mouseUpEvent() {
  document.documentElement.style.cursor = 'auto'
  dragging.value = false
  pinchZoom.value = false
}

function mouseMoveEvent(evt: MouseEvent | TouchEvent) {
  evt.preventDefault()
  if (evt.type === "touchmove" && 'touches' in evt && evt.touches.length) {
    canvasMousePosition.x = evt.touches[0].clientX
    canvasMousePosition.y = evt.touches[0].clientY
  } else if ('offsetX' in evt) {
    // @ts-ignore
    canvasMousePosition.x = evt.offsetX
    // @ts-ignore
    canvasMousePosition.y = evt.offsetY
  }
  toggleCoordinates(pointIsOnImage(canvasMousePosition))
  if (dragging.value) dragEvent(evt)
  if (pinchZoom.value) pinchEvent(evt as TouchEvent)
}

function mouseLeaveEvent() {
  toggleCoordinates(false)
}

function checkIntersections(point: { x: number, y: number }) {
  if (pointIsOnImage(point)) {
    const relPoint = relativePointOnImage(point)
    const quadrant = getRelativePointQuadrant(relPoint)
    if (!quadrant) return
    const hit = positionBoundingBoxes[quadrant].children.slice().reverse().find(box =>
      relPoint.x >= box.x && relPoint.x <= (box.x + box.width) && relPoint.y >= box.y && relPoint.y <= (box.y + box.height)
    )
    if (hit !== undefined) {
      if (hit.idKey == '_index') {
        emit('clickedElement', props.positions[hit.id])
      } else {
        emit('clickedElement', props.positions.find(position => position[hit.idKey] === hit.id))
      }
    }
  }
}

function getRelativePointQuadrant(point: { x: number, y: number }) {
  return Object.keys(positionBoundingBoxes).find((key) => {
    const box = positionBoundingBoxes[key].box
    return point.x >= box.x && point.x <= (box.x + box.width) && point.y >= box.y && point.y <= (box.y + box.height)
  })
}

function getQuadrantsForBoundingBox(box: any) {
  return Object.keys(positionBoundingBoxes).filter((key) => {
    const quadBox = positionBoundingBoxes[key].box
    return box.x < (quadBox.x + quadBox.width) && (box.x + box.width) > quadBox.x && box.y < (quadBox.y + quadBox.height) && (box.y + box.height) > quadBox.y
  })
}

function toggleCoordinates(show: boolean) {
  if (showCoordinates.value != show) {
    showCoordinates.value = show
  }
}

function pointIsOnImage(point: { x: number, y: number }) {
  let rect = {
    top: canvasImagePos.y,
    right: (canvasImagePos.x + scaledImageWidth.value),
    bottom: (canvasImagePos.y + scaledImageHeight.value),
    left: canvasImagePos.x
  }
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
}

function relativePointOnImage(point: { x: number, y: number }) {
  return { x: point.x - canvasImagePos.x, y: point.y - canvasImagePos.y }
}

function scaledPointToFullPoint(scaledPoint: { x: number, y: number }) {
  return { x: scaledPoint.x / scaleMultiplier.value, y: scaledPoint.y / scaleMultiplier.value }
}

function fullPointToScaledPoint(fullPoint: { x: number, y: number }) {
  return { x: fullPoint.x * scaleMultiplier.value, y: fullPoint.y * scaleMultiplier.value }
}

function fullPointToCoordinates(fullPoint: { x: number, y: number }) {
  return {
    x: (Math.round((fullPoint.x / gridSizeInPixels.value) * 10) / 10) + coordinatesOffset.value,
    y: (Math.round((fullPoint.y / gridSizeInPixels.value) * 10) / 10) + coordinatesOffset.value
  }
}

function coordinatesToFullPoint(coordinates: { x: number, y: number }) {
  return {
    x: (coordinates.x - coordinatesOffset.value) * gridSizeInPixels.value,
    y: (coordinates.y - coordinatesOffset.value) * gridSizeInPixels.value
  }
}

function isCoordinateInView(coordinates: { x: number, y: number }) {
  const position = fullPointToScaledPoint(coordinatesToFullPoint(coordinates))
  const shiftedPosition = {
    x: position.x + canvasImagePos.x,
    y: position.y + canvasImagePos.y
  }
  if (shiftedPosition.y < 0 || shiftedPosition.y > canvasElementHeight.value || shiftedPosition.x < 0 || shiftedPosition.x > canvasElementWidth.value) {
    return false
  }
  return true
}

function zoomImage(delta: number, point: { x: number, y: number }) {
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
    let oldRelativePoint = relativePointOnImage(point)
    let newRelativePoint = { x: oldRelativePoint.x + (oldRelativePoint.x * (Math.sign(delta) * zoomChange)), y: oldRelativePoint.y + (oldRelativePoint.y * (Math.sign(delta) * zoomChange)) }
    let newScaledImageWidth = canvasImageWidth.value * (zoomLevel.value / 100)
    let newScaledImageHeight = canvasImageHeight.value * (zoomLevel.value / 100)
    let distance = { x: newRelativePoint.x - oldRelativePoint.x, y: newRelativePoint.y - oldRelativePoint.y }
    canvasImagePos.x -= Math.sign(delta) * distance.x
    canvasImagePos.y -= Math.sign(delta) * distance.y
    scaledImageWidth.value = newScaledImageWidth
    scaledImageHeight.value = newScaledImageHeight
    resetUpBoundingBoxQuadrants()
    draw()
  }
}

function zoomTo(level: number) {
  zoomLevel.value = level
  let newScaledImageWidth = canvasImageWidth.value * (zoomLevel.value / 100)
  let newScaledImageHeight = canvasImageHeight.value * (zoomLevel.value / 100)
  scaledImageWidth.value = newScaledImageWidth
  scaledImageHeight.value = newScaledImageHeight
  if (canvasElement.value) {
    canvasImagePos.x = (canvasElement.value.width / 2) - (scaledImageWidth.value / 2)
    canvasImagePos.y = (canvasElement.value.height / 2) - (scaledImageHeight.value / 2)
  }
  resetUpBoundingBoxQuadrants()
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