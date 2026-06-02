import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useOverlay } from './overlay-utils'
import { buttonVariants } from './button'

export function AlertDialog({ open, onOpenChange, children }) {
  useOverlay(open, () => onOpenChange?.(false))
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-md gap-4 border bg-background p-6 shadow-lg rounded-lg animate-zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function AlertDialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
}

export function AlertDialogFooter({ className, ...props }) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4', className)} {...props} />
  )
}

export function AlertDialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />
}

export function AlertDialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function AlertDialogAction({ className, variant = 'default', ...props }) {
  return <button type="button" className={cn(buttonVariants({ variant }), className)} {...props} />
}

export function AlertDialogCancel({ className, ...props }) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
      {...props}
    />
  )
}
