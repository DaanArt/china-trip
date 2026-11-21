import { expect, test } from 'vitest'
import { groupPlaces } from './places'
import { makePlace } from './fixtures'

test('groups places into idea pins, suggestions and places per stop; dismissed ones are hidden', () => {
  const idea = makePlace({ name: 'Idea', stop_id: null, status: 'active' })
  const suggestedOff = makePlace({ name: 'Sugg off', stop_id: null, status: 'suggested', source: 'claude' })
  const suggestedOn = makePlace({ name: 'Sugg on', stop_id: 's1', status: 'suggested', source: 'claude' })
  const atStop = makePlace({ name: 'At stop', stop_id: 's1', status: 'active' })
  const dismissed = makePlace({ name: 'Gone', stop_id: null, status: 'dismissed' })

  const g = groupPlaces([idea, suggestedOff, suggestedOn, atStop, dismissed])
  expect(g.ideas).toEqual([idea])
  expect(g.suggestions).toEqual([suggestedOff, suggestedOn])
  expect(g.byStop.get('s1')).toEqual([suggestedOn, atStop])
  expect(g.visible).toHaveLength(4)
})
