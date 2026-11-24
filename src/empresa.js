'use strict';
/* Empresas (multiempresa): alta, catalogos iniciales, miembros y busqueda por slug */
const crypto = require('crypto');
const { byName } = require('./schema');
const { seed, hashPassword } = require('./seed');
const { ahora, s } = require('./util');
const { nextId } = require('./routes/common');

const RESERVED = new Set(['auth', 'portal', 'health', 'login', 'logout', 'general', 'rest', 'archivosbep', 'appbep', 'api', 'admin', 'static', 'assets', 'css', 'js', 'templates', 'bep', 'index', 'portal-html']);
const normSlug = (v) => String(v || '').trim().toLowerCase();
function validarSlug(v) {
  const slug = normSlug(v);
  if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(slug)) return 'La direccion debe tener de 2 a 30 caracteres: letras minusculas, numeros y guiones (ej. mi-empresa)';
  if (RESERVED.has(slug)) return 'Esa direccion esta reservada, elija otra';
  return '';
}
const codigoCompania = (id) => 'CM' + String(id).padStart(3, '0');
const claveValida = (p) => String(p || '').length >= 8;
const err = (status, mensaje) => Object.assign(new Error(mensaje), { status });

/** Empresa por slug, con cache corto (15 s) para no consultar en cada peticion */
function crearRegistro(raw) {
  const cache = new Map();
  return {
    async porSlug(slug) {
      const k = normSlug(slug);
      const hit = cache.get(k);
      if (hit && Date.now() - hit.t < 15000) return hit.v;
      const r = (await raw.query('SELECT EmpresaId, EmpNombre, EmpSlug, EmpEstado FROM Empresa WHERE EmpSlug = @s', { s: k }, { limit: 1 }))[0];
      const v = r ? { id: Number(r.EmpresaId), nombre: s(r.EmpNombre), slug: s(r.EmpSlug), activa: !!Number(r.EmpEstado), compania: codigoCompania(r.EmpresaId) } : null;
      cache.set(k, { t: Date.now(), v });
      return v;
    },
    invalidar() { cache.clear(); },
  };
}

// Catalogos que cada empresa recibe como punto de partida (orden = dependencias). Se copian de src/seed.js.
const CATALOGOS = [
  ['TipoBEP', {}], ['Actividad', {}], ['SubActividad', { ActId: 'Actividad' }], ['LeyendaRACI', {}], ['UsoBIM', {}],
  ['Especialidad', { TipoBepId: 'TipoBEP' }], ['LeyendaLOD', {}], ['CategoriaBEP', { TipoBepId: 'TipoBEP' }], ['RolBEP', {}],
  ['CategoriaElemento', { EspId: 'Especialidad' }], ['Elemento', { CatEleId: 'CategoriaElemento' }],
];

/** Copia los catalogos iniciales a la empresa (t = transaccion SIN filtro; cada fila lleva su EmpresaId) */
async function sembrarCatalogos(t, empresaId) {
  const ids = {};
  for (const [tabla, refs] of CATALOGOS) {
    const def = byName[tabla];
    const cols = def.cols.filter((c) => !c.identity && !c.tenantCol).map((c) => c.name);
    ids[tabla] = [];
    for (const src of seed[tabla] || []) {
      const row = { EmpresaId: empresaId };
      for (const c of cols) row[c] = src[c] === undefined ? null : src[c];
      for (const [col, ref] of Object.entries(refs)) row[col] = ids[ref][Number(src[col]) - 1];   // el id del seed = posicion + 1
      ids[tabla].push(await t.insert(tabla, row));
    }
  }
}

/**
 * Agrega a una persona como miembro de la empresa. Si el correo ya existe en la plataforma (otra empresa)
 * conserva su cuenta y su clave; si no, crea la cuenta. Siempre crea su ficha de Personal dentro de la empresa.
 * t = transaccion (sin filtro, o con filtro: se pasa EmpresaId explicito de todos modos).
 */
async function altaMiembro(t, empresaId, d, { rol = 'usuario', estado = 1 } = {}) {
  const q = (sql, p, o) => (t.rawQuery || t.query).call(t, sql, p, o);
  const correo = s(d.correo).trim();
  if (!correo) throw err(400, 'Ingrese el correo');
  const ex = (await q(`SELECT u.usuarioId, u.PersonalId, u.UsuarioSuper, p.PersonalNombres, p.PersonalApellidos, p.PersonaTelefono, p.personaldni, p.PersonaDireccion
      FROM Usuario u LEFT JOIN Personal p ON p.PersonalId = u.PersonalId WHERE LOWER(u.UsuarioNombre) = @c`, { c: correo.toLowerCase() }, { limit: 1 }))[0];
  if (ex && Number(ex.UsuarioSuper)) throw err(400, 'Ese correo es del superadministrador de la plataforma: no puede ser parte de una empresa');
  if (ex) {
    const ya = await q('SELECT UsuEmpId FROM UsuarioEmpresa WHERE usuarioId = @u AND EmpresaId = @e', { u: ex.usuarioId, e: empresaId }, { limit: 1 });
    if (ya.length) throw err(409, 'Correo ya existe');
  } else if (!claveValida(d.password)) {
    throw err(400, 'La contraseña debe tener al menos 8 caracteres');
  }
  const pick = (k, kEx) => (s(d[k]) !== '' ? s(d[k]) : s(ex && ex[kEx]));
  const pid = await nextId(t, 'Personal', 'PersonalId', 'EM', 4);
  await t.insert('Personal', { PersonalId: pid, PersonalNombres: pick('nombre', 'PersonalNombres'), PersonalApellidos: pick('apellido', 'PersonalApellidos'), PersonaTelefono: pick('telefono', 'PersonaTelefono'),
    personaldni: pick('dni', 'personaldni'), PersonaMail: correo, PersonaDireccion: pick('direccion', 'PersonaDireccion'), PersonalEstado: 1, EmpresaId: empresaId });
  let usuarioId;
  if (ex) usuarioId = ex.usuarioId;
  else {
    usuarioId = await nextId(t, 'Usuario', 'usuarioId', 'US', 3);
    const salt = crypto.randomBytes(12).toString('hex');
    await t.insert('Usuario', { usuarioId, UsuarioNombre: correo, UsuarioKey: salt, UsuarioPasword: hashPassword(d.password, salt), PersonalId: pid, RolId: null, UsuarioEstado: 1, UsuarioSuper: 0 });
  }
  await t.insert('UsuarioEmpresa', { usuarioId, PersonalId: pid, UsuEmpRol: rol, UsuEmpEstado: estado, UsuEmpFecha: ahora(), EmpresaId: empresaId });
  return { usuarioId, personalId: pid, existente: !!ex };
}

/** Crea una empresa con sus catalogos, un proyecto inicial y su administrador. raw = base SIN filtro. */
async function crearEmpresa(raw, { nombre, slug, admin }) {
  nombre = s(nombre).trim(); slug = normSlug(slug);
  if (!nombre) throw err(400, 'Ingrese el nombre de la empresa');
  const eslug = validarSlug(slug);
  if (eslug) throw err(400, eslug);
  if (!admin || !s(admin.correo).trim()) throw err(400, 'Ingrese el correo del administrador de la empresa');
  return raw.tx(async (t) => {
    if ((await t.query('SELECT EmpresaId FROM Empresa WHERE EmpSlug = @s', { s: slug }, { limit: 1 })).length) throw err(409, 'Ya existe una empresa con esa direccion');
    const id = await t.insert('Empresa', { EmpNombre: nombre, EmpSlug: slug, EmpEstado: 1, EmpFecha: ahora(), EmpFechaAct: ahora() });
    await sembrarCatalogos(t, id);
    await t.insert('Campana', { CampanaId: 'CP001', CompaniaId: codigoCompania(id), ClienteId: 'CL001', CampanaNombre: 'Proyecto general', CampanaEstado: 'Activo',
      CampanaFechaInicio: ahora(), CampanaFechaFin: null, CampanaFechaFinReal: null, CampanaBep: 1, EmpresaId: id });
    const a = await altaMiembro(t, id, admin, { rol: 'admin' });
    return { id, slug, nombre, admin: a };
  });
}

/** El superadmin se mueve entre empresas, pero NO figura como usuario en ellas (las listas lo ocultan): se le crea una ficha interna, como administrador, para poder trabajar */
async function asegurarSuper(raw, usuarioId, empresaId) {
  const m = (await raw.query('SELECT UsuEmpId, PersonalId, UsuEmpRol, UsuEmpEstado FROM UsuarioEmpresa WHERE usuarioId = @u AND EmpresaId = @e', { u: usuarioId, e: empresaId }, { limit: 1 }))[0];
  if (m) return m;
  return raw.tx(async (t) => {
    const u = (await t.query('SELECT u.PersonalId, p.PersonalNombres, p.PersonalApellidos, p.PersonaMail FROM Usuario u LEFT JOIN Personal p ON p.PersonalId = u.PersonalId WHERE u.usuarioId = @u', { u: usuarioId }, { limit: 1 }))[0] || {};
    const pid = await nextId(t, 'Personal', 'PersonalId', 'EM', 4);
    await t.insert('Personal', { PersonalId: pid, PersonalNombres: s(u.PersonalNombres) || 'Administrador', PersonalApellidos: s(u.PersonalApellidos) || 'BEP', PersonaMail: s(u.PersonaMail), PersonalEstado: 1, EmpresaId: empresaId });
    await t.insert('UsuarioEmpresa', { usuarioId, PersonalId: pid, UsuEmpRol: 'admin', UsuEmpEstado: 1, UsuEmpFecha: ahora(), EmpresaId: empresaId });
    return { PersonalId: pid, UsuEmpRol: 'admin', UsuEmpEstado: 1 };
  });
}

module.exports = { RESERVED, normSlug, validarSlug, codigoCompania, claveValida, crearRegistro, sembrarCatalogos, altaMiembro, crearEmpresa, asegurarSuper, err };
