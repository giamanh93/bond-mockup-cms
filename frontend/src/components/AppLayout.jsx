import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react'

const NAV = []

const DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const day  = DAYS[now.getDay()]
  const date = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`

  return (
    <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
      <span className="text-gray-400">{day},</span>
      <span className="font-medium text-gray-700">{date}</span>
      <span className="text-gray-300">|</span>
      <span className="font-mono font-semibold text-primary-600 tabular-nums">{time}</span>
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarW = collapsed ? 'w-16' : 'w-56'

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:relative z-30 flex flex-col h-full bg-white border-r border-gray-200
          transition-all duration-200 shrink-0
          ${sidebarW}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className={`flex items-center h-14 border-b border-gray-100 px-3 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <span className="font-bold text-primary-600 text-base tracking-tight">Bond</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV.length === 0 && !collapsed && (
            <p className="px-2 text-xs text-gray-400 italic">Chưa có menu</p>
          )}
        </nav>

        <div className="shrink-0 border-t border-gray-100 p-2 space-y-1">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.fullName}</p>
                <p className="text-xs text-gray-400 truncate capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        <header className="flex items-center h-14 px-4 bg-white border-b border-gray-200 shrink-0 md:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 md:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-primary-600 text-base md:hidden">Bond</span>
          <LiveClock />
          <div className="flex-1" />
          <button onClick={logout} className="md:hidden text-gray-400 hover:text-red-500 ml-2">
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="h-full p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
