const sql = require('mssql')
const cfg = require('./config')

let poolPromise = null

async function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(cfg.sqlOptions).then((pool) => {
      console.log(`[db] connected to ${cfg.sqlOptions.server}/${cfg.sqlOptions.database}`)
      return pool
    }).catch((err) => {
      poolPromise = null
      throw err
    })
  }
  return poolPromise
}

async function query(text, params = {}) {
  const pool = await getPool()
  const req = pool.request()
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === 'object' && 'type' in v) req.input(k, v.type, v.value)
    else req.input(k, v)
  }
  return req.query(text)
}

async function ensureV2Tables() {
  if (!cfg.autoInitV2) {
    console.log('[db] AutoInitV2=false, skip schema check')
    return
  }
  const t = cfg.tables
  const schema = cfg.schema

  await query(`
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${schema}' AND TABLE_NAME='${t.Issuer}')
    BEGIN
      CREATE TABLE ${schema}.${t.Issuer} (
        own_cif_no NVARCHAR(20) NOT NULL PRIMARY KEY,
        full_name  NVARCHAR(255) NOT NULL,
        tax_code   NVARCHAR(20)  NULL,
        address    NVARCHAR(500) NULL,
        created_at DATETIME      NOT NULL DEFAULT GETDATE()
      );
      INSERT INTO ${schema}.${t.Issuer} (own_cif_no, full_name, tax_code, address)
      SELECT DISTINCT own_cif_no, full_name, tax_code, address
      FROM ${schema}.${t.IssuerLegacy}
      WHERE own_cif_no IS NOT NULL AND full_name IS NOT NULL;
    END
  `)

  await query(`
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${schema}' AND TABLE_NAME='${t.Bond}')
    BEGIN
      CREATE TABLE ${schema}.${t.Bond} (
        prodId         UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        prod_cd        NVARCHAR(50)     NOT NULL,
        prod_name      NVARCHAR(200)    NOT NULL,
        own_cif_no     NVARCHAR(20)     NOT NULL,
        prod_value     DECIMAL(18,2)    NULL,
        int_coupon_rt  FLOAT            NULL,
        issued_dt      DATETIME         NULL,
        expired_dt     DATETIME         NULL,
        prod_st        INT              NOT NULL DEFAULT 0,
        bond_type      INT              NOT NULL DEFAULT 2,
        int_refund_num INT              NOT NULL DEFAULT 12,
        created_at     DATETIME         NOT NULL DEFAULT GETDATE(),
        updated_at     DATETIME         NOT NULL DEFAULT GETDATE()
      );
      INSERT INTO ${schema}.${t.Bond}
        (prodId, prod_cd, prod_name, own_cif_no, prod_value, int_coupon_rt, issued_dt, expired_dt, prod_st, bond_type, int_refund_num)
      SELECT prodId, prod_cd, prod_name, own_cif_no, prod_value, int_coupon_rt, issued_dt, expired_dt,
             ISNULL(prod_st, 0), ISNULL(bond_type, 2), ISNULL(int_refund_num, 12)
      FROM ${schema}.${t.BondLegacy}
      WHERE prod_type = 'bond';
    END
  `)
  console.log(`[db] V2 tables ensured: ${t.Bond}, ${t.Issuer}`)
}

async function resetV2() {
  if (!cfg.allowReset) throw new Error('AllowReset=false in appsettings.json')
  const t = cfg.tables, schema = cfg.schema
  await query(`IF OBJECT_ID('${schema}.${t.Bond}','U') IS NOT NULL DROP TABLE ${schema}.${t.Bond}`)
  await query(`IF OBJECT_ID('${schema}.${t.Issuer}','U') IS NOT NULL DROP TABLE ${schema}.${t.Issuer}`)
  await ensureV2Tables()
}

module.exports = { sql, getPool, query, ensureV2Tables, resetV2 }
