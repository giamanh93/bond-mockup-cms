import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useOrders } from '@/hooks/useOrders'
import { useShopStore } from '@/store/shopStore'
import { useConfirm } from '@/components/ConfirmDialog'
import Pagination from '@/components/Pagination'
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'NEW', label: 'Mới' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
]

const NEXT_STATUS = {
  NEW: { value: 'PROCESSING', label: 'Xác nhận xử lý' },
  PROCESSING: { value: 'DELIVERED', label: 'Đánh dấu đã giao' },
  DELIVERED: { value: 'COMPLETED', label: 'Hoàn thành' },
}

export default function Orders() {
  const navigate = useNavigate()
  const { orders, meta, isLoading, filters, setFilters, updateStatus, cancelOrder } = useOrders()
  const { config: shop, fetch: fetchShop } = useShopStore()
  const askConfirm = useConfirm()

  useEffect(() => { fetchShop() }, [fetchShop])
  const [expanded, setExpanded] = useState(null)

  async function handleUpdateStatus(order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    const ok = await askConfirm({ title: next.label + '?', description: `Đơn hàng ${order.orderNo}`, confirmText: next.label })
    if (!ok) return
    try { await updateStatus(order.id, next.value) } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  async function handlePrint(order) {
    const toastId = toast.loading('Đang tạo hóa đơn PDF...')
    window.open(`${import.meta.env.VITE_API_URL}/orders/${order.id}/pdf`, '_blank')
    toast.success('Hóa đơn đã sẵn sàng', { id: toastId })
  }

  async function handleZaloOrder(order) {
    const debt = Number(order.debtAmount)
    const shopInfo = [shop.name, shop.phone].filter(Boolean).join(' — ')
    const lines = [
      `Xin chào ${order.customer?.name},`,
      `${shopInfo || 'Cửa hàng'} xin gửi thông tin đơn hàng ${order.orderNo} ngày ${formatDate(order.orderDate)}:`,
      `• Tổng tiền: ${formatVND(Number(order.totalAmount))}`,
      `• Đã thanh toán: ${formatVND(Number(order.paidAmount))}`,
      debt > 0 ? `• Còn lại: ${formatVND(debt)}` : `• Đã thanh toán đủ`,
      `Cảm ơn quý khách!`,
    ]
    const msg = lines.join('\n')
    await navigator.clipboard.writeText(msg)
    toast.success('Đã sao chép thông tin đơn — nhấn Ctrl+V để dán')
    window.open(`https://zalo.me/${order.customer?.phone}`, '_blank')
  }

  async function handleCancel(order) {
    const ok = await askConfirm({
      title: 'Hủy đơn hàng?',
      description: `Đơn ${order.orderNo} sẽ bị hủy và tồn kho sẽ được hoàn lại.`,
      confirmText: 'Hủy đơn',
      variant: 'destructive',
    })
    if (!ok) return
    try { await cancelOrder(order.id, '') } catch { toast.error('Không thể hủy đơn hàng') }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Đơn hàng</h1>
        <button onClick={() => navigate('/orders/new')} className="btn-primary">+ Tạo đơn hàng</button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <select
          className="input sm:w-48"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" className="input sm:w-40" value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value, page: 1 }))} />
        <input type="date" className="input sm:w-40" value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value, page: 1 }))} />
      </div>

      {/* Table */}
      <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Không có đơn hàng nào</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Số đơn', 'Khách hàng', 'Ngày', 'Tổng tiền', 'Đã thu', 'Còn nợ', 'Trạng thái', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <>
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                          className="font-mono text-xs text-primary-600 hover:underline"
                        >
                          {order.orderNo}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{order.customer?.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3 font-medium">{formatVND(Number(order.totalAmount))}</td>
                      <td className="px-4 py-3 text-green-600">{formatVND(Number(order.paidAmount))}</td>
                      <td className="px-4 py-3 text-red-600">{Number(order.debtAmount) > 0 ? formatVND(Number(order.debtAmount)) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ORDER_STATUS_COLOR[order.status]}`}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => handlePrint(order)} className="btn-secondary text-xs py-1 px-2" title="In hóa đơn">
                            🖨
                          </button>
                          {order.customer?.phone && (
                            <button onClick={() => handleZaloOrder(order)} className="btn-secondary text-xs py-1 px-2 text-green-700 border-green-200 hover:bg-green-50" title="Gửi thông tin đơn qua Zalo">
                              Zalo
                            </button>
                          )}
                          {order.status === 'NEW' && (
                            <button onClick={() => navigate(`/orders/${order.id}/edit`)} className="btn-secondary text-xs py-1 px-2">
                              Sửa
                            </button>
                          )}
                          {NEXT_STATUS[order.status] && (
                            <button onClick={() => handleUpdateStatus(order)} className="btn-secondary text-xs py-1 px-2">
                              {NEXT_STATUS[order.status].label}
                            </button>
                          )}
                          {['NEW', 'PROCESSING'].includes(order.status) && (
                            <button onClick={() => handleCancel(order)} className="btn text-xs py-1 px-2 text-red-600 hover:bg-red-50 border border-red-200">
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === order.id && (
                      <tr key={`${order.id}-detail`} className="bg-blue-50">
                        <td colSpan={8} className="px-6 py-3 text-xs text-gray-600">
                          <p><span className="font-medium">Nhân viên:</span> {order.user?.fullName}</p>
                          {order.note && <p><span className="font-medium">Ghi chú:</span> {order.note}</p>}
                          <p><span className="font-medium">Số mặt hàng:</span> {order._count?.items}</p>
                        </td>
                      </tr>
                    )}
                  </>
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
    </div>
  )
}
