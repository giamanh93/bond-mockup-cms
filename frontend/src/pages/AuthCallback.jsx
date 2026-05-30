import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import api from '@/services/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    authService.handleCallback().then(async (oidcUser) => {
      const { data } = await api.get('/auth/me')
      setUser(oidcUser, data.data)
      navigate('/', { replace: true })
    }).catch(() => navigate('/login', { replace: true }))
  }, [navigate, setUser])

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-gray-500">Đang xác thực...</p>
    </div>
  )
}
