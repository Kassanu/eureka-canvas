export function useIconCache() {
  const cache = new Map<string, HTMLImageElement | null>()
  let onLoadCallback: (() => void) | null = null

  function setOnLoad(cb: () => void) {
    onLoadCallback = cb
  }

  function resolve(icon: string | HTMLImageElement): HTMLImageElement | null {
    if (icon instanceof HTMLImageElement) return icon
    if (cache.has(icon)) return cache.get(icon)!
    cache.set(icon, null)
    const img = new Image()
    img.onload = () => {
      cache.set(icon, img)
      onLoadCallback?.()
    }
    img.src = icon
    return null
  }

  function resolveAll(icons: (string | HTMLImageElement)[]): HTMLImageElement[] {
    return icons.map(resolve).filter((img): img is HTMLImageElement => img !== null)
  }

  function clear() {
    cache.clear()
  }

  return { resolve, resolveAll, clear, setOnLoad }
}
