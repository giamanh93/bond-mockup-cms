import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOverlay } from './overlay-utils'

export function Dialog({ open, onOpenChange, children }) {
  useOverlay(open, () => onOpenChange?.(false))
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-lg gap-4 border bg-background p-6 shadow-lg rounded-lg animate-zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}

export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4', className)}
      {...props}
    />
  )
}

export function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
}

export function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogContent({ className, ...props }) {
  return <div className={cn('space-y-3', className)} {...props} />
}
