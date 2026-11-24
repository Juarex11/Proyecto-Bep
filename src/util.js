'use strict';
/* Utilidades de formato (imitan la forma en que GeneXus serializa JSON) */

const pad = (n, l = 2) => String(n).padStart(l, '0');

/** Fecha/hora -> "YYYY-MM-DDTHH:mm:ss" (vacio -> valor nulo de GeneXus) */
function iso(v, empty = '0000-00-00T00:00:00') {
  if (v === null || v === undefined || v === '') return empty;
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}T${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`;
  }
  const s = String(v).trim().replace(' ', 'T');
  return s.length === 10 ? s + 'T00:00:00' : s.slice(0, 19);
}
const isoDate = (v, empty = '0000-00-00') => (v === null || v === undefined || v === '' ? empty : iso(v).slice(0, 10));

/** Hora de Peru (ProcHoraPeru = Now() - 5h). Se guarda como "hora de pared" (UTC-5). */
const ahora = () => new Date(Date.now() - 5 * 3600 * 1000);

const s = (v) => (v === null || v === undefined ? '' : String(v));
const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const b = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'True';

/** Lee un parametro de query (string) con valor por defecto */
const qs = (req, k, d = '') => (req.query[k] === undefined ? d : String(req.query[k]));
const qn = (req, k, d = 0) => (req.query[k] === undefined || req.query[k] === '' ? d : Number(req.query[k]) || 0);
const qb = (req, k, d = true) => (req.query[k] === undefined ? d : b(String(req.query[k]).toLowerCase()));

/** Argumento de un POST: GeneXus envia {NombreSDT: ...} cuando hay varios parametros o es coleccion; si no, el cuerpo directo */
const arg = (body, name) => (body && body[name] !== undefined ? body[name] : body);

const like = (t) => `%${t}%`;

module.exports = { iso, isoDate, ahora, s, n, b, qs, qn, qb, arg, like };
