import { useState, type FormEvent } from 'react'
import { useTrip } from '../data/TripDataProvider'

export function NamePrompt() {
  const { actions } = useTrip()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await actions!.saveMyName(name.trim())
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <h1>Welcome</h1>
        <label>
          What should we call you?
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </label>
        <button type="submit" disabled={!name.trim()}>Continue</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </main>
  )
}
