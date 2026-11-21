import { useState, type FormEvent } from 'react'
import { useTrip } from '../../data/TripDataProvider'
import { timeAgo } from '../../domain/timeAgo'
import type { Comment } from '../../domain/types'
import { LinkedText } from './LinkedText'

type Target = { wishlist_item_id: string } | { activity_id: string } | { task_id: string }

const matches = (c: Comment, t: Target) =>
  'wishlist_item_id' in t ? c.wishlist_item_id === t.wishlist_item_id : 'activity_id' in t ? c.activity_id === t.activity_id : c.task_id === t.task_id

function CommentItem({ comment }: { comment: Comment }) {
  const { actions, nameOf, me } = useTrip()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.body)
  const mine = comment.created_by === me
  const author = nameOf(comment.created_by)
  return (
    <li className="comment" aria-label={`Comment by ${author}`}>
      <div className="comment-head small">
        <strong>{author}</strong> <span className="muted">· {timeAgo(comment.created_at)}{comment.edited_at ? ' (edited)' : ''}</span>
        {mine && !editing && (
          <span className="comment-actions">
            <button className="link" onClick={() => setEditing(true)}>Edit</button>
            <button className="link" onClick={() => window.confirm('Delete this comment?') && actions?.deleteComment(comment.id)}>Delete</button>
          </span>
        )}
      </div>
      {editing ? (
        <form
          className="row"
          onSubmit={async e => {
            e.preventDefault()
            if (!body.trim()) return
            await actions?.updateComment(comment.id, body)
            setEditing(false)
          }}
        >
          <textarea aria-label="Edit comment" rows={2} value={body} onChange={e => setBody(e.target.value)} />
          <button type="submit" disabled={!body.trim()}>Save</button>
          <button type="button" className="link" onClick={() => { setBody(comment.body); setEditing(false) }}>Cancel</button>
        </form>
      ) : (
        <LinkedText text={comment.body} />
      )}
    </li>
  )
}

/** Collapsed comment thread under a wishlist item, activity or to-do. */
export function Comments({ target }: { target: Target }) {
  const { data, actions } = useTrip()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!data || !actions) return null
  const list = data.comments.filter(c => matches(c, target)).sort((a, b) => a.created_at.localeCompare(b.created_at))

  async function post(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    try {
      await actions!.addComment(target, body)
      setBody('')
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="comments">
      <button className="link comments-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        💬 Comments ({list.length})
      </button>
      {open && (
        <>
          <ul className="comment-list">{list.map(c => <CommentItem key={c.id} comment={c} />)}</ul>
          <form className="row" onSubmit={post}>
            <textarea aria-label="Add a comment" rows={2} placeholder="Write a comment…" value={body} onChange={e => setBody(e.target.value)} />
            <button type="submit" disabled={!body.trim()}>Post</button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
        </>
      )}
    </div>
  )
}
