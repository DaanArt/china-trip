import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../../domain/geo'
import { groupPlaces } from '../../domain/places'
import type { Route } from '../../domain/route'
import type { Place } from '../../domain/types'
import type { MapMode, Selection } from '../selection'

// Tiles: openstreetmap.de (free, keyless, not Google). Checked 2026-11-21 at
// zoom 6 over Beijing: labels show Chinese plus a Latin-script name. CARTO now
// needs an API key; standard OSM tiles show Chinese only.
const TILES = 'https://tile.openstreetmap.de/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

interface Props {
  route: Route
  places: Place[]
  selection: Selection
  onSelect: (s: Selection) => void
  mapMode: MapMode
  onMapClick: (lat: number, lng: number) => void
  marker?: LatLng | null
  travelled?: LatLng[]
}

function ClickHandler({ enabled, onClick }: { enabled: boolean; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => enabled && onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

/** Pans only when the timelapse marker leaves the visible area. */
function Follow({ marker }: { marker: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (marker && !map.getBounds().contains([marker.lat, marker.lng])) map.panTo([marker.lat, marker.lng])
  }, [map, marker])
  return null
}

export function TripMap({ route, places, selection, onSelect, mapMode, onMapClick, marker = null, travelled = [] }: Props) {
  const internal = route.legs.filter(l => l.from && l.to)

  return (
    <MapContainer center={[35, 104]} zoom={4} className={`map ${mapMode ? 'picking' : ''}`} worldCopyJump>
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={18} />
      <ClickHandler enabled={!!mapMode} onClick={onMapClick} />

      {internal.map(leg => {
        const selected = selection?.kind === 'leg' && selection.key === leg.key
        return (
          <Polyline
            key={leg.key}
            positions={[
              [leg.from!.lat, leg.from!.lng],
              [leg.to!.lat, leg.to!.lng],
            ]}
            pathOptions={{ color: selected ? '#c8102e' : '#5a5a66', weight: selected ? 5 : 3, dashArray: leg.overnight ? '6 8' : undefined }}
            eventHandlers={{ click: () => onSelect({ kind: 'leg', key: leg.key }) }}
          />
        )
      })}

      {groupPlaces(places).visible.map(p => {
        const selected = selection?.kind === 'place' && selection.id === p.id
        const idea = !p.stop_id
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={selected ? 8 : 5}
            pathOptions={{
              color: '#1f5f8b',
              weight: p.status === 'suggested' ? 2 : 1,
              dashArray: p.status === 'suggested' ? '3 3' : undefined,
              fillColor: '#1f5f8b',
              fillOpacity: p.status === 'suggested' ? 0 : idea ? 0.35 : 0.9,
            }}
            eventHandlers={{ click: () => onSelect({ kind: 'place', id: p.id }) }}
          >
            <Tooltip direction="top">{p.name}{p.status === 'suggested' ? ' (suggested)' : idea ? ' (idea)' : ''}</Tooltip>
          </CircleMarker>
        )
      })}

      {travelled.length > 1 && (
        <Polyline positions={travelled.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: '#c8102e', weight: 6, opacity: 0.6 }} interactive={false} />
      )}
      <Follow marker={marker} />

      {route.stops.map(rs => {
        const selected = selection?.kind === 'stop' && selection.id === rs.stop.id
        return (
          <CircleMarker
            key={rs.stop.id}
            center={[rs.stop.lat, rs.stop.lng]}
            radius={selected ? 10 : 8}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#c8102e', fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelect({ kind: 'stop', id: rs.stop.id }) }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent={route.stops.length <= 25}>
              {rs.index + 1}. {rs.stop.name}
            </Tooltip>
          </CircleMarker>
        )
      })}
      {marker && (
        <CircleMarker
          center={[marker.lat, marker.lng]}
          radius={11}
          interactive={false}
          pathOptions={{ className: 'timelapse-marker', color: '#1d1d1f', weight: 3, fillColor: '#ffc83d', fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  )
}
