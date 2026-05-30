import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const setOidcUser = useAuthStore((s) => s.setOidcUser)
  const [error, setError] = useState('')

  useEffect(() => {
    authService.handleCallback()
      .then((oidcUser) => {
        setOidcUser(oidcUser)
        navigate('/', { replace: true })
      })
      .catch((err) => {
        setError(err?.message || 'Xác thực thất bại')
      })
  }, [navigate, setOidcUser])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      {error ? (
        <div className="text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => navigate('/login', { replace: true })} className="text-primary-600 hover:underline">
            Quay lại đăng nhập
          </button>
        </div>
      ) : (
        <p className="text-gray-500">Đang xác thực với Keycloak...</p>
      )}
    </div>
  )
}
