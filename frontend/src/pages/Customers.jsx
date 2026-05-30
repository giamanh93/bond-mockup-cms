import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuthStore } from '@/store/authStore'
import { useShopStore } from '@/store/shopStore'
import Pagination from '@/components/Pagination'
import CurrencyInput from '@/components/CurrencyInput'
import { formatVND, formatDate } from '@/utils/format'
import api from '@/services/api'

// ── Modal thêm/sửa khách hàng ──────────────────────────────────────────────
function CustomerModal({ customer, onSave, onClose }) {
  const [openingDebt, setOpeningDebt] = useState(String(Number(customer?.openingDebt || 0)))
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: customer || { name: '', phone: '', address: '' },
  })

  async function onSubmit(data) {
    try {
      await onSave({ ...data, openingDebt: Number(openingDebt) || 0 }, customer?.id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{customer ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới'}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng</label>
            <input className="input" placeholder="Nguyễn Văn An" {...register('name', { required: 'Bắt buộc' })} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input className="input" placeholder="0901234567" {...register('phone')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ / Công trình</label>
            <input className="input" placeholder="Công trình Quận 1..." {...register('address')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số nợ ban đầu (VND)
              <span className="ml-2 text-xs font-normal text-gray-400">— nợ có trước khi dùng hệ thống</span>
            </label>
            <CurrencyInput value={openingDebt} onChange={setOpeningDebt} placeholder="0" />
          </div>
          <div className="-mx-6 -mb-6 border-t border-gray-100 px-6 py-4 bg-gray-50 flex gap-3 justify-end rounded-b-lg">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal điều chỉnh công nợ (OWNER only) ─────────────────────────────────
function AdjustmentModal({ customer, onClose, onDone }) {
  const [type, setType] = useState('increase')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) return toast.error('Vui lòng nhập số tiền')
    if (!reason.trim()) return toast.error('Vui lòng nhập lý do điều chỉnh')
    setIsSubmitting(true)
    try {
      await api.post(`/customers/${customer.id}/debt-adjustment`, {
        amount: Number(amount),
        type,
        reason: reason.trim(),
      })
      toast.success('Đã điều chỉnh công nợ')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const preview = type === 'increase'
    ? Number(customer.totalDebt) + (Number(amount) || 0)
    : Math.max(0, Number(customer.totalDebt) - (Number(amount) || 0))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-sm mx-4 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Điều chỉnh công nợ — {customer.name}</h2>
        <div className="bg-gray-50 rounded-lg p-3 flex justify-between text-sm">
          <span className="text-gray-500">Hiện đang nợ</span>
          <span className="font-bold text-red-600">{formatVND(Number(customer.totalDebt))}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setType('increase')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'increase' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500'}`}>
            Tăng nợ
          </button>
          <button onClick={() => setType('decrease')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${type === 'decrease' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-500'}`}>
            Giảm nợ
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền điều chỉnh (VND)</label>
          <CurrencyInput value={amount} onChange={setAmount} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lý do <span className="text-red-500">*</span></label>
          <input className="input" placeholder="Ví dụ: Xóa nợ cũ không thu được, nợ phát sinh ngoài đơn hàng..."
            value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {Number(amount) > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 flex justify-between text-sm">
            <span className="text-gray-500">Công nợ sau điều chỉnh</span>
            <span className={`font-bold ${preview > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatVND(preview)}</span>
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex-1 justify-center">
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal thu tiền ─────────────────────────────────────────────────────────
function PaymentModal({ customer, onCollect, onClose }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) return toast.error('Vui lòng nhập số tiền')
    setIsSubmitting(true)
    try {
      await onCollect(customer.id, Number(amount), note || undefined)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-sm mx-4 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Thu tiền — {customer.name}</h2>
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">Đang nợ</p>
          <p className="text-2xl font-bold text-red-600">{formatVND(Number(customer.totalDebt))}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu (VND)</label>
          <CurrencyInput value={amount} onChange={setAmount} placeholder="0" />
          <button onClick={() => setAmount(String(Number(customer.totalDebt)))}
            className="text-xs text-primary-600 mt-1 hover:underline">Thu toàn bộ</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
          <input className="input" placeholder="Tùy chọn..." value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Hủy</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary flex-1 justify-center">
            {isSubmitting ? 'Đang lưu...' : 'Xác nhận thu'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Drawer xem chi tiết khách hàng ─────────────────────────────────────────
function CustomerDetail({ customerId, onClose }) {
  const [data, setData] = useState(null)

  useState(() => {
    api.get(`/customers/${customerId}`)
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Không thể tải thông tin khách hàng'))
  })

  if (!data) return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full sm:max-w-lg mx-4 p-8 text-center text-gray-400">Đang tải...</div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-lg">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{data.name}</h2>
            {data.phone && <p className="text-sm text-gray-500">{data.phone}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Tổng công nợ */}
        {Number(data.totalDebt) > 0 && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-red-600">Tổng đang nợ</span>
            <span className="font-bold text-red-600">{formatVND(Number(data.totalDebt))}</span>
          </div>
        )}

        {/* Lịch sử đơn hàng */}
        <div className="px-5 py-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Đơn hàng gần đây</h3>
          {data.orders.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có đơn hàng</p>
          ) : (
            <div className="space-y-2">
              {data.orders.map((o) => (
                <div key={o.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-gray-500">{o.orderNo}</span>
                    <span className="font-medium">{formatVND(Number(o.totalAmount))}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatDate(o.orderDate)}</span>
                    {Number(o.debtAmount) > 0 && <span className="text-red-500">Còn nợ {formatVND(Number(o.debtAmount))}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lịch sử thanh toán */}
        {data.payments.length > 0 && (
          <div className="px-5 pb-5">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Lịch sử thanh toán</h3>
            <div className="space-y-1">
              {data.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-500 text-xs">{formatDate(p.paymentDate)}</span>
                  <span className="font-medium text-green-600">{formatVND(Number(p.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Customers() {
  const { customers, meta, isLoading, filters, setFilters, collectPayment, saveCustomer, reload } = useCustomers()
  const user = useAuthStore((s) => s.user)
  const { config: shop, fetch: fetchShop } = useShopStore()
  const isOwner = user?.role === 'OWNER'

  useEffect(() => { fetchShop() }, [fetchShop])
  const [modal, setModal] = useState(null)   // null | 'add' | {edit} | {pay} | {adjust} | {detail}

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Khách hàng</h1>
        <button onClick={() => setModal('add')} className="btn-primary">+ Thêm khách hàng</button>
      </div>

      <input className="input max-w-sm shrink-0"
        placeholder="Tìm theo tên hoặc số điện thoại..."
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />

      <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Không tìm thấy khách hàng</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Tên khách hàng', 'Số điện thoại', 'Địa chỉ', 'Tổng nợ', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setModal({ detail: c.id })} className="font-medium text-primary-600 hover:underline text-left">
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{c.address || '—'}</td>
                    <td className="px-4 py-3">
                      {Number(c.totalDebt) > 0
                        ? <span className="font-medium text-red-600">{formatVND(Number(c.totalDebt))}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {Number(c.totalDebt) > 0 && c.phone && (
                          <button
                            onClick={async () => {
                              const shopInfo = [shop.name, shop.phone].filter(Boolean).join(' — ')
                              const msg = `Kính gửi ${c.name}, ${shopInfo || 'cửa hàng'} xin nhắc bạn còn công nợ ${formatVND(Number(c.totalDebt))}. Vui lòng liên hệ để thanh toán. Xin cảm ơn!`
                              await navigator.clipboard.writeText(msg)
                              toast.success('Đã sao chép tin nhắn — nhấn Ctrl+V để dán')
                              window.open(`https://zalo.me/${c.phone}`, '_blank')
                            }}
                            className="btn-secondary text-xs py-1 px-2 text-green-700 border-green-200 hover:bg-green-50"
                            title="Nhắc nợ qua Zalo"
                          >
                            Nhắc nợ Zalo
                          </button>
                        )}
                        {Number(c.totalDebt) > 0 && (
                          <button onClick={() => setModal({ pay: c })} className="btn-primary text-xs py-1 px-2">Thu tiền</button>
                        )}
                        {isOwner && (
                          <button onClick={() => setModal({ adjust: c })} className="btn-secondary text-xs py-1 px-2 text-orange-600 border-orange-200 hover:bg-orange-50">Điều chỉnh nợ</button>
                        )}
                        <button onClick={() => setModal({ edit: c })} className="btn-secondary text-xs py-1 px-2">Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 border-t border-gray-100 shrink-0">
          <Pagination page={meta.page} total={meta.total} limit={meta.limit}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
        </div>
      </div>

      {(modal === 'add' || modal?.edit) && (
        <CustomerModal
          customer={modal?.edit || null}
          onSave={saveCustomer}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.pay && (
        <PaymentModal customer={modal.pay} onCollect={collectPayment} onClose={() => setModal(null)} />
      )}
      {modal?.adjust && (
        <AdjustmentModal customer={modal.adjust} onClose={() => setModal(null)} onDone={reload} />
      )}
      {modal?.detail && (
        <CustomerDetail customerId={modal.detail} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
