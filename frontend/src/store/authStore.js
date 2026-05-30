import { create } from 'zustand'
import { authService } from '@/services/auth'
import api from '@/services/api'

export const useAuthStore = create((set) => ({
  user: null,
  isLoading: true,

  init: async () => {
    set({ isLoading: true })
    const token = authService.getToken()
    if (!token) return set({ user: null, isLoading: false })
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.data, isLoading: false })
    } catch {
      authService.removeToken()
      set({ user: null, isLoading: false })
    }
  },

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    authService.setToken(data.data.token)
    set({ user: data.data.user })
  },

  logout: () => {
    authService.removeToken()
    set({ user: null })
    window.location.href = '/login'
  },
}))
