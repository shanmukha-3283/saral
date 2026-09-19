import { useRef } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatFileSize } from '@/lib/explain'
import { cn } from '@/lib/utils'

interface FilePickerProps {
  file: File | null
  previewUrl: string | null
  onSelect: (file: File) => void
  onClear: () => void
  disabled: boolean
}

export default function FilePicker({
  file,
  previewUrl,
  onSelect,
  onClear,
  disabled,
}: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isImage = file?.type.startsWith('image/') ?? false

  return (
    <Card>
      <CardContent className="pt-6">
        <Input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
          disabled={disabled}
          onChange={(e) => {
            const picked = e.target.files?.[0]
            if (picked) onSelect(picked)
            e.target.value = ''
          }}
        />
        {!file ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-input px-4 py-10 text-center',
              'transition-colors hover:border-primary/50 hover:bg-muted/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
            <span className="text-base font-medium">
              Tap to upload your document
            </span>
            <span className="text-sm text-muted-foreground">
              Photo (PNG/JPEG) or PDF, up to 5 MB
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded document preview"
                className="h-16 w-16 rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
                <FileText className="h-7 w-7 text-muted-foreground" aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <Badge variant="secondary" className="mt-1">
                {formatFileSize(file.size)}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={onClear}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Change
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
