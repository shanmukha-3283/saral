// Typed client for POST /api/explain (dev: Vite proxy, prod: CloudFront /api/*).

export type Language = 'te' | 'hi' | 'en'

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
}

export const LANGUAGES: { value: Language; label: string; speech: string }[] = [
  { value: 'te', label: 'తెలుగు', speech: 'te-IN' },
  { value: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
  { value: 'en', label: 'English', speech: 'en-IN' },
]

export const MAX_FILE_BYTES = 5 * 1024 * 1024

const ACCEPTED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'application/pdf',
])

const ACCEPTED_EXTS = ['.png', '.jpg', '.jpeg', '.pdf']

export function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTS.some((ext) => name.endsWith(ext))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export class ExplainError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function explainDocument(
  imageBase64: string,
  language: Language,
  signal?: AbortSignal,
): Promise<ExplainResult> {
  const base = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
  const url = base ? `${base}/explain` : '/api/explain'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, language }),
    signal,
  })
  const data = (await res.json().catch(() => ({}))) as {
    error?: unknown
  } & Partial<ExplainResult>
  if (!res.ok) {
    throw new ExplainError(
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`,
      res.status,
    )
  }
  return data as ExplainResult
}

export function friendlyError(err: unknown): string {
  if (err instanceof ExplainError) {
    if (err.status === 502)
      return 'The AI service is busy right now. Please try again in a minute.'
    return err.message
  }
  if (err instanceof DOMException && err.name === 'AbortError')
    return 'Request cancelled.'
  if (err instanceof TypeError)
    return 'Cannot reach the server. Check your connection and try again.'
  return 'Something went wrong. Please try again.'
}
