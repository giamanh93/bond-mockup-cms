const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.resolve(__dirname, 'appsettings.json')
const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))

const upstreamMode = (cfg.Upstream?.Mode || 'csharp').toLowerCase()
const upstreams = {
  csharp: cfg.Upstream?.Csharp?.BaseUrl,
  mock:   cfg.Upstream?.Mock?.BaseUrl,
}

module.exports = {
  raw: cfg,
  port: cfg.Server?.Port || 4002,
  host: cfg.Server?.Host || 'localhost',
  corsOrigins: cfg.Cors?.Origins,
  upstream: {
    mode: upstreamMode,
    csharp: upstreams.csharp,
    mock:   upstreams.mock,
    activeUrl: upstreams[upstreamMode],
  },
}
