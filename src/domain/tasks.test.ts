import { expect, test } from 'vitest'
import { arrangeTasks, copiedTodoIds, localToday } from './tasks'
import type { Task } from './types'

let n = 0
const task = (over: Partial<Task>): Task => ({
  id: `t${++n}`, trip_id: 'trip-1', text: 'x', done: false, done_at: null, assignee_ids: [], stop_id: null,
  due_date: null, source_todo_id: null, created_by: null, created_at: `2026-11-21T10:00:${String(n).padStart(2, '0')}Z`, ...over,
})
const TODAY = '2026-12-01'

test('open to-dos: overdue first, then by due date, undated last, then oldest first', () => {
  const undatedOld = task({ text: 'undated old' })
  const later = task({ text: 'later', due_date: '2027-03-01' })
  const overdue = task({ text: 'overdue', due_date: '2026-11-25' })
  const soon = task({ text: 'soon', due_date: '2026-12-10' })
  const undatedNew = task({ text: 'undated new' })
  const { open } = arrangeTasks([undatedNew, later, undatedOld, soon, overdue], TODAY)
  expect(open.map(t => t.text)).toEqual(['overdue', 'soon', 'later', 'undated old', 'undated new'])
  expect(open.map(t => t.overdue)).toEqual([true, false, false, false, false])
})

test('due today is not overdue', () => {
  expect(arrangeTasks([task({ due_date: TODAY })], TODAY).open[0].overdue).toBe(false)
})

test('done to-dos are separated, most recently done first', () => {
  const a = task({ text: 'a', done: true, done_at: '2026-11-21T12:00:00Z' })
  const b = task({ text: 'b', done: true, done_at: '2026-11-22T12:00:00Z' })
  const open = task({ text: 'open' })
  const result = arrangeTasks([a, open, b], TODAY)
  expect(result.open.map(t => t.text)).toEqual(['open'])
  expect(result.done.map(t => t.text)).toEqual(['b', 'a'])
})

test('copiedTodoIds lists suggestions already on the list (open or done)', () => {
  const ids = copiedTodoIds([task({ source_todo_id: 'book-hotel:s1:2027-04-22' }), task({ source_todo_id: 'unplanned', done: true }), task({})])
  expect([...ids].sort()).toEqual(['book-hotel:s1:2027-04-22', 'unplanned'])
})

test('localToday uses the device calendar date, even late in the evening', () => {
  expect(localToday(new Date(2026, 11, 1, 23, 30))).toBe('2026-12-01')
  expect(localToday(new Date(2027, 0, 1, 0, 5))).toBe('2027-01-01')
})
