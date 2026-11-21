import { useState } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { copiedTodoIds } from '../../domain/tasks'
import type { Selection } from '../selection'
import { TaskForm, TaskList } from './Tasks'

const OPEN_KEY = 'chinaTrip.suggestionsOpen'
const readOpen = () => {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

export function TodoPanel({ onSelect }: { onSelect: (s: Selection) => void }) {
  const { data, todos, actions } = useTrip()
  const [open, setOpen] = useState(readOpen)
  const [error, setError] = useState<string | null>(null)
  if (!data || !actions) return null
  const copied = copiedTodoIds(data.tasks)

  const toggle = () => {
    setOpen(!open)
    try {
      localStorage.setItem(OPEN_KEY, open ? '0' : '1')
    } catch {
      /* per-device convenience only */
    }
  }

  return (
    <section className="panel">
      <h2>Our list</h2>
      <TaskForm />
      <TaskList onSelect={onSelect} />

      <button className="collapse suggestions" aria-expanded={open} onClick={toggle}>
        Suggestions ({todos.length}) {open ? '▾' : '▸'}
      </button>
      {open && (
        <>
          <p className="muted small">Spotted automatically from your route and bookings. They disappear once the plan covers them.</p>
          {todos.length === 0 && <p className="muted">Nothing left to book.</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <ul className="todos">
            {todos.map(t => {
              const target: Selection = t.stopId ? { kind: 'stop', id: t.stopId } : t.legKey ? { kind: 'leg', key: t.legKey } : null
              return (
                <li key={t.id} className="suggestion">
                  <button className={`todo ${t.kind}`} disabled={!target} onClick={() => onSelect(target)}>
                    {t.text}
                  </button>
                  {copied.has(t.id) ? (
                    <span className="muted small">✓ on our list</span>
                  ) : (
                    <button
                      className="link"
                      onClick={() => actions.addTask({ text: t.text, stop_id: t.stopId ?? null, source_todo_id: t.id }).catch(err => setError((err as Error).message))}
                    >
                      Add to our list
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
