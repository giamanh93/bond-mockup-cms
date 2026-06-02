const fs = require('fs')
const path = require('path')

const CONFIG_PATH = path.resolve(__dirname, 'appsettings.json')

function load() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw)
}

function parseConnString(cs) {
  const parts = cs.split(';').filter(Boolean)
  const map = {}
  for (const p of parts) {
    const [k, ...rest] = p.split('=')
    if (!k) continue
    map[k.trim().toLowerCase()] = rest.join('=').trim()
  }
  const server = map['server'] || map['data source'] || 'localhost'
  let host = server
  let port
  let instance
  const inst = server.split('\\')
  if (inst.length > 1) { host = inst[0]; instance = inst[1] }
  const portMatch = host.match(/^(.*?),(\d+)$/)
  if (portMatch) { host = portMatch[1]; port = Number(portMatch[2]) }
  return {
    server: host,
    port,
    instanceName: instance,
    database: map['database'] || map['initial catalog'],
    user: map['user id'] || map['uid'],
    password: map['password'] || map['pwd'],
    options: {
      encrypt: /true/i.test(map['encrypt'] || 'true'),
      trustServerCertificate: /true/i.test(map['trustservercertificate'] || 'false'),
      enableArithAbort: true,
    },
  }
}

const cfg = load()
const sqlOptions = parseConnString(cfg.ConnectionStrings.dbUmeBondConnection)
sqlOptions.pool = {
  max: cfg.Database.PoolMax ?? 10,
  min: cfg.Database.PoolMin ?? 0,
  idleTimeoutMillis: 30000,
}
sqlOptions.requestTimeout = cfg.Database.RequestTimeoutMs ?? 30000

module.exports = {
  raw: cfg,
  sqlOptions,
  tables: cfg.Database.Tables,
  schema: cfg.Database.Schema || 'dbo',
  port: cfg.Server.Port || 4002,
  host: cfg.Server.Host || 'localhost',
  contractsDir: path.resolve(__dirname, cfg.Contracts.Dir),
  corsOrigins: cfg.Cors?.Origins,
  autoInitV2: cfg.Database.AutoInitV2 !== false,
  allowReset: cfg.Database.AllowReset === true,
}
