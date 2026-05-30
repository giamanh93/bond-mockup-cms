const router = require('express').Router()
// User management routes — sẽ implement ở Phase 3
router.get('/', (req, res) => res.json({ success: true, data: [] }))
module.exports = router
