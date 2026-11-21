import { expect, test } from 'vitest'
import { linkify, rankActivities } from './activities'
import type { Activity, ActivityVote } from './types'

const act = (id: string, created_at: string): Activity => ({ id, trip_id: 't', stop_id: 's', title: id, notes: null, created_by: null, created_at })
const vote = (activity_id: string, user_id: string, hearts: number): ActivityVote => ({ activity_id, user_id, hearts })

test('ranks by total hearts, ties by age, and keeps who gave what', () => {
  const pandas = act('pandas', '2026-11-21T10:00:00Z')
  const hotpot = act('hotpot', '2026-11-21T09:00:00Z')
  const opera = act('opera', '2026-11-21T08:00:00Z')
  const jinli = act('jinli', '2026-11-21T07:00:00Z')
  const ranked = rankActivities([opera, jinli, hotpot, pandas], [
    vote('pandas', 'daan', 3), vote('pandas', 'cyn', 3),
    vote('hotpot', 'daan', 2), vote('hotpot', 'cyn', 3),
    vote('jinli', 'daan', 1),
  ])
  expect(ranked.map(r => [r.activity.id, r.total])).toEqual([['pandas', 6], ['hotpot', 5], ['jinli', 1], ['opera', 0]])
  expect(ranked[1].byUser).toEqual({ daan: 2, cyn: 3 })
})

test('equal totals keep the oldest first; votes for other activities are ignored', () => {
  const a = act('a', '2026-11-21T09:00:00Z')
  const b = act('b', '2026-11-21T08:00:00Z')
  const ranked = rankActivities([a, b], [vote('a', 'daan', 2), vote('b', 'cyn', 2), vote('zzz', 'daan', 3)])
  expect(ranked.map(r => r.activity.id)).toEqual(['b', 'a'])
})

test('linkify turns http(s) URLs into links and leaves the rest as text', () => {
  expect(linkify('Tickets: https://panda.org.cn/buy, go early.')).toEqual([
    { text: 'Tickets: ' },
    { href: 'https://panda.org.cn/buy', text: 'https://panda.org.cn/buy' },
    { text: ', go early.' },
  ])
  expect(linkify('see (http://a.cn/x).')).toEqual([{ text: 'see (' }, { href: 'http://a.cn/x', text: 'http://a.cn/x' }, { text: ').' }])
})

test('linkify never turns other schemes into links', () => {
  expect(linkify('javascript:alert(1) and ftp://x')).toEqual([{ text: 'javascript:alert(1) and ftp://x' }])
  expect(linkify('')).toEqual([])
})
