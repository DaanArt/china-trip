// Geocoding via Photon (OpenStreetMap data, no key, no Google).
// Called on Enter or after a debounce, never per keystroke.

export interface PlaceResult {
  name: string
  label: string
  lat: number
  lng: number
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: { name?: string; city?: string; state?: string; country?: string }
}

export function toResults(json: unknown): PlaceResult[] {
  const features = (json as { features?: PhotonFeature[] } | null)?.features ?? []
  return features.flatMap(f => {
    const p = f.properties ?? {}
    const [lng, lat] = f.geometry?.coordinates ?? []
    if (!p.name || lat === undefined || lng === undefined) return []
    const area = p.city ?? (p.state !== p.name ? p.state : undefined)
    const label = [p.name, area, p.country].filter(Boolean).join(', ')
    return [{ name: p.name, label, lat, lng }]
  })
}

const BASE = 'https://photon.komoot.io'

export async function searchPlaces(q: string, near?: { lat: number; lng: number }): Promise<PlaceResult[]> {
  const params = new URLSearchParams({ q, limit: '5', lang: 'en' })
  if (near) {
    params.set('lat', String(near.lat))
    params.set('lon', String(near.lng))
  }
  const res = await fetch(`${BASE}/api/?${params}`)
  if (!res.ok) throw new Error('Place search is unavailable right now')
  return toResults(await res.json())
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/reverse?lat=${lat}&lon=${lng}&lang=en`)
    if (!res.ok) return null
    return toResults(await res.json())[0]?.name ?? null
  } catch {
    return null
  }
}
