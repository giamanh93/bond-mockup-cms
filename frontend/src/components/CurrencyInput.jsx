import { useState } from 'react'

function formatDisplay(val) {
  if (!val) return ''
  return Number(val).toLocaleString('vi-VN')
}

function toHint(val) {
  const n = Number(val)
  if (!n) return ''
  if (n >= 1_000_000_000) return `≈ ${(n / 1_000_000_000).toFixed(1)} tỷ`
  if (n >= 1_000_000) return `≈ ${(n / 1_000_000).toFixed(0)} triệu`
  return ''
}

export default function CurrencyInput({ value, onChange, placeholder = '0', className = '', ...props }) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="relative">
      <input
        type="text"
        className={`input ${className}`}
        value={focused ? value || '' : formatDisplay(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        inputMode="numeric"
        {...props}
      />
      {toHint(value) && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          {toHint(value)}
        </span>
      )}
    </div>
  )
}
