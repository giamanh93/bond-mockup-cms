import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import CurrencyInput from '@/components/CurrencyInput'
import { formatVND } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: 'PRESENT',      label: 'Đi làm',          color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'HALF_DAY',     label: 'Nửa ngày',         color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'LEAVE_PAID',   label: 'Nghỉ phép',        color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'LEAVE_UNPAID', label: 'Nghỉ không phép',  color: 'bg-red-100 text-red-700 border-red-300' },
]

const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]))

function toDateStr(d) {
  return d.toISOString().slice(0, 10)
}

// ── Tab Chấm công ──────────────────────────────────────────────────────────
function TabDaily({ isOwner }) {
  const [date, setDate] = useState(toDateStr(new Date()))
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dirty, setDirty] = useState({})   // { userId: status }

  const fetchDaily = useCallback(async (d) => {
    setIsLoading(true)
    try {
      const { data } = await api.get(`/attendance/daily?date=${d}`)
      setRows(data.data)
      setDirty({})
    } catch { toast.error('Không thể tải dữ liệu chấm công') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchDaily(date) }, [date, fetchDaily])

  function setStatus(userId, status) {
    setDirty((prev) => ({ ...prev, [userId]: status }))
  }

  function getStatus(row) {
    return dirty[row.id] !== undefined ? dirty[row.id] : row.attendance?.status ?? null
  }

  async function handleSave() {
    const records = rows
      .map((r) => ({ userId: r.id, status: getStatus(r) }))
      .filter((r) => r.status !== null)

    if (records.length === 0) return toast.error('Chưa chấm công cho ai')
    setIsSaving(true)
    try {
      await api.post('/attendance/bulk', { date, records })
      toast.success('Đã lưu bảng chấm công')
      fetchDaily(date)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally { setIsSaving(false) }
  }

  const hasDirty = Object.keys(dirty).length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Ngày chấm công</label>
        <input type="date" className="input w-44" value={date}
          max={toDateStr(new Date())}
          onChange={(e) => setDate(e.target.value)} />
        {isOwner && hasDirty && (
          <button onClick={handleSave} disabled={isSaving} className="btn-primary ml-auto">
            {isSaving ? 'Đang lưu...' : 'Lưu bảng công'}
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Chức vụ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const currentStatus = getStatus(row)
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.fullName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            disabled={!isOwner}
                            onClick={() => setStatus(row.id, opt.value)}
                            className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                              currentStatus === opt.value
                                ? opt.color + ' ring-2 ring-offset-1 ring-current'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'
                            } disabled:cursor-default`}
                          >
                            {opt.label}
                          </button>
                        ))}
                        {currentStatus === null && (
                          <span className="text-xs text-gray-300 italic">Chưa chấm</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab Tổng hợp tháng ─────────────────────────────────────────────────────
function TabSummary({ isOwner }) {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [editRate, setEditRate] = useState(null)   // { userId, value }

  const fetchSummary = useCallback(async (m) => {
    setIsLoading(true)
    try {
      const { data } = await api.get(`/attendance/summary?month=${m}`)
      setRows(data.data)
    } catch { toast.error('Không thể tải tổng hợp') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchSummary(month) }, [month, fetchSummary])

  async function saveDailyRate(userId) {
    try {
      await api.put(`/attendance/users/${userId}/daily-rate`, {
        dailyRate: editRate.value ? Number(editRate.value) : null,
      })
      toast.success('Đã cập nhật lương ngày')
      setEditRate(null)
      fetchSummary(month)
    } catch { toast.error('Không thể lưu') }
  }

  const totalSalary = rows.reduce((s, r) => s + (r.salary || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Tháng</label>
        <input type="month" className="input w-40" value={month}
          onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Nhân viên', 'Đi làm', 'Nửa ngày', 'Nghỉ phép', 'Nghỉ KP', 'Tổng công', 'Lương ngày', 'Thành tiền'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.fullName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                          {r.present}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.halfDay > 0
                          ? <span className="inline-block w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold flex items-center justify-center">{r.halfDay}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.leavePaid > 0
                          ? <span className="inline-block w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{r.leavePaid}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.leaveUnpaid > 0
                          ? <span className="inline-block w-7 h-7 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">{r.leaveUnpaid}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.totalDays} ngày</td>
                      <td className="px-4 py-3">
                        {isOwner ? (
                          editRate?.userId === r.userId ? (
                            <div className="flex gap-1 items-center">
                              <div className="w-32">
                                <CurrencyInput value={editRate.value} onChange={(v) => setEditRate({ userId: r.userId, value: v })} />
                              </div>
                              <button onClick={() => saveDailyRate(r.userId)} className="btn-primary text-xs py-1 px-2">✓</button>
                              <button onClick={() => setEditRate(null)} className="btn-secondary text-xs py-1 px-2">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditRate({ userId: r.userId, value: String(Number(r.dailyRate || 0)) })}
                              className="text-left hover:underline text-gray-700">
                              {r.dailyRate ? formatVND(Number(r.dailyRate)) : <span className="text-gray-300 italic text-xs">Chưa đặt</span>}
                            </button>
                          )
                        ) : (
                          <span>{r.dailyRate ? formatVND(Number(r.dailyRate)) : '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-primary-700">
                        {r.salary !== null ? formatVND(r.salary) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={7} className="px-4 py-3 font-semibold text-right text-gray-700">Tổng lương tháng {month}:</td>
                    <td className="px-4 py-3 font-bold text-lg text-primary-700">{formatVND(totalSalary)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-600 space-y-0.5">
              <p>• Tổng công = Đi làm + Nửa ngày × 0.5 + Nghỉ phép (có lương)</p>
              <p>• Thành tiền = Tổng công × Lương ngày (click vào lương ngày để chỉnh)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Attendance() {
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'OWNER'
  const [tab, setTab] = useState('daily')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Chấm công</h1>

      <div className="flex gap-1 border-b border-gray-200">
        {[{ key: 'daily', label: 'Chấm công theo ngày' }, { key: 'summary', label: 'Tổng hợp tháng' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && <TabDaily isOwner={isOwner} />}
      {tab === 'summary' && <TabSummary isOwner={isOwner} />}
    </div>
  )
}
