import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ChevronLeft, ChevronRight, FileText, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { Button, Badge, Separator } from '@/components/ui'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/bond', label: 'Trái phiếu', icon: FileText },
  { to: '/ui',   label: 'UI Showcase', icon: Sparkles },
]

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
    <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
      <span>{day},</span>
      <span className="font-medium text-foreground">{date}</span>
      <Separator orientation="vertical" className="h-4" />
      <span className="font-mono font-semibold text-primary tabular-nums">{time}</span>
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarW = collapsed ? 'w-16' : 'w-56'
  const tag = import.meta.env.VITE_BUILD_TAG
  const tagVariant = tag === 'API-LOCAL' ? 'success' : 'warning'

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed md:relative z-30 flex flex-col h-full bg-background border-r transition-all duration-200 shrink-0',
          sidebarW,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className={cn('flex items-center h-14 border-b px-3 shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-primary text-base tracking-tight">Bond</span>
              {tag && (
                <Badge variant={tagVariant} className="text-[9px] uppercase tracking-wider px-1.5 py-0">
                  {tag}
                </Badge>
              )}
            </span>
          )}
          <Button
            size="icon" variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-7 w-7 text-muted-foreground"
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
          <Button
            size="icon" variant="ghost"
            onClick={() => setMobileOpen(false)}
            className="md:hidden h-7 w-7 text-muted-foreground"
          >
            <X />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
          {NAV.length === 0 && !collapsed && (
            <p className="px-2 text-xs text-muted-foreground italic">Chưa có menu</p>
          )}
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  collapsed ? 'justify-center' : '',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={cn('shrink-0', isActive ? 'text-primary' : '')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t p-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <Button
                size="icon" variant="ghost"
                onClick={logout}
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Đăng xuất"
              >
                <LogOut />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
              </div>
              <Button
                size="icon" variant="ghost"
                onClick={logout}
                className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                title="Đăng xuất"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        <header className="flex items-center h-14 px-4 bg-background border-b shrink-0 md:px-6">
          <Button
            size="icon" variant="ghost"
            onClick={() => setMobileOpen(true)}
            className="mr-2 md:hidden h-8 w-8"
          >
            <Menu />
          </Button>
          <span className="font-bold text-primary text-base md:hidden">Bond</span>
          <LiveClock />
          <div className="flex-1" />
          <Button
            size="icon" variant="ghost"
            onClick={logout}
            className="md:hidden text-muted-foreground hover:text-destructive ml-2"
          >
            <LogOut />
          </Button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
          <div className="h-full p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
