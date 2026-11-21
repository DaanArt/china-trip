import { expect, test } from 'vitest'
import { toResults } from './photon'

test('maps Photon features to name, label and coordinates', () => {
  const json = {
    features: [
      { geometry: { coordinates: [116.39, 39.9] }, properties: { name: 'Beijing', state: 'Beijing', country: 'China' } },
      { geometry: { coordinates: [104.06, 30.66] }, properties: { name: 'Jinli', city: 'Chengdu', country: 'China' } },
      { geometry: { coordinates: [1, 2] }, properties: { country: 'Nowhere' } },
    ],
  }
  expect(toResults(json)).toEqual([
    { name: 'Beijing', label: 'Beijing, China', lat: 39.9, lng: 116.39 },
    { name: 'Jinli', label: 'Jinli, Chengdu, China', lat: 30.66, lng: 104.06 },
  ])
})

test('an empty or broken response gives no results', () => {
  expect(toResults({})).toEqual([])
  expect(toResults(null)).toEqual([])
})
