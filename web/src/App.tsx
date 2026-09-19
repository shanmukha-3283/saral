import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import FilePicker from '@/components/FilePicker'
import LanguagePicker from '@/components/LanguagePicker'
import ResultView from '@/components/ResultView'
import {
  MAX_FILE_BYTES,
  explainDocument,
  fileToBase64,
  friendlyError,
  isAcceptedFile,
  type ExplainResult,
  type Language,
} from '@/lib/explain'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [language, setLanguage] = useState<Language>('te')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ExplainResult | null>(null)
  const [error, setError] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => () => abortRef.current?.abort(), [])

  const pickFile = (picked: File) => {
    if (!isAcceptedFile(picked)) {
      toast.error('Please choose a PNG, JPEG, or PDF file.')
      return
    }
    if (picked.size > MAX_FILE_BYTES) {
      toast.error('File is too large. Maximum 5 MB.')
      return
    }
    setFile(picked)
  }

  const run = async (targetLang: Language) => {
    if (!file) {
      toast.error('Choose a document first.')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError('')
    try {
      const imageBase64 = await fileToBase64(file)
      const explained = await explainDocument(
        imageBase64,
        targetLang,
        controller.signal,
      )
      setResult(explained)
      setLanguage(targetLang)
      setStatus('success')
    } catch (err) {
      if (controller.signal.aborted) return
      setError(friendlyError(err))
      setStatus('error')
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setFile(null)
    setResult(null)
    setError('')
    setStatus('idle')
  }

  const loading = status === 'loading'
  const showForm = status !== 'success'

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 bg-background px-4 py-8 text-foreground">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Saral</h1>
        <p className="mt-1 text-muted-foreground">
          Official documents, explained in Telugu, Hindi, or English.
        </p>
      </header>

      {showForm && (
        <>
          <FilePicker
            file={file}
            previewUrl={previewUrl}
            onSelect={pickFile}
            onClear={() => setFile(null)}
            disabled={loading}
          />
          <LanguagePicker
            value={language}
            onChange={setLanguage}
            disabled={loading}
          />
          <Button
            type="button"
            size="lg"
            className="min-h-12 w-full text-base"
            disabled={!file || loading}
            onClick={() => run(language)}
          >
            {loading && (
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
            )}
            {loading ? 'Reading your document…' : 'Explain my document'}
          </Button>
        </>
      )}

      {loading && (
        <div className="space-y-4" aria-live="polite" aria-label="Loading">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          <AlertTitle>Couldn't explain this document</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => run(language)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={reset}
            >
              Start over
            </Button>
          </div>
        </Alert>
      )}

      {status === 'success' && result && (
        <>
          <ResultView result={result} />
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">
              Explain the same document in another language
            </p>
            <LanguagePicker
              value={language}
              onChange={setLanguage}
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => run(language)}
            >
              {loading && (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Explain again
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={loading}
              onClick={reset}
            >
              Start over with a new document
            </Button>
          </div>
        </>
      )}

      <Toaster position="top-center" richColors={false} />
    </main>
  )
}
