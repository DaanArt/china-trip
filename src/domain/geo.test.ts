import { expect, test } from 'vitest'
import { estimateHours, formatHours, haversineKm } from './geo'

test('Beijing to Xi\'an is roughly 900–930 km in a straight line', () => {
  const km = haversineKm({ lat: 39.9042, lng: 116.4074 }, { lat: 34.3416, lng: 108.9398 })
  expect(km).toBeGreaterThan(900)
  expect(km).toBeLessThan(930)
})

test('estimateHours uses rough speeds per mode', () => {
  expect(estimateHours(800, 'train')).toBe(5)
  expect(estimateHours(1200, 'flight')).toBe(4)
  expect(estimateHours(120, 'bus')).toBe(2)
  expect(estimateHours(140, 'car')).toBe(2)
})

test('formatHours rounds to 15 minutes', () => {
  expect(formatHours(0.75)).toBe('45m')
  expect(formatHours(5)).toBe('5h')
  expect(formatHours(14.5)).toBe('14h 30m')
  expect(formatHours(2.2)).toBe('2h 15m')
})
