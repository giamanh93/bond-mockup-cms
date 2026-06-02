import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, Filter, Loader2, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { bondService } from '@/services/bond.service'
import { extractAxiosMessage, isOk, pickData, pickMessage } from '@/utils/envelope'
import { useConfirm } from '@/components/ConfirmDialog'
import DynamicTable from '@/renderers/DynamicTable'
import DynamicForm from '@/renderers/DynamicForm'
import {
  Button, Input, Badge,
  Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  Sheet, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter,
} from '@/components/ui'

const SPECIAL_FIELDS = ['issuerId', 'bondTypeId']

function flatSpecialValues(schema) {
  const out = {}
  for (const g of schema?.group_fields || []) for (const f of g.fields || []) {
    if (SPECIAL_FIELDS.includes(f.field_name)) out[f.field_name] = f.columnValue
  }
  return out
}

export default function BondList() {
  const confirm = useConfirm()

  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ page: 0, pageSize: 15, total: 0, totalPages: 1 })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterValues, setFilterValues] = useState({})
  const [errorMsg, setErrorMsg] = useState('')

  const [filterSchema, setFilterSchema] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  // ── Drawer state for Add/Detail ──
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('add')
  const [formSchema, setFormSchema] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const lastSpecialRef = useRef({})

  const loadPage = useCallback(async (overrides = {}) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const params = {
        filter: searchQuery || '',
        offSet: (overrides.page ?? pagination.page) * (overrides.pageSize ?? pagination.pageSize),
        pageSize: overrides.pageSize ?? pagination.pageSize,
        ...(overrides.filterValues ?? filterValues),
      }
      const res = await bondService.getBondPage(params)
      if (!isOk(res)) {
        setErrorMsg(pickMessage(res, 'Không tải được danh sách'))
        return
      }
      const d = pickData(res) || {}
      const cols = d.gridflexs ?? d.configs
      if (Array.isArray(cols) && cols.length > 0) setColumns(cols)
      const list = d.dataList ?? d.data ?? []
      const total = d.recordsTotal ?? list.length
      const pageSize = overrides.pageSize ?? pagination.pageSize
      setRows(list.map((r, i) => ({ ...r, id: r.Oid ?? r.oid ?? r.Id ?? `r-${i}` })))
      setPagination((p) => ({
        page: overrides.page ?? p.page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      }))
    } catch (err) {
      setErrorMsg(extractAxiosMessage(err))
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, pagination.page, pagination.pageSize, filterValues])

  useEffect(() => { loadPage({ page: 0 }) }, [])

  async function openFilter() {
    if (!filterSchema) {
      try {
        const res = await bondService.getBondFilter()
        if (isOk(res)) setFilterSchema(pickData(res))
      } catch (err) {
        setErrorMsg(extractAxiosMessage(err))
      }
    }
    setFilterOpen(true)
  }

  function applyFilter() {
    const fd = filterRef.current?.getFormData(true)
    const values = fd?.fields || {}
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v != null && v !== ''))
    setFilterValues(clean)
    setFilterOpen(false)
    loadPage({ page: 0, filterValues: clean })
  }

  function resetFilter() {
    filterRef.current?.resetForm()
    setFilterValues({})
    loadPage({ page: 0, filterValues: {} })
  }

  async function openForm(mode, oid = null) {
    setFormMode(mode)
    setFormSchema(null)
    setFormLoading(true)
    setFormOpen(true)
    try {
      const res = await bondService.getBondInfo(oid ? { Oid: oid } : {})
      if (!isOk(res)) {
        toast.error(pickMessage(res, 'Không tải được thông tin'))
        setFormOpen(false)
        return
      }
      const data = pickData(res)
      setFormSchema(data)
      lastSpecialRef.current = flatSpecialValues(data)
    } catch (err) {
      toast.error(extractAxiosMessage(err))
      setFormOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  function closeForm() {
    setFormOpen(false)
    setFormSchema(null)
    lastSpecialRef.current = {}
  }

  async function handleFormChange(nextSchema) {
    const nextVals = flatSpecialValues(nextSchema)
    const prev = lastSpecialRef.current
    let changedField = null
    for (const k of SPECIAL_FIELDS) {
      if (String(nextVals[k] ?? '') !== String(prev[k] ?? '')) { changedField = k; break }
    }
    if (!changedField) return
    lastSpecialRef.current = nextVals
    try {
      const res = await bondService.setBondInfoDraft(nextSchema, { changed: changedField })
      if (isOk(res)) {
        const data = pickData(res)
        setFormSchema(data)
        lastSpecialRef.current = flatSpecialValues(data)
      }
    } catch (err) {
      console.warn('[draft] failed:', err.message)
    }
  }

  async function saveForm() {
    if (!formRef.current) return
    const validate = formRef.current.validateForm()
    if (!validate.isValid) {
      toast.error(`Vui lòng nhập: ${validate.errorFields.join(', ')}`)
      return
    }
    const fd = formRef.current.getFormData(true)
    setSaving(true)
    try {
      const body = {
        Oid: formMode === 'edit' ? (formSchema?.Oid ?? null) : null,
        tableKey: fd.tableKey,
        groupKey: fd.groupKey,
        group_fields: fd.group_fields,
      }
      const res = await bondService.setBondInfo(body)
      if (!isOk(res)) {
        toast.error(pickMessage(res, 'Lưu thất bại'))
        return
      }
      toast.success(formMode === 'add' ? 'Thêm trái phiếu thành công' : 'Cập nhật thành công')
      closeForm()
      loadPage()
    } catch (err) {
      toast.error(extractAxiosMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRow(row) {
    const ok = await confirm({
      title: 'Xóa trái phiếu?',
      description: `Bạn có chắc muốn xóa "${row.bondCode} — ${row.bondName}"? Hành động không thể hoàn tác.`,
      confirmText: 'Xóa',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      const res = await bondService.deleteBondInfo(row.oid ?? row.Oid)
      if (!isOk(res)) {
        toast.error(pickMessage(res, 'Xóa thất bại'))
        return
      }
      toast.success('Đã xóa trái phiếu')
      loadPage()
    } catch (err) {
      toast.error(extractAxiosMessage(err))
    }
  }

  const activeFilterCount = Object.keys(filterValues).length

  function rowActions(row) {
    return [
      { icon: <Eye />, label: 'Xem / Sửa', variant: 'primary', onClick: () => openForm('edit', row.oid ?? row.Oid) },
      { icon: <Trash2 />, label: 'Xóa', variant: 'danger', onClick: () => deleteRow(row) },
    ]
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadPage({ page: 0 }) }}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="sm" onClick={openFilter}>
          <Filter />
          Bộ lọc
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-1 h-4 min-w-[18px] px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={() => loadPage()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} />
          Tải lại
        </Button>

        <div className="flex-1" />

        <Button size="sm" onClick={() => openForm('add')}>
          <Plus /> Thêm trái phiếu
        </Button>
      </div>

      {errorMsg && (
        <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive shrink-0">
          {errorMsg}
        </div>
      )}

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogHeader>
          <DialogTitle>Bộ lọc nâng cao</DialogTitle>
          <DialogDescription>Chọn điều kiện rồi bấm Áp dụng để lọc danh sách.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto py-2">
          {filterSchema && <DynamicForm ref={filterRef} schema={filterSchema} isFilter />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={resetFilter}>Reset</Button>
          <Button onClick={applyFilter}>Áp dụng</Button>
        </DialogFooter>
      </Dialog>

      {/* Add/Detail drawer */}
      <Sheet open={formOpen} onOpenChange={(v) => { if (!v) closeForm() }} side="right">
        <SheetHeader>
          <SheetTitle>{formMode === 'add' ? 'Thêm trái phiếu' : 'Chi tiết trái phiếu'}</SheetTitle>
          <SheetDescription>
            {formMode === 'add'
              ? 'Điền thông tin để tạo mới một trái phiếu.'
              : 'Xem và chỉnh sửa thông tin trái phiếu.'}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="bg-muted/30">
          {formLoading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải form...
            </div>
          )}
          {!formLoading && formSchema && (
            <DynamicForm ref={formRef} schema={formSchema} onChange={handleFormChange} />
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={closeForm} disabled={saving}>Hủy</Button>
          <Button onClick={saveForm} disabled={saving || formLoading || !formSchema}>
            {saving && <Loader2 className="animate-spin" />}
            {saving ? 'Đang lưu...' : (formMode === 'add' ? 'Tạo mới' : 'Lưu thay đổi')}
          </Button>
        </SheetFooter>
      </Sheet>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <DynamicTable
          columns={columns}
          data={rows}
          loading={loading}
          pagination={pagination}
          onPageChange={(uiPage1Based) => loadPage({ page: Math.max(0, uiPage1Based - 1) })}
          onPageSizeChange={(size) => loadPage({ page: 0, pageSize: size })}
          rowActions={rowActions}
        />
      </div>
    </div>
  )
}
