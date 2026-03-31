import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { Coordinates } from '../types'
import { relativePointOnImage } from '../utils/coordinates'

export interface UseCanvasZoomOptions {
  canvasImageWidth: Ref<number>
  canvasImageHeight: Ref<number>
  canvasElementWidth: Ref<number>
  canvasElementHeight: Ref<number>
  canvasImagePos: { x: number; y: number }
  canvasElement: Ref<HTMLCanvasElement | null>
  minimumZoom: ComputedRef<number>
  maximumZoom: ComputedRef<number>
  onAfterZoom: () => void
}

export function useCanvasZoom(options: UseCanvasZoomOptions) {
  const {
    canvasImageWidth, canvasImageHeight,
    canvasElementWidth, canvasElementHeight,
    canvasImagePos, canvasElement,
    minimumZoom, maximumZoom,
    onAfterZoom
  } = options

  const zoomLevel = ref(100)
  const zoomFactor = ref(1)
  const lastZoomTime = ref(0)
  const scaledImageWidth = ref(0)
  const scaledImageHeight = ref(0)

  const scaleMultiplier = computed(() => zoomLevel.value === 100 ? 1 : (zoomLevel.value / 100))
  const clampedZoomLevel = computed(() =>
    (((zoomLevel.value - minimumZoom.value) * (100 - 50)) / (maximumZoom.value - minimumZoom.value)) + 50
  )

  function zoomImage(delta: number, point: Coordinates, isPinch = false) {
    const oldZoom = zoomLevel.value
    const now = Date.now()
    if (!isPinch && now - lastZoomTime.value < 100) {
      if (zoomFactor.value < 5) zoomFactor.value += 1
    } else {
      zoomFactor.value = 1
    }
    lastZoomTime.value = now
    const changeAmount = 1 * zoomFactor.value
    if (delta > 0) {
      zoomLevel.value = minimumZoom.value > (zoomLevel.value | 0) - changeAmount
        ? minimumZoom.value
        : (zoomLevel.value | 0) - changeAmount
    } else {
      zoomLevel.value = maximumZoom.value < (zoomLevel.value | 0) + changeAmount
        ? maximumZoom.value
        : (zoomLevel.value | 0) + changeAmount
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
      onAfterZoom()
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
    onAfterZoom()
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
    onAfterZoom()
  }

  return {
    zoomLevel,
    scaledImageWidth,
    scaledImageHeight,
    scaleMultiplier,
    clampedZoomLevel,
    zoomImage,
    zoomTo,
    scaleToFit
  }
}
