export default function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit) || 1
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm">
      <p className="text-gray-500">
        {total === 0 ? 'Không có kết quả' : `Hiển thị ${from}–${to} / ${total} kết quả`}
      </p>
      {totalPages > 1 && (
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            ‹ Trước
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  p === page ? 'bg-primary-600 text-white' : 'btn-secondary'
                }`}
              >
                {p}
              </button>
            )
          })}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Sau ›
          </button>
        </div>
      )}
    </div>
  )
}
