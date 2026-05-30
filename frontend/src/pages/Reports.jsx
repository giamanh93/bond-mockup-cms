import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { formatVND } from '@/utils/format'

function MonthPicker({ year, month, onChange }) {
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))

  return (
    <div className="flex gap-2">
      <select className="input w-32" value={month} onChange={(e) => onChange(year, Number(e.target.value))}>
        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select className="input w-24" value={year} onChange={(e) => onChange(Number(e.target.value), month)}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function KpiCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card p-3 text-sm shadow-lg">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="text-primary-600">Doanh thu: <span className="font-bold">{formatVND(payload[0]?.value)}</span></p>
      <p className="text-gray-500">Số đơn: {payload[1]?.value}</p>
    </div>
  )
}

export default function Reports() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [chartData, setChartData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      api.get(`/reports/revenue/monthly?year=${year}&month=${month}`),
      api.get(`/reports/top-products?year=${year}&month=${month}&limit=5`),
    ])
      .then(([rev, top]) => {
        setChartData(rev.data.data.map((d) => ({
          day: d.day.slice(8), // chỉ lấy số ngày
          'Doanh thu': d.revenue,
          'Số đơn': d.orderCount,
        })))
        setTopProducts(top.data.data)
      })
      .catch(() => toast.error('Không thể tải báo cáo'))
      .finally(() => setIsLoading(false))
  }, [year, month])

  const totalRevenue = chartData.reduce((s, d) => s + d['Doanh thu'], 0)
  const totalOrders = chartData.reduce((s, d) => s + d['Số đơn'], 0)
  const daysWithData = chartData.filter((d) => d['Doanh thu'] > 0).length
  const avgPerDay = daysWithData > 0 ? Math.round(totalRevenue / daysWithData) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Báo cáo doanh thu</h1>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Tổng doanh thu" value={formatVND(totalRevenue)} color="text-green-600" />
        <KpiCard label="Tổng số đơn" value={totalOrders} />
        <KpiCard label="Trung bình / ngày có đơn" value={formatVND(avgPerDay)} color="text-primary-600" />
      </div>

      {/* Bar chart */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Doanh thu theo ngày — Tháng {month}/{year}</h2>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Đang tải...</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Không có dữ liệu trong tháng này</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="revenue"
                tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : v}
                tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              />
              <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="revenue" dataKey="Doanh thu" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar yAxisId="orders" dataKey="Số đơn" fill="#86efac" radius={[3, 3, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top sản phẩm */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Top sản phẩm bán chạy — Tháng {month}/{year}</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : topProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Không có dữ liệu</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['#', 'Sản phẩm', 'Số lượng bán', 'Doanh thu'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topProducts.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-bold text-lg">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.totalQty} {p.unit}</td>
                  <td className="px-4 py-3 font-semibold text-primary-700">{formatVND(p.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
