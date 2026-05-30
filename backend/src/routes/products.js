const router = require('express').Router()
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, requireRole } = require('../middleware/auth')

const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.number().int().positive(),
  unit: z.string().min(1),
  sellPrice: z.number().positive(),
  costPrice: z.number().positive().optional(),
  stockQty: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
})

router.use(authMiddleware)

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Danh sách sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Tìm theo tên hoặc mã
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *       - in: query
 *         name: lowStock
 *         schema: { type: boolean }
 *         description: Chỉ lấy sản phẩm tồn kho thấp
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
router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId, lowStock, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId: Number(categoryId) }),
      ...(lowStock === 'true' && { stockQty: { lte: prisma.product.fields.minStock } }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ])

    res.json({ success: true, data: products, meta: { total, page: Number(page), limit: Number(limit) } })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /products/low-stock:
 *   get:
 *     summary: Danh sách sản phẩm tồn kho thấp
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Danh sách sản phẩm có stockQty <= minStock
 */
router.get('/low-stock', async (_req, res, next) => {
  try {
    const products = await prisma.$queryRaw`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = true AND p.stock_qty <= p.min_stock
      ORDER BY (p.stock_qty - p.min_stock) ASC
    `
    res.json({ success: true, data: products })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Chi tiết sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy
 */
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: Number(req.params.id), isActive: true },
      include: { category: true },
    })
    if (!product) return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm', code: 'NOT_FOUND' })
    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Thêm sản phẩm mới
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       422:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', requireRole('OWNER', 'STAFF'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body)
    const product = await prisma.product.create({ data, include: { category: true } })
    res.status(201).json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Cập nhật sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', requireRole('OWNER', 'STAFF'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body)
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data,
      include: { category: true },
    })
    res.json({ success: true, data: product })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Xóa mềm sản phẩm
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Đã xóa
 */
router.delete('/:id', requireRole('OWNER'), async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    })
    res.json({ success: true, data: null })
  } catch (err) {
    next(err)
  }
})

module.exports = router
