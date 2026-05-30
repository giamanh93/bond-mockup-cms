const jwt = require('jsonwebtoken')
const prisma = require('../config/database')

const JWT_SECRET = process.env.JWT_SECRET || 'buildstock-secret-change-in-production'

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Chưa đăng nhập', code: 'UNAUTHORIZED' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Tài khoản không hợp lệ', code: 'INVALID_TOKEN' })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ', code: 'INVALID_TOKEN' })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: 'Không có quyền truy cập', code: 'FORBIDDEN' })
    }
    next()
  }
}

module.exports = { authMiddleware, requireRole, JWT_SECRET }
