import { ref, reactive, computed, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { Coordinates } from '../types'
import {
  relativePointOnImage,
  scaledPointToFullPoint,
  fullPointToCoordinates,
  pointIsOnImage
} from '../utils/coordinates'

export interface UseCanvasInputOptions {
  canvasElement: Ref<HTMLCanvasElement | null>
  canvasImagePos: { x: number; y: number }
  scaleMultiplier: ComputedRef<number>
  scaledImageWidth: Ref<number>
  scaledImageHeight: Ref<number>
  gridSizeInPixels: Ref<number> | ComputedRef<number>
  coordinatesOffset: Ref<number> | ComputedRef<number>
  zoomImage: (delta: number, point: Coordinates, isPinch?: boolean) => void
  dragging: Ref<boolean>
  startDrag: (point: { x: number; y: number }) => void
  stopDrag: () => void
  dragEvent: (evt: MouseEvent | TouchEvent) => void
  onResize: () => void
  onClick: (coordinates: Coordinates) => void
  onClickElement: (point: Coordinates) => void
  onMouseMove?: (point: Coordinates) => void
}

export function useCanvasInput(options: UseCanvasInputOptions) {
  const {
    canvasElement, canvasImagePos,
    scaleMultiplier, scaledImageWidth, scaledImageHeight,
    gridSizeInPixels, coordinatesOffset,
    zoomImage, dragging, startDrag, stopDrag, dragEvent,
    onResize, onClick, onClickElement, onMouseMove
  } = options

  const canvasMousePosition = reactive({ x: 0, y: 0 })
  const showCoordinates = ref(false)
  const pinchZoom = ref(false)
  const pinchDistance = ref(0)
  const lastPinchDistance = ref(0)

  const scaledImageMousePosition = computed(() =>
    relativePointOnImage(canvasMousePosition, canvasImagePos)
  )
  const fullImageMousePosition = computed(() =>
    scaledPointToFullPoint(scaledImageMousePosition.value, scaleMultiplier.value)
  )
  const mouseCoordinates = computed(() =>
    fullPointToCoordinates(fullImageMousePosition.value, gridSizeInPixels.value, coordinatesOffset.value)
  )

  function getMousePoint(evt: MouseEvent | TouchEvent): Coordinates {
    if ('touches' in evt && evt.touches.length) {
      return { x: evt.touches[0].clientX, y: evt.touches[0].clientY }
    }
    return { x: (evt as MouseEvent).offsetX, y: (evt as MouseEvent).offsetY }
  }

  function clickEvent(evt: MouseEvent | TouchEvent) {
    const point = getMousePoint(evt)
    const relPoint = relativePointOnImage(point, canvasImagePos)
    const fullPoint = scaledPointToFullPoint(relPoint, scaleMultiplier.value)
    onClick(fullPointToCoordinates(fullPoint, gridSizeInPixels.value, coordinatesOffset.value))
    onClickElement(point)
  }

  function wheelEvent(evt: WheelEvent) {
    evt.preventDefault()
    const point = { x: evt.offsetX, y: evt.offsetY }
    if (pointIsOnImage(point, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value)) {
      zoomImage(evt.deltaY, point)
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
    zoomImage(pinchDistance.value - lastPinchDistance.value > 0 ? -1 : 1, pinchPosition, true)
    lastPinchDistance.value = pinchDistance.value
  }

  function mouseDownEvent(evt: MouseEvent | TouchEvent) {
    if ('touches' in evt && evt.touches.length) {
      startDrag({ x: evt.touches[0].clientX, y: evt.touches[0].clientY })
      if (evt.touches.length === 2) {
        dragging.value = false
        pinchZoom.value = true
      }
    } else {
      const mouseEvt = evt as MouseEvent
      startDrag({ x: mouseEvt.offsetX, y: mouseEvt.offsetY })
    }
  }

  function mouseUpEvent() {
    stopDrag()
    pinchZoom.value = false
  }

  function mouseMoveEvent(evt: MouseEvent | TouchEvent) {
    evt.preventDefault()
    const point = getMousePoint(evt)
    canvasMousePosition.x = point.x
    canvasMousePosition.y = point.y
    const onImage = pointIsOnImage(canvasMousePosition, canvasImagePos, scaledImageWidth.value, scaledImageHeight.value)
    toggleCoordinates(onImage)
    if (onMouseMove) onMouseMove({ x: point.x, y: point.y })
    if (dragging.value) dragEvent(evt)
    if (pinchZoom.value) pinchEvent(evt as TouchEvent)
  }

  function mouseLeaveEvent() {
    toggleCoordinates(false)
  }

  function toggleCoordinates(show: boolean) {
    if (showCoordinates.value !== show) {
      showCoordinates.value = show
    }
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

  onUnmounted(() => tearDownListeners())

  return {
    canvasMousePosition,
    showCoordinates,
    mouseCoordinates,
    setUpListeners,
    tearDownListeners
  }
}
