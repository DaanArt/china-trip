import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import type { Route } from '../../domain/route'
import type { MapMode, Selection } from '../selection'

// Tiles: openstreetmap.de (free, keyless, not Google). Checked 2026-11-21 at
// zoom 6 over Beijing: labels show Chinese plus a Latin-script name. CARTO now
// needs an API key; standard OSM tiles show Chinese only.
const TILES = 'https://tile.openstreetmap.de/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

interface Props {
  route: Route
  selection: Selection
  onSelect: (s: Selection) => void
  mapMode: MapMode
  onMapClick: (lat: number, lng: number) => void
}

function ClickHandler({ enabled, onClick }: { enabled: boolean; onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => enabled && onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export function TripMap({ route, selection, onSelect, mapMode, onMapClick }: Props) {
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
    </MapContainer>
  )
}
