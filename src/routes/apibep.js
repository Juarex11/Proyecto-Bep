'use strict';
/* APIBEP: lectura (Get*) y operaciones (Post*). Puerto fiel de los procedimientos GeneXus Proc*BEP. */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { iso, isoDate, ahora, s, n, b, qs, qn, arg, like } = require('../util');
const { wrap, nombrePersonal, nextId, maxFecha, toDate } = require('./common');

module.exports = (db, env) => {
  const r = express.Router();
  const uploadDir = path.resolve(env.UPLOAD_DIR || './ArchivosBEP');
  const get = (name, fn) => r.get(`/APIBEP/${name}`, wrap(fn));
  const post = (name, fn) => r.post(`/APIBEP/${name}`, wrap(fn));
  const list = (key, rows, res) => res.json({ [key]: rows });
  const tx = (fn) => db.tx(fn);

  // ===================== LECTURA =====================

  get('GetListaBEP', async (req, res) => {
    const buscar = qs(req, 'buscar');
    const proyectos = await db.query(
      `SELECT ProBepId, ProBepNombre, ProBepPersonalId, ProBepCompleto, ProBepFecha FROM ProyectoBEP
        WHERE ProBepEstado = 1 AND (@t = '' OR ProBepNombre LIKE @b) ORDER BY ProBepId`, { t: buscar, b: like(buscar) });
    const out = [];
    for (const p of proyectos) {
      const it = { id: n(p.ProBepId), nombre: s(p.ProBepNombre), proyecto: '', completado: b(p.ProBepCompleto), personal: '', estados: '',
        idRevision: 0, revision: '', idTipoBep: 0, idEtapa: 0, etapa: '', cliente: '', usuario: '', fechaCreada: iso(p.ProBepFecha), fechaActualizada: '' };
      let revProId = 0;
      const rp = (await db.query('SELECT * FROM RevisionProyecto WHERE ProBepId = @p AND RevProActual = 1 ORDER BY RevProId DESC', { p: p.ProBepId }, { limit: 1 }))[0];
      if (rp) {
        revProId = n(rp.RevProId);
        it.idRevision = revProId; it.revision = s(rp.RevProNombre); it.idTipoBep = n(rp.RevProTipoId);
        const c = (await db.query('SELECT CampanaNombre FROM Campana WHERE CampanaId = @a AND CompaniaId = @b AND ClienteId = @c', { a: rp.RevProCampanaId, b: rp.RevProCompaniaId, c: rp.RevProClienteId }))[0];
        if (c) it.proyecto = s(c.CampanaNombre);
        const o = (await db.query('SELECT OrgBepNombre FROM OrganizacionBEP WHERE OrgBepId = @o', { o: rp.RevProOrganizacionId }))[0];
        if (o) it.cliente = s(o.OrgBepNombre);
      }
      it.personal = await nombrePersonal(db, p.ProBepPersonalId);
      let revBepId = 0;
      const rb = (await db.query('SELECT RevBepId, RevBepNombre FROM RevisionBEP WHERE ProBepId = @p AND RevBepProId = @rp AND RevBepActual = 1 ORDER BY RevBepId DESC', { p: p.ProBepId, rp: revProId }, { limit: 1 }))[0];
      if (rb) { revBepId = n(rb.RevBepId); it.idEtapa = revBepId; it.etapa = s(rb.RevBepNombre); }
      const mf = await maxFecha(db, revBepId);
      it.usuario = mf.usuario; it.fechaActualizada = iso(mf.fecha);
      out.push(it);
    }
    list('SDTListaBEP', out, res);
  });

  get('GetInfoBEP', async (req, res) => {
    const opcion = qs(req, 'opcion'); const buscar = qs(req, 'buscar');
    const out = { campanas: [], tipos: [], organizaciones: [] };
    if (opcion === 'proyectos' || opcion === 'proyecto') {
      const rows = await db.query(`SELECT CampanaId, CompaniaId, ClienteId, CampanaNombre FROM Campana WHERE CampanaNombre LIKE @b AND CampanaEstado <> 'Anulado' ORDER BY CampanaId`, { b: like(buscar) }, opcion === 'proyectos' ? { limit: 20 } : {});
      out.campanas = rows.map((x) => ({ campanaId: s(x.CampanaId), companiaId: s(x.CompaniaId), clienteId: s(x.ClienteId), campanaNombre: s(x.CampanaNombre) }));
    }
    if (opcion === 'datos') {
      const tipos = await db.query('SELECT TipoBepId, TipoBepNombre FROM TipoBEP WHERE TipoBepEstado = 1 ORDER BY TipoBepId');
      for (const t of tipos) {
        const cats = await db.query('SELECT CatBepId, CatBepNombre FROM CategoriaBEP WHERE TipoBepId = @t AND CatBepEstado = 1 ORDER BY CatBepId', { t: t.TipoBepId });
        const pls = await db.query('SELECT PlaBepId, PlaBepNombre FROM PlantillaBEP WHERE TipoBepId = @t AND PlaBepEstado = 1 ORDER BY PlaBepId', { t: t.TipoBepId });
        out.tipos.push({ id: n(t.TipoBepId), nombre: s(t.TipoBepNombre),
          categorias: cats.map((c) => ({ id: n(c.CatBepId), nombre: s(c.CatBepNombre) })),
          plantillas: pls.map((c) => ({ id: n(c.PlaBepId), nombre: s(c.PlaBepNombre) })) });
      }
      const orgs = await db.query('SELECT OrgBepId, OrgBepNombre FROM OrganizacionBEP WHERE OrgBepTipo = 1 AND OrgBepEstado = 1 ORDER BY OrgBepId');
      out.organizaciones = orgs.map((o) => ({ id: n(o.OrgBepId), nombre: s(o.OrgBepNombre) }));
    }
    res.json(out);
  });

  get('GetInformacionBEP', async (req, res) => {
    const proId = qn(req, 'ProBepId'); const rpId = qn(req, 'RevProId'); const rbId = qn(req, 'RevBepId');
    const o = { ProBepId: 0, RevProId: 0, RevBepId: 0, ProBepNombre: '', RevProNombre: '', RevBepNombre: '', RevProOrganizacionId: 0, RevProCampanaId: '', RevProCompaniaId: '', RevProClienteId: '',
      RevProTipoId: 0, RevProCategoriaId: 0, RevProUbicacion: '', RevProPlantillaId: 0, RevProDescripcion: '', FechaCreacion: iso(null), FechaActualizacion: iso(null), PersonalId: '', UsuarioId: '', CampanaNombre: '' };
    const p = (await db.query('SELECT * FROM ProyectoBEP WHERE ProBepId = @i', { i: proId }))[0];
    if (p) Object.assign(o, { ProBepId: n(p.ProBepId), ProBepNombre: s(p.ProBepNombre), PersonalId: s(p.ProBepPersonalId), FechaCreacion: iso(p.ProBepFecha), FechaActualizacion: iso(p.ProBepFechaAct), UsuarioId: s(p.ProBepUsuarioId) });
    const rp = (await db.query('SELECT * FROM RevisionProyecto WHERE RevProId = @i', { i: rpId }))[0];
    if (rp) {
      Object.assign(o, { RevProId: n(rp.RevProId), RevProNombre: s(rp.RevProNombre), RevProDescripcion: s(rp.RevProDescripcion), RevProCampanaId: s(rp.RevProCampanaId), RevProCompaniaId: s(rp.RevProCompaniaId),
        RevProClienteId: s(rp.RevProClienteId), RevProOrganizacionId: n(rp.RevProOrganizacionId), RevProTipoId: n(rp.RevProTipoId), RevProCategoriaId: n(rp.RevProCategoriaId),
        RevProUbicacion: s(rp.RevProUbicacion), RevProPlantillaId: n(rp.RevProPlantillaId) });
      const c = (await db.query('SELECT CampanaNombre FROM Campana WHERE CampanaId = @a AND CompaniaId = @b AND ClienteId = @c', { a: rp.RevProCampanaId, b: rp.RevProCompaniaId, c: rp.RevProClienteId }))[0];
      if (c) o.CampanaNombre = s(c.CampanaNombre);
    }
    const rb = (await db.query('SELECT RevBepId, RevBepNombre FROM RevisionBEP WHERE RevBepId = @i', { i: rbId }))[0];
    if (rb) { o.RevBepId = n(rb.RevBepId); o.RevBepNombre = s(rb.RevBepNombre); }
    res.json(o);
  });

  get('GetListaRevisionesBEP', async (req, res) => {
    const proId = qn(req, 'ProBepId'); const showFechas = qn(req, 'ShowFechas') === 1;
    const revs = await db.query('SELECT RevProId, RevProNombre, RevProActual FROM RevisionProyecto WHERE ProBepId = @p AND RevProEstado = 1 ORDER BY RevProId', { p: proId });
    const out = [];
    for (const rv of revs) {
      const etapas = await db.query('SELECT RevBepId, RevBepNombre, RevBepActual, RevBepFecha FROM RevisionBEP WHERE ProBepId = @p AND RevBepProId = @r AND RevBepEstado = 1 ORDER BY RevBepId', { p: proId, r: rv.RevProId });
      const et = [];
      for (const e of etapas) {
        const o = { id: n(e.RevBepId), nombre: s(e.RevBepNombre), actual: b(e.RevBepActual), fechaCreacion: iso(null), fechaActualizacion: iso(null), usuarioActualizacion: '' };
        if (showFechas) {
          o.fechaCreacion = iso(e.RevBepFecha);
          const mf = await maxFecha(db, e.RevBepId);
          o.usuarioActualizacion = mf.usuario; o.fechaActualizacion = iso(mf.fecha);
        }
        et.push(o);
      }
      out.push({ id: n(rv.RevProId), nombre: s(rv.RevProNombre), actual: b(rv.RevProActual), etapas: et });
    }
    list('SDTListaRevisionesBEP', out, res);
  });

  get('GetListaObjetivosBEP', async (req, res) => {
    const opcion = qs(req, 'opcion'); const rev = qn(req, 'RevBepId');
    const mk = (id, nombre, descripcion, idUsoBim = 0) => ({ id: n(id), nombre: s(nombre), descripcion: s(descripcion), show: false, editar: false, idUsoBim: n(idUsoBim) });
    let rows = [];
    const tipos = { objCliente: 'C', objProyecto: 'P', objBim: 'B' };
    if (tipos[opcion]) {
      rows = (await db.query('SELECT ObjBepId, ObjBepNombre, ObjBepDescripcion FROM ObjetivoBEP WHERE RevBepId = @r AND ObjBepTipo = @t AND ObjBepEstado = 1 ORDER BY ObjBepId', { r: rev, t: tipos[opcion] }))
        .map((x) => mk(x.ObjBepId, x.ObjBepNombre, x.ObjBepDescripcion));
    } else if (opcion === 'usosBim') {
      rows = (await db.query('SELECT UsoBimId, UsoBimNombre, UsoBimDescripcion FROM UsoBIM WHERE UsoBimEstado = 1 ORDER BY UsoBimId'))
        .map((x) => mk(x.UsoBimId, x.UsoBimNombre, x.UsoBimDescripcion));
    } else if (opcion === 'usosBimBEP') {
      rows = (await db.query('SELECT UsoBimBepId, UsoBimBepNombre, UsoBimBepDescripcion, UsoBimIdRef FROM UsoBIMBEP WHERE RevBepId = @r AND UsoBimBepEstado = 1 ORDER BY UsoBimBepId', { r: rev }))
        .map((x) => mk(x.UsoBimBepId, x.UsoBimBepNombre, x.UsoBimBepDescripcion, x.UsoBimIdRef));
    }
    list('SDTListaObjetivosBEP', rows, res);
  });

  get('GetListaAlcanceBEP', async (req, res) => {
    const opcion = qs(req, 'opcion'); const rev = qn(req, 'RevBepId'); const espId = qn(req, 'EspId'); const parametro = qs(req, 'parametro');
    const mk = (o) => ({ id: 0, nombre: '', descripcion: '', idEspecialidad: 0, elementos: [], ...o });
    let rows = [];
    if (opcion === 'especialidades') {
      rows = (await db.query('SELECT EspId, EspNombre FROM Especialidad WHERE TipoBepId = @t AND EspEstado = 1 ORDER BY EspId', { t: Number(parametro) || 0 })).map((x) => mk({ id: n(x.EspId), nombre: s(x.EspNombre) }));
    } else if (opcion === 'especialidadesBEP') {
      rows = (await db.query('SELECT eb.EspBepId, eb.EspId, e.EspNombre FROM EspecialidadBEP eb LEFT JOIN Especialidad e ON e.EspId = eb.EspId WHERE eb.RevBepId = @r AND eb.EspBepEstado = 1 ORDER BY eb.EspBepId', { r: rev }))
        .map((x) => mk({ id: n(x.EspBepId), nombre: s(x.EspNombre), idEspecialidad: n(x.EspId) }));
    } else if (opcion === 'leyendaLOD') {
      rows = (await db.query('SELECT LeyLodId, LeyLodNombre FROM LeyendaLOD WHERE LeyLodDefault = 1 AND LeyLodEstado = 1 ORDER BY LeyLodId')).map((x) => mk({ id: n(x.LeyLodId), nombre: s(x.LeyLodNombre) }));
    } else if (opcion === 'categoriaElementos') {
      const cats = await db.query('SELECT CatEleId, CatEleNombre FROM CategoriaElemento WHERE EspId = @e AND CatEleEstado = 1 ORDER BY CatEleId', { e: espId });
      for (const c of cats) {
        const els = await db.query('SELECT EleId, EleNombre FROM Elemento WHERE CatEleId = @c AND EleEstado = 1 ORDER BY EleId', { c: c.CatEleId });
        rows.push(mk({ id: n(c.CatEleId), nombre: s(c.CatEleNombre), elementos: els.map((e) => ({ id: n(e.EleId), nombre: s(e.EleNombre) })) }));
      }
    } else if (opcion === 'parametroLOI') {
      rows = (await db.query('SELECT ParLoiId, ParLoiNombre FROM ParametroLOI WHERE ParLoiNombre LIKE @p AND ParLoiEstado = 1 ORDER BY ParLoiId', { p: like(parametro) }, { limit: 20 }))
        .map((x) => mk({ id: n(x.ParLoiId), nombre: s(x.ParLoiNombre) }));
    }
    list('SDTListaAlcanceBEP', rows, res);
  });

  get('GetListaAlcanceLOD', async (req, res) => {
    const esp = qn(req, 'EspBepId');
    const rows = await db.query(
      `SELECT c.CatEleId, c.CatEleNombre, d.DetLodId, d.EleId, e.EleNombre, d.LeyLodId, d.DetLodObservacion, d.DetLodUsuarioId
         FROM DetalleLOD d JOIN Elemento e ON e.EleId = d.EleId JOIN CategoriaElemento c ON c.CatEleId = e.CatEleId
        WHERE d.EspBepId = @e AND d.DetLodEstado = 1 ORDER BY c.CatEleId, d.DetLodId`, { e: esp });
    const lois = rows.length ? await db.query(
      `SELECT l.DetLoiId, l.DetLodId, l.ParLoiId, p.ParLoiNombre FROM DetalleLOI l JOIN ParametroLOI p ON p.ParLoiId = l.ParLoiId
        WHERE l.DetLoiEstado = 1 AND l.DetLodId IN (SELECT DetLodId FROM DetalleLOD WHERE EspBepId = @e AND DetLodEstado = 1) ORDER BY l.DetLoiId`, { e: esp }) : [];
    list('SDTListaAlcanceLOD', rows.map((x) => ({
      idCategoria: n(x.CatEleId), nombreCategoria: s(x.CatEleNombre), idDetLod: n(x.DetLodId), idElemento: n(x.EleId), nombreElemento: s(x.EleNombre),
      idLOD: n(x.LeyLodId), observacion: s(x.DetLodObservacion), idUsuario: s(x.DetLodUsuarioId),
      parametrosLOI: lois.filter((l) => l.DetLodId === x.DetLodId).map((l) => ({ idDetLoi: n(l.DetLoiId), idParLoi: n(l.ParLoiId), nombreParLoi: s(l.ParLoiNombre) })),
    })), res);
  });

  get('GetInfoPersonal', async (req, res) => {
    const opcion = qs(req, 'opcion'); const p = qs(req, 'parametro');
    let rows = [];
    const cols = 'PersonalId, PersonalNombres, PersonalApellidos, PersonaMail, PersonaTelefono';
    if (opcion === 'buscarId') rows = await db.query(`SELECT ${cols} FROM Personal WHERE PersonalId = @p`, { p });
    else if (opcion === 'buscarCorreo') rows = await db.query(`SELECT ${cols} FROM Personal WHERE PersonaMail = @p AND PersonalId NOT IN (SELECT ue.PersonalId FROM UsuarioEmpresa ue JOIN Usuario us ON us.usuarioId = ue.usuarioId WHERE us.UsuarioSuper = 1)`, { p });
    else if (opcion === 'listaCorreo') rows = await db.query(`SELECT ${cols} FROM Personal WHERE PersonaMail LIKE @p AND PersonalEstado = 1 AND PersonalId NOT IN (SELECT ue.PersonalId FROM UsuarioEmpresa ue JOIN Usuario us ON us.usuarioId = ue.usuarioId WHERE us.UsuarioSuper = 1) ORDER BY PersonalId`, { p: like(p) }, { limit: 20 });
    list('SDTInfoPersonal', rows.map((x) => ({ id: s(x.PersonalId), nombres: s(x.PersonalNombres), apellidos: s(x.PersonalApellidos), correo: s(x.PersonaMail), telefono: s(x.PersonaTelefono) })), res);
  });

  get('GetListaContactosBEP', async (req, res) => {
    const opcion = qs(req, 'opcion'); const rev = qn(req, 'RevBepId'); const parametro = qs(req, 'parametro');
    const mk = (o) => ({ id: 0, refId: '', descripcion: '', nombres: '', apellidos: '', correo: '', telefono: '', permiso: 0, orgId: 0, orgNombre: '', rolId: 0, rolNombre: '', ...o });
    let rows = [];
    if (opcion === 'contactoBEP') {
      rows = (await db.query(
        `SELECT c.ConBepId, c.ConBepPersonalId, c.ConBepPermiso, c.OrgBepId, o.OrgBepNombre, c.RolBepId, r.RolBepNombre, p.PersonalNombres, p.PersonalApellidos, p.PersonaMail, p.PersonaTelefono
           FROM ContactoBEP c LEFT JOIN OrganizacionBEP o ON o.OrgBepId = c.OrgBepId LEFT JOIN RolBEP r ON r.RolBepId = c.RolBepId LEFT JOIN Personal p ON p.PersonalId = c.ConBepPersonalId
          WHERE c.RevBepId = @r AND c.ConBepEstado = 1 ORDER BY c.ConBepId`, { r: rev }))
        .map((x) => mk({ id: n(x.ConBepId), refId: s(x.ConBepPersonalId), nombres: s(x.PersonalNombres), apellidos: s(x.PersonalApellidos), correo: s(x.PersonaMail), telefono: s(x.PersonaTelefono),
          permiso: n(x.ConBepPermiso), orgId: n(x.OrgBepId), orgNombre: s(x.OrgBepNombre), rolId: n(x.RolBepId), rolNombre: s(x.RolBepNombre) }));
    } else if (opcion === 'organizacionBEP') {
      rows = (await db.query('SELECT OrgBepId, OrgBepNombre FROM OrganizacionBEP WHERE OrgBepNombre LIKE @p AND OrgBepEstado = 1 ORDER BY OrgBepId', { p: like(parametro) }, { limit: 20 }))
        .map((x) => mk({ id: n(x.OrgBepId), descripcion: s(x.OrgBepNombre) }));
    } else if (opcion === 'rolBEP') {
      rows = (await db.query('SELECT RolBepId, RolBepNombre FROM RolBEP WHERE RolBepEstado = 1 ORDER BY RolBepId')).map((x) => mk({ id: n(x.RolBepId), descripcion: s(x.RolBepNombre) }));
    }
    list('SDTListaContactosBEP', rows, res);
  });

  const orgsDeRev = (rev) => db.query(
    `SELECT DISTINCT c.OrgBepId, o.OrgBepNombre FROM ContactoBEP c LEFT JOIN OrganizacionBEP o ON o.OrgBepId = c.OrgBepId WHERE c.RevBepId = @r AND c.ConBepEstado = 1 ORDER BY c.OrgBepId`, { r: rev });

  get('GetListaMatrizRACI', async (req, res) => {
    const rev = qn(req, 'RevBepId');
    const mats = await db.query(
      `SELECT m.MatRaciId, m.MatRaciActId, a.ActNombre, m.SubActId, sa.SubActNombre FROM MatrizRACI m
         LEFT JOIN Actividad a ON a.ActId = m.MatRaciActId LEFT JOIN SubActividad sa ON sa.SubActId = m.SubActId
        WHERE m.RevBepId = @r AND m.MatEstado = 1 ORDER BY m.MatRaciActId, m.MatRaciId`, { r: rev });
    const dets = mats.length ? await db.query(
      `SELECT d.MatRaciId, d.LeyRaciId, d.OrgBepId, l.LeyRaciAbreviacion, l.LeyRaciColor, l.LeyRaciBackground FROM DetalleMatrizRACI d LEFT JOIN LeyendaRACI l ON l.LeyRaciId = d.LeyRaciId
        WHERE d.DetMatrizEstado = 1 AND d.MatRaciId IN (SELECT MatRaciId FROM MatrizRACI WHERE RevBepId = @r AND MatEstado = 1) ORDER BY d.DetMatrizId`, { r: rev }) : [];
    list('SDTListaMatrizRACI', mats.map((m) => ({
      idMatRaci: n(m.MatRaciId), idActividad: n(m.MatRaciActId), nombreActividad: s(m.ActNombre), idSubActividad: n(m.SubActId), nombreSubActividad: s(m.SubActNombre),
      detalle: dets.filter((d) => d.MatRaciId === m.MatRaciId).map((d) => ({ idLeyRACI: n(d.LeyRaciId), idOrgBep: n(d.OrgBepId), abreviatura: s(d.LeyRaciAbreviacion), color: s(d.LeyRaciColor), background: s(d.LeyRaciBackground) })),
    })), res);
  });

  get('GetListaMatriz', async (req, res) => {
    const opcion = qs(req, 'opcion'); const rev = qn(req, 'RevBepId');
    const mk = (o) => ({ id: 0, nombre: '', color: '', background: '', abreviacion: '', subactividades: [], ...o });
    let rows = [];
    if (opcion === 'leyendaRACI') {
      rows = (await db.query('SELECT LeyRaciId, LeyRaciNombre, LeyRaciColor, LeyRaciBackground, LeyRaciAbreviacion FROM LeyendaRACI WHERE LeyRaciEstado = 1 ORDER BY LeyRaciId'))
        .map((x) => mk({ id: n(x.LeyRaciId), nombre: s(x.LeyRaciNombre), color: s(x.LeyRaciColor), background: s(x.LeyRaciBackground), abreviacion: s(x.LeyRaciAbreviacion) }));
    } else if (opcion === 'organizaciones') {
      rows = (await orgsDeRev(rev)).map((x) => mk({ id: n(x.OrgBepId), nombre: s(x.OrgBepNombre) }));
    } else if (opcion === 'subActividades') {
      const acts = await db.query('SELECT ActId, ActNombre FROM Actividad WHERE ActEstado = 1 ORDER BY ActId');
      for (const a of acts) {
        const subs = await db.query('SELECT SubActId, SubActNombre FROM SubActividad WHERE ActId = @a AND SubActEstado = 1 ORDER BY SubActId', { a: a.ActId });
        rows.push(mk({ id: n(a.ActId), nombre: s(a.ActNombre), subactividades: subs.map((x) => ({ id: n(x.SubActId), nombre: s(x.SubActNombre) })) }));
      }
    }
    list('SDTListaMatriz', rows, res);
  });

  get('GetListaHitos', async (req, res) => {
    const opcion = qs(req, 'opcion'); const rev = qn(req, 'RevBepId');
    const mk = (o) => ({ id: 0, nombre: '', orgId: 0, orgNombre: '', fechaInicio: '0000-00-00', fechaFin: '0000-00-00', fechaEntrega: '0000-00-00', ...o });
    let rows = [];
    if (opcion === 'hConstruccion') {
      rows = (await db.query('SELECT HitConId, HitConNombre, HitConFechaInicio, HitConFechaFin FROM HitoConstruccion WHERE RevBepId = @r AND HitConEstado = 1 ORDER BY HitConId', { r: rev }))
        .map((x) => mk({ id: n(x.HitConId), nombre: s(x.HitConNombre), fechaInicio: isoDate(x.HitConFechaInicio), fechaFin: isoDate(x.HitConFechaFin) }));
    } else if (opcion === 'hEntrega') {
      rows = (await db.query('SELECT e.EntInfId, e.EntInfNombre, e.OrgBepId, o.OrgBepNombre, e.EntInfFechaInicio, e.EntInfFechaEntrega FROM EntregableInformacion e LEFT JOIN OrganizacionBEP o ON o.OrgBepId = e.OrgBepId WHERE e.RevBepId = @r AND e.EntInfEstado = 1 ORDER BY e.EntInfId', { r: rev }))
        .map((x) => mk({ id: n(x.EntInfId), nombre: s(x.EntInfNombre), orgId: n(x.OrgBepId), orgNombre: s(x.OrgBepNombre), fechaInicio: isoDate(x.EntInfFechaInicio), fechaEntrega: isoDate(x.EntInfFechaEntrega) }));
    } else if (opcion === 'organizaciones') {
      rows = (await orgsDeRev(rev)).map((x) => mk({ id: n(x.OrgBepId), nombre: s(x.OrgBepNombre), orgId: n(x.OrgBepId), orgNombre: s(x.OrgBepNombre) }));
    }
    list('SDTListaHitos', rows, res);
  });

  get('GetListaRecursos', async (req, res) => {
    const rev = qn(req, 'RevBepId');
    const recs = await db.query('SELECT RecId, RecNombre, RecUrl, RecTipo, RecPersonalId, RecFecha, RecFechaAct FROM Recurso WHERE RevBepId = @r AND RecEstado = 1 ORDER BY RecId', { r: rev });
    const archs = await db.query('SELECT ArcBepId, ArcBepRecursoId, ArcBepNombre, ArcBepTipo, ArcBepPeso, ArcBepRuta FROM ArchivoBEP WHERE RevBepId = @r AND ArcBepEstado = 1 ORDER BY ArcBepId', { r: rev });
    const out = [];
    for (const x of recs) {
      out.push({ id: n(x.RecId), nombre: s(x.RecNombre), url: s(x.RecUrl), tipo: s(x.RecTipo), personalId: s(x.RecPersonalId), personalNombre: await nombrePersonal(db, x.RecPersonalId),
        fecha: isoDate(x.RecFecha), fechaAct: isoDate(x.RecFechaAct),
        archivos: archs.filter((a) => a.ArcBepRecursoId === x.RecId).map((a) => ({ id: n(a.ArcBepId), nombre: s(a.ArcBepNombre), tipo: s(a.ArcBepTipo), peso: s(a.ArcBepPeso), ruta: s(a.ArcBepRuta) })) });
    }
    list('SDTListaRecursos', out, res);
  });

  get('GetListaEComunicacion', async (req, res) => {
    const opcion = qs(req, 'opcion'); const rev = qn(req, 'RevBepId');
    const mk = (o) => ({ id: 0, nombre: '', descripcion: '', plataforma: '', ubicacion: '', responsable: '', frecuencia: '', dias: '', hora: '', minuto: '', duracion: 0, proposito: '', url: '', comentario: '', involucrados: '', ...o });
    let rows = [];
    if (opcion === 'eReunion') {
      rows = (await db.query('SELECT * FROM ReunionBEP WHERE RevBepId = @r AND ReuBepEstado = 1 ORDER BY ReuBepId', { r: rev }))
        .map((x) => mk({ id: n(x.ReuBepId), nombre: s(x.ReuBepNombre), descripcion: s(x.ReuBepDescripcion), plataforma: s(x.ReuBepPlataforma), ubicacion: s(x.ReuBepUbicacion), responsable: s(x.ReuBepResponsable),
          frecuencia: s(x.ReuBepFrecuencia), dias: s(x.ReuBepDias), hora: s(x.ReuBepHora), minuto: s(x.ReuBepMinuto), duracion: n(x.ReuBepDuracion), involucrados: s(x.ReuBepInvolucrados) }));
    } else if (opcion === 'cComunicacion') {
      rows = (await db.query('SELECT CanBepId, CanBepNombre, CanBepProposito FROM CanalBEP WHERE RevBepId = @r AND CanBepEstado = 1 ORDER BY CanBepId', { r: rev }))
        .map((x) => mk({ id: n(x.CanBepId), nombre: s(x.CanBepNombre), proposito: s(x.CanBepProposito) }));
    } else if (opcion === 'eComunDatos') {
      rows = (await db.query('SELECT EcdBepId, EcdBepNombre, EcdBepUrl, EcdBepComentario FROM EntornoDatosBEP WHERE RevBepId = @r AND EcdBepEstado = 1 ORDER BY EcdBepId', { r: rev }))
        .map((x) => mk({ id: n(x.EcdBepId), nombre: s(x.EcdBepNombre), url: s(x.EcdBepUrl), comentario: s(x.EcdBepComentario) }));
    }
    list('SDTListaEComunicacion', rows, res);
  });

  get('GetInfoProyecto', async (req, res) => {
    const x = (await db.query('SELECT * FROM Campana WHERE CampanaId = @a AND CompaniaId = @b AND ClienteId = @c', { a: qs(req, 'CampanaId'), b: qs(req, 'CompaniaId'), c: qs(req, 'ClienteId') }))[0];
    res.json({ CampanaId: s(x && x.CampanaId), CompaniaId: s(x && x.CompaniaId), ClienteId: s(x && x.ClienteId), CampanaNombre: s(x && x.CampanaNombre),
      CampanaFechaInicio: iso(x && x.CampanaFechaInicio), CampanaFechaFin: iso(x && x.CampanaFechaFin), CampanaFechaFinReal: isoDate(x && x.CampanaFechaFinReal) });
  });

  require('./apibep-post')({ r, db, post, tx, uploadDir });
  return r;
};
