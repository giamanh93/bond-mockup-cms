const rateLimit = require('express-rate-limit')

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Quá nhiều request, thử lại sau 1 phút', code: 'RATE_LIMIT' },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Quá nhiều lần đăng nhập thất bại', code: 'LOGIN_RATE_LIMIT' },
})

module.exports = { apiLimiter, loginLimiter }
