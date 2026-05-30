import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useShopStore } from '@/store/shopStore'
import { useAuthStore } from '@/store/authStore'

export default function Settings() {
  const { config, fetch, save } = useShopStore()
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'OWNER'

  const { register, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm({
    defaultValues: config,
  })

  useEffect(() => { fetch() }, [fetch])
  useEffect(() => { reset(config) }, [config, reset])

  async function onSubmit(data) {
    try {
      await save(data)
      toast.success('Đã lưu thông tin cửa hàng')
      reset(data)
    } catch {
      toast.error('Không thể lưu thông tin')
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Cài đặt cửa hàng</h1>

      <div className="card p-6 space-y-4">
        <h2 className="font-medium text-gray-700">Thông tin cửa hàng</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label>
            <input className="input" placeholder="Cửa hàng vật liệu xây dựng..." {...register('name', { required: true })} disabled={!isOwner} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input className="input" placeholder="0869199320" {...register('phone')} disabled={!isOwner} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input className="input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" {...register('address')} disabled={!isOwner} />
          </div>
          {isOwner && (
            <div className="pt-2">
              <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary disabled:opacity-40">
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          )}
          {!isOwner && (
            <p className="text-xs text-gray-400">Chỉ OWNER mới có thể chỉnh sửa thông tin cửa hàng.</p>
          )}
        </form>
      </div>

      <div className="card p-6 space-y-2">
        <h2 className="font-medium text-gray-700">Xem trước thông tin trên hóa đơn</h2>
        <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-700 space-y-1">
          <p className="font-bold text-base">{config.name || '—'}</p>
          {config.phone && <p className="text-gray-500">{config.phone}{config.address ? '  |  ' + config.address : ''}</p>}
          <p className="text-blue-700 font-semibold text-base mt-2">HÓA ĐƠN BÁN HÀNG</p>
        </div>
      </div>
    </div>
  )
}
