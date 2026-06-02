import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import AppLayout from '@/components/AppLayout'
import Home from '@/pages/Home'
import BondList from '@/pages/BondList'
import UIShowcase from '@/pages/UIShowcase'

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
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="bond" element={<BondList />} />
        <Route path="ui" element={<UIShowcase />} />
      </Route>
    </Routes>
  )
}
