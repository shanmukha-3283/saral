import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb'
import { createHash, randomUUID } from 'node:crypto'

export type Language = 'te' | 'hi' | 'en' | 'mr' | 'ta'

export interface ExplainAction {
  step: string
  deadline: string | null
}

export interface ExplainResult {
  id: string
  createdAt: string
  language: Language
  summary: string
  what_it_means: string
  actions: ExplainAction[]
  draft_reply: string
  modelId: string
  cached: boolean
}

const LANGUAGE_NAMES: Record<Language, string> = {
  te: 'Telugu (తెలుగు)',
  hi: 'Hindi (हिन्दी)',
  en: 'English',
  mr: 'Marathi (मराठी)',
  ta: 'Tamil (தமிழ்)',
}

const region = process.env.AWS_REGION ?? 'us-east-1'
// Comma-separated failover list: first healthy model wins.
const DEFAULT_MODELS =
  'gemini-3.7-flash,gemini-3.6-flash,gemini-3.8-flash'
const modelIds = (process.env.GEMINI_MODEL ?? DEFAULT_MODELS)
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
const tableName = process.env.RESULTS_TABLE ?? 'saral-results'
const cacheTable = process.env.CACHE_TABLE ?? 'saral-cache'
const ATTEMPT_TIMEOUT_MS = 20_000
const FAILOVER_PAUSE_MS = 3_000
// Stay ahead of the API Gateway ~30s integration ceiling.
const FAILOVER_BUDGET_MS = 22_000

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))

// Strict JSON schema for the Gemini response — guarantees the saral contract.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: {
      type: 'STRING',
      description:
        '2-4 sentence plain-language summary of what the document says',
    },
    what_it_means: {
      type: 'STRING',
      description:
        '1-3 sentences on what the document means for the reader in practical terms',
    },
    actions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          step: { type: 'STRING', description: 'one concrete next step' },
          deadline: {
            type: 'STRING',
            description:
              'deadline as stated in the document, or empty string when the document states none',
          },
        },
        required: ['step'],
      },
    },
    draft_reply: {
      type: 'STRING',
      description:
        'a short polite draft reply or application the reader could send, in the same language',
    },
  },
  required: ['summary', 'what_it_means', 'actions', 'draft_reply'],
} as const

export function detectFileType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'application/pdf' {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  )
    return 'application/pdf' // %PDF-
  throw new Error('unsupported file type (use PNG, JPEG, or PDF)')
}

function buildSystemPrompt(): string {
  return [
    'You are Saral, a helper that explains official documents in plain language.',
    'Rules: use simple words; never invent dates, names, or reference numbers;',
    'for the deadline field use an empty string when the document does not state one.',
  ].join(' ')
}

function buildUserText(language: Language): string {
  const lang = LANGUAGE_NAMES[language]
  return [
    'The user uploaded an official document (a photo or a PDF).',
    `Respond in ${lang}. The draft_reply must also be in ${lang}.`,
  ].join(' ')
}

export function coerceActions(value: unknown): ExplainAction[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>
      const deadline =
        typeof o.deadline === 'string' && o.deadline.length > 0
          ? o.deadline
          : null
      return { step: String(o.step ?? ''), deadline }
    })
    .filter((a) => a.step.length > 0)
}

export function parseExplain(
  text: string,
): Omit<ExplainResult, 'id' | 'createdAt' | 'language' | 'modelId' | 'cached'> {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
  const obj = JSON.parse(cleaned) as Record<string, unknown>
  if (
    typeof obj.summary !== 'string' ||
    typeof obj.what_it_means !== 'string' ||
    typeof obj.draft_reply !== 'string'
  ) {
    throw new Error('model response missing required keys')
  }
  return {
    summary: obj.summary,
    what_it_means: obj.what_it_means,
    actions: coerceActions(obj.actions),
    draft_reply: obj.draft_reply,
  }
}

interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

async function generate(
  model: string,
  imageB64: string,
  mime: string,
  userText: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mime, data: imageB64 } },
            { text: userText },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: RESPONSE_SCHEMA,
        max_output_tokens: 2000,
        temperature: 0.2,
      },
    }),
    signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
  })
  if (!res.ok) {
    const errBody = (await res.text()).slice(0, 300)
    throw new Error(`gemini request failed (${res.status}): ${errBody}`)
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: GeminiPart[] } }[]
  }
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const text = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('gemini returned no text')
  return text
}

export function docHashFor(imageB64: string, language: Language): string {
  return createHash('sha256').update(`${language}:${imageB64}`).digest('hex')
}

async function getCached(
  docHash: string,
): Promise<ExplainResult | null> {
  try {
    const out = await ddb.send(
      new GetCommand({ TableName: cacheTable, Key: { docHash } }),
    )
    const item = out.Item as ExplainResult | undefined
    if (!item?.summary) return null
    return { ...item, cached: true }
  } catch {
    return null // cache is best-effort; a miss here just means "call the model"
  }
}

async function putCached(result: ExplainResult, docHash: string) {
  try {
    await ddb.send(
      new PutCommand({
        TableName: cacheTable,
        Item: {
          ...result,
          docHash,
          expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
        },
      }),
    )
  } catch (err) {
    console.error('cache write failed (non-fatal):', err)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function attemptModel(
  model: string,
  imageB64: string,
  mime: string,
  userText: string,
): Promise<{
  parsed: ReturnType<typeof parseExplain>
  model: string
}> {
  try {
    return {
      parsed: parseExplain(await generate(model, imageB64, mime, userText)),
      model,
    }
  } catch (err) {
    // A malformed-JSON answer may succeed with a stricter instruction.
    if (err instanceof SyntaxError || /missing required keys/i.test(String(err))) {
      return {
        parsed: parseExplain(
          await generate(
            model,
            imageB64,
            mime,
            `${userText} Reply with ONLY the JSON object, no other text.`,
          ),
        ),
        model,
      }
    }
    throw err
  }
}

export async function explainDocument(
  imageBytes: Uint8Array,
  language: Language,
): Promise<ExplainResult> {
  const mime = detectFileType(imageBytes)
  const imageB64 = Buffer.from(imageBytes).toString('base64')
  const userText = buildUserText(language)

  const cached = await getCached(docHashFor(imageB64, language))
  if (cached) return cached

  // Failover across models (first healthy one wins), one extra pass after a
  // short pause — bounded so a hung call can't outlive the API Gateway
  // ~30s integration ceiling.
  const deadline = Date.now() + FAILOVER_BUDGET_MS
  const failures: string[] = []
  for (let round = 0; round < 2; round++) {
    for (const model of modelIds) {
      try {
        const { parsed, model: used } = await attemptModel(
          model,
          imageB64,
          mime,
          userText,
        )
        const result: ExplainResult = {
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          language,
          ...parsed,
          modelId: used,
          cached: false,
        }
        await putCached(result, docHashFor(imageB64, language))
        await ddb.send(
          new PutCommand({ TableName: tableName, Item: result }),
        )
        return result
      } catch (err) {
        failures.push(`${model}: ${err instanceof Error ? err.message : err}`)
        console.error(`explain attempt failed on ${model}:`, err)
      }
    }
    if (Date.now() > deadline) break
    await sleep(FAILOVER_PAUSE_MS)
  }
  throw new Error(
    `gemini request failed on all models: ${failures.at(-1) ?? 'unknown error'}`,
  )
}
