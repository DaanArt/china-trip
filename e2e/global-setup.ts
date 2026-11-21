// The e2e tests run against the live Supabase project. Once the trip holds real
// stops, running them would shift real dates while they run, so refuse unless
// explicitly allowed. (Long term: point e2e at a separate test project.)
import { db, PREFIX } from './helpers'

export default async function globalSetup() {
  if (process.env.E2E_ALLOW_LIVE === '1') return
  const client = await db()
  const { data, error } = await client.from('stops').select('name')
  if (error) throw new Error(`e2e guard could not read stops: ${error.message}`)
  const real = (data ?? []).filter(s => !s.name.startsWith(PREFIX))
  if (real.length) {
    throw new Error(
      `Refusing to run e2e: the live trip has ${real.length} real stop(s). ` +
        'The tests would temporarily change real dates. Use a separate test project, or set E2E_ALLOW_LIVE=1 if you accept that.',
    )
  }
}
