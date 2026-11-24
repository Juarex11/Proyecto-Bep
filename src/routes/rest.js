'use strict';
/* CRUD generico /rest/General/<Transaccion>[/<id>] (se monta en /rest/General)  (reemplaza las Business Components REST de GeneXus) */
const express = require('express');
const crypto = require('crypto');
const { BEP_TABLES, byName } = require('../schema');
const { iso, b } = require('../util');
const { wrap, toDate } = require('./common');

// Catalogos de configuracion: solo los modifica el administrador de la empresa
const CATALOGOS = new Set(['tipobep', 'categoriabep', 'usobim', 'especialidad', 'categoriaelemento', 'elemento', 'leyendalod', 'parametroloi', 'organizacionbep', 'rolbep', 'actividad', 'subactividad', 'leyendaraci', 'plantillabep', 'detalleplantilla']);
const TABLES = Object.fromEntries(BEP_TABLES.map((t) => [t.name.toLowerCase(), byName[t.name]]));

/** Valor de la base -> JSON (nulos como valor "vacio" de GeneXus) */
function out(type, v) {
  const base = type.replace('?', '');
  if (base === 'bit') return b(v);
  if (base === 'dt') return iso(v);
  if (base === 'id' || base === 'i16') return v === null || v === undefined ? 0 : Number(v);
  return v === null || v === undefined ? '' : String(v);
}

/** Valor del cliente -> parametro SQL */
function inn(col, v) {
  const type = col.type; const base = type.replace('?', ''); const nullable = type.endsWith('?');
  if (base === 'bit') return b(v) ? 1 : 0;
  if (base === 'dt') return toDate(v);
  if (base === 'id' || base === 'i16') {
    const num = v === '' || v === null || v === undefined ? 0 : Number(v);
    if (Number.isNaN(num)) throw Object.assign(new Error(`Valor numerico no valido en ${col.name}`), { status: 400 });
    return nullable && num === 0 ? null : num;
  }
  const str = v === null || v === undefined ? '' : String(v);
  if (base.startsWith('s:') && str.length > Number(base.slice(2))) {
    throw Object.assign(new Error(`El campo ${col.name} excede ${base.slice(2)} caracteres`), { status: 400 });
  }
  return nullable && str === '' ? null : str;
}

module.exports = (db) => {
  const r = express.Router();
  r.use('/:t', (req, res, next) => {
    if (req.method !== 'GET' && CATALOGOS.has(String(req.params.t).toLowerCase()) && !(req.user && req.user.rol === 'admin')) {
      return res.status(403).json({ error: 'Sin permiso', mensaje: 'Solo el administrador de la empresa puede modificar la configuracion' });
    }
    next();
  });
  const table = (req, res) => {
    const t = TABLES[String(req.params.t).toLowerCase()];
    if (!t) { res.status(404).json({ error: 'Transaccion no existe' }); return null; }
    return t;
  };
  const pkOf = (t) => (Array.isArray(t.pk) ? t.pk[0] : t.pk);
  const record = (t, row) => {
    const o = {};
    for (const c of t.cols) { if (!c.tenantCol) o[c.name] = out(c.type, row[c.name]); }
    o.gx_md5_hash = crypto.createHash('md5').update(JSON.stringify(o)).digest('hex');
    return o;
  };
  const load = async (t, id) => (await db.query(`SELECT * FROM ${t.name} WHERE ${pkOf(t)} = @id`, { id }))[0];
  const fail = (res, e) => res.status(e.status || 500).json({ error: e.message, mensaje: e.message });

  r.get('/:t', wrap(async (req, res) => {
    const t = table(req, res); if (!t) return;
    const rows = await db.query(`SELECT * FROM ${t.name} ORDER BY ${pkOf(t)}`);
    res.json(rows.map((x) => record(t, x)));
  }));

  r.get('/:t/:id', wrap(async (req, res) => {
    const t = table(req, res); if (!t) return;
    const row = await load(t, Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Registro no encontrado', mensaje: 'Registro no encontrado' });
    res.json(record(t, row));
  }));

  // el front guarda con POST <Tabla>/0 (id 0 = registro nuevo), asi que se aceptan las dos formas
  r.post(['/:t', '/:t/:id'], wrap(async (req, res) => {
    const t = table(req, res); if (!t) return;
    try {
      const row = {};
      for (const c of t.cols) {
        if (c.identity || c.tenantCol || req.body[c.name] === undefined) continue;
        row[c.name] = inn(c, req.body[c.name]);
      }
      const id = await db.insert(t.name, row);
      res.status(201).json(record(t, await load(t, id)));
    } catch (e) { fail(res, e); }
  }));

  r.put('/:t/:id', wrap(async (req, res) => {
    const t = table(req, res); if (!t) return;
    try {
      const id = Number(req.params.id);
      if (!(await load(t, id))) return res.status(404).json({ error: 'Registro no encontrado', mensaje: 'Registro no encontrado' });
      const sets = []; const p = { _id: id };
      for (const c of t.cols) {
        if (c.pk || c.tenantCol || req.body[c.name] === undefined) continue;
        sets.push(`${c.name} = @${c.name}`); p[c.name] = inn(c, req.body[c.name]);
      }
      if (sets.length) await db.exec(`UPDATE ${t.name} SET ${sets.join(', ')} WHERE ${pkOf(t)} = @_id`, p);
      res.json(record(t, await load(t, id)));
    } catch (e) { fail(res, e); }
  }));

  r.delete('/:t/:id', wrap(async (req, res) => {
    const t = table(req, res); if (!t) return;
    try {
      await db.exec(`DELETE FROM ${t.name} WHERE ${pkOf(t)} = @id`, { id: Number(req.params.id) });
      res.json({});
    } catch (e) { res.status(409).json({ error: 'No se puede eliminar: tiene datos relacionados', mensaje: e.message }); }
  }));

  return r;
};
