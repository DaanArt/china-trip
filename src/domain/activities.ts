import type { Activity, ActivityVote } from './types'

export interface RankedActivity {
  activity: Activity
  total: number
  byUser: Record<string, number> // user id -> hearts (missing = 0)
}

/** Most hearts first; equal totals keep the oldest first. */
export function rankActivities(activities: Activity[], votes: ActivityVote[]): RankedActivity[] {
  return activities
    .map(activity => {
      const mine = votes.filter(v => v.activity_id === activity.id)
      return {
        activity,
        total: mine.reduce((sum, v) => sum + v.hearts, 0),
        byUser: Object.fromEntries(mine.map(v => [v.user_id, v.hearts])),
      }
    })
    .sort((a, b) => b.total - a.total || a.activity.created_at.localeCompare(b.activity.created_at))
}

export type Segment = { text: string } | { href: string; text: string }

const URL_RE = /https?:\/\/[^\s<>"']+/g

/** Splits notes into plain text and http(s) links; trailing punctuation stays text. */
export function linkify(text: string): Segment[] {
  const out: Segment[] = []
  const push = (t: string) => {
    if (!t) return
    const last = out[out.length - 1]
    if (last && !('href' in last)) last.text += t
    else out.push({ text: t })
  }
  let at = 0
  for (const m of text.matchAll(URL_RE)) {
    let url = m[0]
    const trail = /[.,;:!?)\]]+$/.exec(url)?.[0] ?? ''
    url = url.slice(0, url.length - trail.length)
    push(text.slice(at, m.index))
    out.push({ href: url, text: url })
    push(trail)
    at = m.index! + m[0].length
  }
  push(text.slice(at))
  return out
}
