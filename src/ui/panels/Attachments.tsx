import { useState } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import type { Attachment } from '../../domain/types'

export function Attachments({ reservationId }: { reservationId: string }) {
  const { data, actions } = useTrip()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!data || !actions) return null
  const files = data.attachments.filter(a => a.reservation_id === reservationId)

  async function upload(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(list)) await actions!.uploadAttachment(reservationId, file)
    } catch (err) {
      setError(`Upload failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  async function open(a: Attachment) {
    // Open the tab during the click so popup blockers allow it, then point it at the signed link.
    const tab = window.open('', '_blank')
    try {
      const url = await actions!.openAttachment(a)
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (err) {
      tab?.close()
      setError((err as Error).message)
    }
  }

  async function remove(a: Attachment) {
    if (!window.confirm(`Remove ${a.filename}?`)) return
    await actions!.deleteAttachment(a).catch(err => setError((err as Error).message))
  }

  return (
    <div className="files">
      {files.map(a => (
        <div key={a.id} className="row file">
          <button className="link file-name" onClick={() => open(a)}>{a.filename}</button>
          <button className="link" aria-label={`Remove ${a.filename}`} onClick={() => remove(a)}>✕</button>
        </div>
      ))}
      <label className="attach">
        {busy ? 'Uploading…' : '+ Attach file'}
        <input type="file" aria-label="Attach file" accept="image/*,application/pdf" multiple disabled={busy} onChange={e => upload(e.target.files)} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
