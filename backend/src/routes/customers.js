const router = require('express').Router()
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: Danh sách khách hàng
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
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
    const { search, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
      : {}

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip, take: Number(limit) }),
      prisma.customer.count({ where }),
    ])
    res.json({ success: true, data: customers, meta: { total, page: Number(page), limit: Number(limit) } })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /customers/debts:
 *   get:
 *     summary: Danh sách khách hàng đang có công nợ
 *     tags: [Customers]
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
router.get('/debts', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)
    const where = { totalDebt: { gt: 0 } }

    const [customers, total, agg] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { totalDebt: 'desc' }, skip, take: Number(limit) }),
      prisma.customer.count({ where }),
      prisma.customer.aggregate({ where, _sum: { totalDebt: true } }),
    ])

    res.json({
      success: true,
      data: customers,
      meta: { total, page: Number(page), limit: Number(limit) },
      totalDebt: Number(agg._sum.totalDebt || 0),
    })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Chi tiết khách hàng + lịch sử
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        orders: { orderBy: { orderDate: 'desc' }, take: 10, include: { items: { include: { product: { select: { name: true, unit: true } } } } } },
        payments: { orderBy: { paymentDate: 'desc' }, take: 10 },
      },
    })
    if (!customer) return res.status(404).json({ success: false, error: 'Không tìm thấy khách hàng', code: 'NOT_FOUND' })
    res.json({ success: true, data: customer })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /customers:
 *   post:
 *     summary: Thêm khách hàng mới
 *     tags: [Customers]
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post('/', async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      address: z.string().optional(),
      openingDebt: z.number().min(0).optional().default(0),
    }).parse(req.body)

    const { openingDebt, ...rest } = data
    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: { ...rest, openingDebt, totalDebt: openingDebt },
      })
      if (openingDebt > 0) {
        await tx.payment.create({
          data: { customerId: c.id, amount: -openingDebt, paymentMethod: 'opening_balance', note: 'Số nợ ban đầu khi nhập hệ thống' },
        })
      }
      return c
    })
    res.status(201).json({ success: true, data: customer })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /customers/{id}:
 *   put:
 *     summary: Cập nhật thông tin khách hàng
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put('/:id', async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      openingDebt: z.number().min(0).optional(),
    }).parse(req.body)

    const { openingDebt, ...rest } = data

    const customer = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { id: Number(req.params.id) } })
      if (!existing) throw Object.assign(new Error('Không tìm thấy khách hàng'), { status: 404 })

      const updateData = { ...rest }

      if (openingDebt !== undefined) {
        const diff = openingDebt - Number(existing.openingDebt)
        updateData.openingDebt = openingDebt
        updateData.totalDebt = { increment: diff }
        if (diff !== 0) {
          await tx.payment.create({
            data: {
              customerId: existing.id,
              amount: -diff,
              paymentMethod: 'opening_balance',
              note: `Điều chỉnh số nợ ban đầu: ${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} đ`,
            },
          })
        }
      }

      return tx.customer.update({ where: { id: existing.id }, data: updateData })
    })

    res.json({ success: true, data: customer })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /customers/{id}/debt-adjustment:
 *   post:
 *     summary: Điều chỉnh công nợ thủ công (chỉ OWNER)
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, reason]
 *             properties:
 *               amount: { type: number, description: "Số tiền điều chỉnh (dương)" }
 *               type: { type: string, enum: [increase, decrease] }
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post('/:id/debt-adjustment', requireRole('OWNER'), async (req, res, next) => {
  try {
    const { amount, type, reason } = z.object({
      amount: z.number().positive(),
      type: z.enum(['increase', 'decrease']),
      reason: z.string().min(1, 'Vui lòng nhập lý do điều chỉnh'),
    }).parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: Number(req.params.id) } })
      if (!customer) throw Object.assign(new Error('Không tìm thấy khách hàng'), { status: 404 })

      const delta = type === 'increase' ? amount : -amount
      if (type === 'decrease' && Number(customer.totalDebt) < amount) {
        throw Object.assign(new Error('Số tiền giảm vượt quá công nợ hiện tại'), { status: 422, code: 'INVALID_AMOUNT' })
      }

      const updated = await tx.customer.update({
        where: { id: customer.id },
        data: { totalDebt: { increment: delta } },
      })

      await tx.payment.create({
        data: {
          customerId: customer.id,
          amount: -delta,
          paymentMethod: 'adjustment',
          note: `[Điều chỉnh ${type === 'increase' ? 'tăng' : 'giảm'} ${amount.toLocaleString('vi-VN')} đ] ${reason}`,
        },
      })

      return updated
    })

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /customers/{id}/payments:
 *   post:
 *     summary: Thu tiền / ghi nhận thanh toán công nợ
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post('/:id/payments', async (req, res, next) => {
  try {
    const { amount, note, paymentMethod = 'cash' } = z.object({
      amount: z.number().positive(),
      note: z.string().optional(),
      paymentMethod: z.string().optional(),
    }).parse(req.body)

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: Number(req.params.id) } })
      if (!customer) throw Object.assign(new Error('Không tìm thấy khách hàng'), { status: 404 })
      const actualAmount = Math.min(amount, Number(customer.totalDebt))
      await tx.customer.update({ where: { id: customer.id }, data: { totalDebt: { decrement: actualAmount } } })
      return tx.payment.create({ data: { customerId: customer.id, amount: actualAmount, paymentMethod, note } })
    })

    res.json({ success: true, data: result })
  } catch (err) { next(err) }
})

module.exports = router
