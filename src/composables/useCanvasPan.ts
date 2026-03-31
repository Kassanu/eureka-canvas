import { ref, reactive, type Ref } from 'vue'

export interface UseCanvasPanOptions {
  canvasImagePos: { x: number; y: number }
  canvasElementWidth: Ref<number>
  canvasElementHeight: Ref<number>
  scaledImageWidth: Ref<number>
  scaledImageHeight: Ref<number>
  onAfterPan: () => void
}

export function useCanvasPan(options: UseCanvasPanOptions) {
  const {
    canvasImagePos,
    canvasElementWidth, canvasElementHeight,
    scaledImageWidth, scaledImageHeight,
    onAfterPan
  } = options

  const dragging = ref(false)
  const lastDragPosition = reactive({ x: 0, y: 0 })
  const lastDragTime = ref(0)

  function startDrag(point: { x: number; y: number }) {
    dragging.value = true
    document.documentElement.style.cursor = 'move'
    lastDragPosition.x = point.x
    lastDragPosition.y = point.y
  }

  function stopDrag() {
    dragging.value = false
    document.documentElement.style.cursor = 'auto'
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
      onAfterPan()
    }
  }

  return { dragging, lastDragPosition, startDrag, stopDrag, dragEvent }
}
