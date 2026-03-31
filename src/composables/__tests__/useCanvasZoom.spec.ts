import { describe, it, expect, vi } from 'vitest'
import { ref, reactive, computed } from 'vue'
import { useCanvasZoom } from '../useCanvasZoom'

function createZoom(overrides: Record<string, any> = {}) {
  const onAfterZoom = vi.fn()
  const canvasElement = ref<HTMLCanvasElement>({
    width: 800,
    height: 600
  } as unknown as HTMLCanvasElement)

  const zoom = useCanvasZoom({
    canvasImageWidth: ref(2000),
    canvasImageHeight: ref(1000),
    canvasElementWidth: ref(800),
    canvasElementHeight: ref(600),
    canvasImagePos: reactive({ x: 0, y: 0 }),
    canvasElement,
    minimumZoom: computed(() => 10),
    maximumZoom: computed(() => 100),
    onAfterZoom,
    ...overrides
  })

  return { zoom, onAfterZoom }
}

describe('useCanvasZoom', () => {
  describe('scaleMultiplier', () => {
    it('returns 1 at zoom level 100', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 100
      expect(zoom.scaleMultiplier.value).toBe(1)
    })

    it('returns 0.5 at zoom level 50', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 50
      expect(zoom.scaleMultiplier.value).toBe(0.5)
    })
  })

  describe('clampedZoomLevel', () => {
    it('returns 50 at minimum zoom', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 10
      expect(zoom.clampedZoomLevel.value).toBe(50)
    })

    it('returns 100 at maximum zoom', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 100
      expect(zoom.clampedZoomLevel.value).toBe(100)
    })

    it('returns 75 at midpoint zoom', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 55
      expect(zoom.clampedZoomLevel.value).toBe(75)
    })
  })

  describe('scaleToFit', () => {
    it('scales image to fit canvas and centers it', () => {
      const canvasImagePos = reactive({ x: 0, y: 0 })
      const { zoom } = createZoom({ canvasImagePos })
      zoom.scaleToFit()

      // Canvas is 800x600 (ratio 1.33), image is 2000x1000 (ratio 2.0)
      // canvasRatio > imageRatio is false (1.33 < 2.0), so width-constrained
      // scaledImageWidth = 800, scaledImageHeight = 1000 * (800/2000) = 400
      expect(zoom.scaledImageWidth.value).toBe(800)
      expect(zoom.scaledImageHeight.value).toBe(400)
      // zoomLevel = (800 / 2000) * 100 = 40
      expect(zoom.zoomLevel.value).toBe(40)
      // centered: x = (800/2) - (800/2) = 0, y = (600/2) - (400/2) = 100
      expect(canvasImagePos.x).toBe(0)
      expect(canvasImagePos.y).toBe(100)
    })

    it('calls onAfterZoom', () => {
      const { zoom, onAfterZoom } = createZoom()
      zoom.scaleToFit()
      expect(onAfterZoom).toHaveBeenCalledOnce()
    })
  })

  describe('zoomTo', () => {
    it('sets zoom level and centers image', () => {
      const canvasImagePos = reactive({ x: 0, y: 0 })
      const { zoom } = createZoom({ canvasImagePos })
      zoom.zoomTo(50)

      expect(zoom.zoomLevel.value).toBe(50)
      expect(zoom.scaledImageWidth.value).toBe(1000)
      expect(zoom.scaledImageHeight.value).toBe(500)
      // centered: x = (800/2) - (1000/2) = -100, y = (600/2) - (500/2) = 50
      expect(canvasImagePos.x).toBe(-100)
      expect(canvasImagePos.y).toBe(50)
    })

    it('calls onAfterZoom', () => {
      const { zoom, onAfterZoom } = createZoom()
      zoom.zoomTo(50)
      expect(onAfterZoom).toHaveBeenCalledOnce()
    })
  })

  describe('zoomImage', () => {
    it('zooms out when delta is positive', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 50
      zoom.zoomImage(1, { x: 400, y: 300 })
      expect(zoom.zoomLevel.value).toBe(49)
    })

    it('zooms in when delta is negative', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 50
      zoom.zoomImage(-1, { x: 400, y: 300 })
      expect(zoom.zoomLevel.value).toBe(51)
    })

    it('clamps to minimum zoom', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 10
      zoom.zoomImage(1, { x: 400, y: 300 })
      expect(zoom.zoomLevel.value).toBe(10)
    })

    it('clamps to maximum zoom', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 100
      zoom.zoomImage(-1, { x: 400, y: 300 })
      expect(zoom.zoomLevel.value).toBe(100)
    })

    it('does not call onAfterZoom when zoom is clamped', () => {
      const { zoom, onAfterZoom } = createZoom()
      zoom.zoomLevel.value = 100
      zoom.zoomImage(-1, { x: 400, y: 300 })
      expect(onAfterZoom).not.toHaveBeenCalled()
    })

    it('calls onAfterZoom when zoom changes', () => {
      const { zoom, onAfterZoom } = createZoom()
      zoom.zoomLevel.value = 50
      zoom.zoomImage(1, { x: 400, y: 300 })
      expect(onAfterZoom).toHaveBeenCalledOnce()
    })

    it('updates scaled image dimensions', () => {
      const { zoom } = createZoom()
      zoom.zoomLevel.value = 50
      zoom.zoomImage(1, { x: 400, y: 300 })
      // zoomLevel went from 50 to 49
      expect(zoom.scaledImageWidth.value).toBe(2000 * 0.49)
      expect(zoom.scaledImageHeight.value).toBe(1000 * 0.49)
    })
  })
})
