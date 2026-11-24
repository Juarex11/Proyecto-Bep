'use strict';
/* APIBEP: operaciones POST (puerto de ProcGuardarBEP, ProcCrearEtapa, ProcCrearRevision, ProcReporteBEP, etc.) */
const fs = require('fs');
const path = require('path');
const { iso, isoDate, ahora, s, n, b, arg } = require('../util');
const { nextId, toDate } = require('./common');
const ctx = require('../ctx');

const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const nz = (v) => (v === undefined || v === null || v === '' || Number(v) === 0 ? null : v);   // 0 / vacio -> NULL (FK opcional)

module.exports = ({ r, db, post, tx, uploadDir }) => {
  const OK = 'Registrado correctamente';

  // ---------- helpers reutilizados (cada uno recibe la conexion/transaccion t) ----------
  async function agregarEspecialidades(t, items) {
    for (const it of items) {
      const f = ahora();
      const espBepId = await t.insert('EspecialidadBEP', { RevBepId: n(it.idRevision), EspId: n(it.idEspecialidad), EspBepFecha: f, EspBepFechaAct: f, EspBepEstado: 1, EspBepUsuarioId: s(it.idUsuario) || null });
      const els = await t.query(
        `SELECT e.EleId FROM Elemento e JOIN CategoriaElemento c ON c.CatEleId = e.CatEleId
          WHERE c.EspId = @esp AND c.CatEleEstado = 1 AND e.EleDefault = 1 AND e.EleEstado = 1 ORDER BY c.CatEleId, e.EleId`, { esp: n(it.idEspecialidad) });
      for (const e of els) {
        await t.insert('DetalleLOD', { EspBepId: espBepId, EleId: e.EleId, LeyLodId: null, DetLodCheck: 0, DetLodObservacion: '', DetLodFecha: ahora(), DetLodFechaAct: ahora(), DetLodEstado: 1, DetLodUsuarioId: s(it.idUsuario) || null });
      }
    }
  }
  async function agregarMatriz(t, items) {
    for (const it of items) {
      await t.insert('MatrizRACI', { RevBepId: n(it.idRevBep), SubActId: n(it.idSubActividad), MatRaciActId: nz(it.idActividad), MatFecha: ahora(), MatFechaAct: ahora(), MatEstado: 1, MatUsuarioId: s(it.idUsuario) || null });
    }
  }

  // ---------- Guardar BEP ----------
  post('PostGuardarBEP', async (req, res) => {
    const d = arg(req.body, 'SDTGuardarInfoBEP');
    const mensaje = await tx(async (t) => {
      const user = s(d.UsuarioId) || null;
      if (n(d.ProBepId) === 0) {
        const f = ahora();
        const proId = await t.insert('ProyectoBEP', { ProBepNombre: s(d.ProBepNombre), ProBepPersonalId: s(d.PersonalId) || null, ProBepCompleto: 0, ProBepFecha: f, ProBepFechaAct: f, ProBepEstado: 1, ProBepUsuarioId: user });
        const rpId = await t.insert('RevisionProyecto', {
          ProBepId: proId, RevProIdPadre: 0, RevProNombre: s(d.RevProNombre), RevProDescripcion: s(d.RevProDescripcion), RevProCampanaId: s(d.RevProCampanaId) || null, RevProCompaniaId: s(d.RevProCompaniaId) || null,
          RevProClienteId: s(d.RevProClienteId) || null, RevProOrganizacionId: nz(d.RevProOrganizacionId), RevProTipoId: nz(d.RevProTipoId), RevProCategoriaId: nz(d.RevProCategoriaId), RevProUbicacion: s(d.RevProUbicacion),
          RevProPlantillaId: nz(d.RevProPlantillaId), RevProActual: 1, RevProFecha: f, RevProFechaAct: f, RevProEstado: 1, RevProUsuarioId: user });
        const rbId = await t.insert('RevisionBEP', { ProBepId: proId, RevBepProId: rpId, RevBepIdPadre: 0, RevBepNombre: s(d.RevBepNombre), RevBepActual: 1, RevBepCompleto: 0, RevBepFecha: f, RevBepFechaAct: f, RevBepEstado: 1, RevBepUsuarioId: user });
        return `${proId}#${rpId}#${rbId}`;
      }
      const f = ahora();
      await t.exec('UPDATE ProyectoBEP SET ProBepNombre=@n, ProBepFechaAct=@f, ProBepUsuarioId=@u WHERE ProBepId=@i', { n: s(d.ProBepNombre), f, u: user, i: n(d.ProBepId) });
      await t.exec(`UPDATE RevisionProyecto SET RevProNombre=@n, RevProDescripcion=@d, RevProCampanaId=@ca, RevProCompaniaId=@co, RevProClienteId=@cl, RevProOrganizacionId=@o, RevProTipoId=@ti,
          RevProCategoriaId=@ca2, RevProUbicacion=@ub, RevProPlantillaId=@pl, RevProFechaAct=@f, RevProUsuarioId=@u WHERE RevProId=@i`,
        { n: s(d.RevProNombre), d: s(d.RevProDescripcion), ca: s(d.RevProCampanaId) || null, co: s(d.RevProCompaniaId) || null, cl: s(d.RevProClienteId) || null, o: nz(d.RevProOrganizacionId), ti: nz(d.RevProTipoId),
          ca2: nz(d.RevProCategoriaId), ub: s(d.RevProUbicacion), pl: nz(d.RevProPlantillaId), f, u: user, i: n(d.RevProId) });
      await t.exec('UPDATE RevisionBEP SET RevBepNombre=@n, RevBepFechaAct=@f, RevBepUsuarioId=@u WHERE RevBepId=@i', { n: s(d.RevBepNombre), f, u: user, i: n(d.RevBepId) });
      return `${n(d.ProBepId)}#${n(d.RevProId)}#${n(d.RevBepId)}`;
    });
    res.json({ mensaje });
  });

  // ---------- Usos BIM / Especialidades / LOD / LOI ----------
  post('PostAgregarUsoBimBEP', async (req, res) => {
    const items = arr(arg(req.body, 'SDTAgregarUsoBimBEP'));
    await tx(async (t) => {
      for (const it of items) {
        await t.insert('UsoBIMBEP', { RevBepId: n(it.idRevision), UsoBimIdRef: nz(it.idUsoBim), UsoBimBepNombre: s(it.nombreUsoBim), UsoBimBepDescripcion: s(it.descripcionUsoBim),
          UsoBimBepFecha: ahora(), UsoBimBepFechaAct: ahora(), UsoBimBepEstado: 1, UsoBimBepUsuarioId: s(it.idUsuario) || null });
      }
    });
    res.json({ mensaje: OK });
  });

  post('PostAgregarEspecialidadBEP', async (req, res) => {
    const items = arr(arg(req.body, 'SDTAgregarEspecialidadBEP'));
    await tx((t) => agregarEspecialidades(t, items));
    res.json({ mensaje: OK });
  });

  post('PostAgregarDetalleLOD', async (req, res) => {
    const items = arr(arg(req.body, 'SDTAgregarDetalleLOD'));
    await tx(async (t) => {
      for (const it of items) {
        await t.insert('DetalleLOD', { EspBepId: n(it.idEspBep), EleId: n(it.idElemento), LeyLodId: null, DetLodCheck: 0, DetLodObservacion: '', DetLodFecha: ahora(), DetLodFechaAct: ahora(), DetLodEstado: 1, DetLodUsuarioId: s(it.idUsuario) || null });
      }
    });
    res.json({ mensaje: OK });
  });

  post('PostGuardarDetalleLOD', async (req, res) => {
    const items = arr(arg(req.body, 'SDTListaAlcanceLOD'));
    await tx(async (t) => {
      for (const it of items) {
        await t.exec('UPDATE DetalleLOD SET LeyLodId=@l, DetLodObservacion=@o, DetLodFechaAct=@f, DetLodUsuarioId=@u WHERE DetLodId=@i',
          { l: nz(it.idLOD), o: s(it.observacion), f: ahora(), u: s(it.idUsuario) || null, i: n(it.idDetLod) });
      }
    });
    res.json({ mensaje: OK });
  });

  post('PostActualizarDetalleLOD', async (req, res) => {
    await tx((t) => t.exec('UPDATE DetalleLOD SET DetLodEstado=0, DetLodFechaAct=@f, DetLodUsuarioId=@u WHERE DetLodId=@i', { f: ahora(), u: s(req.body.UsuarioId) || null, i: n(req.body.DetLodId) }));
    res.json({ mensaje: '' });
  });

  post('PostAgregarDetalleLOI', async (req, res) => {
    const items = arr(arg(req.body, 'SDTAgregarDetalleLOI'));
    const detLodId = n(req.body.DetLodId);
    await tx(async (t) => {
      await t.exec('UPDATE DetalleLOI SET DetLoiEstado=0 WHERE DetLodId=@d', { d: detLodId });
      for (const it of items) {
        let parId = n(it.ParLoiId);
        if (parId === 0) {
          parId = await t.insert('ParametroLOI', { ParLoiNombre: s(it.ParLoiNombre), ParLoiFecha: ahora(), ParLoiFechaAct: ahora(), ParLoiEstado: 1, ParLoiUsuarioId: s(it.UsuarioId) || null });
        }
        const upd = await t.exec('UPDATE DetalleLOI SET DetLoiEstado=1 WHERE DetLodId=@d AND ParLoiId=@p', { d: detLodId, p: parId });
        if (!upd) {
          await t.insert('DetalleLOI', { ParLoiId: parId, DetLodId: n(it.DetLodId) || detLodId, DetLoiRevBepId: nz(it.RevBepId), DetLoiFecha: ahora(), DetLoiFechaAct: ahora(), DetLoiEstado: 1, DetLoiUsuarioId: s(it.UsuarioId) || null });
        }
      }
    });
    res.json({ mensaje: OK });
  });

  // ---------- Registro por defecto (tipo de BEP o plantilla) ----------
  post('PostRegistroDefaultBEP', async (req, res) => {
    const d = arg(req.body, 'SDTRegistroDefaultBEP');
    await tx(async (t) => {
      const rev = n(d.RevBepId);
      await t.exec('DELETE FROM DetalleLOI WHERE DetLodId IN (SELECT d.DetLodId FROM DetalleLOD d JOIN EspecialidadBEP e ON e.EspBepId = d.EspBepId WHERE e.RevBepId = @r)', { r: rev });
      await t.exec('DELETE FROM DetalleLOD WHERE EspBepId IN (SELECT EspBepId FROM EspecialidadBEP WHERE RevBepId = @r)', { r: rev });
      await t.exec('DELETE FROM EspecialidadBEP WHERE RevBepId = @r', { r: rev });
      const user = s(d.UsuarioId) || null;
      if (s(d.FormaRegistro) === 'TipoBep') {
        const esps = await t.query('SELECT EspId FROM Especialidad WHERE TipoBepId = @t AND EspDefault = 1 AND EspEstado = 1 ORDER BY EspId', { t: n(d.TipoBepId) });
        await agregarEspecialidades(t, esps.map((e) => ({ idEspecialidad: e.EspId, idRevision: rev, idUsuario: user })));
      } else {
        const fecha = toDate(d.Fecha) || ahora();
        const espIds = await t.query('SELECT DISTINCT DetPlaEspId AS e FROM DetallePlantilla WHERE PlaBepId = @p AND DetPlaEspId IS NOT NULL ORDER BY DetPlaEspId', { p: n(d.PlaBepId) });
        for (const e of espIds) {
          const espBepId = await t.insert('EspecialidadBEP', { RevBepId: rev, EspId: e.e, EspBepFecha: fecha, EspBepFechaAct: fecha, EspBepEstado: 1, EspBepUsuarioId: user });
          const dets = await t.query('SELECT DetPlaEleId FROM DetallePlantilla WHERE PlaBepId = @p AND DetPlaEspId = @e AND DetPlaEleId IS NOT NULL ORDER BY DetPlaId', { p: n(d.PlaBepId), e: e.e });
          for (const x of dets) {
            await t.insert('DetalleLOD', { EspBepId: espBepId, EleId: x.DetPlaEleId, LeyLodId: null, DetLodCheck: 0, DetLodObservacion: '', DetLodFecha: fecha, DetLodFechaAct: fecha, DetLodEstado: 1, DetLodUsuarioId: user });
          }
        }
      }
      if (b(d.BepNuevo)) {
        const subs = await t.query('SELECT SubActId, ActId FROM SubActividad WHERE SubActDefault = 1 AND SubActEstado = 1 ORDER BY SubActId');
        await agregarMatriz(t, subs.map((x) => ({ idSubActividad: x.SubActId, idActividad: x.ActId, idRevBep: rev, idUsuario: user })));
      }
    });
    res.json({ mensaje: OK });
  });

  // ---------- Contactos ----------
  post('PostAgregarContactoBEP', async (req, res) => {
    const d = arg(req.body, 'SDTAgregarContactoBEP');
    const mensaje = await tx(async (t) => {
      let personalId = s(d.ConBepPersonalId);
      if (personalId === '') {
        personalId = await nextId(t, 'Personal', 'PersonalId', 'EM', 4);
        await t.insert('Personal', { PersonalId: personalId, PersonalNombres: s(d.nombres), PersonalApellidos: s(d.apellidos), PersonaTelefono: s(d.telefono), PersonaMail: s(d.correo), PersonalEstado: 1 });
      } else {
        await t.exec('UPDATE Personal SET PersonalNombres=@n, PersonalApellidos=@a, PersonaTelefono=@t WHERE PersonalId=@i', { n: s(d.nombres), a: s(d.apellidos), t: s(d.telefono), i: personalId });
      }
      let orgId = n(d.OrgBepId);
      if (orgId === 0) {
        orgId = await t.insert('OrganizacionBEP', { OrgBepNombre: s(d.OrgBepNombre), OrgBepFecha: ahora(), OrgBepFechaAct: ahora(), OrgBepTipo: n(d.OrgBepTipo), OrgBepEstado: 1, OrgBepUsuarioId: s(d.ConBepUsuarioId) || null });
      }
      const conId = n(d.ConBepId);
      const dup = await t.query(
        `SELECT ConBepId FROM ContactoBEP WHERE RevBepId=@r AND RolBepId=@ro AND OrgBepId=@o AND ConBepPersonalId=@p AND ConBepEstado=1 AND ConBepId <> @c`,
        { r: n(d.RevBepId), ro: n(d.RolBepId), o: orgId, p: personalId, c: conId }, { limit: 1 });
      if (dup.length) return 'Existe';
      const estado = d.ConBepEstado === undefined ? 1 : (b(d.ConBepEstado) ? 1 : 0);
      if (conId === 0) {
        await t.insert('ContactoBEP', { RevBepId: n(d.RevBepId), RolBepId: n(d.RolBepId), OrgBepId: orgId, ConBepPersonalId: personalId, ConBepPermiso: n(d.ConBepPermiso), ConBepFecha: ahora(), ConBepFechaAct: ahora(), ConBepEstado: estado, ConBepUsuarioId: s(d.ConBepUsuarioId) || null });
        return 'Guardado';
      }
      await t.exec('UPDATE ContactoBEP SET RevBepId=@r, RolBepId=@ro, OrgBepId=@o, ConBepPersonalId=@p, ConBepPermiso=@pe, ConBepFechaAct=@f, ConBepEstado=@e, ConBepUsuarioId=@u WHERE ConBepId=@c',
        { r: n(d.RevBepId), ro: n(d.RolBepId), o: orgId, p: personalId, pe: n(d.ConBepPermiso), f: ahora(), e: estado, u: s(d.ConBepUsuarioId) || null, c: conId });
      return 'Actualizado';
    });
    res.json({ mensaje });
  });

  // ---------- Matriz RACI ----------
  post('PostAgregarMatrizRACI', async (req, res) => {
    const items = arr(arg(req.body, 'SDTAgregarMatrizRACI'));
    await tx((t) => agregarMatriz(t, items));
    res.json({ mensaje: OK });
  });

  post('PostGuardarDetalleRACI', async (req, res) => {
    const items = arr(arg(req.body, 'SDTGuardarDetalleRACI'));
    const matId = n(req.body.MatRaciId); const orgId = n(req.body.OrgBepId);
    await tx(async (t) => {
      await t.exec('UPDATE DetalleMatrizRACI SET DetMatrizEstado=0 WHERE MatRaciId=@m AND OrgBepId=@o', { m: matId, o: orgId });
      for (const it of items) {
        const upd = await t.exec('UPDATE DetalleMatrizRACI SET DetMatrizFechaAct=@f, DetMatrizEstado=1 WHERE MatRaciId=@m AND OrgBepId=@o AND LeyRaciId=@l', { f: ahora(), m: matId, o: orgId, l: n(it.idLeyRaci) });
        if (!upd) {
          await t.insert('DetalleMatrizRACI', { MatRaciId: n(it.idMatrizRaci) || matId, LeyRaciId: n(it.idLeyRaci), OrgBepId: n(it.idOrgBep) || orgId, DetMatrizFecha: ahora(), DetMatrizFechaAct: ahora(), DetMatrizEstado: 1, DetMatrizUsuarioId: s(it.idUsuario) || null });
        }
      }
    });
    res.json({ mensaje: OK });
  });

  // ---------- Archivos ----------
  const safeName = (nombre) => path.basename(String(nombre)).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
  post('PostSubirArchivo', async (req, res) => {
    const items = arr(arg(req.body, 'SDTSubirArchivo'));
    const recursoId = n(req.body.RecursoId);
    if (!Array.isArray(arg(req.body, 'SDTSubirArchivo'))) return res.status(400).json({ mensaje: 'Formato no valido' });
    const dirEmpresa = path.join(uploadDir, 'emp-' + ctx.empresaId());   // cada empresa guarda sus archivos en su propia carpeta
    fs.mkdirSync(dirEmpresa, { recursive: true });
    await tx(async (t) => {
      await t.exec('UPDATE ArchivoBEP SET ArcBepEstado=0 WHERE ArcBepRecursoId=@r', { r: recursoId });
      for (const it of items) {
        if (n(it.id) === 0) {
          const nombre = safeName(it.nombre);
          const ex = await t.query('SELECT ArcBepId FROM ArchivoBEP WHERE RevBepId=@r AND ArcBepRecursoId=@rc AND ArcBepNombre=@n AND ArcBepEstado=1', { r: n(it.idRevision), rc: n(it.idRecurso), n: nombre }, { limit: 1 });
          if (!ex.length) {
            fs.writeFileSync(path.join(dirEmpresa, nombre), Buffer.from(s(it.fileBlob), 'base64'));
            await t.insert('ArchivoBEP', { RevBepId: n(it.idRevision), ArcBepRecursoId: nz(it.idRecurso), ArcBepNombre: nombre, ArcBepTipo: s(it.tipo), ArcBepPeso: s(it.peso), ArcBepRuta: '/ArchivosBEP/' + nombre,
              ArcBepFecha: ahora(), ArcBepFechaAct: ahora(), ArcBepEstado: 1, ArcBepUsuarioId: s(it.usuarioId) || null });
          }
        } else {
          await t.exec('UPDATE ArchivoBEP SET ArcBepEstado=1 WHERE ArcBepId=@i', { i: n(it.id) });
        }
      }
    });
    res.json({ mensaje: 'Archivo subido correctamente' });
  });

  // ---------- Plantilla ----------
  post('PostGuardarPlantilla', async (req, res) => {
    const d = arg(req.body, 'SDTGuardarPlantilla');
    await tx(async (t) => {
      const f = toDate(d.PlaBepFecha) || ahora(); const fa = toDate(d.PlaBepFechaAct) || f; const estado = d.PlaBepEstado === undefined ? 1 : (b(d.PlaBepEstado) ? 1 : 0);
      const user = s(d.PlaBepUsuarioId) || null;
      const plaId = await t.insert('PlantillaBEP', { PlaBepNombre: s(d.PlaBepNombre), TipoBepId: n(d.TipoBepId), PlaBepFecha: f, PlaBepFechaAct: fa, PlaBepEstado: estado, PlaBepUsuarioId: user });
      const esps = await t.query('SELECT EspBepId, EspId FROM EspecialidadBEP WHERE RevBepId = @r AND EspBepEstado = 1 ORDER BY EspBepId', { r: n(d.RevBepId) });
      for (const e of esps) {
        const dets = await t.query(
          `SELECT d.EleId, el.CatEleId FROM DetalleLOD d JOIN Elemento el ON el.EleId = d.EleId WHERE d.EspBepId = @e AND d.DetLodEstado = 1 ORDER BY d.DetLodId`, { e: e.EspBepId });
        for (const x of dets) {
          await t.insert('DetallePlantilla', { PlaBepId: plaId, DetPlaEspId: e.EspId, DetPlaCatEleId: x.CatEleId, DetPlaEleId: x.EleId, DetPlaFecha: f, DetPlaFechaAct: fa, DetPlaEstado: estado, DetPlaUsuarioId: user });
        }
        if (!dets.length) {
          await t.insert('DetallePlantilla', { PlaBepId: plaId, DetPlaEspId: e.EspId, DetPlaFecha: f, DetPlaFechaAct: fa, DetPlaEstado: estado, DetPlaUsuarioId: user });
        }
      }
    });
    res.json({ mensaje: OK });
  });

  // ---------- Copiar etapa / crear revision ----------
  async function crearEtapa(t, proBepId, revBepId, revBepNombre, revProId) {
    await t.exec('UPDATE RevisionBEP SET RevBepActual=0 WHERE ProBepId=@p AND RevBepProId=@rp AND RevBepActual=1', { p: proBepId, rp: revProId });
    const src = (await t.query('SELECT * FROM RevisionBEP WHERE RevBepId=@i', { i: revBepId }))[0];
    if (!src) return 0;
    const nuevo = await t.insert('RevisionBEP', {
      ProBepId: src.ProBepId, RevBepProId: revProId, RevBepIdPadre: revBepId, RevBepCampanaId: src.RevBepCampanaId, RevBepCompaniaId: src.RevBepCompaniaId, RevBepClienteId: src.RevBepClienteId,
      RevBepTipoId: src.RevBepTipoId, RevBepCategoriaId: src.RevBepCategoriaId, RevBepOrganizacionId: src.RevBepOrganizacionId, RevBepPersonalId: src.RevBepPersonalId,
      RevBepNombre: revBepNombre, RevBepDescripcion: src.RevBepDescripcion, RevBepUbicacion: src.RevBepUbicacion, RevBepActual: 1, RevBepCompleto: src.RevBepCompleto, RevBepEstados: src.RevBepEstados,
      RevBepFecha: ahora(), RevBepFechaAct: ahora(), RevBepUsuarioId: src.RevBepUsuarioId, RevBepEstado: 1 });
    const q = (sql) => t.query(sql, { r: revBepId });
    for (const x of await q('SELECT * FROM ObjetivoBEP WHERE RevBepId=@r AND ObjBepEstado=1 ORDER BY ObjBepId')) {
      await t.insert('ObjetivoBEP', { RevBepId: nuevo, ObjBepNombre: x.ObjBepNombre, ObjBepDescripcion: x.ObjBepDescripcion, ObjBepTipo: x.ObjBepTipo, ObjBepFecha: x.ObjBepFecha, ObjBepFechaAct: x.ObjBepFechaAct, ObjBepEstado: 1, ObjBepUsuarioId: x.ObjBepUsuarioId });
    }
    for (const x of await q('SELECT * FROM UsoBIMBEP WHERE RevBepId=@r AND UsoBimBepEstado=1 ORDER BY UsoBimBepId')) {
      await t.insert('UsoBIMBEP', { RevBepId: nuevo, UsoBimIdRef: x.UsoBimIdRef, UsoBimBepNombre: x.UsoBimBepNombre, UsoBimBepDescripcion: x.UsoBimBepDescripcion, UsoBimBepFecha: x.UsoBimBepFecha, UsoBimBepFechaAct: x.UsoBimBepFechaAct, UsoBimBepEstado: 1, UsoBimBepUsuarioId: x.UsoBimBepUsuarioId });
    }
    for (const e of await q('SELECT * FROM EspecialidadBEP WHERE RevBepId=@r AND EspBepEstado=1 ORDER BY EspBepId')) {
      const newEsp = await t.insert('EspecialidadBEP', { RevBepId: nuevo, EspId: e.EspId, EspBepFecha: e.EspBepFecha, EspBepFechaAct: e.EspBepFechaAct, EspBepEstado: 1, EspBepUsuarioId: e.EspBepUsuarioId });
      for (const d of await t.query('SELECT * FROM DetalleLOD WHERE EspBepId=@e AND DetLodEstado=1 ORDER BY DetLodId', { e: e.EspBepId })) {
        const newDet = await t.insert('DetalleLOD', { EspBepId: newEsp, EleId: d.EleId, LeyLodId: nz(d.LeyLodId), DetLodCheck: d.DetLodCheck, DetLodObservacion: d.DetLodObservacion, DetLodFecha: d.DetLodFecha, DetLodFechaAct: d.DetLodFechaAct, DetLodEstado: 1, DetLodUsuarioId: d.DetLodUsuarioId });
        // mejora: tambien se copian los parametros LOI (el procedimiento original los omitia)
        for (const l of await t.query('SELECT * FROM DetalleLOI WHERE DetLodId=@d AND DetLoiEstado=1 ORDER BY DetLoiId', { d: d.DetLodId })) {
          await t.insert('DetalleLOI', { ParLoiId: l.ParLoiId, DetLodId: newDet, DetLoiRevBepId: nuevo, DetLoiFecha: l.DetLoiFecha, DetLoiFechaAct: l.DetLoiFechaAct, DetLoiEstado: 1, DetLoiUsuarioId: l.DetLoiUsuarioId });
        }
      }
    }
    for (const x of await q('SELECT * FROM ContactoBEP WHERE RevBepId=@r AND ConBepEstado=1 ORDER BY ConBepId')) {
      await t.insert('ContactoBEP', { RevBepId: nuevo, RolBepId: x.RolBepId, OrgBepId: x.OrgBepId, ConBepPersonalId: x.ConBepPersonalId, ConBepPermiso: x.ConBepPermiso, ConBepFecha: x.ConBepFecha, ConBepFechaAct: x.ConBepFechaAct, ConBepEstado: 1, ConBepUsuarioId: x.ConBepUsuarioId });
    }
    for (const m of await q('SELECT * FROM MatrizRACI WHERE RevBepId=@r AND MatEstado=1 ORDER BY MatRaciId')) {
      const newMat = await t.insert('MatrizRACI', { RevBepId: nuevo, SubActId: m.SubActId, MatRaciActId: m.MatRaciActId, MatFecha: m.MatFecha, MatFechaAct: m.MatFechaAct, MatEstado: 1, MatUsuarioId: m.MatUsuarioId });
      for (const d of await t.query('SELECT * FROM DetalleMatrizRACI WHERE MatRaciId=@m AND DetMatrizEstado=1 ORDER BY DetMatrizId', { m: m.MatRaciId })) {
        await t.insert('DetalleMatrizRACI', { MatRaciId: newMat, LeyRaciId: d.LeyRaciId, OrgBepId: d.OrgBepId, DetMatrizFecha: d.DetMatrizFecha, DetMatrizFechaAct: d.DetMatrizFechaAct, DetMatrizEstado: 1, DetMatrizUsuarioId: d.DetMatrizUsuarioId });
      }
    }
    for (const x of await q('SELECT * FROM HitoConstruccion WHERE RevBepId=@r AND HitConEstado=1 ORDER BY HitConId')) {
      await t.insert('HitoConstruccion', { RevBepId: nuevo, HitConNombre: x.HitConNombre, HitConFechaInicio: x.HitConFechaInicio, HitConFechaFin: x.HitConFechaFin, HitConFecha: x.HitConFecha, HitConFechaAct: x.HitConFechaAct, HitConEstado: 1, HitConUsuarioId: x.HitConUsuarioId });
    }
    for (const x of await q('SELECT * FROM EntregableInformacion WHERE RevBepId=@r AND EntInfEstado=1 ORDER BY EntInfId')) {
      await t.insert('EntregableInformacion', { RevBepId: nuevo, OrgBepId: x.OrgBepId, EntInfNombre: x.EntInfNombre, EntInfFechaInicio: x.EntInfFechaInicio, EntInfFechaEntrega: x.EntInfFechaEntrega, EntInfFecha: x.EntInfFecha, EntInfFechaAct: x.EntInfFechaAct, EntInfEstado: 1, EntInfUsuarioId: x.EntInfUsuarioId });
    }
    for (const x of await q('SELECT * FROM Recurso WHERE RevBepId=@r AND RecEstado=1 ORDER BY RecId')) {
      const newRec = await t.insert('Recurso', { RevBepId: nuevo, RecNombre: x.RecNombre, RecDescripcion: x.RecDescripcion, RecUrl: x.RecUrl, RecTipo: x.RecTipo, RecPersonalId: x.RecPersonalId, RecFecha: x.RecFecha, RecFechaAct: x.RecFechaAct, RecEstado: 1, RecUsuarioId: x.RecUsuarioId });
      for (const a of await t.query('SELECT * FROM ArchivoBEP WHERE RevBepId=@r AND ArcBepRecursoId=@rc AND ArcBepEstado=1 ORDER BY ArcBepId', { r: revBepId, rc: x.RecId })) {
        await t.insert('ArchivoBEP', { RevBepId: nuevo, ArcBepRecursoId: newRec, ArcBepNombre: a.ArcBepNombre, ArcBepTipo: a.ArcBepTipo, ArcBepPeso: a.ArcBepPeso, ArcBepRuta: a.ArcBepRuta, ArcBepFecha: a.ArcBepFecha, ArcBepFechaAct: a.ArcBepFechaAct, ArcBepEstado: 1, ArcBepUsuarioId: a.ArcBepUsuarioId });
      }
    }
    for (const x of await q('SELECT * FROM ReunionBEP WHERE RevBepId=@r AND ReuBepEstado=1 ORDER BY ReuBepId')) {
      await t.insert('ReunionBEP', { RevBepId: nuevo, ReuBepNombre: x.ReuBepNombre, ReuBepDescripcion: x.ReuBepDescripcion, ReuBepPlataforma: x.ReuBepPlataforma, ReuBepUbicacion: x.ReuBepUbicacion, ReuBepResponsable: x.ReuBepResponsable,
        ReuBepFrecuencia: x.ReuBepFrecuencia, ReuBepDias: x.ReuBepDias, ReuBepHora: x.ReuBepHora, ReuBepMinuto: x.ReuBepMinuto, ReuBepDuracion: x.ReuBepDuracion, ReuBepInvolucrados: x.ReuBepInvolucrados,
        ReuBepFecha: x.ReuBepFecha, ReuBepFechaAct: x.ReuBepFechaAct, ReuBepEstado: 1, ReuBepUsuarioId: x.ReuBepUsuarioId });
    }
    for (const x of await q('SELECT * FROM CanalBEP WHERE RevBepId=@r AND CanBepEstado=1 ORDER BY CanBepId')) {
      await t.insert('CanalBEP', { RevBepId: nuevo, CanBepNombre: x.CanBepNombre, CanBepProposito: x.CanBepProposito, CanBepFecha: x.CanBepFecha, CanBepFechaAct: x.CanBepFechaAct, CanBepEstado: 1, CanBepUsuarioId: x.CanBepUsuarioId });
    }
    for (const x of await q('SELECT * FROM EntornoDatosBEP WHERE RevBepId=@r AND EcdBepEstado=1 ORDER BY EcdBepId')) {
      await t.insert('EntornoDatosBEP', { RevBepId: nuevo, EcdBepNombre: x.EcdBepNombre, EcdBepUrl: x.EcdBepUrl, EcdBepComentario: x.EcdBepComentario, EcdBepFecha: x.EcdBepFecha, EcdBepFechaAct: x.EcdBepFechaAct, EcdBepEstado: 1, EcdBepUsuarioId: x.EcdBepUsuarioId });
    }
    return nuevo;
  }

  post('PostCrearEtapa', async (req, res) => {
    const d = req.body;
    const nuevo = await tx((t) => crearEtapa(t, n(d.ProBepId), n(d.RevBepId), s(d.RevBepNombre), n(d.RevProId)));
    res.json({ NewRevBepId: nuevo });
  });

  post('PostCrearRevision', async (req, res) => {
    const d = arg(req.body, 'SDTCrearRevision');
    const mensaje = await tx(async (t) => {
      const proId = n(d.ProBepId);
      await t.exec('UPDATE RevisionProyecto SET RevProActual=0 WHERE ProBepId=@p', { p: proId });
      let revProId = 0;
      const padre = (await t.query('SELECT * FROM RevisionProyecto WHERE RevProId=@i', { i: n(d.RevProIdPadre) }))[0];
      if (padre) {
        const f = toDate(d.RevProFecha) || ahora();
        revProId = await t.insert('RevisionProyecto', {
          ProBepId: proId, RevProIdPadre: n(d.RevProIdPadre), RevProNombre: s(d.RevProNombre), RevProDescripcion: padre.RevProDescripcion, RevProCampanaId: padre.RevProCampanaId, RevProCompaniaId: padre.RevProCompaniaId,
          RevProClienteId: padre.RevProClienteId, RevProOrganizacionId: padre.RevProOrganizacionId, RevProTipoId: padre.RevProTipoId, RevProCategoriaId: padre.RevProCategoriaId, RevProUbicacion: padre.RevProUbicacion,
          RevProPlantillaId: padre.RevProPlantillaId, RevProActual: 1, RevProFecha: f, RevProFechaAct: f, RevProEstado: 1, RevProUsuarioId: s(d.RevProUsuarioId) || null });
        for (const e of arr(d.Etapas)) await crearEtapa(t, proId, n(e.RevBepId), s(e.RevBepNombre), revProId);
      }
      return `Revision creada correctamente #${revProId}`;
    });
    res.json({ mensaje });
  });

  // ---------- Reporte (PDF) ----------
  post('PostReporteBEP', async (req, res) => {
    const proId = n(req.body.ProBepId); const rpId = n(req.body.RevProId); const revIds = arr(req.body.RevBepIds).map(Number);
    const out = { NombreBep: '', Cliente: '', Proyecto: '', Tipo: '', Categoria: '', Ubicacion: '', Estado: '', Descripcion: '', Revision: '', Etapas: [] };
    const p = (await db.query('SELECT ProBepNombre FROM ProyectoBEP WHERE ProBepId=@i', { i: proId }))[0];
    if (p) out.NombreBep = s(p.ProBepNombre);
    const rp = (await db.query('SELECT * FROM RevisionProyecto WHERE RevProId=@i', { i: rpId }))[0];
    if (rp) {
      const one = async (sql, prm, col) => { const x = (await db.query(sql, prm))[0]; return x ? s(x[col]) : ''; };
      out.Cliente = await one('SELECT OrgBepNombre FROM OrganizacionBEP WHERE OrgBepId=@i', { i: rp.RevProOrganizacionId }, 'OrgBepNombre');
      out.Proyecto = await one('SELECT CampanaNombre FROM Campana WHERE CampanaId=@a AND CompaniaId=@b AND ClienteId=@c', { a: rp.RevProCampanaId, b: rp.RevProCompaniaId, c: rp.RevProClienteId }, 'CampanaNombre');
      out.Tipo = await one('SELECT TipoBepNombre FROM TipoBEP WHERE TipoBepId=@i', { i: rp.RevProTipoId }, 'TipoBepNombre');
      out.Categoria = await one('SELECT CatBepNombre FROM CategoriaBEP WHERE CatBepId=@i', { i: rp.RevProCategoriaId }, 'CatBepNombre');
      out.Ubicacion = s(rp.RevProUbicacion); out.Descripcion = s(rp.RevProDescripcion); out.Revision = s(rp.RevProNombre);
    }
    const leyenda = await db.query('SELECT LeyRaciNombre, LeyRaciAbreviacion, LeyRaciColor, LeyRaciBackground FROM LeyendaRACI WHERE LeyRaciEstado=1 ORDER BY LeyRaciId');
    let numero = 1;
    for (const rev of revIds) {
      numero += 1;
      const P = { r: rev };
      const q = (sql, prm = P) => db.query(sql, prm);
      const e = { Id: 0, Numero: String(numero), Seccion: '', Nombre: '', ObjetivosCliente: [], ObjetivosProyecto: [], ObjetivosBim: [], UsosBim: [], Especialidades: [], ContactosClave: [], MatrizRaci: [], LeyendaRaci: [], OrganizacionesRaci: [],
        HitosConstruccion: [], HitosEntregaInformacion: [], FlujoTrabajo: [], EntornoComunDatos: [], EstrategiaReuniones: [], CanalesComunicacion: [] };
      const rb = (await q('SELECT RevBepId, RevBepNombre FROM RevisionBEP WHERE RevBepId=@r'))[0];
      if (rb) { e.Id = n(rb.RevBepId); e.Seccion = 'Seccion' + n(rb.RevBepId); e.Nombre = s(rb.RevBepNombre); }
      const obj = async (tipo) => (await q('SELECT ObjBepNombre, ObjBepDescripcion FROM ObjetivoBEP WHERE RevBepId=@r AND ObjBepTipo=@t AND ObjBepEstado=1 ORDER BY ObjBepId', { r: rev, t: tipo })).map((x) => ({ Nombre: s(x.ObjBepNombre), Descripcion: s(x.ObjBepDescripcion) }));
      e.ObjetivosCliente = await obj('C'); e.ObjetivosProyecto = await obj('P'); e.ObjetivosBim = await obj('B');
      e.UsosBim = (await q('SELECT UsoBimBepNombre FROM UsoBIMBEP WHERE RevBepId=@r AND UsoBimBepEstado=1 ORDER BY UsoBimBepId')).map((x) => ({ Nombre: s(x.UsoBimBepNombre) }));
      for (const es of await q('SELECT eb.EspBepId, es.EspNombre FROM EspecialidadBEP eb LEFT JOIN Especialidad es ON es.EspId = eb.EspId WHERE eb.RevBepId=@r AND eb.EspBepEstado=1 ORDER BY eb.EspBepId')) {
        const dets = await q(`SELECT c.CatEleId, c.CatEleNombre, el.EleNombre, l.LeyLodNombre, d.DetLodId, d.DetLodObservacion FROM DetalleLOD d JOIN Elemento el ON el.EleId = d.EleId JOIN CategoriaElemento c ON c.CatEleId = el.CatEleId
            LEFT JOIN LeyendaLOD l ON l.LeyLodId = d.LeyLodId WHERE d.EspBepId=@e AND d.DetLodEstado=1 ORDER BY c.CatEleId, d.DetLodId`, { e: es.EspBepId });
        const lois = dets.length ? await q('SELECT l.DetLodId, p.ParLoiNombre FROM DetalleLOI l JOIN ParametroLOI p ON p.ParLoiId = l.ParLoiId WHERE l.DetLoiEstado=1 AND l.DetLodId IN (SELECT DetLodId FROM DetalleLOD WHERE EspBepId=@e AND DetLodEstado=1) ORDER BY l.DetLoiId', { e: es.EspBepId }) : [];
        e.Especialidades.push({ Nombre: s(es.EspNombre), DetalleLOD: dets.map((d) => ({ CatEleId: n(d.CatEleId), Categoria: s(d.CatEleNombre), Elemento: s(d.EleNombre), Lod: s(d.LeyLodNombre), Observacion: s(d.DetLodObservacion),
          DetalleLOI: lois.filter((l) => l.DetLodId === d.DetLodId).map((l) => ({ Parametro: s(l.ParLoiNombre) })) })) });
      }
      e.ContactosClave = (await q(`SELECT p.PersonalNombres, p.PersonalApellidos, p.PersonaMail, p.PersonaTelefono, o.OrgBepNombre, ro.RolBepNombre FROM ContactoBEP c LEFT JOIN Personal p ON p.PersonalId = c.ConBepPersonalId
          LEFT JOIN OrganizacionBEP o ON o.OrgBepId = c.OrgBepId LEFT JOIN RolBEP ro ON ro.RolBepId = c.RolBepId WHERE c.RevBepId=@r AND c.ConBepEstado=1 ORDER BY c.ConBepId`))
        .map((x) => ({ Nombres: s(x.PersonalNombres), Apellidos: s(x.PersonalApellidos), Correo: s(x.PersonaMail), Organizacion: s(x.OrgBepNombre), Rol: s(x.RolBepNombre), Telefono: s(x.PersonaTelefono) }));
      const mats = await q(`SELECT m.MatRaciId, m.MatRaciActId, a.ActNombre, sa.SubActNombre FROM MatrizRACI m LEFT JOIN Actividad a ON a.ActId = m.MatRaciActId LEFT JOIN SubActividad sa ON sa.SubActId = m.SubActId
          WHERE m.RevBepId=@r AND m.MatEstado=1 ORDER BY m.MatRaciActId, m.MatRaciId`);
      const dm = mats.length ? await q('SELECT d.MatRaciId, d.LeyRaciId, d.OrgBepId, l.LeyRaciAbreviacion, l.LeyRaciColor, l.LeyRaciBackground FROM DetalleMatrizRACI d LEFT JOIN LeyendaRACI l ON l.LeyRaciId = d.LeyRaciId WHERE d.DetMatrizEstado=1 AND d.MatRaciId IN (SELECT MatRaciId FROM MatrizRACI WHERE RevBepId=@r AND MatEstado=1) ORDER BY d.DetMatrizId') : [];
      e.MatrizRaci = mats.map((m) => ({ ActId: n(m.MatRaciActId), Actividad: s(m.ActNombre), SubActividad: s(m.SubActNombre),
        DetalleMatriz: dm.filter((d) => d.MatRaciId === m.MatRaciId).map((d) => ({ LeyRaciId: n(d.LeyRaciId), Abreviacion: s(d.LeyRaciAbreviacion), Color: s(d.LeyRaciColor), Fondo: s(d.LeyRaciBackground), OrgId: n(d.OrgBepId) })) }));
      e.LeyendaRaci = leyenda.map((l) => ({ Nombre: s(l.LeyRaciNombre), Abreviacion: s(l.LeyRaciAbreviacion), Color: s(l.LeyRaciColor), Fondo: s(l.LeyRaciBackground) }));
      e.OrganizacionesRaci = (await q('SELECT DISTINCT c.OrgBepId, o.OrgBepNombre FROM ContactoBEP c LEFT JOIN OrganizacionBEP o ON o.OrgBepId = c.OrgBepId WHERE c.RevBepId=@r AND c.ConBepEstado=1 ORDER BY c.OrgBepId')).map((x) => ({ Id: n(x.OrgBepId), Nombre: s(x.OrgBepNombre) }));
      e.HitosConstruccion = (await q('SELECT HitConNombre, HitConFechaInicio, HitConFechaFin FROM HitoConstruccion WHERE RevBepId=@r AND HitConEstado=1 ORDER BY HitConId')).map((x) => ({ Nombre: s(x.HitConNombre), FechaInicio: isoDate(x.HitConFechaInicio), FechaFin: isoDate(x.HitConFechaFin) }));
      e.HitosEntregaInformacion = (await q('SELECT x.EntInfNombre, o.OrgBepNombre, x.EntInfFechaEntrega FROM EntregableInformacion x LEFT JOIN OrganizacionBEP o ON o.OrgBepId = x.OrgBepId WHERE x.RevBepId=@r AND x.EntInfEstado=1 ORDER BY x.EntInfId')).map((x) => ({ Nombre: s(x.EntInfNombre), Organizacion: s(x.OrgBepNombre), FechaEntrega: isoDate(x.EntInfFechaEntrega) }));
      const recs = await q('SELECT RecId, RecNombre, RecUrl FROM Recurso WHERE RevBepId=@r AND RecEstado=1 ORDER BY RecId');
      for (const rc of recs) {
        const ar = await q('SELECT ArcBepNombre, ArcBepTipo, ArcBepRuta FROM ArchivoBEP WHERE RevBepId=@r AND ArcBepRecursoId=@rc AND ArcBepEstado=1 ORDER BY ArcBepId', { r: rev, rc: rc.RecId });
        e.FlujoTrabajo.push({ Nombre: s(rc.RecNombre), Url: s(rc.RecUrl), Archivos: ar.map((a) => ({ Nombre: s(a.ArcBepNombre), Tipo: s(a.ArcBepTipo), Ruta: s(a.ArcBepRuta) })) });
      }
      e.EntornoComunDatos = (await q('SELECT EcdBepNombre, EcdBepComentario FROM EntornoDatosBEP WHERE RevBepId=@r AND EcdBepEstado=1 ORDER BY EcdBepId')).map((x) => ({ Nombre: s(x.EcdBepNombre), Comentario: s(x.EcdBepComentario) }));
      e.EstrategiaReuniones = (await q('SELECT * FROM ReunionBEP WHERE RevBepId=@r AND ReuBepEstado=1 ORDER BY ReuBepId')).map((x) => ({ Nombre: s(x.ReuBepNombre), Plataforma: s(x.ReuBepPlataforma), Frecuencia: s(x.ReuBepFrecuencia), Dias: s(x.ReuBepDias),
        HoraMinuto: s(x.ReuBepHora) + ':' + s(x.ReuBepMinuto), Duracion: n(x.ReuBepDuracion), Ubicacion: s(x.ReuBepUbicacion), Responsable: s(x.ReuBepResponsable), Involucrados: s(x.ReuBepInvolucrados), Descripcion: s(x.ReuBepDescripcion) }));
      e.CanalesComunicacion = (await q('SELECT CanBepNombre, CanBepProposito FROM CanalBEP WHERE RevBepId=@r AND CanBepEstado=1 ORDER BY CanBepId')).map((x) => ({ Nombre: s(x.CanBepNombre), Proposito: s(x.CanBepProposito) }));
      out.Etapas.push(e);
    }
    res.json(out);
  });
};
