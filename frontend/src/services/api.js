import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(err)
  }
)

/** Gọi từ main.jsx sau khi loadRuntime() trả về. */
export function configureApi({ baseURL }) {
  if (baseURL) api.defaults.baseURL = baseURL
}

export default api
