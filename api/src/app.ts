import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true, service: 'saral-api' }))

// TODO (phase 2): implement document explain via Amazon Bedrock.
app.post('/explain', (c) => c.json({ error: 'not implemented yet' }, 501))

export default app
