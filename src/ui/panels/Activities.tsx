import { useState, type FormEvent } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { linkify, rankActivities, type RankedActivity } from '../../domain/activities'
import { Reservations } from './Reservations'

function Notes({ text }: { text: string }) {
  return (
    <p className="small pre">
      {linkify(text).map((seg, i) =>
        'href' in seg ? (
          <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer">{seg.text}</a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  )
}

const hearts = (n: number) => '♥'.repeat(n) + '♡'.repeat(3 - n)

function ActivityCard({ ranked }: { ranked: RankedActivity }) {
  const { data, actions, nameOf, me } = useTrip()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { activity, total, byUser } = ranked
  if (!data || !actions) return null
  const mine = byUser[me] ?? 0
  // Other travellers: everyone on the trip except me and the Claude account.
  const others = data.profiles.filter(p => p.id !== me && p.display_name !== 'Claude')
  const fail = (err: unknown) => setError((err as Error).message)

  async function remove() {
    const bookings = data!.reservations.filter(r => r.activity_id === activity.id)
    const files = data!.attachments.filter(a => bookings.some(b => b.id === a.reservation_id))
    const extra = bookings.length ? ` and its ${bookings.length} booking${bookings.length === 1 ? '' : 's'}` : ''
    if (window.confirm(`Delete ${activity.title}${extra}?`)) await actions!.deleteActivity(activity.id, files).catch(fail)
  }

  return (
    <article className="activity res-card" aria-label={activity.title}>
      <div className="row spread">
        <strong>{activity.title}</strong>
        <span className="total" aria-label={`${total} hearts in total`}>♥ {total}</span>
      </div>
      <div className="votes">
        <span className="vote-row" aria-label={`${nameOf(me)} (you): ${mine} hearts`}>
          <span className="who">You</span>
          {[1, 2, 3].map(n => (
            <button
              key={n}
              className={`heart ${n <= mine ? 'on' : ''}`}
              aria-label={`Give ${n} heart${n === 1 ? '' : 's'}`}
              aria-pressed={n <= mine}
              onClick={() => actions.vote(activity.id, mine === n ? n - 1 : n).catch(fail)}
            >
              {n <= mine ? '♥' : '♡'}
            </button>
          ))}
        </span>
        {others.map(p => (
          <span key={p.id} className="vote-row" aria-label={`${p.display_name}: ${byUser[p.id] ?? 0} hearts`}>
            <span className="who">{p.display_name}</span>
            <span className="heart-static">{hearts(byUser[p.id] ?? 0)}</span>
          </span>
        ))}
      </div>
      {editing ? (
        <ActivityForm
          initial={activity}
          onSave={async (title, notes) => {
            await actions.updateActivity(activity.id, { title, notes })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        activity.notes && <Notes text={activity.notes} />
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <Reservations target={{ activity }} />
      <div className="row spread">
        <span className="muted small">added by {nameOf(activity.created_by)}</span>
        <span className="row">
          <button className="link" onClick={() => setEditing(true)}>Edit</button>
          <button className="link" onClick={remove}>Delete</button>
        </span>
      </div>
    </article>
  )
}

function ActivityForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { title: string; notes: string | null }
  onSave: (title: string, notes: string | null) => Promise<unknown>
  onCancel?: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await onSave(title.trim(), notes.trim() || null)
      if (!initial) {
        setTitle('')
        setNotes('')
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }
  return (
    <form className="fields task-form" onSubmit={submit}>
      <label>Activity<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Panda Base" /></label>
      <label>Notes<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Links, opening hours, tips…" /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="primary" disabled={!title.trim()}>{initial ? 'Save activity' : 'Add activity'}</button>
        {onCancel && <button type="button" className="link" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export function ActivitiesPanel({ stopId }: { stopId: string }) {
  const { data, actions } = useTrip()
  if (!data || !actions) return null
  const ranked = rankActivities(
    data.activities.filter(a => a.stop_id === stopId),
    data.votes,
  )
  return (
    <div className="activities">
      <ActivityForm onSave={(title, notes) => actions.addActivity({ stop_id: stopId, title, notes })} />
      {ranked.length === 0 && <p className="muted small">No activities yet. Add something you'd like to do here.</p>}
      {ranked.map(r => <ActivityCard key={r.activity.id} ranked={r} />)}
    </div>
  )
}
