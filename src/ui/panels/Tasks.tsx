import { useState, type FormEvent } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { formatDay } from '../../domain/dates'
import { arrangeTasks, localToday, type OpenTask } from '../../domain/tasks'
import type { Task } from '../../domain/types'
import type { Selection } from '../selection'

/** People who can be assigned: everyone on the trip except the Claude account. */
function usePeople() {
  const { data } = useTrip()
  return (data?.profiles ?? []).filter(p => p.display_name !== 'Claude')
}

export function TaskForm({ stopId }: { stopId?: string }) {
  const { route, actions } = useTrip()
  const people = usePeople()
  const [text, setText] = useState('')
  const [who, setWho] = useState<string[]>([])
  const [stop, setStop] = useState(stopId ?? '')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await actions!.addTask({ text, assignee_ids: who, stop_id: stop || null, due_date: due || null })
      setText('')
      setWho([])
      setDue('')
      if (!stopId) setStop('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="task-form" onSubmit={submit}>
      <div className="row">
        <input aria-label="New to-do" placeholder="Add a to-do…" value={text} onChange={e => setText(e.target.value)} />
        <button type="submit" className="primary" disabled={!text.trim()}>Add to-do</button>
      </div>
      <div className="row small">
        {people.map(p => (
          <label key={p.id} className="who">
            <input type="checkbox" checked={who.includes(p.id)} onChange={e => setWho(e.target.checked ? [...who, p.id] : who.filter(id => id !== p.id))} />
            {p.display_name}
          </label>
        ))}
        {!stopId && (
          <label className="inline">
            Stop
            <select value={stop} onChange={e => setStop(e.target.value)}>
              <option value="">—</option>
              {route?.stops.map(s => <option key={s.stop.id} value={s.stop.id}>{s.stop.name}</option>)}
            </select>
          </label>
        )}
        <label className="inline">
          Due
          <input type="date" value={due} onChange={e => setDue(e.target.value)} />
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  )
}

export function TaskItem({ task, onSelect }: { task: Task | OpenTask; onSelect: (s: Selection) => void }) {
  const { data, actions, nameOf } = useTrip()
  const stop = data?.stops.find(s => s.id === task.stop_id)
  const overdue = 'overdue' in task && task.overdue
  const remove = () => window.confirm(`Delete “${task.text}”?`) && actions?.deleteTask(task.id)
  return (
    <li aria-label={task.text} className={`task ${task.done ? 'done' : ''} ${overdue ? 'overdue' : ''}`}>
      <input type="checkbox" aria-label="Done" key={`d-${task.done}`} defaultChecked={task.done} onChange={e => actions?.updateTask(task.id, { done: e.target.checked })} />
      <div className="task-body">
        <span className="task-text">{task.text}</span>
        <span className="task-tags">
          {task.due_date && <span className={`chip ${overdue ? 'not_covered' : ''}`}>{overdue ? 'Overdue · ' : ''}{formatDay(task.due_date)}</span>}
          {stop && <button className="place-link" onClick={() => onSelect({ kind: 'stop', id: stop.id })}>{stop.name}</button>}
          {task.assignee_ids.map(id => <span key={id} className="chip">{nameOf(id)}</span>)}
          <span className="muted small">added by {nameOf(task.created_by)}</span>
        </span>
      </div>
      <button className="link" aria-label={`Delete to-do ${task.text}`} onClick={remove}>✕</button>
    </li>
  )
}

/** Own to-dos, optionally only those linked to one stop. */
export function TaskList({ onSelect, stopId }: { onSelect: (s: Selection) => void; stopId?: string }) {
  const { data } = useTrip()
  const [showDone, setShowDone] = useState(false)
  if (!data) return null
  const tasks = stopId ? data.tasks.filter(t => t.stop_id === stopId) : data.tasks
  const { open, done } = arrangeTasks(tasks, localToday())
  return (
    <>
      <ul className="tasks">{open.map(t => <TaskItem key={t.id} task={t} onSelect={onSelect} />)}</ul>
      {open.length === 0 && <p className="muted small">{stopId ? 'No to-dos for this stop.' : 'Nothing on your list yet.'}</p>}
      {done.length > 0 && (
        <>
          <button className="collapse" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
            Done ({done.length}) {showDone ? '▾' : '▸'}
          </button>
          {showDone && <ul className="tasks">{done.map(t => <TaskItem key={t.id} task={t} onSelect={onSelect} />)}</ul>}
        </>
      )}
    </>
  )
}
