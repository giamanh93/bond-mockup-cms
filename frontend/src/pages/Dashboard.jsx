import { useNavigate } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '@/utils/format'

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="card p-6 text-red-600">{error}</div>
  }

  const { kpi, recentOrders, topDebtors } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Tổng quan hôm nay</h1>
        <button onClick={() => navigate('/orders/new')} className="btn-primary">
          + Tạo đơn hàng
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Doanh thu hôm nay"
          value={formatVND(kpi.revenueToday)}
          color="text-green-600"
        />
        <KpiCard
          label="Số đơn hôm nay"
          value={kpi.ordersToday}
          sub="đơn hàng"
          color="text-blue-600"
        />
        <KpiCard
          label="Tổng công nợ"
          value={formatVND(kpi.totalDebt)}
          color={kpi.totalDebt > 0 ? 'text-red-600' : 'text-gray-700'}
        />
        <KpiCard
          label="Hàng sắp hết"
          value={kpi.lowStockCount}
          sub="mặt hàng cần nhập thêm"
          color={kpi.lowStockCount > 0 ? 'text-orange-600' : 'text-gray-700'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Đơn hàng gần nhất */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Đơn hàng gần nhất</h2>
            <button onClick={() => navigate('/orders')} className="text-sm text-primary-600 hover:underline">
              Xem tất cả
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Chưa có đơn hàng nào</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders?id=${order.id}`)}
                  className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{order.orderNo}</p>
                    <p className="text-xs text-gray-500">{order.customer?.name} · {formatDate(order.orderDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">{formatVND(Number(order.totalAmount))}</p>
                    <span className={`badge text-xs ${ORDER_STATUS_COLOR[order.status]}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Khách nợ nhiều nhất */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Khách hàng nợ nhiều nhất</h2>
            <button onClick={() => navigate('/debts')} className="text-sm text-primary-600 hover:underline">
              Xem công nợ
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {topDebtors.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Không có công nợ</p>
            ) : (
              topDebtors.map((c) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/customers?id=${c.id}`)}
                  className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone || 'Chưa có SĐT'}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-600">{formatVND(Number(c.totalDebt))}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
