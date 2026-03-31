import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useImageLoader } from '../useImageLoader'

describe('useImageLoader', () => {
  it('sets image immediately when given an HTMLImageElement', () => {
    const img = new Image()
    img.src = 'test.png'
    const { image, isLoading, error } = useImageLoader(img)
    expect(image.value).toBe(img)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('sets isLoading when given a string URL', () => {
    const { isLoading, error } = useImageLoader('https://example.com/test.png')
    expect(isLoading.value).toBe(true)
    expect(error.value).toBeNull()
  })

  it('handles reactive source changes', async () => {
    const source = ref<string | HTMLImageElement>(new Image())
    const { image, isLoading } = useImageLoader(source)
    expect(image.value).toBeInstanceOf(HTMLImageElement)
    expect(isLoading.value).toBe(false)

    const newImg = new Image()
    source.value = newImg
    await nextTick()
    expect(image.value).toBe(newImg)
    expect(isLoading.value).toBe(false)
  })

  it('handles switching from HTMLImageElement to another HTMLImageElement', async () => {
    const img1 = new Image()
    const img2 = new Image()
    const source = ref<HTMLImageElement>(img1)
    const { image } = useImageLoader(source)
    expect(image.value).toBe(img1)

    source.value = img2
    await nextTick()
    expect(image.value).toBe(img2)
  })

  it('does not load when given empty string', () => {
    const { image, isLoading } = useImageLoader('')
    expect(image.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })

  it('accepts a getter function', () => {
    const img = new Image()
    const { image, isLoading } = useImageLoader(() => img)
    expect(image.value).toBe(img)
    expect(isLoading.value).toBe(false)
  })
})
