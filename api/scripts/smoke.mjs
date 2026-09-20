// Live smoke test: BASE env var (default: deployed API).
// `/results` endpoints land later; tolerate 404 there for now.
const BASE = (process.env.BASE ?? 'https://5kp0hzndc2.execute-api.us-east-1.amazonaws.com').replace(/\/$/, '')

let failures = 0
async function check(name, path, want) {
  const res = await fetch(`${BASE}${path}`)
  const ok = want.includes(res.status)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}: ${res.status}`)
  if (!ok) failures++
}

await check('health', '/health', [200])
await check('results list (tolerate 404 pre-step-4)', '/results', [200, 404])
process.exit(failures === 0 ? 0 : 1)
