const router = require('express').Router()
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, requireRole } = require('../middleware/auth')

const stockItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  costPrice: z.number().positive(),
})

const createEntrySchema = z.object({
  supplierName: z.string().optional(),
  note: z.string().optional(),
  items: z.array(stockItemSchema).min(1),
})

router.use(authMiddleware)

/**
 * @openapi
 * /stock/entries:
 *   get:
 *     summary: Lịch sử phiếu nhập kho
 *     tags: [Stock]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/entries', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    // Nhóm entries theo ngày nhập + nhà cung cấp (giả lập phiếu nhập)
    const [entries, total] = await Promise.all([
      prisma.stockEntry.findMany({
        include: { product: { select: { id: true, code: true, name: true, unit: true } } },
        orderBy: { entryDate: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.stockEntry.count(),
    ])

    res.json({ success: true, data: entries, meta: { total, page: Number(page), limit: Number(limit) } })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /stock/entries:
 *   post:
 *     summary: Tạo phiếu nhập kho
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               supplierName: { type: string }
 *               note: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: integer }
 *                     quantity: { type: number }
 *                     costPrice: { type: number }
 *     responses:
 *       201:
 *         description: Nhập kho thành công
 */
router.post('/entries', requireRole('OWNER', 'WAREHOUSE'), async (req, res, next) => {
  try {
    const body = createEntrySchema.parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      // Tạo stock entries và cập nhật tồn kho
      const created = await Promise.all(
        body.items.map(async (item) => {
          const product = await tx.product.findFirst({ where: { id: item.productId, isActive: true } })
          if (!product) throw Object.assign(new Error(`Sản phẩm ID ${item.productId} không tồn tại`), { status: 404 })

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQty: { increment: item.quantity },
              costPrice: item.costPrice, // cập nhật giá vốn mới nhất
            },
          })

          return tx.stockEntry.create({
            data: {
              productId: item.productId,
              supplierName: body.supplierName,
              quantity: item.quantity,
              costPrice: item.costPrice,
              note: body.note,
            },
            include: { product: { select: { name: true, unit: true } } },
          })
        })
      )
      return created
    })

    res.status(201).json({ success: true, data: result })
  } catch (err) { next(err) }
})

module.exports = router
