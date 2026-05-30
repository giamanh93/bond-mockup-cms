const router = require('express').Router()
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, requireRole } = require('../middleware/auth')

/**
 * @openapi
 * /settings:
 *   get:
 *     summary: Lấy thông tin cửa hàng
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', async (req, res, next) => {
  try {
    const config = await prisma.shopConfig.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Cửa hàng vật liệu xây dựng Thanh Hương', phone: '0869199320', address: 'Xóm 4, Phù Yên, Phú Nghĩa, Hà Nội' },
    })
    res.json({ success: true, data: config })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /settings:
 *   put:
 *     summary: Cập nhật thông tin cửa hàng (OWNER only)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put('/', authMiddleware, requireRole('OWNER'), async (req, res, next) => {
  try {
    const data = z.object({
      name:    z.string().min(1),
      phone:   z.string().optional().default(''),
      address: z.string().optional().default(''),
    }).parse(req.body)

    const config = await prisma.shopConfig.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    })
    res.json({ success: true, data: config })
  } catch (err) { next(err) }
})

module.exports = router
