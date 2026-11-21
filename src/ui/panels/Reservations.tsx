import { useState } from 'react'
import type { ReservationInput } from '../../data/actions'
import { useTrip } from '../../data/TripDataProvider'
import { formatDay } from '../../domain/dates'
import { dateLabels, defaultDates } from '../../domain/reservationDefaults'
import type { RouteLeg, RouteStop } from '../../domain/route'
import type { Activity, Reservation, ReservationKind } from '../../domain/types'
import { Attachments } from './Attachments'
import { ReservationForm } from './ReservationForm'

type Target = { stop: RouteStop } | { leg: RouteLeg } | { activity: Activity }

const EMPTY: Omit<ReservationInput, 'kind'> = {
  title: '', confirmation: null, start_date: null, start_time: null, end_date: null, end_time: null,
  address: null, address_zh: null, details: null,
}

function when(r: Reservation): string {
  const [a, b] = dateLabels(r.kind)
  const part = (label: string, d: string | null, t: string | null) => (d || t ? `${label} ${d ? formatDay(d) : ''}${t ? ` ${t}` : ''}` : null)
  return [part(a, r.start_date, r.start_time), part(b, r.end_date, r.end_time)].filter(Boolean).join(' · ')
}

export function Reservations({ target, allowAdd = true }: { target: Target; allowAdd?: boolean }) {
  const { data, actions, nameOf } = useTrip()
  const [editing, setEditing] = useState<'new' | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!data || !actions) return null

  const legRow = 'leg' in target ? target.leg.row : null
  const list = data.reservations.filter(r =>
    'stop' in target ? r.stop_id === target.stop.stop.id : 'activity' in target ? r.activity_id === target.activity.id : legRow && r.leg_id === legRow.id,
  )
  const defaultKind: ReservationKind = 'stop' in target ? 'hotel' : 'activity' in target ? 'activity' : 'transport'
  const prefill = 'activity' in target ? { start_date: null, end_date: null } : defaultDates(defaultKind, target)

  async function create(input: ReservationInput) {
    let ref: { stop_id: string } | { leg_id: string } | { activity_id: string }
    if ('stop' in target) ref = { stop_id: target.stop.stop.id }
    else if ('activity' in target) ref = { activity_id: target.activity.id }
    else {
      const leg = target.leg.row ?? (await actions!.upsertLeg(target.leg.from?.id ?? null, target.leg.to?.id ?? null, {}))
      ref = { leg_id: leg.id }
    }
    await actions!.addReservation(ref, input)
    setEditing(null)
  }

  async function remove(r: Reservation) {
    if (!window.confirm(`Delete ${r.title}?`)) return
    const files = data!.attachments.filter(a => a.reservation_id === r.id)
    await actions!.deleteReservation(r, files).catch(err => setError((err as Error).message))
  }

  return (
    <section className="reservations">
      <h3>Reservations</h3>
      {error && <p className="error" role="alert">{error}</p>}
      {list.map(r =>
        editing === r.id ? (
          <ReservationFormFor key={r.id} initial={r} onCancel={() => setEditing(null)} onSave={async input => {
            await actions.updateReservation(r.id, input)
            setEditing(null)
          }} />
        ) : (
          <article key={r.id} className="res-card" aria-label={r.title}>
            <div className="row spread">
              <strong>{r.title}</strong>
              <span className="tag">{r.kind}</span>
            </div>
            {when(r) && <div className="muted small">{when(r)}</div>}
            {r.confirmation && <div>Confirmation: <code>{r.confirmation}</code></div>}
            {r.address && <div className="small">{r.address}</div>}
            {r.address_zh && <div className="small" lang="zh">{r.address_zh}</div>}
            {r.details && <div className="small pre">{r.details}</div>}
            <Attachments reservationId={r.id} />
            <div className="row spread">
              <span className="muted small">added by {nameOf(r.created_by)}</span>
              <span className="row">
                <button className="link" onClick={() => setEditing(r.id)}>Edit</button>
                <button className="link" onClick={() => remove(r)}>Delete</button>
              </span>
            </div>
          </article>
        ),
      )}
      {list.length === 0 && editing !== 'new' && <p className="muted small">Nothing booked yet.</p>}
      {editing === 'new' ? (
        <ReservationFormFor
          initial={{ ...EMPTY, kind: defaultKind, ...prefill }}
          onCancel={() => setEditing(null)}
          onSave={create}
        />
      ) : (
        allowAdd && <button onClick={() => setEditing('new')}>Add reservation</button>
      )}
    </section>
  )
}

// Keeps only the editable fields when editing an existing row.
function ReservationFormFor({ initial, onSave, onCancel }: { initial: ReservationInput | Reservation; onSave: (i: ReservationInput) => Promise<unknown>; onCancel: () => void }) {
  const { kind, title, confirmation, start_date, start_time, end_date, end_time, address, address_zh, details } = initial
  return (
    <ReservationForm
      initial={{ kind, title, confirmation, start_date, start_time, end_date, end_time, address, address_zh, details }}
      onSave={onSave}
      onCancel={onCancel}
    />
  )
}

