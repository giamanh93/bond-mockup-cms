import { useState, useEffect } from 'react'
import api from '@/services/api'

export function useDashboard() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/reports/dashboard')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.response?.data?.error || 'Không thể tải dữ liệu'))
      .finally(() => setIsLoading(false))
  }, [])

  return { data, isLoading, error }
}
