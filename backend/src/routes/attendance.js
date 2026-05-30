const router = require('express').Router()
const { z } = require('zod')
const prisma = require('../config/database')
const { authMiddleware, requireRole } = require('../middleware/auth')

router.use(authMiddleware)

/**
 * @openapi
 * /attendance/daily:
 *   get:
 *     summary: Lấy danh sách chấm công theo ngày
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *         description: "YYYY-MM-DD, mặc định hôm nay"
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/daily', async (req, res, next) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date()
    date.setHours(0, 0, 0, 0)
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    const [users, records] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, role: true, dailyRate: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: date, lt: nextDay } },
      }),
    ])

    const recordMap = Object.fromEntries(records.map((r) => [r.userId, r]))

    res.json({
      success: true,
      data: users.map((u) => ({
        ...u,
        attendance: recordMap[u.id] || null,
      })),
    })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /attendance/bulk:
 *   post:
 *     summary: Chấm công hàng loạt cho một ngày (OWNER)
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post('/bulk', requireRole('OWNER'), async (req, res, next) => {
  try {
    const { date, records } = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      records: z.array(z.object({
        userId: z.number().int(),
        status: z.enum(['PRESENT', 'HALF_DAY', 'LEAVE_PAID', 'LEAVE_UNPAID']),
        note: z.string().optional(),
      })),
    }).parse(req.body)

    const dateObj = new Date(date)
    dateObj.setHours(0, 0, 0, 0)

    await prisma.$transaction(
      records.map((r) =>
        prisma.attendance.upsert({
          where: { userId_date: { userId: r.userId, date: dateObj } },
          update: { status: r.status, note: r.note ?? null },
          create: { userId: r.userId, date: dateObj, status: r.status, note: r.note ?? null },
        })
      )
    )

    res.json({ success: true })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /attendance/summary:
 *   get:
 *     summary: Tổng hợp công tháng và tính lương
 *     tags: [Attendance]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: string }
 *         description: "YYYY-MM, mặc định tháng hiện tại"
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/summary', async (req, res, next) => {
  try {
    const monthStr = req.query.month || new Date().toISOString().slice(0, 7)
    const [year, month] = monthStr.split('-').map(Number)
    const from = new Date(year, month - 1, 1)
    const to   = new Date(year, month, 1)

    const [users, records] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, role: true, dailyRate: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.attendance.findMany({
        where: { date: { gte: from, lt: to } },
      }),
    ])

    const summary = users.map((u) => {
      const userRecords = records.filter((r) => r.userId === u.id)
      const present   = userRecords.filter((r) => r.status === 'PRESENT').length
      const halfDay   = userRecords.filter((r) => r.status === 'HALF_DAY').length
      const leavePaid = userRecords.filter((r) => r.status === 'LEAVE_PAID').length
      const leaveUnpaid = userRecords.filter((r) => r.status === 'LEAVE_UNPAID').length
      const totalDays = present + halfDay * 0.5 + leavePaid
      const salary = u.dailyRate ? Math.round(totalDays * Number(u.dailyRate)) : null

      return {
        userId: u.id,
        fullName: u.fullName,
        role: u.role,
        dailyRate: u.dailyRate,
        present,
        halfDay,
        leavePaid,
        leaveUnpaid,
        totalDays,
        salary,
      }
    })

    res.json({ success: true, data: summary, month: monthStr })
  } catch (err) { next(err) }
})

/**
 * @openapi
 * /attendance/users/{id}/daily-rate:
 *   put:
 *     summary: Cập nhật lương ngày cho nhân viên (OWNER)
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put('/users/:id/daily-rate', requireRole('OWNER'), async (req, res, next) => {
  try {
    const { dailyRate } = z.object({
      dailyRate: z.number().min(0).nullable(),
    }).parse(req.body)

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { dailyRate: dailyRate ?? null },
      select: { id: true, fullName: true, dailyRate: true },
    })
    res.json({ success: true, data: user })
  } catch (err) { next(err) }
})

module.exports = router
