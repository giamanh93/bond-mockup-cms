const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const PORT = process.env.MOCK_PORT || 4001
const CONTRACTS_DIR = path.resolve(__dirname, '..', 'contracts')
const ROUTES_FILE = path.join(CONTRACTS_DIR, 'api-routes.yaml')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

function loadJson(rel) {
  const full = path.join(CONTRACTS_DIR, rel)
  return JSON.parse(fs.readFileSync(full, 'utf8'))
}

function loadRoutes() {
  const doc = yaml.load(fs.readFileSync(ROUTES_FILE, 'utf8'))
  return doc.routes || []
}

function tagPath(path) {
  return `[${path}]`
}

// ───────── Built-in handlers for dynamic endpoints ─────────

function handleBondInfo(req, res) {
  // ?Oid=<guid> → try info-edit.json, fall back to info-add.json
  const oid = req.query.Oid || req.query.oid
  const tryFiles = oid
    ? ['features/01-bond-list/info-edit.json', 'features/01-bond-list/info-add.json']
    : ['features/01-bond-list/info-add.json']
  for (const rel of tryFiles) {
    try { return res.json(loadJson(rel)) } catch { /* try next */ }
  }
  return res.status(404).json({ status: 'error', message: 'Mock not found' })
}

function handleBondInfoDraft(req, res) {
  // Echo body + recompute taxCode/address if changed=issuerId
  const changed = req.query.changed
  const body = req.body || {}

  // Walk group_fields to mutate dependent fields
  if (changed === 'issuerId') {
    const issuerOid = findFieldValue(body.group_fields, 'issuerId')
    let taxCode = '', address = ''
    if (issuerOid) {
      try {
        const issuers = loadJson('lookups/issuer-list.json')
        const found = (issuers.data || []).find((x) => String(x.value) === String(issuerOid))
        if (found) { taxCode = found.taxCode || ''; address = found.address || '' }
      } catch { /* ignore */ }
    }
    setFieldValue(body.group_fields, 'taxCode', taxCode)
    setFieldValue(body.group_fields, 'address', address)
  }

  if (changed === 'bondTypeId') {
    // Demo: Chính phủ (value=1) → khóa lãi suất; loại khác mở
    const bondType = findFieldValue(body.group_fields, 'bondTypeId')
    const lock = String(bondType) === '1'
    setFieldFlag(body.group_fields, 'interestRate', 'isDisable', lock ? 1 : 0)
    if (lock) setFieldValue(body.group_fields, 'interestRate', 4.2)
  }

  return res.json({
    status: 'success',
    message: 'OK',
    data: {
      Oid: body.Oid || null,
      tableKey: body.tableKey || 'bond_info',
      groupKey: body.groupKey || 'bond_info_group',
      draftPath: '/api/v2/bond/SetBondInfoDraft',
      submitPath: '/api/v2/bond/SetBondInfo',
      group_fields: body.group_fields || [],
    },
  })
}

function handleBondInfoSet(_req, res) {
  return res.json({
    status: 'success',
    message: 'Lưu thành công',
    data: { Oid: `b${Math.random().toString(16).slice(2, 10)}-mock` },
  })
}

function handleBondInfoDelete(req, res) {
  const oid = req.body?.Oid || req.body?.oid || req.query.Oid
  if (!oid) return res.status(400).json({ status: 'error', message: 'Thiếu Oid' })
  return res.json({ status: 'success', message: 'Đã xóa', data: { Oid: oid } })
}

function findFieldValue(groupFields, fieldName) {
  for (const g of groupFields || []) {
    for (const f of g.fields || []) {
      if (f.field_name === fieldName) return f.columnValue
    }
  }
  return null
}

function setFieldValue(groupFields, fieldName, value) {
  for (const g of groupFields || []) {
    for (const f of g.fields || []) {
      if (f.field_name === fieldName) { f.columnValue = value; return }
    }
  }
}

function setFieldFlag(groupFields, fieldName, flag, value) {
  for (const g of groupFields || []) {
    for (const f of g.fields || []) {
      if (f.field_name === fieldName) { f[flag] = value; return }
    }
  }
}

// ───────── Register routes from api-routes.yaml ─────────

const ROUTES = loadRoutes()
const DYNAMIC = {
  '/api/v2/bond/GetBondInfo':       { method: 'GET',  handler: handleBondInfo },
  '/api/v2/bond/SetBondInfoDraft':  { method: 'POST', handler: handleBondInfoDraft },
  '/api/v2/bond/SetBondInfo':       { method: 'POST', handler: handleBondInfoSet },
  '/api/v2/bond/DeleteBondInfo':    { method: 'POST', handler: handleBondInfoDelete },
}

for (const r of ROUTES) {
  const method = (r.method || 'GET').toLowerCase()
  const path = r.path
  const dyn = DYNAMIC[path]
  if (dyn && dyn.method === r.method) {
    app[method](path, dyn.handler)
    console.log(`${tagPath(path)} dynamic handler bound (${r.method})`)
    continue
  }
  if (r.mock_file) {
    app[method](path, (req, res) => {
      try {
        const body = loadJson(r.mock_file)
        return res.json(body)
      } catch (err) {
        return res.status(500).json({ status: 'error', message: `Cannot load ${r.mock_file}: ${err.message}` })
      }
    })
    console.log(`${tagPath(path)} static <- ${r.mock_file} (${r.method})`)
  } else {
    console.warn(`${tagPath(path)} SKIPPED (no mock_file and no dynamic handler)`)
  }
}

app.get('/health', (_req, res) => res.json({ status: 'success', data: { service: 'bond-mock-server', ts: new Date().toISOString() } }))

app.use((_req, res) => res.status(404).json({ status: 'error', message: 'Mock route not found' }))

app.listen(PORT, () => {
  console.log(`\n[mock-server] listening on http://localhost:${PORT}`)
  console.log(`[mock-server] contracts: ${CONTRACTS_DIR}`)
})
