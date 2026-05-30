import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import CurrencyInput from '@/components/CurrencyInput'
import Pagination from '@/components/Pagination'
import { formatVND, formatDate } from '@/utils/format'

const PAGE_SIZE = 20

// ── Form nhập kho ──────────────────────────────────────────────────────────
function EntryForm({ onSuccess }) {
  const [supplierName, setSupplierName] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (search.length < 1) { setResults([]); return }
    const t = setTimeout(() =>
      api.get(`/products?search=${encodeURIComponent(search)}&limit=6`)
        .then((r) => setResults(r.data.data))
        .catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [search])

  function addProduct(p) {
    if (items.find((i) => i.productId === p.id)) return toast.error('Sản phẩm đã có trong phiếu')
    setItems((prev) => [...prev, {
      productId: p.id,
      name: p.name,
      unit: p.unit,
      currentStock: Number(p.stockQty),
      quantity: 1,
      costPrice: String(p.costPrice || ''),
    }])
    setSearch(''); setResults([])
  }

  function updateItem(idx, field, val) {
    setItems((prev) => { const next = [...prev]; next[idx] = { ...next[idx], [field]: val }; return next })
  }

  function removeItem(idx) { setItems((prev) => prev.filter((_, i) => i !== idx)) }

  async function handleSubmit() {
    if (items.length === 0) return toast.error('Chưa có hàng hóa nào trong phiếu')
    const invalid = items.find((i) => !i.quantity || !i.costPrice || Number(i.quantity) <= 0 || Number(i.costPrice) <= 0)
    if (invalid) return toast.error(`Vui lòng điền đủ số lượng và giá vốn cho: ${invalid.name}`)

    setIsSubmitting(true)
    try {
      await api.post('/stock/entries', {
        supplierName: supplierName || undefined,
        note: note || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), costPrice: Number(i.costPrice) })),
      })
      toast.success(`Đã nhập kho ${items.length} mặt hàng`)
      setItems([]); setSupplierName(''); setNote('')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi khi nhập kho')
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalValue = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.costPrice || 0), 0)

  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">Phiếu nhập kho mới</h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
          <input className="input" placeholder="Tên nhà cung cấp (tùy chọn)" value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
          <input className="input" placeholder="Ghi chú phiếu nhập..." value={note}
            onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      {/* Tìm sản phẩm */}
      <div className="relative">
        <input className="input" placeholder="Tìm hàng hóa để thêm vào phiếu nhập..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 card shadow-lg divide-y divide-gray-100">
            {results.map((p) => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.code} · Tồn hiện tại: {Number(p.stockQty)} {p.unit}</p>
                </div>
                <span className="text-xs text-gray-400">Giá vốn: {p.costPrice ? formatVND(Number(p.costPrice)) : '—'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bảng hàng nhập */}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Sản phẩm', 'Tồn hiện tại', 'Số lượng nhập', 'Giá vốn (VND)', 'Thành tiền', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {item.name}
                    <span className="text-xs text-gray-400 ml-1">({item.unit})</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{item.currentStock} {item.unit}</td>
                  <td className="px-3 py-2 w-28">
                    <input type="number" min="0.001" step="0.001" className="input py-1 text-center"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </td>
                  <td className="px-3 py-2 w-36">
                    <CurrencyInput value={item.costPrice}
                      onChange={(v) => updateItem(idx, 'costPrice', v)} />
                  </td>
                  <td className="px-3 py-2 font-medium text-right">
                    {Number(item.costPrice) > 0
                      ? formatVND(Number(item.quantity) * Number(item.costPrice))
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-3 py-2 font-semibold text-right text-gray-700">Tổng giá trị nhập:</td>
                <td className="px-3 py-2 font-bold text-primary-700 text-right">{formatVND(totalValue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}
          className="btn-primary px-8 disabled:opacity-40">
          {isSubmitting ? 'Đang lưu...' : `Xác nhận nhập kho (${items.length} mặt hàng)`}
        </button>
      </div>
    </div>
  )
}

// ── Lịch sử nhập kho ───────────────────────────────────────────────────────
function EntryHistory({ refresh }) {
  const [entries, setEntries] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    api.get(`/stock/entries?page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => { setEntries(r.data.data); setMeta(r.data.meta) })
      .catch(() => toast.error('Không thể tải lịch sử nhập kho'))
      .finally(() => setIsLoading(false))
  }, [page, refresh])

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Lịch sử nhập kho</h2>
      </div>
      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Đang tải...</div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center text-gray-400">Chưa có phiếu nhập nào</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                {['Ngày nhập', 'Sản phẩm', 'Nhà cung cấp', 'Số lượng', 'Giá vốn', 'Thành tiền', 'Ghi chú'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(e.entryDate)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {e.product?.name}
                    <span className="text-xs text-gray-400 ml-1">({e.product?.unit})</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.supplierName || '—'}</td>
                  <td className="px-4 py-3 font-medium text-green-600">+{Number(e.quantity)} {e.product?.unit}</td>
                  <td className="px-4 py-3">{formatVND(Number(e.costPrice))}</td>
                  <td className="px-4 py-3 font-medium">{formatVND(Number(e.quantity) * Number(e.costPrice))}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{e.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 border-t border-gray-100">
        <Pagination page={page} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function StockEntryPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Nhập kho</h1>
      <EntryForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      <EntryHistory refresh={refreshKey} />
    </div>
  )
}
