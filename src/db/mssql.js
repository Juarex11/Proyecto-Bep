'use strict';
/**
 * Adaptador SQL Server.
 * API comun (igual en sqlite.js):
 *   query(sql, params, {limit})  -> filas
 *   exec(sql, params)            -> filas afectadas
 *   insert(table, row)           -> id autonumerico nuevo
 *   tx(fn)                       -> ejecuta fn(db) dentro de una transaccion
 * Los parametros se escriben como @nombre.
 */
const sql = require('mssql');
const { byName } = require('../schema');

function norm(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined) return null;
  return v;
}

function make(getRunner) {
  const api = {
    async query(text, params = {}, opts = {}) {
      if (opts.limit) text = text.replace(/^\s*SELECT(\s+DISTINCT)?/i, (m, d) => `SELECT${d || ''} TOP (${Number(opts.limit)})`);
      const r = await run(getRunner, text, params);
      return r.recordset || [];
    },
    async exec(text, params = {}) {
      const r = await run(getRunner, text, params);
      return (r.rowsAffected || []).reduce((a, c) => a + c, 0);
    },
    async insert(table, row) {
      const t = byName[table];
      const cols = Object.keys(row).filter(c => row[c] !== undefined);
      const pk = Array.isArray(t.pk) ? t.pk[0] : t.pk;
      const idCol = t.cols.find(c => c.name === pk && c.identity);
      const text = `INSERT INTO [dbo].[${table}] (${cols.map(c => `[${c}]`).join(', ')}) ${idCol ? `OUTPUT INSERTED.[${pk}] ` : ''}VALUES (${cols.map(c => '@' + c).join(', ')})`;
      const r = await run(getRunner, text, row);
      return idCol ? Number(r.recordset[0][pk]) : null;
    },
  };
  return api;
}

async function run(getRunner, text, params) {
  const req = await getRunner();
  for (const [k, v] of Object.entries(params || {})) req.input(k, norm(v));
  return req.query(text);
}

// Con instancia con nombre (equipo\\SQLEXPRESS) no se fija puerto: lo resuelve SQL Browser.
function puerto(cfg) {
  if (cfg.DB_PORT) return { port: Number(cfg.DB_PORT) };
  return String(cfg.DB_SERVER || '').includes('\\') ? {} : { port: 1433 };
}

module.exports = function createMssql(cfg) {
  let pool;
  const connect = async () => {
    if (pool) return pool;
    pool = await new sql.ConnectionPool({
      server: cfg.DB_SERVER || 'localhost',
      ...puerto(cfg),
      user: cfg.DB_USER, password: cfg.DB_PASSWORD,
      database: cfg.DB_NAME || 'BEP',
      options: { encrypt: cfg.DB_ENCRYPT === 'true', trustServerCertificate: cfg.DB_TRUST_CERT !== 'false' },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      requestTimeout: 60000,
    }).connect();
    return pool;
  };
  const base = make(async () => (await connect()).request());
  return {
    ...base,
    kind: 'mssql',
    connect,
    async tx(fn) {
      const p = await connect();
      const t = new sql.Transaction(p);
      await t.begin();
      try {
        const res = await fn(make(async () => new sql.Request(t)));
        await t.commit();
        return res;
      } catch (e) {
        try { await t.rollback(); } catch (_) { /* ya cerrada */ }
        throw e;
      }
    },
    async close() { if (pool) await pool.close(); },
  };
};
