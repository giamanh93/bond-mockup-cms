import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useProducts } from '@/hooks/useProducts'
import { useConfirm } from '@/components/ConfirmDialog'
import Pagination from '@/components/Pagination'
import CurrencyInput from '@/components/CurrencyInput'
import { formatVND } from '@/utils/format'

function ProductModal({ product, categories, onSave, onClose }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: product
      ? { ...product, sellPrice: String(product.sellPrice), costPrice: String(product.costPrice || ''), categoryId: String(product.categoryId) }
      : { code: '', name: '', categoryId: '', unit: '', sellPrice: '', costPrice: '', minStock: '0' },
  })

  const sellPrice = watch('sellPrice')
  const costPrice = watch('costPrice')

  async function onSubmit(data) {
    try {
      await onSave({
        ...data,
        categoryId: Number(data.categoryId),
        sellPrice: Number(data.sellPrice),
        costPrice: data.costPrice ? Number(data.costPrice) : undefined,
        minStock: Number(data.minStock || 0),
      }, product?.id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Có lỗi xảy ra')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative card w-full max-w-lg mx-4 max-h-[calc(100dvh-4rem)] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã hàng</label>
              <input className="input" placeholder="VL001" {...register('code', { required: 'Bắt buộc' })} />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
              <input className="input" placeholder="Bao, m³, Cây..." {...register('unit', { required: 'Bắt buộc' })} />
              {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
            <input className="input" placeholder="Xi măng Hà Tiên PCB40..." {...register('name', { required: 'Bắt buộc' })} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
            <select className="input" {...register('categoryId', { required: 'Bắt buộc' })}>
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán (VND)</label>
              <CurrencyInput
                value={sellPrice}
                onChange={(v) => setValue('sellPrice', v)}
                placeholder="95000"
              />
              {errors.sellPrice && <p className="text-xs text-red-500 mt-1">Bắt buộc</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giá vốn (VND)</label>
              <CurrencyInput
                value={costPrice}
                onChange={(v) => setValue('costPrice', v)}
                placeholder="Tùy chọn"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho tối thiểu</label>
            <input type="number" className="input" min="0" step="0.001" placeholder="0" {...register('minStock')} />
          </div>

          <div className="-mx-6 -mb-6 border-t border-gray-100 px-6 py-4 bg-gray-50 flex gap-3 justify-end rounded-b-lg">
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Products() {
  const { products, categories, meta, isLoading, filters, setFilters, saveProduct, deleteProduct } = useProducts()
  const askConfirm = useConfirm()
  const [modalProduct, setModalProduct] = useState(undefined)

  async function handleDelete(product) {
    const ok = await askConfirm({
      title: 'Xóa sản phẩm?',
      description: `Sản phẩm "${product.name}" sẽ bị ẩn khỏi hệ thống.`,
      confirmText: 'Xóa',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await deleteProduct(product.id)
    } catch {
      toast.error('Không thể xóa sản phẩm')
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Hàng hóa</h1>
        <button onClick={() => setModalProduct(null)} className="btn-primary">+ Thêm hàng hóa</button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <input
          className="input flex-1"
          placeholder="Tìm theo tên hoặc mã hàng..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
        />
        <select
          className="input sm:w-48"
          value={filters.categoryId}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table — fills remaining height */}
      <div className="card flex-1 min-h-0 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Không tìm thấy sản phẩm nào</div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Mã', 'Tên sản phẩm', 'Danh mục', 'ĐVT', 'Giá bán', 'Tồn kho', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const isLow = Number(p.stockQty) <= Number(p.minStock)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.category?.name}</td>
                      <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                      <td className="px-4 py-3 font-medium">{formatVND(Number(p.sellPrice))}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {Number(p.stockQty)} {p.unit}
                          {isLow && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setModalProduct(p)} className="btn-secondary text-xs py-1 px-2">Sửa</button>
                          <button onClick={() => handleDelete(p)} className="btn text-xs py-1 px-2 text-red-600 hover:bg-red-50 border border-red-200">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 border-t border-gray-100 shrink-0">
          <Pagination
            page={meta.page}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          />
        </div>
      </div>

      {modalProduct !== undefined && (
        <ProductModal
          product={modalProduct}
          categories={categories}
          onSave={saveProduct}
          onClose={() => setModalProduct(undefined)}
        />
      )}
    </div>
  )
}
