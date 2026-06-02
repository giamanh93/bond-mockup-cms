import { forwardRef, useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import { cn } from '@/lib/utils'

function toDate(v) {
  if (!v) return undefined
  if (v instanceof Date) return isValid(v) ? v : undefined
  const parsed = typeof v === 'string' ? (v.length === 10 ? parseISO(v) : new Date(v)) : new Date(v)
  return isValid(parsed) ? parsed : undefined
}

function toIsoDate(date) {
  if (!date || !isValid(date)) return null
  return format(date, 'yyyy-MM-dd')
}

/**
 * shadcn-style DatePicker — Popover + Calendar + Button.
 * value: ISO string ('yyyy-MM-dd') | Date | null/undefined
 * onChange(isoString | null): trả ra ISO 'yyyy-MM-dd' khi chọn, null khi clear
 */
export const DatePicker = forwardRef(function DatePicker(
  { value, onChange, placeholder = 'Chọn ngày', disabled, className, displayFormat = 'dd/MM/yyyy', clearable = true },
  ref,
) {
  const [open, setOpen] = useState(false)
  const selected = toDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-9',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
          <span className="flex-1">
            {selected ? format(selected, displayFormat, { locale: vi }) : placeholder}
          </span>
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange?.(null) }}
              className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Xóa ngày"
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => { onChange?.(toIsoDate(d)); setOpen(false) }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
})
