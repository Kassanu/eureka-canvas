import { ref, shallowRef, watch, toValue, type MaybeRefOrGetter } from 'vue'

export function useImageLoader(source: MaybeRefOrGetter<string | HTMLImageElement>) {
  const image = shallowRef<HTMLImageElement | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  watch(() => toValue(source), (src) => {
    if (src instanceof HTMLImageElement) {
      image.value = src
      isLoading.value = false
      error.value = null
    } else if (typeof src === 'string' && src) {
      isLoading.value = true
      error.value = null
      const img = new Image()
      img.onload = () => {
        image.value = img
        isLoading.value = false
      }
      img.onerror = () => {
        error.value = `Failed to load image: ${src}`
        isLoading.value = false
      }
      img.src = src
    }
  }, { immediate: true })

  return { image, isLoading, error }
}
