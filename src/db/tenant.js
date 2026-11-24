'use strict';
/**
 * Aislamiento por empresa (una sola base, columna EmpresaId).
 *
 * Todo el codigo de BEP (rutas) usa `db` a traves de scope(): cada consulta se reescribe para que
 * SOLO vea las filas de la empresa activa, y cada INSERT graba EmpresaId.
 *   SELECT ... FROM Tabla t        ->  SELECT ... FROM (SELECT * FROM Tabla WHERE EmpresaId = @_emp) AS t
 *   UPDATE/DELETE Tabla ... WHERE  ->  ... WHERE EmpresaId = @_emp AND (<condicion original>)
 * Si una sentencia menciona una tabla de empresa de una forma que no se pueda filtrar, se RECHAZA
 * (nunca se ejecuta sin filtro). Funciona igual en SQL Server y SQLite.
 */
const { tenantTables } = require('../schema');
const ctx = require('../ctx');

const byLower = new Map(tenantTables.map((n) => [n.toLowerCase(), n]));
const NOT_ALIAS = 'WHERE|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|JOIN|ON|ORDER|GROUP|HAVING|UNION|SET|LIMIT|AND|OR';
const REF = new RegExp(`\\b(FROM|JOIN)(\\s+)(?:\\[?dbo\\]?\\.)?\\[?(\\w+)\\]?(?:(\\s+)(?:AS\\s+)?(?!(?:${NOT_ALIAS})\\b)(\\[?\\w+\\]?))?`, 'gi');
const HEAD = /^\s*(UPDATE\s+|DELETE\s+FROM\s+)(?:\[?dbo\]?\.)?\[?(\w+)\]?/i;
const allNames = new RegExp(`(?<![@\\w])(${tenantTables.join('|')})(?!\\w)`, 'i');   // nombre de tabla suelto (no un @parametro ni parte de otro nombre)

class TenantError extends Error {}

function topLevelWhere(t) {
  let depth = 0;
  const re = /WHERE\b/iy;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && (c === 'W' || c === 'w') && (i === 0 || !/\w/.test(t[i - 1]))) {
      re.lastIndex = i;
      if (re.test(t)) return i;
    }
  }
  return -1;
}

const cache = new Map();
function rewrite(sql) {
  let out = cache.get(sql);
  if (out) return out;
  out = doRewrite(sql);
  if (cache.size > 2000) cache.clear();
  cache.set(sql, out);
  return out;
}

function doRewrite(sql) {
  const strs = [];
  let t = String(sql).replace(/'(?:[^']|'')*'/g, (m) => { strs.push(m); return `\u0002${strs.length - 1}\u0002`; });
  const marks = [];
  let target = null; let head = '';

  if (/^\s*INSERT\b/i.test(t) && allNames.test(t)) throw new TenantError('INSERT directo sobre una tabla de empresa: use db.insert()');
  const h = HEAD.exec(t);
  if (h) {
    head = h[0]; target = byLower.get(h[2].toLowerCase()) || null;
    t = t.slice(head.length);
    if (target && /\bEmpresaId\b/i.test(t)) throw new TenantError('No se puede referenciar EmpresaId en UPDATE/DELETE');
  }

  t = t.replace(REF, (full, kw, sp, name, sp2, alias) => {
    const real = byLower.get(name.toLowerCase());
    if (!real) return full;
    marks.push(`(SELECT * FROM ${real} WHERE EmpresaId = @_emp) AS ${alias || real}`);
    return `${kw}${sp}\u0001${marks.length - 1}\u0001`;
  });

  if (target) {
    const i = topLevelWhere(t);
    if (i < 0) t = `${t} WHERE EmpresaId = @_emp`;
    else t = `${t.slice(0, i + 5)} EmpresaId = @_emp AND (${t.slice(i + 5)})`;
  }

  // Fail-closed: no puede quedar ninguna tabla de empresa sin filtrar
  const left = allNames.exec(t.replace(/\u0001\d+\u0001/g, ' '));
  if (left) throw new TenantError(`Consulta no segura sobre la tabla de empresa ${left[1]}: ${String(sql).slice(0, 120)}`);

  t = t.replace(/\u0001(\d+)\u0001/g, (m, i) => marks[Number(i)]);
  t = t.replace(/\u0002(\d+)\u0002/g, (m, i) => strs[Number(i)]);
  return head + t;
}

const isTenant = (table) => byLower.has(String(table).toLowerCase());

/** Envuelve una conexion/transaccion fijando la empresa */
function bind(runner, emp) {
  const need = () => { if (!emp) throw new TenantError('Consulta sin empresa activa'); return emp; };
  return {
    query: (sql, p = {}, o) => runner.query(rewrite(sql), { ...p, _emp: need() }, o),
    exec: (sql, p = {}) => runner.exec(rewrite(sql), { ...p, _emp: need() }),
    insert: (table, row) => runner.insert(table, isTenant(table) ? { ...row, EmpresaId: need() } : row),
    // Consulta GLOBAL (sin filtro): solo para secuencias de ids compartidos (Personal/Usuario) y control de cuentas
    rawQuery: (sql, p = {}, o) => runner.query(sql, p, o),
    empresaId: emp,
  };
}

/** db para las rutas de BEP: la empresa sale del contexto de la peticion */
function scope(raw) {
  const cur = () => { const e = ctx.empresaId(); if (!e) throw new TenantError('Consulta sin empresa activa'); return e; };
  return {
    kind: raw.kind,
    connect: () => raw.connect(),
    close: () => raw.close(),
    query: (sql, p, o) => bind(raw, cur()).query(sql, p, o),
    exec: (sql, p) => bind(raw, cur()).exec(sql, p),
    insert: (table, row) => bind(raw, cur()).insert(table, row),
    rawQuery: (sql, p, o) => raw.query(sql, p, o),
    tx(fn) { const emp = cur(); return raw.tx((t) => fn(bind(t, emp))); },
  };
}

module.exports = { rewrite, scope, bind, isTenant, TenantError };
