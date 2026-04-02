import type { BoundingBox, BoundingBoxEntry } from '../types'

interface QuadtreeOptions {
  maxDepth?: number
  maxItems?: number
}

export class Quadtree {
  private bounds: BoundingBox
  private maxDepth: number
  private maxItems: number
  private depth: number
  private items: BoundingBoxEntry[]
  private children: Quadtree[] | null

  constructor(bounds: BoundingBox, options?: QuadtreeOptions, depth = 0) {
    this.bounds = bounds
    this.maxDepth = options?.maxDepth ?? 8
    this.maxItems = options?.maxItems ?? 4
    this.depth = depth
    this.items = []
    this.children = null
  }

  insert(entry: BoundingBoxEntry): void {
    if (this.children) {
      const child = this.getChildForEntry(entry)
      if (child) {
        child.insert(entry)
      } else {
        this.items.push(entry)
      }
      return
    }

    this.items.push(entry)

    if (this.items.length > this.maxItems && this.depth < this.maxDepth) {
      this.subdivide()
    }
  }

  queryPoint(point: { x: number; y: number }): BoundingBoxEntry | undefined {
    if (!this.containsPoint(this.bounds, point)) return undefined

    let result: BoundingBoxEntry | undefined

    // Check items at this node in reverse (topmost/last-inserted first)
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      if (this.pointInBox(point, item)) {
        if (!item.hitTest || item.hitTest(point)) {
          result = item
          break
        }
      }
    }

    // Recurse into the child containing this point
    if (this.children) {
      for (const child of this.children) {
        if (this.containsPoint(child.bounds, point)) {
          const childResult = child.queryPoint(point)
          if (childResult) result = childResult
          break
        }
      }
    }

    return result
  }

  queryArea(area: BoundingBox): BoundingBoxEntry[] {
    const results: BoundingBoxEntry[] = []

    if (!this.boxesIntersect(this.bounds, area)) return results

    for (const item of this.items) {
      if (this.boxesIntersect(item, area)) {
        results.push(item)
      }
    }

    if (this.children) {
      for (const child of this.children) {
        results.push(...child.queryArea(area))
      }
    }

    return results
  }

  clear(): void {
    this.items = []
    this.children = null
  }

  private subdivide(): void {
    const { x, y, width, height } = this.bounds
    const halfW = width / 2
    const halfH = height / 2
    const opts = { maxDepth: this.maxDepth, maxItems: this.maxItems }
    const nextDepth = this.depth + 1

    this.children = [
      new Quadtree({ x,           y,           width: halfW, height: halfH }, opts, nextDepth), // NW
      new Quadtree({ x: x + halfW, y,           width: halfW, height: halfH }, opts, nextDepth), // NE
      new Quadtree({ x,           y: y + halfH, width: halfW, height: halfH }, opts, nextDepth), // SW
      new Quadtree({ x: x + halfW, y: y + halfH, width: halfW, height: halfH }, opts, nextDepth), // SE
    ]

    const oldItems = this.items
    this.items = []

    for (const item of oldItems) {
      const child = this.getChildForEntry(item)
      if (child) {
        child.insert(item)
      } else {
        this.items.push(item)
      }
    }
  }

  private getChildForEntry(entry: BoundingBoxEntry): Quadtree | null {
    if (!this.children) return null
    for (const child of this.children) {
      if (this.boxContainsBox(child.bounds, entry)) {
        return child
      }
    }
    return null
  }

  private containsPoint(box: BoundingBox, point: { x: number; y: number }): boolean {
    return point.x >= box.x
      && point.x <= box.x + box.width
      && point.y >= box.y
      && point.y <= box.y + box.height
  }

  private pointInBox(point: { x: number; y: number }, box: BoundingBox): boolean {
    return point.x >= box.x
      && point.x <= box.x + box.width
      && point.y >= box.y
      && point.y <= box.y + box.height
  }

  private boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return a.x < b.x + b.width
      && a.x + a.width > b.x
      && a.y < b.y + b.height
      && a.y + a.height > b.y
  }

  private boxContainsBox(outer: BoundingBox, inner: BoundingBox): boolean {
    return inner.x >= outer.x
      && inner.y >= outer.y
      && inner.x + inner.width <= outer.x + outer.width
      && inner.y + inner.height <= outer.y + outer.height
  }
}
