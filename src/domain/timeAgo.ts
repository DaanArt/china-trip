import { formatDay } from './dates'

/** "just now", "5 min ago", "2 h ago", "3 d ago", else the local date ("17 Apr"). */
export function timeAgo(iso: string, now = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} d ago`
  const local = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return formatDay(`${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`)
}
