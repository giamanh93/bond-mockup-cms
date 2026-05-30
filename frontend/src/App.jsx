import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import AppLayout from '@/components/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Products from '@/pages/Products'
import Orders from '@/pages/Orders'
import NewOrder from '@/pages/NewOrder'
import Customers from '@/pages/Customers'
import Debts from '@/pages/Debts'
import Reports from '@/pages/Reports'
import StockEntryPage from '@/pages/StockEntry'
import Settings from '@/pages/Settings'
import Attendance from '@/pages/Attendance'

function PrivateRoute({ children }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <div className="flex h-screen items-center justify-center text-gray-500">Đang tải...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<NewOrder />} />
        <Route path="orders/:id/edit" element={<NewOrder />} />
        <Route path="customers" element={<Customers />} />
        <Route path="debts" element={<Debts />} />
        <Route path="stock/entry" element={<StockEntryPage />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="attendance" element={<Attendance />} />
      </Route>
    </Routes>
  )
}
