import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

export function useProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: PAGE_SIZE })
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', categoryId: '', page: 1 })

  const fetchProducts = useCallback(async (f) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      if (f.categoryId) params.set('categoryId', f.categoryId)
      params.set('page', f.page)
      params.set('limit', PAGE_SIZE)
      const { data } = await api.get(`/products?${params}`)
      setProducts(data.data)
      setMeta(data.meta)
    } catch {
      toast.error('Không thể tải danh sách hàng hóa')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data.data)).catch(() => {})
  }, [])

  useEffect(() => { fetchProducts(filters) }, [filters, fetchProducts])

  async function saveProduct(data, id) {
    if (id) {
      await api.put(`/products/${id}`, data)
      toast.success('Đã cập nhật sản phẩm')
    } else {
      await api.post('/products', data)
      toast.success('Đã thêm sản phẩm mới')
    }
    fetchProducts(filters)
  }

  async function deleteProduct(id) {
    await api.delete(`/products/${id}`)
    toast.success('Đã xóa sản phẩm')
    fetchProducts(filters)
  }

  return { products, categories, meta, isLoading, filters, setFilters, saveProduct, deleteProduct }
}
