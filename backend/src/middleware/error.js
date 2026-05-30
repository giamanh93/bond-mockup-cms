function errorMiddleware(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message)

  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      error: 'Dữ liệu không hợp lệ',
      code: 'VALIDATION_ERROR',
      fields: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ', code: 'INVALID_TOKEN' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' })
  }

  const status = err.status || 500
  res.status(status).json({
    success: false,
    error: err.message || 'Lỗi máy chủ',
    code: err.code || 'SERVER_ERROR',
  })
}

module.exports = errorMiddleware
