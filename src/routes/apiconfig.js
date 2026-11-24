'use strict';
/* APIConfigBEP: catalogos de configuracion, usuarios (puerto de las procedimientos Proc*Lista*, ProcSelectConfigBEP, ProcUsuario*) */
const express = require('express');
const { s, n, b, qs, qn, qb, like, iso } = require('../util');
const { wrap, nextId, toDate } = require('./common');
const { hashPassword } = require('../seed');
const { altaMiembro, claveValida } = require('../empresa');
const crypto = require('crypto');

const DEF = { id: 0, nombre: '', default: false, tipoOrg: 0, tipoBep: '', actividad: '', espId: 0, especialidad: '', categoria: '', abreviacion: '', color: '', background: '', estado: false };

/** Paginacion identica a la de GeneXus: 10 por pagina, siguiente/anterior por id */
async function paged(db, req, o) {
  const estado = qb(req, 'estado', true) ? 1 : 0;
  const idParam = o.idParam || 'inicio';
  const inicio = o.textId ? qs(req, idParam, '') : qn(req, idParam, 0);
  const params = {
    buscar: like(qs(req, 'buscar')), estado, inicio,
    tipoBep: qn(req, 'tipoBep'), espId: qn(req, 'espId'), catId: qn(req, 'catId'), tipoOrg: qn(req, 'tipoOrg'), actId: qn(req, 'actId'),
  };
  const where = `${o.nameCond} AND ${o.estCol} = @estado ${o.extra || ''}`;
  const from = `FROM ${o.from} WHERE ${where}`;
  if (qb(req, 'todos', false)) {   // lista completa (la tabla del front pagina, busca y ordena en el navegador)
    const all = await db.query(`SELECT ${o.select}, ${o.idCol} AS _id ${from} ORDER BY ${o.idCol} ASC`, params, { limit: 5000 });
    return { anterior: o.textId ? 'US000' : 0, siguiente: o.textId ? 'US000' : 0, data: all.map(o.map) };
  }
  const rows = await db.query(`SELECT ${o.select}, ${o.idCol} AS _id ${from} AND ${o.idCol} > @inicio ORDER BY ${o.idCol} ASC`, params, { limit: 10 });
  let siguiente = o.textId ? 'US000' : 0;
  if (rows.length === 10) {
    const last = rows[9]._id;
    const more = await db.query(`SELECT ${o.idCol} AS _id ${from} AND ${o.idCol} > @last`, { ...params, last }, { limit: 1 });
    if (more.length) siguiente = last;
  }
  let anterior = o.textId ? 'US000' : 0;
  const prev = await db.query(`SELECT ${o.idCol} AS _id ${from} AND ${o.idCol} < @inicio ORDER BY ${o.idCol} DESC`, params, { limit: 10 });
  if (prev.length > 0) anterior = prev[prev.length - 1]._id;
  return { anterior, siguiente, data: rows.map(o.map) };
}

const NAME = (col) => `${col} LIKE @buscar`;

module.exports = (db, auth, img) => {
  const r = express.Router();
  const fotoVer = (id) => (img ? (img.buscar(img.claveFoto(id)) || {}).ver || 0 : 0);   // 0 = sin foto
  const lista = (path, spec) => r.get(`/APIConfigBEP/${path}`, auth.requireAdmin, wrap(async (req, res) => res.json(await paged(db, req, spec))));
  const item = (o) => ({ ...DEF, ...o });

  lista('GetListaTiposBEP', { from: 'TipoBEP t', select: 't.TipoBepId, t.TipoBepNombre, t.TipoBepEstado', idCol: 't.TipoBepId', nameCond: NAME('t.TipoBepNombre'), estCol: 't.TipoBepEstado',
    map: (x) => item({ id: x.TipoBepId, nombre: s(x.TipoBepNombre), estado: b(x.TipoBepEstado) }) });
  lista('GetListaCategoriasBEP', { from: 'CategoriaBEP c LEFT JOIN TipoBEP t ON t.TipoBepId = c.TipoBepId', select: 'c.CatBepId, c.CatBepNombre, c.CatBepEstado, t.TipoBepNombre',
    idCol: 'c.CatBepId', nameCond: NAME('c.CatBepNombre'), estCol: 'c.CatBepEstado', extra: 'AND (@tipoBep = 0 OR c.TipoBepId = @tipoBep)',
    map: (x) => item({ id: x.CatBepId, nombre: s(x.CatBepNombre), tipoBep: s(x.TipoBepNombre), estado: b(x.CatBepEstado) }) });
  lista('GetListaUsosBim', { from: 'UsoBIM u', select: 'u.UsoBimId, u.UsoBimNombre, u.UsoBimDefault, u.UsoBimEstado', idCol: 'u.UsoBimId', nameCond: NAME('u.UsoBimNombre'), estCol: 'u.UsoBimEstado',
    map: (x) => item({ id: x.UsoBimId, nombre: s(x.UsoBimNombre), default: b(x.UsoBimDefault), estado: b(x.UsoBimEstado) }) });
  lista('GetListaEspecialidades', { from: 'Especialidad e LEFT JOIN TipoBEP t ON t.TipoBepId = e.TipoBepId', select: 'e.EspId, e.EspNombre, e.EspDefault, e.EspEstado, t.TipoBepNombre',
    idCol: 'e.EspId', nameCond: NAME('e.EspNombre'), estCol: 'e.EspEstado', extra: 'AND (@tipoBep = 0 OR e.TipoBepId = @tipoBep)',
    map: (x) => item({ id: x.EspId, nombre: s(x.EspNombre), tipoBep: s(x.TipoBepNombre), default: b(x.EspDefault), estado: b(x.EspEstado) }) });
  lista('GetListaCategorias', { from: 'CategoriaElemento c LEFT JOIN Especialidad e ON e.EspId = c.EspId LEFT JOIN TipoBEP t ON t.TipoBepId = e.TipoBepId',
    select: 'c.CatEleId, c.CatEleNombre, c.CatEleEstado, e.EspNombre, t.TipoBepNombre', idCol: 'c.CatEleId', nameCond: NAME('c.CatEleNombre'), estCol: 'c.CatEleEstado',
    extra: 'AND (@tipoBep = 0 OR e.TipoBepId = @tipoBep) AND (@espId = 0 OR c.EspId = @espId)',
    map: (x) => item({ id: x.CatEleId, nombre: s(x.CatEleNombre), estado: b(x.CatEleEstado), especialidad: s(x.EspNombre), tipoBep: s(x.TipoBepNombre) }) });
  lista('GetListaElementos', { from: 'Elemento x LEFT JOIN CategoriaElemento c ON c.CatEleId = x.CatEleId LEFT JOIN Especialidad e ON e.EspId = c.EspId LEFT JOIN TipoBEP t ON t.TipoBepId = e.TipoBepId',
    select: 'x.EleId, x.EleNombre, x.EleEstado, x.EleDefault, c.CatEleNombre, c.EspId, e.EspNombre, t.TipoBepNombre', idCol: 'x.EleId', nameCond: NAME('x.EleNombre'), estCol: 'x.EleEstado',
    extra: 'AND (@catId = 0 OR x.CatEleId = @catId) AND (@espId = 0 OR c.EspId = @espId) AND (@tipoBep = 0 OR e.TipoBepId = @tipoBep)',
    map: (x) => item({ id: x.EleId, nombre: s(x.EleNombre), estado: b(x.EleEstado), default: b(x.EleDefault), categoria: s(x.CatEleNombre), espId: n(x.EspId), especialidad: s(x.EspNombre), tipoBep: s(x.TipoBepNombre) }) });
  lista('GetListaLOD', { from: 'LeyendaLOD l', select: 'l.LeyLodId, l.LeyLodNombre, l.LeyLodDefault, l.LeyLodEstado', idCol: 'l.LeyLodId', nameCond: NAME('l.LeyLodNombre'), estCol: 'l.LeyLodEstado',
    map: (x) => item({ id: x.LeyLodId, nombre: s(x.LeyLodNombre), default: b(x.LeyLodDefault), estado: b(x.LeyLodEstado) }) });
  lista('GetListaParametros', { from: 'ParametroLOI p', select: 'p.ParLoiId, p.ParLoiNombre, p.ParLoiEstado', idCol: 'p.ParLoiId', nameCond: NAME('p.ParLoiNombre'), estCol: 'p.ParLoiEstado',
    map: (x) => item({ id: x.ParLoiId, nombre: s(x.ParLoiNombre), estado: b(x.ParLoiEstado) }) });
  lista('GetListaOrganizaciones', { from: 'OrganizacionBEP o', select: 'o.OrgBepId, o.OrgBepNombre, o.OrgBepTipo, o.OrgBepEstado', idCol: 'o.OrgBepId', nameCond: NAME('o.OrgBepNombre'), estCol: 'o.OrgBepEstado',
    extra: 'AND (@tipoOrg = 0 OR o.OrgBepTipo = @tipoOrg)',
    map: (x) => item({ id: x.OrgBepId, nombre: s(x.OrgBepNombre), tipoOrg: n(x.OrgBepTipo), estado: b(x.OrgBepEstado) }) });
  lista('GetListaRoles', { from: 'RolBEP r', select: 'r.RolBepId, r.RolBepNombre, r.RolBepEstado', idCol: 'r.RolBepId', nameCond: NAME('r.RolBepNombre'), estCol: 'r.RolBepEstado',
    map: (x) => item({ id: x.RolBepId, nombre: s(x.RolBepNombre), estado: b(x.RolBepEstado) }) });
  lista('GetListaActividades', { from: 'Actividad a', select: 'a.ActId, a.ActNombre, a.ActEstado', idCol: 'a.ActId', nameCond: NAME('a.ActNombre'), estCol: 'a.ActEstado',
    map: (x) => item({ id: x.ActId, nombre: s(x.ActNombre), estado: b(x.ActEstado) }) });
  lista('GetListaSubActividades', { from: 'SubActividad s LEFT JOIN Actividad a ON a.ActId = s.ActId', select: 's.SubActId, s.SubActNombre, s.SubActDefault, s.SubActEstado, a.ActNombre',
    idCol: 's.SubActId', nameCond: NAME('s.SubActNombre'), estCol: 's.SubActEstado', extra: 'AND (@actId = 0 OR s.ActId = @actId)',
    map: (x) => item({ id: x.SubActId, nombre: s(x.SubActNombre), default: b(x.SubActDefault), actividad: s(x.ActNombre), estado: b(x.SubActEstado) }) });
  lista('GetListaLeyRACI', { from: 'LeyendaRACI l', select: 'l.LeyRaciId, l.LeyRaciNombre, l.LeyRaciAbreviacion, l.LeyRaciColor, l.LeyRaciBackground, l.LeyRaciEstado', idCol: 'l.LeyRaciId', nameCond: NAME('l.LeyRaciNombre'), estCol: 'l.LeyRaciEstado',
    map: (x) => item({ id: x.LeyRaciId, nombre: s(x.LeyRaciNombre), abreviacion: s(x.LeyRaciAbreviacion), color: s(x.LeyRaciColor), background: s(x.LeyRaciBackground), estado: b(x.LeyRaciEstado) }) });

  // ---- Selects ----
  r.get('/APIConfigBEP/GetSelectConfigBEP', wrap(async (req, res) => {
    const opcion = qs(req, 'opcion'); const parametro = qn(req, 'parametro');
    const Q = {
      tipoBEP: ['SELECT TipoBepId AS id, TipoBepNombre AS nombre FROM TipoBEP WHERE TipoBepEstado = 1 ORDER BY TipoBepId', {}],
      actividad: ['SELECT ActId AS id, ActNombre AS nombre FROM Actividad WHERE ActEstado = 1 ORDER BY ActId', {}],
      especialidad: ['SELECT EspId AS id, EspNombre AS nombre FROM Especialidad WHERE TipoBepId = @p AND EspEstado = 1 ORDER BY EspId', { p: parametro }],
      categoria: ['SELECT CatEleId AS id, CatEleNombre AS nombre FROM CategoriaElemento WHERE EspId = @p AND CatEleEstado = 1 ORDER BY CatEleId', { p: parametro }],
    }[opcion];
    const rows = Q ? await db.query(Q[0], Q[1]) : [];
    res.json({ SDTSelectConfigBEP: rows.map((x) => ({ id: Number(x.id), nombre: s(x.nombre) })) });
  }));

  // ---- Usuarios de la empresa (solo administrador de la empresa) ----
  // La cuenta (correo/clave) es global; la pertenencia, el rol, el estado y la ficha de Personal son de cada empresa.
  const MEMBER = 'UsuarioEmpresa ue JOIN Usuario u ON u.usuarioId = ue.usuarioId LEFT JOIN Personal p ON p.PersonalId = ue.PersonalId';

  r.get('/APIConfigBEP/GetListaUsuarios', auth.requireAdmin, wrap(async (req, res) => {
    const out = await paged(db, { query: { ...req.query, inicio: req.query.id } }, {
      from: MEMBER, textId: true,
      select: 'u.usuarioId, ue.PersonalId, p.PersonalNombres, p.PersonalApellidos, p.personaldni, p.PersonaTelefono, u.UsuarioNombre, ue.UsuEmpEstado, ue.UsuEmpRol',
      idCol: 'u.usuarioId', nameCond: '(p.PersonalNombres LIKE @buscar OR p.PersonalApellidos LIKE @buscar OR u.UsuarioNombre LIKE @buscar)', estCol: 'ue.UsuEmpEstado', extra: 'AND COALESCE(u.UsuarioSuper, 0) = 0',
      map: (x) => ({ id: s(x.usuarioId), personalId: s(x.PersonalId), nombre: s(x.PersonalNombres), apellido: s(x.PersonalApellidos), dni: s(x.personaldni), telefono: s(x.PersonaTelefono), correo: s(x.UsuarioNombre), estado: b(x.UsuEmpEstado), rol: s(x.UsuEmpRol), foto: fotoVer(x.usuarioId) }),
    });
    res.json(out);
  }));

  r.get('/APIConfigBEP/GetUsuarioInfo', auth.requireAdmin, wrap(async (req, res) => {
    const id = qs(req, 'id');
    const x = (await db.query(`SELECT u.usuarioId, ue.PersonalId, ue.UsuEmpRol, ue.UsuEmpEstado, u.UsuarioNombre, p.PersonalNombres, p.PersonalApellidos, p.personaldni, p.PersonaTelefono, p.PersonaDireccion
        FROM ${MEMBER} WHERE u.usuarioId = @id AND COALESCE(u.UsuarioSuper, 0) = 0`, { id }))[0];
    // La clave se guarda con hash (no reversible): nunca se devuelve
    res.json({ usuarioId: s(x && x.usuarioId), personalId: s(x && x.PersonalId), rolId: '', rol: s(x && x.UsuEmpRol) || 'usuario', dni: s(x && x.personaldni), nombre: s(x && x.PersonalNombres), apellido: s(x && x.PersonalApellidos),
      telefono: s(x && x.PersonaTelefono), correo: s(x && x.UsuarioNombre), direccion: s(x && x.PersonaDireccion), password: '', estado: x ? b(x.UsuEmpEstado) : false, foto: x ? fotoVer(x.usuarioId) : 0 });
  }));

  r.post('/APIConfigBEP/PostUsuarioGuardar', auth.requireAdmin, wrap(async (req, res) => {
    const u = req.body.SDTUsuario || req.body;
    const emp = req.empresa.id;
    const rol = ['admin', 'usuario'].includes(s(u.rol)) ? s(u.rol) : 'usuario';
    const estado = b(u.estado) ? 1 : 0;
    let mensaje;
    try {
      mensaje = await db.tx(async (t) => {
        if (s(u.usuarioId) === '') {
          const a = await altaMiembro(t, emp, u, { rol, estado });
          return a.existente ? 'Registrado correctamente (ese correo ya tenia cuenta en BEP: conserva su contraseña actual)' : 'Registrado correctamente';
        }
        const id = s(u.usuarioId);
        const m = (await t.query(`SELECT ue.usuarioId, ue.PersonalId, ue.UsuEmpRol, ue.UsuEmpEstado, u.UsuarioNombre, u.UsuarioSuper
            FROM UsuarioEmpresa ue JOIN Usuario u ON u.usuarioId = ue.usuarioId WHERE ue.usuarioId = @id`, { id }))[0];
        if (!m) return 'Usuario no encontrado';
        if (Number(m.UsuarioSuper)) return 'Usuario no encontrado';
        // la empresa siempre debe conservar un administrador propio activo
        if (m.UsuEmpRol === 'admin' && Number(m.UsuEmpEstado) && (rol !== 'admin' || !estado)) {
          const otros = await t.query(`SELECT ue.UsuEmpId FROM UsuarioEmpresa ue JOIN Usuario x ON x.usuarioId = ue.usuarioId
              WHERE ue.UsuEmpRol = 'admin' AND ue.UsuEmpEstado = 1 AND ue.usuarioId <> @id AND COALESCE(x.UsuarioSuper, 0) = 0`, { id }, { limit: 1 });
          if (!otros.length) return 'La empresa debe tener al menos un administrador activo';
        }
        const correo = s(u.correo).trim();
        const cambiaCorreo = correo.toLowerCase() !== s(m.UsuarioNombre).toLowerCase();
        const cambiaClave = s(u.password) !== '';
        if (cambiaCorreo || cambiaClave) {
          // correo y clave son de la cuenta, que puede estar en otras empresas: solo se cambian si es de esta empresa unicamente
          const otras = await t.rawQuery('SELECT COUNT(*) AS c FROM UsuarioEmpresa WHERE usuarioId = @id AND EmpresaId <> @e', { id, e: emp });
          if (Number(otras[0].c) > 0) return 'Ese usuario tambien pertenece a otras empresas: su correo y su contraseña solo los puede cambiar el propio usuario';
          if (cambiaCorreo && (await t.rawQuery('SELECT usuarioId FROM Usuario WHERE LOWER(UsuarioNombre) = @c AND usuarioId <> @id', { c: correo.toLowerCase(), id }, { limit: 1 })).length) return 'Correo ya existe';
          if (cambiaClave && !claveValida(u.password)) return 'La contraseña debe tener al menos 8 caracteres';
        }
        await t.exec(`UPDATE Personal SET PersonalNombres=@n, PersonalApellidos=@a, PersonaTelefono=@t, personaldni=@d, PersonaMail=@m, PersonaDireccion=@dir, PersonalEstado=@e WHERE PersonalId=@id`,
          { n: s(u.nombre), a: s(u.apellido), t: s(u.telefono), d: s(u.dni), m: correo, dir: s(u.direccion), e: estado, id: m.PersonalId });
        await t.exec('UPDATE UsuarioEmpresa SET UsuEmpRol=@r, UsuEmpEstado=@e WHERE usuarioId=@id', { r: rol, e: estado, id });
        if (cambiaCorreo) await t.exec('UPDATE Usuario SET UsuarioNombre=@m WHERE usuarioId=@id', { m: correo, id });
        if (cambiaClave) {
          const salt = crypto.randomBytes(12).toString('hex');
          await t.exec('UPDATE Usuario SET UsuarioKey=@k, UsuarioPasword=@p WHERE usuarioId=@id', { k: salt, p: hashPassword(u.password, salt), id });
        }
        return 'Editado correctamente';
      });
    } catch (e) { if (e.status) mensaje = e.message; else throw e; }
    auth.invalidar();
    res.json({ mensaje });
  }));

  // ---- Proyectos de la empresa (tabla Campana) ----
  r.get('/APIConfigBEP/GetListaCampanas', auth.requireAdmin, wrap(async (req, res) => {
    const activo = qb(req, 'estado', true);
    const rows = await db.query(`SELECT CampanaId, CompaniaId, ClienteId, CampanaNombre, CampanaEstado, CampanaFechaInicio, CampanaFechaFin FROM Campana
        WHERE CampanaNombre LIKE @b AND ${activo ? "CampanaEstado <> 'Anulado'" : "CampanaEstado = 'Anulado'"} ORDER BY CampanaId`, { b: like(qs(req, 'buscar')) }, { limit: 200 });
    res.json({ data: rows.map((x) => ({ campanaId: s(x.CampanaId), companiaId: s(x.CompaniaId), clienteId: s(x.ClienteId), nombre: s(x.CampanaNombre), estado: s(x.CampanaEstado) !== 'Anulado',
      fechaInicio: iso(x.CampanaFechaInicio, '').slice(0, 10), fechaFin: iso(x.CampanaFechaFin, '').slice(0, 10) })) });
  }));

  r.post('/APIConfigBEP/PostCampanaGuardar', auth.requireAdmin, wrap(async (req, res) => {
    const d = req.body || {};
    const nombre = s(d.nombre).trim();
    if (!nombre) return res.json({ mensaje: 'Ingrese el nombre del proyecto' });
    if (nombre.length > 150) return res.json({ mensaje: 'El nombre excede 150 caracteres' });
    const estado = b(d.estado) ? 'Activo' : 'Anulado';
    const fi = toDate(d.fechaInicio); const ff = toDate(d.fechaFin);
    const mensaje = await db.tx(async (t) => {
      if (s(d.campanaId) === '') {
        const id = await nextId({ query: (...a) => t.query(...a) }, 'Campana', 'CampanaId', 'CP', 3);   // secuencia propia de la empresa
        await t.insert('Campana', { CampanaId: id, CompaniaId: req.empresa.compania, ClienteId: 'CL001', CampanaNombre: nombre, CampanaEstado: estado, CampanaFechaInicio: fi, CampanaFechaFin: ff, CampanaFechaFinReal: null, CampanaBep: 1 });
        return 'Registrado correctamente';
      }
      const n = await t.exec('UPDATE Campana SET CampanaNombre=@n, CampanaEstado=@e, CampanaFechaInicio=@fi, CampanaFechaFin=@ff WHERE CampanaId=@a AND CompaniaId=@c AND ClienteId=@cl',
        { n: nombre, e: estado, fi, ff, a: s(d.campanaId), c: s(d.companiaId), cl: s(d.clienteId) });
      return n ? 'Editado correctamente' : 'Proyecto no encontrado';
    });
    res.json({ mensaje });
  }));

  return r;
};
