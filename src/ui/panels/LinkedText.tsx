import { linkify } from '../../domain/activities'

/** Text with http(s) links made clickable (nothing else becomes a link). */
export function LinkedText({ text, className = 'small pre' }: { text: string; className?: string }) {
  return (
    <p className={className}>
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
