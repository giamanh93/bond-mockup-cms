const router = require('express').Router()
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, requireRole } = require('../middleware/auth')
const { generateInvoicePDF, uploadInvoicePDF } = require('../services/pdfService')

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).max(100).optional().default(0),
})

const createOrderSchema = z.object({
  customerId: z.number().int().positive(),
  items: z.array(orderItemSchema).min(1),
  paidAmount: z.number().min(0).optional().default(0),
  note: z.string().optional(),
})

const VALID_TRANSITIONS = {
  NEW: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

function generateOrderNo() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `DH${y}${m}${d}-${rand}`
}

// Public route — no auth required
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const orderId = Number(req.params.id)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        user: { select: { fullName: true } },
        items: {
          include: { product: { select: { name: true, unit: true } } },
        },
      },
    })
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng', code: 'NOT_FOUND' })

    const shopConfig = await prisma.shopConfig.findUnique({ where: { id: 1 } }) || {}
    const pdfBuffer = await generateInvoicePDF(order, shopConfig)

    const filename = `HoaDon-${order.orderNo}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)

    // Save to MinIO in background (for archiving)
    uploadInvoicePDF(orderId, order.orderNo, pdfBuffer)
      .then(({ objectName }) => prisma.order.update({ where: { id: orderId }, data: { pdfUrl: objectName } }).catch(() => {}))
      .catch(() => {})
  } catch (err) {
    next(err)
  }
})

router.use(authMiddleware)

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Danh sách đơn hàng
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: customerId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [NEW, PROCESSING, DELIVERED, COMPLETED, CANCELLED] }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
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
    const { customerId, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const where = {
      ...(customerId && { customerId: Number(customerId) }),
      ...(status && { status }),
      ...(dateFrom || dateTo
        ? {
            orderDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
            },
          }
        : {}),
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ])

    res.json({ success: true, data: orders, meta: { total, page: Number(page), limit: Number(limit) } })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Chi tiết đơn hàng
 *     tags: [Orders]
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
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        customer: true,
        user: { select: { id: true, fullName: true } },
        items: {
          include: { product: { select: { id: true, code: true, name: true, unit: true } } },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    })
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng', code: 'NOT_FOUND' })
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /orders/{id}:
 *   put:
 *     summary: Sửa đơn hàng (chỉ khi status = NEW)
 *     tags: [Orders]
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
 *             required: [customerId, items]
 *             properties:
 *               customerId: { type: integer }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               paidAmount: { type: number }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       409:
 *         description: Đơn hàng không ở trạng thái NEW
 */
router.put('/:id', requireRole('OWNER', 'STAFF'), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id)
    const body = createOrderSchema.parse(req.body)

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
      if (!existing) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404, code: 'NOT_FOUND' })
      if (existing.status !== 'NEW') {
        throw Object.assign(
          new Error('Chỉ có thể sửa đơn hàng ở trạng thái Mới'),
          { status: 409, code: 'INVALID_STATE' }
        )
      }

      // Hoàn kho cũ
      await Promise.all(
        existing.items.map((item) =>
          tx.product.update({ where: { id: item.productId }, data: { stockQty: { increment: item.quantity } } })
        )
      )

      // Hoàn công nợ cũ
      if (Number(existing.debtAmount) > 0) {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: { totalDebt: { decrement: existing.debtAmount } },
        })
      }

      // Xóa items và payments cũ
      await tx.orderItem.deleteMany({ where: { orderId } })
      await tx.payment.deleteMany({ where: { orderId } })

      // Validate và tính items mới
      const itemsData = await Promise.all(
        body.items.map(async (item) => {
          const product = await tx.product.findFirst({ where: { id: item.productId, isActive: true } })
          if (!product) throw Object.assign(new Error(`Sản phẩm ID ${item.productId} không tồn tại`), { status: 404, code: 'PRODUCT_NOT_FOUND' })
          if (Number(product.stockQty) < item.quantity) {
            throw Object.assign(
              new Error(`Tồn kho không đủ: ${product.name} (còn ${product.stockQty} ${product.unit})`),
              { status: 409, code: 'INSUFFICIENT_STOCK' }
            )
          }
          const subtotal = Math.round(item.quantity * item.unitPrice * (1 - item.discount / 100))
          return { ...item, subtotal }
        })
      )

      const totalAmount = itemsData.reduce((s, i) => s + i.subtotal, 0)
      const paidAmount  = Math.min(body.paidAmount, totalAmount)
      const debtAmount  = totalAmount - paidAmount

      // Tạo items mới + cập nhật order
      await tx.orderItem.createMany({
        data: itemsData.map((i) => ({
          orderId,
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          subtotal: i.subtotal,
        })),
      })

      const order = await tx.order.update({
        where: { id: orderId },
        data: { customerId: body.customerId, totalAmount, paidAmount, debtAmount, note: body.note ?? null },
      })

      // Trừ kho mới
      await Promise.all(
        body.items.map((item) =>
          tx.product.update({ where: { id: item.productId }, data: { stockQty: { decrement: item.quantity } } })
        )
      )

      // Cập nhật công nợ mới
      if (debtAmount > 0) {
        await tx.customer.update({ where: { id: body.customerId }, data: { totalDebt: { increment: debtAmount } } })
      }

      // Ghi nhận thanh toán mới
      if (paidAmount > 0) {
        await tx.payment.create({
          data: { customerId: body.customerId, orderId, amount: paidAmount, paymentMethod: 'cash' },
        })
      }

      return order
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Tạo đơn hàng mới
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, items]
 *             properties:
 *               customerId: { type: integer }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: integer }
 *                     quantity: { type: number }
 *                     unitPrice: { type: number }
 *                     discount: { type: number }
 *               paidAmount: { type: number }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       409:
 *         description: Tồn kho không đủ
 */
router.post('/', requireRole('OWNER', 'STAFF'), async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body)

    let itemsData = []
    const order = await prisma.$transaction(async (tx) => {
      // Validate và tính subtotal từng item
      itemsData = await Promise.all(
        body.items.map(async (item) => {
          const product = await tx.product.findFirst({
            where: { id: item.productId, isActive: true },
          })
          if (!product) throw Object.assign(new Error(`Sản phẩm ID ${item.productId} không tồn tại`), { status: 404, code: 'PRODUCT_NOT_FOUND' })
          if (Number(product.stockQty) < item.quantity) {
            throw Object.assign(
              new Error(`Tồn kho không đủ: ${product.name} (còn ${product.stockQty} ${product.unit})`),
              { status: 409, code: 'INSUFFICIENT_STOCK' }
            )
          }
          const subtotal = Math.round(item.quantity * item.unitPrice * (1 - item.discount / 100))
          const remainAfter = Number(product.stockQty) - item.quantity
          const lowStock = remainAfter < Number(product.minStock)
          return { ...item, subtotal, productName: product.name, unit: product.unit, remainAfter, minStock: Number(product.minStock), lowStock }
        })
      )

      const totalAmount = itemsData.reduce((sum, i) => sum + i.subtotal, 0)
      const paidAmount = Math.min(body.paidAmount, totalAmount)
      const debtAmount = totalAmount - paidAmount

      // Tạo đơn hàng
      const newOrder = await tx.order.create({
        data: {
          orderNo: generateOrderNo(),
          customerId: body.customerId,
          userId: req.user.id,
          totalAmount,
          paidAmount,
          debtAmount,
          note: body.note,
          items: {
            create: itemsData.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount,
              subtotal: i.subtotal,
            })),
          },
        },
        include: { items: true },
      })

      // Trừ tồn kho
      await Promise.all(
        body.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { decrement: item.quantity } },
          })
        )
      )

      // Cập nhật công nợ khách hàng
      if (debtAmount > 0) {
        await tx.customer.update({
          where: { id: body.customerId },
          data: { totalDebt: { increment: debtAmount } },
        })
      }

      // Ghi nhận thanh toán nếu có
      if (paidAmount > 0) {
        await tx.payment.create({
          data: {
            customerId: body.customerId,
            orderId: newOrder.id,
            amount: paidAmount,
            paymentMethod: 'cash',
          },
        })
      }

      return newOrder
    })

    const warnings = itemsData
      .filter((i) => i.lowStock)
      .map((i) => `${i.productName}: còn ${i.remainAfter} ${i.unit} (tối thiểu ${i.minStock})`)

    res.status(201).json({ success: true, data: order, warnings })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /orders/{id}/status:
 *   put:
 *     summary: Cập nhật trạng thái đơn hàng
 *     tags: [Orders]
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PROCESSING, DELIVERED, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       409:
 *         description: Không thể chuyển trạng thái
 */
router.put('/:id/status', requireRole('OWNER', 'STAFF'), async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['PROCESSING', 'DELIVERED', 'COMPLETED', 'CANCELLED']) }).parse(req.body)

    const current = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, select: { status: true } })
    if (!current) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng', code: 'NOT_FOUND' })

    if (!VALID_TRANSITIONS[current.status]?.includes(status)) {
      return res.status(409).json({
        success: false,
        error: `Không thể chuyển từ ${current.status} sang ${status}`,
        code: 'INVALID_TRANSITION',
      })
    }

    // State machine: UPDATE WHERE status = current (atomic)
    const updated = await prisma.$executeRaw`
      UPDATE orders SET status = ${status}::\"OrderStatus\"
      WHERE id = ${Number(req.params.id)} AND status = ${current.status}::\"OrderStatus\"
    `
    if (updated === 0) {
      return res.status(409).json({ success: false, error: 'Trạng thái đã thay đổi, thử lại', code: 'INVALID_TRANSITION' })
    }

    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) } })
    res.json({ success: true, data: order })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     summary: Hủy đơn hàng và hoàn tồn kho
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Hủy thành công
 *       409:
 *         description: Không thể hủy đơn ở trạng thái này
 */
router.post('/:id/cancel', requireRole('OWNER', 'STAFF'), async (req, res, next) => {
  try {
    const orderId = Number(req.params.id)

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })
      if (!order) throw Object.assign(new Error('Không tìm thấy đơn hàng'), { status: 404, code: 'NOT_FOUND' })

      if (!VALID_TRANSITIONS[order.status]?.includes('CANCELLED')) {
        throw Object.assign(
          new Error(`Không thể hủy đơn hàng ở trạng thái ${order.status}`),
          { status: 409, code: 'INVALID_TRANSITION' }
        )
      }

      // State machine atomic update
      const updated = await tx.$executeRaw`
        UPDATE orders SET status = 'CANCELLED'::"OrderStatus",
          note = CONCAT(COALESCE(note, ''), ' [Hủy: ${req.body.reason || 'Không có lý do'}]')
        WHERE id = ${orderId} AND status != 'CANCELLED'::"OrderStatus"
      `
      if (updated === 0) throw Object.assign(new Error('Đơn hàng đã bị hủy'), { status: 409, code: 'ALREADY_CANCELLED' })

      // Hoàn tồn kho
      await Promise.all(
        order.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.quantity } },
          })
        )
      )

      // Hoàn công nợ nếu có
      if (Number(order.debtAmount) > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalDebt: { decrement: order.debtAmount } },
        })
      }

      return tx.order.findUnique({ where: { id: orderId } })
    })

    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})


module.exports = router
