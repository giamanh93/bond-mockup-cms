import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useShopStore } from '@/store/shopStore'
import Pagination from '@/components/Pagination'
import CurrencyInput from '@/components/CurrencyInput'
import { formatVND } from '@/utils/format'

const PAGE_SIZE = 20

function PaymentModal({ customer, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) return toast.error('Vui lòng nhập số tiền')
    setIsSubmitting(true)
    try {
      await api.post(`/customers/${customer.id}/payments`, { amount: Number(amount), note: note || undefined })
      toast.success('Đã ghi nhận thanh toán')
      onDone()
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
        <div className="bg-red-50 rounded-lg p-3 flex justify-between">
          <span className="text-sm text-gray-600">Đang nợ</span>
          <span className="font-bold text-red-600">{formatVND(Number(customer.totalDebt))}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền thu (VND)</label>
          <CurrencyInput value={amount} onChange={setAmount} placeholder="0" />
          <button onClick={() => setAmount(String(Number(customer.totalDebt)))}
            className="text-xs text-primary-600 mt-1 hover:underline">Thu toàn bộ nợ</button>
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

export default function Debts() {
  const [customers, setCustomers] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE })
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [paying, setPaying] = useState(null)
  const [totalDebt, setTotalDebt] = useState(0)
  const { config: shop, fetch: fetchShop } = useShopStore()

  async function fetchDebts(p = 1) {
    setIsLoading(true)
    try {
      const { data } = await api.get(`/customers/debts?page=${p}&limit=${PAGE_SIZE}`)
      setCustomers(data.data)
      setMeta(data.meta)
      setTotalDebt(data.totalDebt || 0)
    } catch {
      toast.error('Không thể tải danh sách công nợ')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchDebts(page) }, [page])
  useEffect(() => { fetchShop() }, [fetchShop])

  return (
    <div className="h-full flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900 shrink-0">Quản lý công nợ</h1>

      <div className="card p-4 flex justify-between items-center bg-red-50 border-red-200 shrink-0">
        <span className="text-sm text-gray-600">Tổng công nợ toàn cửa hàng</span>
        <span className="text-2xl font-bold text-red-600">{formatVND(totalDebt)}</span>
      </div>

      <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Không có công nợ nào</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Khách hàng', 'Số điện thoại', 'Tổng nợ', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{formatVND(Number(c.totalDebt))}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {c.phone && (
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
                        <button onClick={() => setPaying(c)} className="btn-primary text-xs py-1 px-3">Thu tiền</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 border-t border-gray-100 shrink-0">
          <Pagination page={page} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
        </div>
      </div>

      {paying && (
        <PaymentModal customer={paying} onClose={() => setPaying(null)} onDone={() => fetchDebts(page)} />
      )}
    </div>
  )
}
