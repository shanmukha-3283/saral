import { useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarClock,
  Copy,
  Info,
  ListTodo,
  MailOpen,
  Square,
  Volume2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LANGUAGES, type ExplainResult } from '@/lib/explain'

function speak(text: string, lang: string): boolean {
  if (!('speechSynthesis' in window)) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  const voice = synth
    .getVoices()
    .find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2)))
  if (voice) utter.voice = voice
  synth.speak(utter)
  return true
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

interface SpeakButtonProps {
  text: string
  speechLang: string
  label: string
}

function SpeakButton({ text, speechLang, label }: SpeakButtonProps) {
  const [speaking, setSpeaking] = useState(false)
  if (!('speechSynthesis' in window)) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label={speaking ? `Stop reading ${label}` : `Read ${label} aloud`}
      onClick={() => {
        if (speaking) {
          stopSpeaking()
          setSpeaking(false)
        } else if (speak(text, speechLang)) {
          setSpeaking(true)
          window.setTimeout(() => setSpeaking(false), 60_000)
        } else {
          toast.error('Read-aloud is not available in this browser.')
        }
      }}
    >
      {speaking ? (
        <Square className="h-4 w-4" aria-hidden />
      ) : (
        <Volume2 className="h-4 w-4" aria-hidden />
      )}
    </Button>
  )
}

export default function ResultView({ result }: { result: ExplainResult }) {
  const speechLang =
    LANGUAGES.find((l) => l.value === result.language)?.speech ?? 'en-IN'

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(result.draft_reply)
      toast.success('Draft reply copied.')
    } catch {
      toast.error('Could not copy. Long-press the text to copy it.')
    }
  }

  return (
    <div className="space-y-4" aria-live="polite">
      {result.cached && (
        <Badge variant="secondary" className="w-fit">
          Served instantly from saved result
        </Badge>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Summary</CardTitle>
          <SpeakButton
            text={result.summary}
            speechLang={speechLang}
            label="summary"
          />
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" aria-hidden />
        <AlertTitle className="flex items-center justify-between">
          What it means for you
          <SpeakButton
            text={result.what_it_means}
            speechLang={speechLang}
            label="what it means"
          />
        </AlertTitle>
        <AlertDescription className="text-base">
          {result.what_it_means}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" aria-hidden />
            What to do next
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No specific actions mentioned.
            </p>
          ) : (
            <ol className="divide-y">
              {result.actions.map((action, i) => (
                <li key={i} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <p className="text-base leading-relaxed">{action.step}</p>
                  {action.deadline ? (
                    <Badge variant="secondary" className="w-fit">
                      <CalendarClock
                        className="mr-1 h-3 w-3"
                        aria-hidden
                      />
                      {action.deadline}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="w-fit">
                      No deadline
                    </Badge>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MailOpen className="h-5 w-5" aria-hidden />
            Draft reply
          </CardTitle>
          <div className="flex items-center">
            <SpeakButton
              text={result.draft_reply}
              speechLang={speechLang}
              label="draft reply"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={copyDraft}
              aria-label="Copy draft reply"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-base leading-relaxed">
            {result.draft_reply}
          </p>
          <Separator className="my-3" />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={copyDraft}
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden />
            Copy draft reply
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
