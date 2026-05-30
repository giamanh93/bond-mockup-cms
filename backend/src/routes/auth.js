const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, JWT_SECRET } = require('../middleware/auth')

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Đăng nhập bằng username/password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Sai thông tin đăng nhập
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || !user.isActive || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu', code: 'INVALID_CREDENTIALS' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Sai tên đăng nhập hoặc mật khẩu', code: 'INVALID_CREDENTIALS' })
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, username: user.username, fullName: user.fullName, email: user.email, role: user.role },
      },
    })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Thông tin user hiện tại
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, fullName: true, email: true, role: true, isActive: true },
    })
    res.json({ success: true, data: user })
  } catch (err) { next(err) }
})

module.exports = router
