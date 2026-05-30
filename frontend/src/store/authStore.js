import { create } from 'zustand'
import { authService } from '@/services/auth'

function toProfile(oidcUser) {
  if (!oidcUser) return null
  const p = oidcUser.profile || {}
  return {
    sub: p.sub,
    username: p.preferred_username || p.email || p.sub,
    fullName: p.name || p.preferred_username || '',
    email: p.email || '',
    role: p.role || (Array.isArray(p.roles) ? p.roles[0] : null),
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  init: async () => {
    set({ isLoading: true })
    try {
      const oidcUser = await authService.getUser()
      if (oidcUser && !oidcUser.expired) {
        set({ user: toProfile(oidcUser), accessToken: oidcUser.access_token, isLoading: false })
      } else {
        set({ user: null, accessToken: null, isLoading: false })
      }
    } catch {
      set({ user: null, accessToken: null, isLoading: false })
    }
  },

  setOidcUser: (oidcUser) => {
    set({ user: toProfile(oidcUser), accessToken: oidcUser?.access_token ?? null })
  },

  login: () => authService.login(),

  logout: async () => {
    set({ user: null, accessToken: null })
    await authService.logout()
  },
}))
