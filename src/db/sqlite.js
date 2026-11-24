'use strict';
/**
 * Adaptador SQLite (modo demo y pruebas). Usa node:sqlite (Node >= 22).
 * Crea las tablas a partir de src/schema.js y siembra src/seed.js si la base esta vacia.
 */
const { DatabaseSync } = require('node:sqlite');
const { tables, byName, sqlType } = require('../schema');
const { seed } = require('../seed');
const { iso } = require('../util');

function norm(v) {
  if (v instanceof Date) return iso(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined) return null;
  return v;
}
// SQLite rechaza parametros con nombre que no aparecen en la sentencia: se filtran los no usados
const bind = (params, text) => {
  const used = new Set(((text || '').match(/@\w+/g) || []).map((x) => x.slice(1)));
  return Object.fromEntries(Object.entries(params || {}).filter(([k]) => !text || used.has(k)).map(([k, v]) => [k, norm(v)]));
};

function ddl() {
  const out = [];
  for (const t of tables) {
    const pkCols = Array.isArray(t.pk) ? t.pk : [t.pk];
    const single = pkCols.length === 1;
    const lines = t.cols.map(c => {
      let s = `"${c.name}" ${sqlType(c.type, 'sqlite')}`;
      if (c.tenantCol) return `${s} NOT NULL DEFAULT 1`;
      if (single && c.pk) s += c.identity ? ' PRIMARY KEY AUTOINCREMENT' : ' PRIMARY KEY';
      else if (c.pk || !c.nullable) s += ' NOT NULL';
      return s;
    });
    if (!single) lines.push(`PRIMARY KEY (${pkCols.map(c => `"${c.name || c}"`).join(', ')})`);
    out.push(`CREATE TABLE IF NOT EXISTS "${t.name}" (${lines.join(', ')});`);
    (t.uniques || []).forEach((u) => out.push(`CREATE UNIQUE INDEX IF NOT EXISTS "UX_${t.name}_${u.join('_')}" ON "${t.name}" (${u.map((c) => `"${c}"`).join(', ')});`));
    if (t.tenant) out.push(`CREATE INDEX IF NOT EXISTS "IX_${t.name}_EmpresaId" ON "${t.name}" ("EmpresaId");`);
  }
  return out.join('\n');
}

const LOG = process.env.BEP_SQL_LOG;   // solo para pruebas: registra las sentencias para validarlas como T-SQL
const logSql = (text, limit) => { if (LOG) require('fs').appendFileSync(LOG, JSON.stringify({ text, limit: limit || 0 }) + '\n'); };

function make(db) {
  return {
    async query(text, params = {}, opts = {}) {
      logSql(text, opts.limit);
      if (opts.limit) text += ` LIMIT ${Number(opts.limit)}`;
      return db.prepare(text).all(bind(params, text));
    },
    async exec(text, params = {}) {
      logSql(text, 0);
      return Number(db.prepare(text).run(bind(params, text)).changes);
    },
    async insert(table, row) {
      const t = byName[table];
      const cols = Object.keys(row).filter(c => row[c] !== undefined);
      const pk = Array.isArray(t.pk) ? t.pk[0] : t.pk;
      const idCol = t.cols.find(c => c.name === pk && c.identity);
      const r = db.prepare(`INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(c => '@' + c).join(', ')})`).run(bind(row));
      return idCol ? Number(r.lastInsertRowid) : null;
    },
  };
}

module.exports = function createSqlite(cfg) {
  const db = new DatabaseSync(cfg.SQLITE_FILE || ':memory:');
  db.exec('PRAGMA foreign_keys = OFF; PRAGMA journal_mode = WAL;');
  db.exec(ddl());
  // siembra (solo tablas vacias)
  for (const t of tables) {
    const rows = seed[t.name];
    if (!rows || !rows.length) continue;
    const c = db.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get().c;
    if (c) continue;
    const cols = t.cols.filter(x => !x.identity && !x.tenantCol).map(x => x.name);
    const st = db.prepare(`INSERT INTO "${t.name}" (${cols.map(x => `"${x}"`).join(', ')}) VALUES (${cols.map(x => '@' + x).join(', ')})`);
    for (const r of rows) st.run(bind(Object.fromEntries(cols.map(x => [x, r[x] === undefined ? null : r[x]])), st.sourceSQL));
  }
  // Usuarios existentes -> miembros de la empresa 1 (igual que la migracion del script SQL)
  if (!db.prepare('SELECT COUNT(*) AS c FROM "UsuarioEmpresa"').get().c) {
    db.exec(`INSERT INTO "UsuarioEmpresa" ("usuarioId","PersonalId","UsuEmpRol","UsuEmpEstado","UsuEmpFecha","EmpresaId")
             SELECT "usuarioId","PersonalId", CASE WHEN COALESCE("UsuarioSuper",0)=1 THEN 'admin' ELSE 'usuario' END, "UsuarioEstado", datetime('now'), 1 FROM "Usuario"`);
  }
  const base = make(db);
  let chain = Promise.resolve();
  return {
    ...base,
    kind: 'sqlite',
    async connect() { return db; },
    // Transacciones serializadas (una conexion unica)
    tx(fn) {
      const job = chain.then(async () => {
        db.exec('BEGIN');
        try {
          const res = await fn(base);
          db.exec('COMMIT');
          return res;
        } catch (e) {
          try { db.exec('ROLLBACK'); } catch (_) { /* nada */ }
          throw e;
        }
      });
      chain = job.catch(() => {});
      return job;
    },
    async close() { db.close(); },
  };
};
