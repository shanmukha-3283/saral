import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { explainDocument, type Language } from './explain'

const app = new Hono()

app.use('*', cors())

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const healthHandler = (c: Context) =>
  c.json({ ok: true, service: 'saral-api' })

const explainHandler = async (c: Context) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'request body must be JSON' }, 400)
  }
  const { imageBase64, language } = (body ?? {}) as {
    imageBase64?: unknown
    language?: unknown
  }
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return c.json({ error: 'imageBase64 (PNG/JPEG/PDF) is required' }, 400)
  }
  if (
    language !== 'te' &&
    language !== 'hi' &&
    language !== 'en' &&
    language !== 'mr' &&
    language !== 'ta'
  ) {
    return c.json({ error: "language must be one of 'te', 'hi', 'en', 'mr', 'ta'" }, 400)
  }
  let bytes: Buffer
  try {
    bytes = Buffer.from(imageBase64, 'base64')
  } catch {
    return c.json({ error: 'imageBase64 is not valid base64' }, 400)
  }
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    return c.json({ error: 'decoded image must be 1 byte – 5 MB' }, 400)
  }
  try {
    return c.json(await explainDocument(bytes, language as Language))
  } catch (err) {
    console.error('explain failed:', err)
    const msg = err instanceof Error ? err.message : 'explain failed'
    if (/unsupported image|required keys|JSON|gemini/i.test(msg)) {
      return c.json({ error: msg }, 502)
    }
    return c.json({ error: 'explain failed' }, 500)
  }
}

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)
app.post('/explain', explainHandler)
app.post('/api/explain', explainHandler)

export default app
