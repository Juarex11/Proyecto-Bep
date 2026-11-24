'use strict';
const { iso, s } = require('../util');

/** Express async wrapper -> 500 JSON */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
  console.error(`[${req.method} ${req.originalUrl}]`, e);
  res.status(500).json({ error: 'Error interno', mensaje: e.message });
});

/** "Nombres Apellidos" del personal (equivale a ProcObtenerPersonal de Supervisore) */
async function nombrePersonal(db, personalId) {
  if (!personalId) return '';
  const r = await db.query('SELECT PersonalNombres, PersonalApellidos FROM Personal WHERE PersonalId = @id', { id: personalId });
  return r[0] ? `${s(r[0].PersonalNombres)} ${s(r[0].PersonalApellidos)}`.trim() : '';
}

/** Siguiente id con prefijo (ej. EM0071, US012) como Proc_CreaIdPersonal / Proc_GenUsuarioId */
async function nextId(db, table, col, prefix, digits) {
  // Las secuencias de Personal/Usuario son globales (PK unica en toda la base): se leen sin filtro de empresa
  const rows = await (db.rawQuery || db.query).call(db,`SELECT ${col} AS v FROM ${table} WHERE ${col} LIKE @p`, { p: prefix + '%' });
  let max = 0;
  for (const r of rows) {
    const m = String(r.v).slice(prefix.length);
    if (/^\d+$/.test(m)) max = Math.max(max, Number(m));
  }
  return prefix + String(max + 1).padStart(digits, '0');
}

/** Fecha mas reciente de modificacion de una etapa y quien la hizo (ProcMaximaFecha) */
const SIMPLE = [
  ['ObjetivoBEP', 'ObjBepFechaAct', 'ObjBepUsuarioId'], ['UsoBIMBEP', 'UsoBimBepFechaAct', 'UsoBimBepUsuarioId'],
  ['EspecialidadBEP', 'EspBepFechaAct', 'EspBepUsuarioId'], ['ContactoBEP', 'ConBepFechaAct', 'ConBepUsuarioId'],
  ['MatrizRACI', 'MatFechaAct', 'MatUsuarioId'], ['HitoConstruccion', 'HitConFechaAct', 'HitConUsuarioId'],
  ['EntregableInformacion', 'EntInfFechaAct', 'EntInfUsuarioId'], ['Recurso', 'RecFechaAct', 'RecUsuarioId'],
  ['ArchivoBEP', 'ArcBepFechaAct', 'ArcBepUsuarioId'], ['ReunionBEP', 'ReuBepFechaAct', 'ReuBepUsuarioId'],
  ['CanalBEP', 'CanBepFechaAct', 'CanBepUsuarioId'], ['EntornoDatosBEP', 'EcdBepFechaAct', 'EcdBepUsuarioId'],
];
async function maxFecha(db, revBepId) {
  if (!revBepId) return { fecha: '', usuario: '' };
  const p = { r: revBepId };
  const r0 = (await db.query('SELECT RevBepFechaAct AS f, RevBepUsuarioId AS u FROM RevisionBEP WHERE RevBepId = @r', p))[0];
  let fecha = r0 ? iso(r0.f, '') : '';
  let uid = r0 ? r0.u : null;
  const consider = (row) => {
    if (!row) return;
    const f = iso(row.f, '');
    if (f && f > fecha) { fecha = f; uid = row.u; }
  };
  for (const [t, f, u] of SIMPLE) {
    consider((await db.query(`SELECT ${f} AS f, ${u} AS u FROM ${t} WHERE RevBepId = @r ORDER BY ${f} DESC`, p, { limit: 1 }))[0]);
  }
  consider((await db.query(`SELECT d.DetLodFechaAct AS f, d.DetLodUsuarioId AS u FROM DetalleLOD d JOIN EspecialidadBEP e ON e.EspBepId = d.EspBepId WHERE e.RevBepId = @r ORDER BY d.DetLodFechaAct DESC`, p, { limit: 1 }))[0]);
  consider((await db.query(`SELECT d.DetMatrizFechaAct AS f, d.DetMatrizUsuarioId AS u FROM DetalleMatrizRACI d JOIN MatrizRACI m ON m.MatRaciId = d.MatRaciId WHERE m.RevBepId = @r ORDER BY d.DetMatrizFechaAct DESC`, p, { limit: 1 }))[0]);
  let usuario = '';
  if (uid) {
    const u = (await db.query('SELECT p.PersonalNombres AS n, p.PersonalApellidos AS a FROM UsuarioEmpresa ue LEFT JOIN Personal p ON p.PersonalId = ue.PersonalId WHERE ue.usuarioId = @u', { u: uid }))[0];
    if (u) usuario = `${s(u.n)} ${s(u.a)}`.trim();
  }
  return { fecha, usuario };
}

/** Convierte un valor del cliente ("2025-07-02 14:02:00", ISO, '') a Date (hora de pared como UTC) o null */
function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v;
  const t = iso(v, '');
  if (!t || t.startsWith('0000')) return null;
  const d = new Date(t + 'Z');
  return isNaN(d) ? null : d;
}

module.exports = { wrap, nombrePersonal, nextId, maxFecha, toDate };
