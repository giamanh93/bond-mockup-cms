import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

export function useOrders() {
  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE })
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', dateFrom: '', dateTo: '', page: 1 })

  const fetchOrders = useCallback(async (f) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.status) params.set('status', f.status)
      if (f.dateFrom) params.set('dateFrom', f.dateFrom)
      if (f.dateTo) params.set('dateTo', f.dateTo)
      params.set('page', f.page)
      params.set('limit', PAGE_SIZE)
      const { data } = await api.get(`/orders?${params}`)
      setOrders(data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Không thể tải danh sách đơn hàng')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders(filters) }, [filters, fetchOrders])

  async function updateStatus(id, status) {
    await api.put(`/orders/${id}/status`, { status })
    toast.success('Đã cập nhật trạng thái')
    fetchOrders(filters)
  }

  async function cancelOrder(id, reason) {
    await api.post(`/orders/${id}/cancel`, { reason })
    toast.success('Đã hủy đơn hàng')
    fetchOrders(filters)
  }

  return { orders, meta, isLoading, filters, setFilters, updateStatus, cancelOrder, reload: () => fetchOrders(filters) }
}
