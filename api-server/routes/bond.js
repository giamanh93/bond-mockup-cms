const express = require('express')
const fs = require('fs')
const path = require('path')
const cfg = require('../config')
const { sql, query } = require('../db')

const router = express.Router()
const FEATURE_DIR = path.join(cfg.contractsDir, 'features', '01-bond-list')

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(cfg.contractsDir, rel), 'utf8'))
}

function fmtDate(d) {
  if (!d) return ''
  const dt = (d instanceof Date) ? d : new Date(d)
  if (isNaN(dt.getTime())) return ''
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${dt.getFullYear()}`
}

function toIsoOrNull(d) {
  if (!d) return null
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? null : dt.toISOString()
}

const STATUS_LABEL = { 0: 'Khởi tạo', 1: 'Hoạt động', 2: 'Đáo hạn', 3: 'Hủy' }
const BOND_TYPE_LABEL = { 1: 'Chính phủ', 2: 'Doanh nghiệp', 3: 'Ngân hàng', 4: 'Trái phiếu xanh' }

function findFieldValue(groupFields, name) {
  for (const g of groupFields || []) for (const f of g.fields || []) {
    if (f.field_name === name) return f.columnValue
  }
  return null
}
function setFieldValue(groupFields, name, value) {
  for (const g of groupFields || []) for (const f of g.fields || []) {
    if (f.field_name === name) { f.columnValue = value; return }
  }
}
function setFieldFlag(groupFields, name, flag, value) {
  for (const g of groupFields || []) for (const f of g.fields || []) {
    if (f.field_name === name) { f[flag] = value; return }
  }
}

// ───── /bond/GetBondFilter ─────
router.get('/bond/GetBondFilter', (_req, res) => {
  res.json(loadJson('features/01-bond-list/filter-config.json'))
})

// ───── /bond/GetBondPage ─────
router.get('/bond/GetBondPage', async (req, res) => {
  try {
    const filter = (req.query.filter || '').toString().trim()
    const pageSize = Math.max(1, Math.min(500, Number(req.query.pageSize) || 15))
    const offSet = Math.max(0, Number(req.query.offSet) || 0)
    const bondTypeId = req.query.bondTypeId ? Number(req.query.bondTypeId) : null
    const issuerId = req.query.issuerId ? String(req.query.issuerId) : null
    const status = req.query.status !== undefined && req.query.status !== '' ? Number(req.query.status) : null
    const issueDateFrom = req.query.issueDateFrom || null
    const issueDateTo = req.query.issueDateTo || null

    const tBond = `${cfg.schema}.${cfg.tables.Bond}`
    const tIss = `${cfg.schema}.${cfg.tables.Issuer}`

    const where = ['1=1']
    const params = {}
    if (filter) {
      where.push('(b.prod_cd LIKE @kw OR b.prod_name LIKE @kw OR ISNULL(i.full_name,\'\') LIKE @kw)')
      params.kw = { type: sql.NVarChar, value: `%${filter}%` }
    }
    if (bondTypeId != null && !Number.isNaN(bondTypeId)) {
      where.push('b.bond_type = @bondTypeId'); params.bondTypeId = { type: sql.Int, value: bondTypeId }
    }
    if (issuerId) {
      where.push('b.own_cif_no = @issuerId'); params.issuerId = { type: sql.NVarChar, value: issuerId }
    }
    if (status != null && !Number.isNaN(status)) {
      where.push('b.prod_st = @status'); params.status = { type: sql.Int, value: status }
    }
    if (issueDateFrom) {
      where.push('b.issued_dt >= @issueDateFrom'); params.issueDateFrom = { type: sql.DateTime, value: new Date(issueDateFrom) }
    }
    if (issueDateTo) {
      where.push('b.issued_dt <= @issueDateTo'); params.issueDateTo = { type: sql.DateTime, value: new Date(issueDateTo) }
    }
    const whereSql = where.join(' AND ')

    const countRes = await query(
      `SELECT COUNT(*) AS cnt FROM ${tBond} b LEFT JOIN ${tIss} i ON i.own_cif_no = b.own_cif_no WHERE ${whereSql}`,
      params,
    )
    const total = countRes.recordset[0].cnt

    const pageRes = await query(
      `SELECT b.prodId, b.prod_cd, b.prod_name, b.own_cif_no,
              ISNULL(i.full_name, '') AS issuerName,
              b.prod_value, b.int_coupon_rt, b.issued_dt, b.expired_dt,
              b.prod_st, b.bond_type
       FROM ${tBond} b
       LEFT JOIN ${tIss} i ON i.own_cif_no = b.own_cif_no
       WHERE ${whereSql}
       ORDER BY b.created_at DESC, b.prodId DESC
       OFFSET @offSet ROWS FETCH NEXT @pageSize ROWS ONLY`,
      { ...params, offSet: { type: sql.Int, value: offSet }, pageSize: { type: sql.Int, value: pageSize } },
    )

    const tpl = loadJson('features/01-bond-list/page-config.json')
    const dataList = pageRes.recordset.map((r) => ({
      oid: r.prodId,
      bondCode: r.prod_cd,
      bondName: r.prod_name,
      issuerName: r.issuerName,
      bondTypeName: BOND_TYPE_LABEL[r.bond_type] || '',
      faceValue: r.prod_value != null ? Number(r.prod_value) : null,
      interestRate: r.int_coupon_rt != null ? Number((r.int_coupon_rt * 100).toFixed(4)) : null,
      issueDate: fmtDate(r.issued_dt),
      maturityDate: fmtDate(r.expired_dt),
      statusName: STATUS_LABEL[r.prod_st] || '',
      status: r.prod_st,
    }))

    res.json({
      status: 'success',
      message: 'OK',
      data: {
        recordsTotal: total,
        recordsFiltered: total,
        gridKey: tpl.data.gridKey,
        gridType: tpl.data.gridType,
        valid: true,
        gridflexs: tpl.data.gridflexs,
        dataList,
      },
    })
  } catch (err) {
    console.error('[bond] GetBondPage error:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// ───── /bond/GetBondInfo ─────
router.get('/bond/GetBondInfo', async (req, res) => {
  try {
    const oid = req.query.Oid || req.query.oid
    const tpl = loadJson('features/01-bond-list/info-add.json')

    if (!oid) return res.json(tpl)

    const r = await query(
      `SELECT TOP 1 b.prodId, b.prod_cd, b.prod_name, b.own_cif_no,
              b.prod_value, b.int_coupon_rt, b.issued_dt, b.expired_dt,
              b.prod_st, b.bond_type, b.int_refund_num,
              i.tax_code, i.address
       FROM ${cfg.schema}.${cfg.tables.Bond} b
       LEFT JOIN ${cfg.schema}.${cfg.tables.Issuer} i ON i.own_cif_no = b.own_cif_no
       WHERE b.prodId = @oid`,
      { oid: { type: sql.UniqueIdentifier, value: oid } },
    )
    if (!r.recordset.length) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy trái phiếu' })
    }
    const row = r.recordset[0]
    const out = JSON.parse(JSON.stringify(tpl))
    out.data.Oid = row.prodId
    const gf = out.data.group_fields
    setFieldValue(gf, 'bondCode', row.prod_cd)
    setFieldValue(gf, 'bondName', row.prod_name)
    setFieldValue(gf, 'bondTypeId', row.bond_type)
    setFieldValue(gf, 'issuerId', row.own_cif_no)
    setFieldValue(gf, 'taxCode', row.tax_code || '')
    setFieldValue(gf, 'address', row.address || '')
    setFieldValue(gf, 'faceValue', row.prod_value != null ? Number(row.prod_value) : null)
    setFieldValue(gf, 'interestRate', row.int_coupon_rt != null ? Number((row.int_coupon_rt * 100).toFixed(4)) : null)
    setFieldValue(gf, 'couponFreq', row.int_refund_num)
    setFieldValue(gf, 'issueDate', toIsoOrNull(row.issued_dt))
    setFieldValue(gf, 'maturityDate', toIsoOrNull(row.expired_dt))
    setFieldValue(gf, 'status', row.prod_st)

    res.json(out)
  } catch (err) {
    console.error('[bond] GetBondInfo error:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// ───── /bond/SetBondInfoDraft ─────
router.post('/bond/SetBondInfoDraft', async (req, res) => {
  try {
    const changed = req.query.changed
    const body = req.body || {}
    const gf = body.group_fields || []

    if (changed === 'issuerId') {
      const issuer = findFieldValue(gf, 'issuerId')
      let taxCode = '', address = ''
      if (issuer) {
        const r = await query(
          `SELECT TOP 1 tax_code, address FROM ${cfg.schema}.${cfg.tables.Issuer} WHERE own_cif_no = @id`,
          { id: { type: sql.NVarChar, value: String(issuer) } },
        )
        if (r.recordset.length) { taxCode = r.recordset[0].tax_code || ''; address = r.recordset[0].address || '' }
      }
      setFieldValue(gf, 'taxCode', taxCode)
      setFieldValue(gf, 'address', address)
    }

    if (changed === 'bondTypeId') {
      const bt = Number(findFieldValue(gf, 'bondTypeId'))
      const lock = bt === 1
      setFieldFlag(gf, 'interestRate', 'isDisable', lock ? 1 : 0)
      if (lock) setFieldValue(gf, 'interestRate', 4.2)
    }

    res.json({
      status: 'success',
      message: 'OK',
      data: {
        Oid: body.Oid || null,
        tableKey: body.tableKey || 'bond_info',
        groupKey: body.groupKey || 'bond_info_group',
        draftPath: '/api/v2/bond/SetBondInfoDraft',
        submitPath: '/api/v2/bond/SetBondInfo',
        group_fields: gf,
      },
    })
  } catch (err) {
    console.error('[bond] SetBondInfoDraft error:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// ───── /bond/SetBondInfo ─────
router.post('/bond/SetBondInfo', async (req, res) => {
  try {
    const body = req.body || {}
    const gf = body.group_fields || []
    const v = (n) => findFieldValue(gf, n)
    const oid = body.Oid || null

    const bondCode = v('bondCode')
    const bondName = v('bondName')
    const bondTypeId = v('bondTypeId') != null ? Number(v('bondTypeId')) : null
    const issuerId = v('issuerId')
    const faceValue = v('faceValue') != null ? Number(v('faceValue')) : null
    const interestRate = v('interestRate') != null ? Number(v('interestRate')) / 100 : null
    const couponFreq = v('couponFreq') != null ? Number(v('couponFreq')) : 12
    const issueDate = v('issueDate') ? new Date(v('issueDate')) : null
    const maturityDate = v('maturityDate') ? new Date(v('maturityDate')) : null
    const status = v('status') != null ? Number(v('status')) : 0

    if (!bondCode || !bondName || !issuerId) {
      return res.status(400).json({ status: 'error', message: 'Thiếu trường bắt buộc (mã, tên hoặc đơn vị phát hành)' })
    }

    const tBond = `${cfg.schema}.${cfg.tables.Bond}`
    const params = {
      bondCode: { type: sql.NVarChar, value: String(bondCode) },
      bondName: { type: sql.NVarChar, value: String(bondName) },
      issuerId: { type: sql.NVarChar, value: String(issuerId) },
      faceValue: { type: sql.Decimal(18, 2), value: faceValue },
      interestRate: { type: sql.Float, value: interestRate },
      issueDate: { type: sql.DateTime, value: issueDate },
      maturityDate: { type: sql.DateTime, value: maturityDate },
      status: { type: sql.Int, value: status },
      bondType: { type: sql.Int, value: bondTypeId ?? 2 },
      couponFreq: { type: sql.Int, value: couponFreq },
    }

    let savedOid = oid
    if (oid) {
      await query(
        `UPDATE ${tBond} SET
           prod_cd=@bondCode, prod_name=@bondName, own_cif_no=@issuerId,
           prod_value=@faceValue, int_coupon_rt=@interestRate,
           issued_dt=@issueDate, expired_dt=@maturityDate,
           prod_st=@status, bond_type=@bondType, int_refund_num=@couponFreq,
           updated_at=GETDATE()
         WHERE prodId=@oid`,
        { ...params, oid: { type: sql.UniqueIdentifier, value: oid } },
      )
    } else {
      const r = await query(
        `DECLARE @new UNIQUEIDENTIFIER = NEWID();
         INSERT INTO ${tBond} (prodId, prod_cd, prod_name, own_cif_no, prod_value, int_coupon_rt, issued_dt, expired_dt, prod_st, bond_type, int_refund_num)
         VALUES (@new, @bondCode, @bondName, @issuerId, @faceValue, @interestRate, @issueDate, @maturityDate, @status, @bondType, @couponFreq);
         SELECT @new AS newId;`,
        params,
      )
      savedOid = r.recordset[0].newId
    }

    res.json({ status: 'success', message: 'Lưu thành công', data: { Oid: savedOid } })
  } catch (err) {
    console.error('[bond] SetBondInfo error:', err.message)
    res.status(500).json({ status: 'error', message: err.message })
  }
})

module.exports = router
