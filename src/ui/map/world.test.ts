import { expect, test } from 'vitest'
import { world } from './world'

function bbox(fc: GeoJSON.FeatureCollection) {
  const xs: number[] = []
  const ys: number[] = []
  const walk = (c: unknown): void => {
    if (typeof (c as number[])[0] === 'number') {
      xs.push((c as number[])[0])
      ys.push((c as number[])[1])
    } else (c as unknown[]).forEach(walk)
  }
  fc.features.forEach(f => walk((f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates))
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

test('China and the land around it are GeoJSON feature collections', () => {
  expect(world.china.type).toBe('FeatureCollection')
  expect(world.land.type).toBe('FeatureCollection')
  expect(world.china.features.length).toBeGreaterThan(0)
  expect(world.land.features.length).toBeGreaterThan(0)
})

test('the China shape covers roughly the real country', () => {
  const b = bbox(world.china)
  expect(b.minX).toBeGreaterThan(72)
  expect(b.maxX).toBeLessThan(136)
  expect(b.minY).toBeGreaterThan(17)
  expect(b.maxY).toBeLessThan(54)
  expect(b.maxX - b.minX).toBeGreaterThan(55)
})

test('the shapes stay tiny (low-detail game map)', () => {
  expect(JSON.stringify(world).length).toBeLessThan(15_000)
})
