const express = require('express')
const fs = require('fs')
const path = require('path')
const cfg = require('../config')
const { sql, query } = require('../db')

const router = express.Router()

function readLookup(file) {
  const full = path.join(cfg.contractsDir, 'lookups', file)
  return JSON.parse(fs.readFileSync(full, 'utf8'))
}

router.get('/bondType/GetBondTypeList', (_req, res) => {
  res.json(readLookup('bond-type-list.json'))
})

router.get('/bond/GetBondStatusList', (_req, res) => {
  res.json(readLookup('bond-status-list.json'))
})

router.get('/bond/GetCouponFreqList', (_req, res) => {
  res.json(readLookup('coupon-freq-list.json'))
})

router.get('/issuer/GetIssuerList', async (req, res) => {
  const filter = (req.query.filter || '').toString().trim()
  try {
    const t = cfg.tables.Issuer
    const where = filter ? `WHERE full_name LIKE @kw OR own_cif_no LIKE @kw OR ISNULL(tax_code,'') LIKE @kw` : ''
    const r = await query(
      `SELECT TOP 100 own_cif_no AS value, full_name AS label, tax_code AS taxCode, address
       FROM ${cfg.schema}.${t} ${where} ORDER BY full_name`,
      filter ? { kw: { type: sql.NVarChar, value: `%${filter}%` } } : {},
    )
    res.json({ status: 'success', data: r.recordset })
  } catch (err) {
    console.error('[lookup] issuer error:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

module.exports = router
