import { useEffect } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLng } from '../../domain/geo'
import { groupPlaces } from '../../domain/places'
import type { Route } from '../../domain/route'
import type { Place } from '../../domain/types'
import type { MapMode, Selection } from '../selection'
import { placePin, stopPin } from './pins'
import { world } from './world'

// The map is built in: low-detail outlines of China and the land around it
// (Natural Earth, see world.ts) drawn on a CSS sea. No tile server, so nothing
// to block in China and nothing to load offline.
const INK = '#2f2f2f'
const RED = '#e8343f'
const BOUNDS: [[number, number], [number, number]] = [[0, 55], [60, 155]]

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
    <MapContainer
      center={[35.5, 104.5]}
      zoom={4.25}
      zoomSnap={0.25}
      minZoom={3.5}
      maxZoom={8}
      maxBounds={BOUNDS}
      maxBoundsViscosity={0.8}
      className={`map ${mapMode ? 'picking' : ''}`}
      attributionControl
    >
      <GeoJSON
        data={world.land}
        interactive={false}
        style={{ className: 'land-shape', color: '#c9b78e', weight: 1, fillColor: '#e6d6b0', fillOpacity: 1 }}
      />
      <GeoJSON
        data={world.china}
        interactive={false}
        style={{ className: 'china-shape', color: INK, weight: 3, fillColor: '#fbf1d6', fillOpacity: 1, lineJoin: 'miter' }}
        attribution="Map data: Natural Earth"
      />
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
            pathOptions={{
              color: selected ? RED : INK,
              weight: selected ? 6 : 4,
              lineCap: 'round',
              dashArray: leg.overnight ? '10 10' : '2 10',
            }}
            eventHandlers={{ click: () => onSelect({ kind: 'leg', key: leg.key }) }}
          />
        )
      })}

      {travelled.length > 1 && (
        <Polyline positions={travelled.map(p => [p.lat, p.lng] as [number, number])} pathOptions={{ color: INK, weight: 5, opacity: 0.85 }} interactive={false} />
      )}
      <Follow marker={marker} />

      {groupPlaces(places).visible.map(p => {
        const selected = selection?.kind === 'place' && selection.id === p.id
        const kind = p.status === 'suggested' ? 'suggested' : p.stop_id ? 'active' : 'idea'
        return (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={placePin(kind, selected)} eventHandlers={{ click: () => onSelect({ kind: 'place', id: p.id }) }}>
            <Tooltip direction="top" offset={[0, -22]} className="place-label">
              {p.name}
              {kind === 'suggested' ? ' (suggested)' : kind === 'idea' ? ' (idea)' : ''}
            </Tooltip>
          </Marker>
        )
      })}

      {route.stops.map(rs => {
        const selected = selection?.kind === 'stop' && selection.id === rs.stop.id
        return (
          <Marker
            key={rs.stop.id}
            position={[rs.stop.lat, rs.stop.lng]}
            icon={stopPin(rs.index + 1, selected)}
            zIndexOffset={1000}
            eventHandlers={{ click: () => onSelect({ kind: 'stop', id: rs.stop.id }) }}
          >
            <Tooltip direction="right" offset={[12, -24]} permanent className="stop-label">
              {rs.stop.name}
            </Tooltip>
          </Marker>
        )
      })}

      {marker && (
        <CircleMarker
          center={[marker.lat, marker.lng]}
          radius={10}
          interactive={false}
          pathOptions={{ className: 'timelapse-marker', color: INK, weight: 3, fillColor: '#ffd23f', fillOpacity: 1 }}
        />
      )}
    </MapContainer>
  )
}
