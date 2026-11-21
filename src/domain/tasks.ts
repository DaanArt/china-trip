import type { ISODate, Task } from './types'

export type OpenTask = Task & { overdue: boolean }

/** Own to-dos: open ones (overdue, then by due date, undated last, then oldest) and done ones (latest first). */
export function arrangeTasks(tasks: Task[], today: ISODate): { open: OpenTask[]; done: Task[] } {
  const open = tasks
    .filter(t => !t.done)
    .map(t => ({ ...t, overdue: !!t.due_date && t.due_date < today }))
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
        a.created_at.localeCompare(b.created_at),
    )
  const done = tasks.filter(t => t.done).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''))
  return { open, done }
}

/** Suggestions (automatic to-dos) already copied to the list. */
export function copiedTodoIds(tasks: Task[]): Set<string> {
  return new Set(tasks.flatMap(t => (t.source_todo_id ? [t.source_todo_id] : [])))
}

/** The device's local calendar date. */
export function localToday(now = new Date()): ISODate {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
