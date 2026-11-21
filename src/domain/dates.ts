import type { ISODate } from './types'

// All date math happens in UTC on 'YYYY-MM-DD' strings, so the result never
// depends on the time zone of the device (Netherlands or China).

const DAY_MS = 86_400_000
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function toUtc(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, day)
}

function fromUtc(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUtc(toUtc(d) + n * DAY_MS)
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUtc(a) - toUtc(b)) / DAY_MS)
}

function parts(d: ISODate): { day: number; month: number } {
  const date = new Date(toUtc(d))
  return { day: date.getUTCDate(), month: date.getUTCMonth() }
}

export function formatDay(d: ISODate): string {
  const { day, month } = parts(d)
  return `${day} ${SHORT[month]}`
}

export function formatDayLong(d: ISODate): string {
  const { day, month } = parts(d)
  return `${day} ${LONG[month]}`
}

export function formatRange(from: ISODate, to: ISODate): string {
  const a = parts(from)
  const b = parts(to)
  if (a.month === b.month) return `${a.day}–${b.day} ${SHORT[b.month]}`
  return `${formatDay(from)}–${formatDay(to)}`
}
