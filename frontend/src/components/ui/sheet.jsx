import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOverlay } from './overlay-utils'

const sideClasses = {
  right: 'inset-y-0 right-0 h-full w-3/4 animate-slide-in-right border-l',
  left:  'inset-y-0 left-0  h-full w-3/4 border-r',
  top:   'inset-x-0 top-0   border-b',
  bottom:'inset-x-0 bottom-0 border-t',
}

export function Sheet({ open, onOpenChange, side = 'right', children, className }) {
  useOverlay(open, () => onOpenChange?.(false))
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed z-50 bg-background shadow-lg flex flex-col',
          sideClasses[side],
          className,
        )}
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

export function SheetHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 px-6 py-4 border-b shrink-0', className)}
      {...props}
    />
  )
}

export function SheetFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 px-6 py-3 border-t shrink-0 bg-background',
        className,
      )}
      {...props}
    />
  )
}

export function SheetTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold text-foreground', className)} {...props} />
}

export function SheetDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function SheetBody({ className, ...props }) {
  return <div className={cn('flex-1 overflow-y-auto p-6', className)} {...props} />
}
