import { useEffect, useRef, useState } from 'react'
import { dayLabel } from '../domain/playback'
import type { Route } from '../domain/route'
import { tripDays } from '../domain/timelapse'

const MS_PER_DAY = 700

/** Bottom bar: step or play through the trip days. Reports t (day index + progress), or null when idle. */
export function Timelapse({ route, onChange }: { route: Route; onChange: (t: number | null) => void }) {
  const last = tripDays(route).length - 1
  const [t, setT] = useState(0)
  const [active, setActive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const frame = useRef<number | null>(null)

  const show = (next: number) => {
    setT(next)
    setActive(true)
    onChange(next)
  }
  const goto = (day: number) => {
    setPlaying(false)
    show(Math.min(last, Math.max(0, day)) + 0.5)
  }

  useEffect(() => {
    if (!playing) return
    let prev = performance.now()
    let current = t >= last ? 0 : Math.floor(t)
    const tick = (now: number) => {
      current += (now - prev) / MS_PER_DAY
      prev = now
      if (current >= last + 0.99) {
        show(last + 0.5)
        setPlaying(false)
        return
      }
      show(current)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  const day = Math.floor(t)
  return (
    <div className="timelapse">
      <button className="icon" aria-label="Previous day" onClick={() => goto(day - 1)} disabled={day === 0}>◀</button>
      <button className="icon play" aria-label={playing ? 'Pause' : 'Play'} onClick={() => (playing ? goto(day) : setPlaying(true))}>
        {playing ? '❚❚' : '▶'}
      </button>
      <button className="icon" aria-label="Next day" onClick={() => goto(day + 1)} disabled={day === last}>▶|</button>
      <input type="range" aria-label="Day" min={0} max={last} step={1} value={day} onChange={e => goto(Number(e.target.value))} />
      <span className="timelapse-label">{dayLabel(route, day)}</span>
      {active && !playing && (
        <button className="link" aria-label="Hide timelapse marker" onClick={() => { setActive(false); onChange(null) }}>✕</button>
      )}
    </div>
  )
}
