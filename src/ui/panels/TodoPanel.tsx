import { useTrip } from '../../data/TripDataProvider'
import type { Selection } from '../selection'

export function TodoPanel({ onSelect }: { onSelect: (s: Selection) => void }) {
  const { todos } = useTrip()
  return (
    <section className="panel">
      <h2>To do</h2>
      {todos.length === 0 && <p className="muted">Nothing left to book.</p>}
      <ul className="todos">
        {todos.map(t => {
          const target: Selection = t.stopId ? { kind: 'stop', id: t.stopId } : t.legKey ? { kind: 'leg', key: t.legKey } : null
          return (
            <li key={t.id}>
              <button className={`todo ${t.kind}`} disabled={!target} onClick={() => onSelect(target)}>
                {t.text}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
