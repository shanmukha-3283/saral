import { History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LANGUAGES, type ExplainResult } from '@/lib/explain'

function dateLabel(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

interface HistoryListProps {
  items: ExplainResult[]
  onSelect: (id: string) => void
}

export default function HistoryList({ items, onSelect }: HistoryListProps) {
  if (items.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" aria-hidden />
          Previous explanations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((item) => {
            const lang =
              LANGUAGES.find((l) => l.value === item.language)?.label ??
              item.language
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex w-full flex-col gap-1 py-3 text-left first:pt-0 last:pb-0"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">{lang}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {dateLabel(item.createdAt)}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-sm leading-relaxed">
                    {item.summary}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
