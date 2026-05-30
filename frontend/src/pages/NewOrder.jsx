import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/services/api'
import CurrencyInput from '@/components/CurrencyInput'
import { formatVND } from '@/utils/format'

const STEPS = ['Khách hàng', 'Chọn hàng', 'Điều chỉnh', 'Thanh toán', 'Xác nhận']

// ── Step 1: Chọn / Tạo khách hàng ──────────────────────────────────────────
function StepCustomer({ value, onChange }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [isNew, setIsNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    if (search.length < 1) { setResults([]); return }
    const t = setTimeout(() =>
      api.get(`/customers?search=${encodeURIComponent(search)}&limit=5`)
        .then((r) => setResults(r.data.data))
        .catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [search])

  function selectCustomer(c) { onChange(c); setSearch(''); setResults([]) }

  async function createCustomer() {
    if (!newName.trim()) return toast.error('Vui lòng nhập tên khách hàng')
    const { data } = await api.post('/customers', { name: newName.trim(), phone: newPhone.trim() || undefined })
    onChange(data.data)
    setIsNew(false)
    toast.success('Đã thêm khách hàng mới')
  }

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-gray-700">Bước 1 — Chọn khách hàng</h2>
      {value ? (
        <div className="card p-4 flex items-center justify-between bg-green-50 border-green-200">
          <div>
            <p className="font-medium text-gray-900">{value.name}</p>
            {value.phone && <p className="text-sm text-gray-500">{value.phone}</p>}
            {Number(value.totalDebt) > 0 && (
              <p className="text-sm text-red-600">Đang nợ: {formatVND(Number(value.totalDebt))}</p>
            )}
          </div>
          <button onClick={() => onChange(null)} className="btn-secondary text-xs">Đổi</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <input
              className="input"
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 card shadow-lg divide-y divide-gray-100">
                {results.map((c) => (
                  <button key={c.id} onClick={() => selectCustomer(c)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-gray-500 text-xs">{c.phone || 'Chưa có SĐT'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <hr className="flex-1 border-gray-200" />
          </div>
          {!isNew ? (
            <button onClick={() => setIsNew(true)} className="btn-secondary w-full justify-center">
              + Thêm khách hàng mới
            </button>
          ) : (
            <div className="card p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Thông tin khách hàng mới</p>
              <input className="input" placeholder="Tên khách hàng *" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className="input" placeholder="Số điện thoại" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setIsNew(false)} className="btn-secondary flex-1">Hủy</button>
                <button onClick={createCustomer} className="btn-primary flex-1">Thêm</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Step 2: Chọn sản phẩm ──────────────────────────────────────────────────
function StepProducts({ items, onChange }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    if (search.length < 1) { setResults([]); return }
    const t = setTimeout(() =>
      api.get(`/products?search=${encodeURIComponent(search)}&limit=8`)
        .then((r) => setResults(r.data.data))
        .catch(() => {}), 300)
    return () => clearTimeout(t)
  }, [search])

  function addProduct(p) {
    if (items.find((i) => i.productId === p.id)) return toast.error('Sản phẩm đã có trong đơn')
    onChange([...items, { productId: p.id, name: p.name, unit: p.unit, stockQty: Number(p.stockQty), quantity: 1, unitPrice: Number(p.sellPrice), discount: 0 }])
    setSearch(''); setResults([])
  }

  function updateItem(idx, field, val) {
    const next = [...items]
    next[idx] = { ...next[idx], [field]: val }
    onChange(next)
  }

  function removeItem(idx) { onChange(items.filter((_, i) => i !== idx)) }

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-gray-700">Bước 2 — Chọn hàng hóa</h2>
      <div className="relative">
        <input className="input" placeholder="Tìm hàng hóa để thêm vào đơn..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 card shadow-lg divide-y divide-gray-100">
            {results.map((p) => (
              <button key={p.id} onClick={() => addProduct(p)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm flex justify-between items-center">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-gray-500 text-xs">{p.code} · Tồn: {Number(p.stockQty)} {p.unit}</p>
                </div>
                <span className="text-primary-600 font-medium">{formatVND(Number(p.sellPrice))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-center py-8 text-gray-400 text-sm">Chưa có hàng hóa nào. Tìm và thêm bên trên.</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                  <td className="px-3 py-2 w-28">
                    <input type="number" min="0.001" step="0.001" className="input py-1 text-center"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-2 w-36">
                    <CurrencyInput value={String(item.unitPrice)}
                      onChange={(v) => updateItem(idx, 'unitPrice', Number(v))} />
                  </td>
                  <td className="px-3 py-2 font-medium text-right">
                    {formatVND(item.quantity * item.unitPrice)}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Step 3: Điều chỉnh giá / chiết khấu ──────────────────────────────────
function StepAdjust({ items, onChange }) {
  function updateDiscount(idx, val) {
    const next = [...items]
    next[idx] = { ...next[idx], discount: Math.min(100, Math.max(0, Number(val))) }
    onChange(next)
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100), 0)
  const overStockItems = items.filter((i) => i.stockQty !== undefined && i.quantity > i.stockQty)

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-gray-700">Bước 3 — Điều chỉnh giá</h2>
      {overStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-sm text-yellow-800 space-y-1">
          <p className="font-semibold">⚠️ Cảnh báo: vượt tồn kho</p>
          {overStockItems.map((i) => (
            <p key={i.productId}>• <strong>{i.name}</strong>: đặt {i.quantity} {i.unit}, tồn kho chỉ còn {i.stockQty} {i.unit}</p>
          ))}
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Sản phẩm', 'SL', 'Đơn giá', 'CK (%)', 'Thành tiền'].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, idx) => {
              const subtotal = item.quantity * item.unitPrice * (1 - item.discount / 100)
              const isOver = item.stockQty !== undefined && item.quantity > item.stockQty
              return (
                <tr key={idx} className={isOver ? 'bg-yellow-50' : ''}>
                  <td className="px-3 py-2 font-medium">
                    {item.name}
                    {isOver && <span className="ml-2 text-xs text-yellow-700 font-normal">(tồn: {item.stockQty})</span>}
                  </td>
                  <td className={`px-3 py-2 ${isOver ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}>{item.quantity} {item.unit}</td>
                  <td className="px-3 py-2">{formatVND(item.unitPrice)}</td>
                  <td className="px-3 py-2 w-24">
                    <input type="number" min="0" max="100" step="0.5" className="input py-1 text-center"
                      value={item.discount} onChange={(e) => updateDiscount(idx, e.target.value)} />
                  </td>
                  <td className="px-3 py-2 font-medium text-right">{formatVND(Math.round(subtotal))}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-3 py-2 font-semibold text-right">Tổng cộng:</td>
              <td className="px-3 py-2 font-bold text-lg text-right text-primary-700">{formatVND(Math.round(total))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Step 4: Thanh toán ─────────────────────────────────────────────────────
function StepPayment({ items, paidAmount, onChangePaid, note, onChangeNote }) {
  const total = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100), 0))
  const debt = Math.max(0, total - Number(paidAmount))

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-gray-700">Bước 4 — Ghi nhận thanh toán</h2>
      <div className="card p-5 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tổng tiền hàng</span>
          <span className="font-bold text-lg">{formatVND(total)}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền khách trả ngay (VND)</label>
          <CurrencyInput value={paidAmount} onChange={onChangePaid} placeholder="0 = ghi nợ toàn bộ" />
          <div className="flex gap-2 mt-2">
            {[0, Math.round(total / 2), total].map((v) => (
              <button key={v} onClick={() => onChangePaid(String(v))}
                className="btn-secondary text-xs py-1 flex-1">
                {v === 0 ? 'Ghi nợ' : v === total ? 'Thanh toán đủ' : 'Trả 1/2'}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Đã thanh toán</span>
            <span className="font-medium text-green-600">{formatVND(Math.min(Number(paidAmount), total))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Còn lại (ghi nợ)</span>
            <span className={`font-medium ${debt > 0 ? 'text-red-600' : 'text-gray-400'}`}>{debt > 0 ? formatVND(debt) : '—'}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
          <textarea className="input resize-none" rows={2} placeholder="Ghi chú đơn hàng..." value={note} onChange={(e) => onChangeNote(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

// ── Step 5: Xác nhận ───────────────────────────────────────────────────────
function StepConfirm({ customer, items, paidAmount }) {
  const total = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100), 0))
  const debt = Math.max(0, total - Number(paidAmount))

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-gray-700">Bước 5 — Xác nhận đơn hàng</h2>
      <div className="card p-4 space-y-3">
        <div><span className="text-xs text-gray-500 uppercase">Khách hàng</span><p className="font-medium">{customer?.name}</p></div>
        <div className="border-t border-gray-100 pt-3 space-y-1">
          {items.map((item, idx) => {
            const subtotal = Math.round(item.quantity * item.unitPrice * (1 - item.discount / 100))
            return (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} × {item.quantity} {item.unit}{item.discount > 0 ? ` (-${item.discount}%)` : ''}</span>
                <span className="font-medium">{formatVND(subtotal)}</span>
              </div>
            )
          })}
        </div>
        <div className="border-t border-gray-200 pt-3 space-y-1">
          <div className="flex justify-between font-semibold"><span>Tổng cộng</span><span>{formatVND(total)}</span></div>
          <div className="flex justify-between text-sm text-green-600"><span>Đã thu</span><span>{formatVND(Math.min(Number(paidAmount), total))}</span></div>
          {debt > 0 && <div className="flex justify-between text-sm text-red-600"><span>Còn nợ</span><span>{formatVND(debt)}</span></div>}
        </div>
      </div>
    </div>
  )
}

// ── Main Wizard ────────────────────────────────────────────────────────────
export default function NewOrder() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEdit = !!editId

  const [step, setStep] = useState(0)
  const [customer, setCustomer] = useState(null)
  const [items, setItems] = useState([])
  const [paidAmount, setPaidAmount] = useState('0')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingOrder, setIsLoadingOrder] = useState(isEdit)

  // Khi edit: load dữ liệu đơn hàng cũ vào wizard
  useEffect(() => {
    if (!isEdit) return
    api.get(`/orders/${editId}`)
      .then(({ data }) => {
        const o = data.data
        if (o.status !== 'NEW') {
          toast.error('Chỉ có thể sửa đơn hàng ở trạng thái Mới')
          navigate('/orders')
          return
        }
        setCustomer(o.customer)
        setItems(o.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          unit: i.product.unit,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount),
        })))
        setPaidAmount(String(Number(o.paidAmount)))
        setNote(o.note || '')
      })
      .catch(() => { toast.error('Không thể tải đơn hàng'); navigate('/orders') })
      .finally(() => setIsLoadingOrder(false))
  }, [editId, isEdit, navigate])

  function canNext() {
    if (step === 0) return !!customer
    if (step === 1) return items.length > 0 && items.every((i) => i.quantity > 0 && i.unitPrice > 0)
    return true
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const payload = {
        customerId: customer.id,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
        paidAmount: Number(paidAmount),
        note: note || undefined,
      }
      if (isEdit) {
        await api.put(`/orders/${editId}`, payload)
        toast.success('Đã cập nhật đơn hàng thành công!')
      } else {
        const { data: res } = await api.post('/orders', payload)
        toast.success('Đã tạo đơn hàng thành công!')
        if (res.warnings?.length) {
          res.warnings.forEach((w) => toast(`⚠️ Tồn kho thấp: ${w}`, { icon: '⚠️', duration: 6000 }))
        }
      }
      navigate('/orders')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingOrder) return <div className="flex justify-center py-20 text-gray-400">Đang tải...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/orders')} className="btn-secondary text-xs py-1.5 px-3">← Quay lại</button>
        <h1 className="text-xl font-semibold text-gray-900">{isEdit ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'}</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < step ? 'bg-green-500 border-green-500 text-white'
                  : i === step ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>{i < step ? '✓' : i + 1}</div>
              <span className={`text-xs mt-1 hidden sm:block ${i === step ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="card p-6">
        {step === 0 && <StepCustomer value={customer} onChange={setCustomer} />}
        {step === 1 && <StepProducts items={items} onChange={setItems} />}
        {step === 2 && <StepAdjust items={items} onChange={setItems} />}
        {step === 3 && <StepPayment items={items} paidAmount={paidAmount} onChangePaid={setPaidAmount} note={note} onChangeNote={setNote} />}
        {step === 4 && <StepConfirm customer={customer} items={items} paidAmount={paidAmount} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep((s) => s - 1)} disabled={step === 0} className="btn-secondary disabled:opacity-40">
          ← Quay lại
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="btn-primary disabled:opacity-40">
            Tiếp theo →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary px-8 disabled:opacity-40">
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Xác nhận tạo đơn'}
          </button>
        )}
      </div>
    </div>
  )
}
