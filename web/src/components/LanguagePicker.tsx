import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { LANGUAGES, type Language } from '@/lib/explain'
import { cn } from '@/lib/utils'

interface LanguagePickerProps {
  value: Language
  onChange: (lang: Language) => void
  disabled: boolean
}

export default function LanguagePicker({
  value,
  onChange,
  disabled,
}: LanguagePickerProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as Language)}
      disabled={disabled}
      className="grid grid-cols-3 gap-2"
      aria-label="Explanation language"
    >
      {LANGUAGES.map((lang) => (
        <div key={lang.value}>
          <RadioGroupItem
            value={lang.value}
            id={`lang-${lang.value}`}
            className="peer sr-only"
          />
          <Label
            htmlFor={`lang-${lang.value}`}
            className={cn(
              'flex min-h-14 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-base font-medium',
              'transition-colors hover:bg-muted/50',
              'peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {lang.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}
