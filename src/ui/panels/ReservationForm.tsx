import { useState, type FormEvent } from 'react'
import type { ReservationInput } from '../../data/actions'
import { dateLabels } from '../../domain/reservationDefaults'
import type { ReservationKind } from '../../domain/types'

const KINDS: ReservationKind[] = ['hotel', 'transport', 'activity', 'other']

interface Props {
  initial: ReservationInput
  onSave: (input: ReservationInput) => Promise<unknown>
  onCancel: () => void
}

export function ReservationForm({ initial, onSave, onCancel }: Props) {
  const [r, setR] = useState<ReservationInput>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startLabel, endLabel] = dateLabels(r.kind)
  const set = (patch: Partial<ReservationInput>) => setR(prev => ({ ...prev, ...patch }))
  const text = (field: 'title' | 'confirmation' | 'address' | 'address_zh' | 'details' | 'start_date' | 'start_time' | 'end_date' | 'end_time') => ({
    value: r[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set({ [field]: e.target.value || null }),
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({ ...r, title: r.title.trim() })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <form className="fields res-form" onSubmit={submit}>
      <label>
        Kind
        <select value={r.kind} onChange={e => set({ kind: e.target.value as ReservationKind })}>
          {KINDS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </label>
      <label>Title<input {...text('title')} required placeholder="e.g. Panda Inn, G87" /></label>
      <label>Confirmation<input {...text('confirmation')} /></label>
      <div className="two">
        <label>{startLabel}<input type="date" {...text('start_date')} /></label>
        <label>{startLabel} time<input type="time" {...text('start_time')} /></label>
        <label>{endLabel}<input type="date" {...text('end_date')} /></label>
        <label>{endLabel} time<input type="time" {...text('end_time')} /></label>
      </div>
      <label>Address<input {...text('address')} /></label>
      <label>Address in Chinese<input {...text('address_zh')} lang="zh" /></label>
      <label>Details<textarea rows={2} {...text('details')} /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="primary" disabled={busy || !r.title.trim()}>Save reservation</button>
        <button type="button" className="link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
