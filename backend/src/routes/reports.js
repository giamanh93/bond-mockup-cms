const router = require('express').Router()
const prisma = require('../config/database')
const redis = require('../config/redis')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

/**
 * @openapi
 * /reports/dashboard:
 *   get:
 *     summary: Số liệu tổng quan Dashboard
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: KPI hôm nay + danh sách nhanh
 */
router.get('/dashboard', async (_req, res, next) => {
  try {
    const cacheKey = 'dashboard:main'
    const cached = await redis.get(cacheKey)
    if (cached) return res.json({ success: true, data: JSON.parse(cached) })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [revenueToday, ordersToday, totalDebt, lowStockCount, recentOrders, topDebtors] = await Promise.all([
      // Doanh thu hôm nay (đơn COMPLETED hoặc đã thanh toán một phần)
      prisma.order.aggregate({
        where: { orderDate: { gte: today, lt: tomorrow }, status: { notIn: ['CANCELLED'] } },
        _sum: { paidAmount: true },
      }),
      // Số đơn hôm nay
      prisma.order.count({
        where: { orderDate: { gte: today, lt: tomorrow }, status: { notIn: ['CANCELLED'] } },
      }),
      // Tổng công nợ
      prisma.customer.aggregate({ _sum: { totalDebt: true } }),
      // Số mặt hàng sắp hết
      prisma.$queryRaw`SELECT COUNT(*) as count FROM products WHERE is_active = true AND stock_qty <= min_stock`,
      // 5 đơn gần nhất
      prisma.order.findMany({
        where: { status: { notIn: ['CANCELLED'] } },
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { orderDate: 'desc' },
        take: 5,
      }),
      // Top 5 khách nợ nhiều
      prisma.customer.findMany({
        where: { totalDebt: { gt: 0 } },
        orderBy: { totalDebt: 'desc' },
        take: 5,
        select: { id: true, name: true, phone: true, totalDebt: true },
      }),
    ])

    const data = {
      kpi: {
        revenueToday: Number(revenueToday._sum.paidAmount || 0),
        ordersToday,
        totalDebt: Number(totalDebt._sum.totalDebt || 0),
        lowStockCount: Number(lowStockCount[0]?.count || 0),
      },
      recentOrders,
      topDebtors,
    }

    await redis.setex(cacheKey, 300, JSON.stringify(data))
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /reports/revenue/daily:
 *   get:
 *     summary: Doanh thu theo ngày
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/revenue/daily', async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date()
    date.setHours(0, 0, 0, 0)
    const next = new Date(date)
    next.setDate(next.getDate() + 1)

    const [summary, orders] = await Promise.all([
      prisma.order.aggregate({
        where: { orderDate: { gte: date, lt: next }, status: { notIn: ['CANCELLED'] } },
        _sum: { totalAmount: true, paidAmount: true, debtAmount: true },
        _count: true,
      }),
      prisma.order.findMany({
        where: { orderDate: { gte: date, lt: next }, status: { notIn: ['CANCELLED'] } },
        include: { customer: { select: { name: true } } },
        orderBy: { orderDate: 'desc' },
      }),
    ])

    res.json({
      success: true,
      data: {
        date: date.toISOString().split('T')[0],
        totalAmount: Number(summary._sum.totalAmount || 0),
        paidAmount: Number(summary._sum.paidAmount || 0),
        debtAmount: Number(summary._sum.debtAmount || 0),
        orderCount: summary._count,
        orders,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /reports/revenue/monthly:
 *   get:
 *     summary: Doanh thu theo tháng
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/revenue/monthly', async (req, res, next) => {
  try {
    const now = new Date()
    const year = Number(req.query.year || now.getFullYear())
    const month = Number(req.query.month || now.getMonth() + 1)

    const cacheKey = `report:monthly:${year}:${month}`
    const cached = await redis.get(cacheKey)
    if (cached) return res.json({ success: true, data: JSON.parse(cached) })

    const rows = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('day', order_date) as day,
        SUM(paid_amount)::bigint as revenue,
        COUNT(*)::int as order_count
      FROM orders
      WHERE
        EXTRACT(YEAR FROM order_date) = ${year}
        AND EXTRACT(MONTH FROM order_date) = ${month}
        AND status != 'CANCELLED'::"OrderStatus"
      GROUP BY DATE_TRUNC('day', order_date)
      ORDER BY day ASC
    `

    const data = rows.map((r) => ({
      day: r.day.toISOString().split('T')[0],
      revenue: Number(r.revenue),
      orderCount: r.order_count,
    }))

    await redis.setex(cacheKey, 3600, JSON.stringify(data))
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

/**
 * @openapi
 * /reports/top-products:
 *   get:
 *     summary: Top sản phẩm bán chạy
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/top-products', async (req, res, next) => {
  try {
    const now = new Date()
    const year = Number(req.query.year || now.getFullYear())
    const month = Number(req.query.month || now.getMonth() + 1)
    const limit = Number(req.query.limit || 10)

    const rows = await prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        p.unit,
        SUM(oi.quantity)::numeric as total_qty,
        SUM(oi.subtotal)::bigint as total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE
        EXTRACT(YEAR FROM o.order_date) = ${year}
        AND EXTRACT(MONTH FROM o.order_date) = ${month}
        AND o.status != 'CANCELLED'::"OrderStatus"
      GROUP BY p.id, p.name, p.unit
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        unit: r.unit,
        totalQty: Number(r.total_qty),
        totalRevenue: Number(r.total_revenue),
      })),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
