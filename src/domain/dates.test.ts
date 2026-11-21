import { describe, expect, test } from 'vitest'
import { addDays, diffDays, formatDay, formatDayLong, formatRange } from './dates'

describe('addDays', () => {
  test('crosses a month boundary', () => {
    expect(addDays('2027-04-30', 1)).toBe('2027-05-01')
  })
  test('goes backwards', () => {
    expect(addDays('2027-06-17', -61)).toBe('2027-04-17')
  })
  test('crosses a year boundary', () => {
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01')
  })
})

describe('diffDays', () => {
  test('counts the trip nights', () => {
    expect(diffDays('2027-06-17', '2027-04-17')).toBe(61)
  })
})

describe('formatting', () => {
  test('formatDay gives day and short month', () => {
    expect(formatDay('2027-04-17')).toBe('17 Apr')
  })
  test('formatDayLong gives day and full month', () => {
    expect(formatDayLong('2027-06-17')).toBe('17 June')
  })
  test('formatRange within one month', () => {
    expect(formatRange('2027-04-17', '2027-04-22')).toBe('17–22 Apr')
  })
  test('formatRange across months', () => {
    expect(formatRange('2027-04-29', '2027-05-02')).toBe('29 Apr–2 May')
  })
})
