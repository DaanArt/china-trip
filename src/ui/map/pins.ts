import L from 'leaflet'

// Map-pin SVGs for the adventure-map look (shape from mockup B).
const PIN_PATH = 'M12 30C12 30 2 18.5 2 11.5a10 10 0 1 1 20 0C22 18.5 12 30 12 30z'
const INK = '#2f2f2f'

/** Big red pin with the stop number inside. */
export function stopPin(n: number, selected: boolean): L.DivIcon {
  const w = selected ? 36 : 30
  const h = Math.round(w * 1.3)
  return L.divIcon({
    className: `stop-pin-icon${selected ? ' selected' : ''}`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    html:
      `<svg width="${w}" height="${h}" viewBox="0 0 24 31" aria-hidden="true">` +
      `<path d="${PIN_PATH}" fill="${selected ? '#ffd23f' : '#e8343f'}" stroke="${INK}" stroke-width="1.8"/>` +
      `<text class="stop-pin" x="12" y="15.5" text-anchor="middle" font-weight="700" font-size="11" fill="${selected ? INK : '#fff'}">${n}</text>` +
      `</svg>`,
  })
}

/** Smaller pin for places: solid grey on a stop, light for idea pins, dashed outline for suggestions. */
export function placePin(kind: 'active' | 'idea' | 'suggested', selected: boolean): L.DivIcon {
  const w = selected ? 24 : 18
  const h = Math.round(w * 1.3)
  const fill = kind === 'suggested' ? '#fbf1d6' : kind === 'idea' ? '#b9b2a0' : '#6b6b70'
  const dash = kind === 'suggested' ? ' stroke-dasharray="3 3"' : ''
  return L.divIcon({
    className: `pin-${kind}${selected ? ' selected' : ''}`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    html:
      `<svg width="${w}" height="${h}" viewBox="0 0 24 31" aria-hidden="true">` +
      `<path d="${PIN_PATH}" fill="${fill}" stroke="${INK}" stroke-width="2.2"${dash}/>` +
      `<circle cx="12" cy="11.5" r="3.2" fill="${INK}" opacity="${kind === 'suggested' ? 0.4 : 0.7}"/>` +
      `</svg>`,
  })
}
