import { create } from 'zustand'
import api from '@/services/api'

export const useShopStore = create((set, get) => ({
  config: { name: '', phone: '', address: '' },
  loaded: false,

  fetch: async () => {
    if (get().loaded) return
    try {
      const { data } = await api.get('/settings')
      set({ config: data.data, loaded: true })
    } catch {}
  },

  save: async (values) => {
    const { data } = await api.put('/settings', values)
    set({ config: data.data })
  },
}))
