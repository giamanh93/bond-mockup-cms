import { useMemo } from 'react'
import {
  Button, Card,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext, PaginationEllipsis,
} from '@/components/ui'
import { paginationRange } from '@/lib/pagination-range'
import { cn } from '@/lib/utils'

function fmtNumber(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return new Intl.NumberFormat('vi-VN').format(n)
}

function parseBadge(columnObject) {
  if (!columnObject || typeof columnObject !== 'string') return null
  try {
    const arr = JSON.parse(columnObject)
    if (!Array.isArray(arr)) return null
    const map = {}
    for (const it of arr) if (it?.label) map[it.label] = it
    return map
  } catch { return null }
}

function StatusBadge({ value, columnObject }) {
  const badgeMap = useMemo(() => parseBadge(columnObject), [columnObject])
  const meta = badgeMap?.[value]
  if (!meta) return <span className="text-muted-foreground">{value ?? ''}</span>
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', meta.badge, meta.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {value}
    </span>
  )
}

function Cell({ row, col }) {
  const v = row[col.columnField]
  const fieldType = col.fieldType || 'text'

  if (col.isStatusLable) {
    return <StatusBadge value={v} columnObject={col.columnObject} />
  }

  switch (fieldType) {
    case 'number':
      return <span className="tabular-nums">{fmtNumber(v)}</span>
    case 'date':
    case 'datetime':
      return <span>{v ?? ''}</span>
    case 'html':
      return <span dangerouslySetInnerHTML={{ __html: v ?? '' }} />
    case 'checkbox':
    case 'boolean':
      return <input type="checkbox" checked={!!v} readOnly className="h-4 w-4 cursor-not-allowed accent-primary" />
    case 'image':
      return v ? <img src={v} alt="" className="h-8 w-8 object-cover rounded" /> : null
    default:
      return <span>{v ?? ''}</span>
  }
}

function cellAlignClass(col) {
  const c = String(col.cellClass || '')
  if (c.includes('justify-content-end')) return 'text-right'
  if (c.includes('justify-content-center') || col.isStatusLable) return 'text-center'
  return 'text-left'
}

export default function DynamicTable({ columns = [], data = [], loading = false, pagination, onPageChange, onPageSizeChange, onRowClick, rowActions = null }) {
  const visibleCols = useMemo(
    () => [...columns].filter((c) => !c.isHide).sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0)),
    [columns]
  )

  const totalPages = pagination?.totalPages ?? 1
  const currentPage = (pagination?.page ?? 0) + 1
  const colCount = visibleCols.length + (rowActions ? 1 : 0)

  return (
    <Card className="flex flex-col h-full min-h-0 overflow-hidden">
      <Table
        wrapperClassName="flex-1 min-h-0"
        className="min-w-max"
        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <TableHeader className="sticky top-0 z-10 bg-background [&_tr]:border-0 [&_th]:border-b">
          <TableRow className="hover:bg-transparent">
            {visibleCols.map((col) => (
              <TableHead
                key={col.columnField}
                style={{ width: col.columnWidth, minWidth: col.columnWidth }}
                className={cn('whitespace-nowrap bg-background', cellAlignClass(col))}
              >
                {col.columnCaption}
              </TableHead>
            ))}
            {rowActions && (
              <TableHead
                style={{ width: 100, minWidth: 100 }}
                className="sticky right-0 bg-background text-center"
              >
                Hành động
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center py-10 text-muted-foreground">
                Đang tải...
              </TableCell>
            </TableRow>
          )}
          {!loading && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={colCount} className="text-center py-10 text-muted-foreground">
                Không có dữ liệu
              </TableCell>
            </TableRow>
          )}
          {!loading && data.map((row) => (
            <TableRow
              key={row.id ?? row.oid ?? row.Oid}
              className="cursor-pointer"
              onClick={() => onRowClick?.(row)}
            >
              {visibleCols.map((col) => (
                <TableCell
                  key={col.columnField}
                  style={{ width: col.columnWidth, minWidth: col.columnWidth }}
                  className={cn('whitespace-nowrap', cellAlignClass(col))}
                >
                  <Cell row={row} col={col} />
                </TableCell>
              ))}
              {rowActions && (
                <TableCell
                  style={{ width: 100, minWidth: 100 }}
                  className="p-1.5 text-center sticky right-0 bg-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    {rowActions(row).map((act, idx) => (
                      <Button
                        key={idx}
                        size="icon"
                        variant="ghost"
                        title={act.label}
                        disabled={act.disabled}
                        onClick={() => act.onClick(row)}
                        className={cn(
                          'h-7 w-7',
                          act.variant === 'danger' && 'text-destructive hover:bg-destructive/10 hover:text-destructive',
                          act.variant === 'primary' && 'text-primary hover:bg-primary/10',
                        )}
                      >
                        {act.icon}
                      </Button>
                    ))}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pagination && (
        <div className="flex items-center justify-between gap-4 px-4 py-2 border-t text-sm shrink-0">
          <div className="text-muted-foreground shrink-0">
            Tổng <span className="font-medium text-foreground">{pagination.total ?? 0}</span> bản ghi
          </div>
          <Pagination className="mx-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage <= 1}
                />
              </PaginationItem>
              {paginationRange(totalPages, currentPage).map((p, idx) => (
                <PaginationItem key={`${p}-${idx}`}>
                  {p === 'ellipsis' ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      isActive={p === currentPage}
                      onClick={() => onPageChange?.(p)}
                    >
                      {p}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
          >
            {[10, 15, 25, 50].map((n) => <option key={n} value={n}>{n}/trang</option>)}
          </select>
        </div>
      )}
    </Card>
  )
}
