import type { Stop } from './types'

export function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
}

export function nextPosition(stops: Stop[]): number {
  return stops.reduce((max, s) => Math.max(max, s.position), 0) + 1
}

/** New positions (1..n) after moving a stop; only the stops that change. */
export function reorderPositions(stops: Stop[], id: string, dir: -1 | 1): { id: string; position: number }[] {
  const order = sortStops(stops)
  const from = order.findIndex(s => s.id === id)
  const to = from + dir
  if (from < 0 || to < 0 || to >= order.length) return []
  ;[order[from], order[to]] = [order[to], order[from]]
  return order
    .map((s, i) => ({ id: s.id, position: i + 1, old: s.position }))
    .filter(s => s.position !== s.old)
    .map(({ id, position }) => ({ id, position }))
}
