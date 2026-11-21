import type { Mode } from './types'

export interface LatLng {
  lat: number
  lng: number
}

const EARTH_KM = 6371

/** Straight-line distance; shown as an approximation only. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h))
}

/** Rough door-to-door estimate, meant to make unrealistic hops stand out. */
export function estimateHours(km: number, mode: Mode): number {
  switch (mode) {
    case 'train':
      return km / 160
    case 'flight':
      return km / 600 + 2
    case 'car':
      return km / 70
    case 'bus':
    case 'other':
      return km / 60
  }
}

export function formatHours(h: number): string {
  const quarters = Math.max(1, Math.round((h * 60) / 15))
  const hours = Math.floor(quarters / 4)
  const minutes = (quarters % 4) * 15
  if (hours === 0) return `${minutes}m`
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
