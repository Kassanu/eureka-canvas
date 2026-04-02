import { describe, it, expect, vi } from 'vitest'
import { useIconCache } from '../useIconCache'

describe('useIconCache', () => {
  it('passes through HTMLImageElement directly', () => {
    const { resolve } = useIconCache()
    const img = new Image()
    expect(resolve(img)).toBe(img)
  })

  it('returns null for string URL on first call (loading)', () => {
    const { resolve } = useIconCache()
    expect(resolve('https://example.com/icon.png')).toBeNull()
  })

  it('returns cached image after load completes', () => {
    const { resolve } = useIconCache()
    // First call starts loading
    resolve('https://example.com/icon.png')

    // Simulate the Image onload by finding the created Image
    // and triggering its onload
    const createdImages: HTMLImageElement[] = []
    const OrigImage = globalThis.Image
    globalThis.Image = class extends OrigImage {
      constructor() {
        super()
        createdImages.push(this)
      }
    } as typeof Image

    resolve('https://example.com/icon2.png')
    expect(createdImages.length).toBe(1)
    createdImages[0].onload!(new Event('load'))

    const result = resolve('https://example.com/icon2.png')
    expect(result).toBeInstanceOf(HTMLImageElement)

    globalThis.Image = OrigImage
  })

  it('calls onLoad callback when image finishes loading', () => {
    const createdImages: HTMLImageElement[] = []
    const OrigImage = globalThis.Image
    globalThis.Image = class extends OrigImage {
      constructor() {
        super()
        createdImages.push(this)
      }
    } as typeof Image

    const { resolve, setOnLoad } = useIconCache()
    const callback = vi.fn()
    setOnLoad(callback)

    resolve('https://example.com/icon.png')
    expect(createdImages.length).toBe(1)
    createdImages[0].onload!(new Event('load'))
    expect(callback).toHaveBeenCalledOnce()

    globalThis.Image = OrigImage
  })

  it('resolveAll filters out not-yet-loaded icons', () => {
    const { resolveAll } = useIconCache()
    const img = new Image()
    const results = resolveAll([img, 'https://example.com/loading.png'])
    expect(results).toEqual([img])
  })

  it('clear empties the cache', () => {
    const createdImages: HTMLImageElement[] = []
    const OrigImage = globalThis.Image
    globalThis.Image = class extends OrigImage {
      constructor() {
        super()
        createdImages.push(this)
      }
    } as typeof Image

    const { resolve, clear } = useIconCache()
    resolve('https://example.com/icon.png')
    createdImages[0].onload!(new Event('load'))

    clear()
    // After clear, same URL returns null again (re-triggers load)
    const result = resolve('https://example.com/icon.png')
    expect(result).toBeNull()

    globalThis.Image = OrigImage
  })
})
