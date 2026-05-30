import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { LogIn } from 'lucide-react'

export default function Login() {
  const login = useAuthStore((s) => s.login)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogin() {
    setIsLoading(true)
    try {
      await login()
    } catch {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="card p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Bond</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý trái phiếu</p>
        </div>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="btn-primary w-full justify-center py-3 flex items-center gap-2"
        >
          <LogIn size={18} />
          {isLoading ? 'Đang chuyển hướng...' : 'Đăng nhập với Keycloak'}
        </button>
        <p className="text-xs text-center text-gray-400">
          Bạn sẽ được chuyển đến trang đăng nhập SSO
        </p>
      </div>
    </div>
  )
}
