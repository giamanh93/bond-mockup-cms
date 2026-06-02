const express = require('express')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')
const cfg = require('./config')

const app = express()
app.use(cors({ origin: cfg.corsOrigins?.length ? cfg.corsOrigins : true }))

app.get('/health', (_req, res) => res.json({
  status: 'success',
  data: {
    service: 'bond-api-server',
    upstream: {
      mode: cfg.upstream.mode,
      activeUrl: cfg.upstream.activeUrl,
      csharp: cfg.upstream.csharp,
      mock: cfg.upstream.mock,
    },
    ts: new Date().toISOString(),
  },
}))

const target = cfg.upstream.activeUrl
if (!target) {
  console.error(`[mode] ${cfg.upstream.mode} — KHÔNG có URL upstream. Check appsettings.Upstream.${cfg.upstream.mode}.BaseUrl`)
  process.exit(1)
}

console.log(`[mode] ${cfg.upstream.mode} — proxy /api/* → ${target}`)

app.use('/api', createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: (path) => '/api' + path, // express strips '/api' khi mount → cộng lại
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.headers.authorization) proxyReq.setHeader('authorization', req.headers.authorization)
    },
    error: (err, _req, res) => {
      console.error('[proxy] error:', err.message)
      if (!res.headersSent) res.status(502).json({ status: 'error', message: `Upstream unreachable: ${err.message}` })
    },
  },
}))

app.use((_req, res) => res.status(404).json({ status: 'error', message: 'API route not found' }))

app.listen(cfg.port, cfg.host, () => {
  console.log(`\n[api-server] listening on http://${cfg.host}:${cfg.port}`)
  console.log(`[api-server] mode: ${cfg.upstream.mode}`)
  console.log(`[api-server] upstream: ${cfg.upstream.activeUrl}\n`)
})
