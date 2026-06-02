import { useEffect, useRef } from 'react'

/**
 * Trap body scroll + close on Esc khi overlay open.
 * Bỏ qua hover/focus trap (Phase 4 mới làm full a11y).
 */
export function useOverlay(open, onClose) {
  const mounted = useRef(false)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    mounted.current = true
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
}
