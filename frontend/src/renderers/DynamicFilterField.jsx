import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import api from '@/services/api'
import { normalizeOptions, resolveDependencies, setUrlQueryParam } from '@/utils/urlQuery'
import {
  Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  DatePicker,
} from '@/components/ui'
import { cn } from '@/lib/utils'

function flagOn(v) {
  return v === 1 || v === true
}

function useOptions(field, formData) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!field?.columnObject) return
    if (!['dropdown', 'select', 'selects', 'autocomplete', 'autocompletes'].includes(field.columnType)) return
    let cancelled = false
    setLoading(true)
    const url = resolveDependencies(field.columnObject, formData)
    api.get(url)
      .then((r) => { if (!cancelled) setOptions(normalizeOptions(r.data)) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field?.columnObject])
  return { options, loading }
}

export default function DynamicFilterField({ field, value, onChange, formData }) {
  const disabled = flagOn(field.isDisable)
  const placeholder = field.columnTooltip || field.columnLabel || ''
  const { options } = useOptions(field, formData)

  switch (field.columnType) {
    case 'input':
    case 'text':
      return (
        <Input
          value={value ?? ''} placeholder={placeholder} disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength ? Number(field.maxLength) : undefined}
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''} placeholder={placeholder} disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      )

    case 'textarea':
      return (
        <Textarea
          rows={3}
          value={value ?? ''} placeholder={placeholder} disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'dropdown':
    case 'select':
      return (
        <Select
          value={value != null && value !== '' ? String(value) : undefined}
          disabled={disabled}
          onValueChange={(v) => onChange(v === '__clear__' ? null : (field.data_type === 'int' ? Number(v) : v))}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder || '— Chọn —'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__"><span className="text-muted-foreground italic">— Tất cả —</span></SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'autocomplete':
      return <AutocompleteField field={field} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} formData={formData} />

    case 'datepicker':
      return (
        <DatePicker
          value={value}
          onChange={(iso) => onChange(iso)}
          disabled={disabled}
          placeholder={placeholder || 'Chọn ngày'}
        />
      )

    case 'datetime':
    case 'datefulltime':
      // Datetime với giờ phút: tạm dùng native input. Phase sau làm DateTimePicker.
      return (
        <Input
          type="datetime-local"
          value={value ?? ''} disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
        />
      )

    case 'checkbox':
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            checked={!!value} disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.columnLabel}
        </label>
      )

    default:
      return (
        <Input
          value={value ?? ''} placeholder={`[${field.columnType}] ${placeholder}`}
          disabled readOnly
        />
      )
  }
}

function AutocompleteField({ field, value, onChange, disabled, placeholder, formData }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [selectedLabel, setSelectedLabel] = useState('')

  useEffect(() => {
    if (!field?.columnObject) return
    let cancelled = false
    const url = setUrlQueryParam(resolveDependencies(field.columnObject, formData), 'filter', query)
    api.get(url)
      .then((r) => { if (!cancelled) setOptions(normalizeOptions(r.data)) })
      .catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, field?.columnObject])

  useEffect(() => {
    if (value == null || value === '') { setSelectedLabel(''); return }
    const found = options.find((o) => String(o.value) === String(value))
    if (found) setSelectedLabel(found.label)
  }, [value, options])

  return (
    <div className="relative">
      <Input
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        className={cn(value && 'pr-8')}
      />
      {open && options.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-auto z-20 py-1">
          {options.map((o) => (
            <li
              key={o.value}
              className="px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              onMouseDown={() => { onChange(o.value); setSelectedLabel(o.label); setQuery(''); setOpen(false) }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {value && !disabled && (
        <button
          type="button"
          onClick={() => { onChange(null); setSelectedLabel(''); setQuery('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Xóa"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
