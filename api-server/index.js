const express = require('express')
const cors = require('cors')
const cfg = require('./config')
const { ensureV2Tables, resetV2 } = require('./db')

const app = express()
app.use(cors({ origin: cfg.corsOrigins?.length ? cfg.corsOrigins : true }))
app.use(express.json({ limit: '10mb' }))

const bondRouter = require('./routes/bond')
const lookupRouter = require('./routes/lookup')

app.use('/api/v2', bondRouter)
app.use('/api/v2', lookupRouter)

app.get('/health', (_req, res) => res.json({
  status: 'success',
  data: {
    service: 'bond-api-server',
    db: `${cfg.sqlOptions.server}/${cfg.sqlOptions.database}`,
    tables: cfg.tables,
    ts: new Date().toISOString(),
  },
}))

app.post('/admin/reset-v2', async (_req, res) => {
  try { await resetV2(); res.json({ status: 'success', message: 'V2 tables reseeded' }) }
  catch (err) { res.status(400).json({ status: 'error', message: err.message }) }
})

app.use((_req, res) => res.status(404).json({ status: 'error', message: 'API route not found' }))

async function boot() {
  await ensureV2Tables()
  app.listen(cfg.port, cfg.host, () => {
    console.log(`\n[api-server] listening on http://${cfg.host}:${cfg.port}`)
    console.log(`[api-server] DB: ${cfg.sqlOptions.server}/${cfg.sqlOptions.database}`)
    console.log(`[api-server] V2 tables: ${cfg.tables.Bond}, ${cfg.tables.Issuer}\n`)
  })
}

boot().catch((err) => {
  console.error('[api-server] startup failed:', err)
  process.exit(1)
})
