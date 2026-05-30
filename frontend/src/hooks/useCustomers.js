import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE })
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', page: 1 })

  const fetchCustomers = useCallback(async (f) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      params.set('page', f.page)
      params.set('limit', PAGE_SIZE)
      const { data } = await api.get(`/customers?${params}`)
      setCustomers(data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Không thể tải danh sách khách hàng')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchCustomers(filters) }, [filters, fetchCustomers])

  async function collectPayment(customerId, amount, note) {
    await api.post(`/customers/${customerId}/payments`, { amount, note })
    toast.success('Đã ghi nhận thanh toán')
    fetchCustomers(filters)
  }

  async function saveCustomer(data, id) {
    if (id) {
      await api.put(`/customers/${id}`, data)
      toast.success('Đã cập nhật thông tin khách hàng')
    } else {
      await api.post('/customers', data)
      toast.success('Đã thêm khách hàng mới')
    }
    fetchCustomers(filters)
  }

  return { customers, meta, isLoading, filters, setFilters, collectPayment, saveCustomer, reload: () => fetchCustomers(filters) }
}
