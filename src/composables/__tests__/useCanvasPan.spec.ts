import { describe, it, expect, vi } from 'vitest'
import { ref, reactive } from 'vue'
import { useCanvasPan } from '../useCanvasPan'

function createPan(overrides: Record<string, any> = {}) {
  const onAfterPan = vi.fn()
  const canvasImagePos = reactive({ x: 100, y: 100 })

  const pan = useCanvasPan({
    canvasImagePos,
    canvasElementWidth: ref(800),
    canvasElementHeight: ref(600),
    scaledImageWidth: ref(1600),
    scaledImageHeight: ref(1200),
    onAfterPan,
    ...overrides
  })

  return { pan, canvasImagePos, onAfterPan }
}

function mouseEvent(x: number, y: number): MouseEvent {
  return { offsetX: x, offsetY: y } as MouseEvent
}

describe('useCanvasPan', () => {
  describe('startDrag', () => {
    it('sets dragging to true', () => {
      const { pan } = createPan()
      expect(pan.dragging.value).toBe(false)
      pan.startDrag({ x: 100, y: 100 })
      expect(pan.dragging.value).toBe(true)
    })

    it('records the starting position', () => {
      const { pan } = createPan()
      pan.startDrag({ x: 150, y: 250 })
      expect(pan.lastDragPosition.x).toBe(150)
      expect(pan.lastDragPosition.y).toBe(250)
    })
  })

  describe('stopDrag', () => {
    it('sets dragging to false', () => {
      const { pan } = createPan()
      pan.startDrag({ x: 100, y: 100 })
      expect(pan.dragging.value).toBe(true)
      pan.stopDrag()
      expect(pan.dragging.value).toBe(false)
    })
  })

  describe('dragEvent', () => {
    it('moves image position by the drag delta', () => {
      const { pan, canvasImagePos } = createPan()
      pan.startDrag({ x: 100, y: 100 })

      pan.dragEvent(mouseEvent(120, 110))
      // moved 20px right, 10px down
      expect(canvasImagePos.x).toBe(120)
      expect(canvasImagePos.y).toBe(110)
    })

    it('calls onAfterPan when moved and enough time has passed', () => {
      const { pan, onAfterPan } = createPan()
      pan.startDrag({ x: 100, y: 100 })

      // First drag — lastDragTime is 0, so delta is large enough
      pan.dragEvent(mouseEvent(120, 110))
      expect(onAfterPan).toHaveBeenCalledOnce()
    })

    it('does not call onAfterPan when nothing moved', () => {
      const { pan, onAfterPan } = createPan()
      pan.startDrag({ x: 100, y: 100 })

      pan.dragEvent(mouseEvent(100, 100))
      expect(onAfterPan).not.toHaveBeenCalled()
    })

    it('clamps image position so it does not go too far right', () => {
      const { pan, canvasImagePos } = createPan()
      // Image is 1600 wide, canvas is 800 wide
      // If image.x + imageWidth < canvasWidth, clamp
      canvasImagePos.x = -850
      pan.startDrag({ x: 100, y: 100 })

      // Try to drag further left (more negative)
      pan.dragEvent(mouseEvent(50, 100))
      // moved.x = 50 - 100 = -50, so canvasImagePos.x = -850 + (-50) = -900
      // -900 + 1600 = 700 < 800, so clamps to 800 - 1600 = -800
      expect(canvasImagePos.x).toBe(-800)
    })

    it('clamps image position so it does not go too far left', () => {
      const { pan, canvasImagePos } = createPan()
      // When image is wider than canvas and pos is slightly positive, clamp to 0
      canvasImagePos.x = 30
      pan.startDrag({ x: 100, y: 100 })

      pan.dragEvent(mouseEvent(100, 100))
      // moved.x = 0, so canvasImagePos stays at 30
      // 30 > 0 && 30 < 800 * 0.05 (40) → clamp to 0
      expect(canvasImagePos.x).toBe(0)
    })
  })
})
