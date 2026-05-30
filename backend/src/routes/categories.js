const router = require('express').Router()
const prisma = require('../config/database')
const { authMiddleware } = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json({ success: true, data: categories })
  } catch (err) {
    next(err)
  }
})

module.exports = router
