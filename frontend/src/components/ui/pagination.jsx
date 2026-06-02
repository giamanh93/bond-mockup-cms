import { forwardRef } from 'react'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { buttonVariants } from './button'
import { cn } from '@/lib/utils'

function Pagination({ className, ...props }) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

const PaginationContent = forwardRef(function PaginationContent({ className, ...props }, ref) {
  return <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
})

const PaginationItem = forwardRef(function PaginationItem({ className, ...props }, ref) {
  return <li ref={ref} className={cn('', className)} {...props} />
})

const PaginationLink = forwardRef(function PaginationLink(
  { className, isActive, size = 'icon', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }),
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
})

function PaginationPrevious({ className, ...props }) {
  return (
    <PaginationLink
      aria-label="Trang trước"
      size="default"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Trước</span>
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }) {
  return (
    <PaginationLink
      aria-label="Trang sau"
      size="default"
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:inline">Sau</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }) {
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">Trang khác</span>
    </span>
  )
}

export {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
}
