'use strict';
/* Prueba de humo de la API completa contra SQLite en memoria (no requiere SQL Server).  npm test */
process.env.DB_CLIENT = 'sqlite';
process.env.SQLITE_FILE = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = require('path').join(require('os').tmpdir(), 'bep-test-uploads-' + process.pid);
process.env.FRONT_DIR = './public/AppBEP';
const assert = require('assert');
const { createApp } = require('../server');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../src/seed');

let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); passed++; };

(async () => {
  const { app, db } = createApp(process.env);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  // Cliente HTTP con "jar" de cookies que respeta Path (como un navegador): cada sesion es independiente
  const mk = () => {
    const jar = new Map();   // "nombre|ruta" -> valor
    const header = (url) => [...jar.entries()].map(([k, v]) => { const [n, p] = k.split('|'); return { n, p, v }; })
      .filter((c) => url.split('?')[0].startsWith(c.p === '/' ? '/' : c.p.endsWith('/') ? c.p : c.p + '/') || url.split('?')[0] === c.p)
      .sort((a, b) => b.p.length - a.p.length).map((c) => `${c.n}=${c.v}`).join('; ');
    const absorb = (sc) => sc.forEach((c) => {
      const [nv, ...attrs] = c.split(';'); const i = nv.indexOf('=');
      const path = ((attrs.find((a) => /^\s*Path=/i.test(a)) || '=/').split('=')[1] || '/').trim();
      const age = (attrs.find((a) => /^\s*Max-Age=/i.test(a)) || '').split('=')[1];
      const key = `${nv.slice(0, i)}|${path}`;
      if (age !== undefined && Number(age) <= 0) jar.delete(key); else jar.set(key, nv.slice(i + 1));
    });
    const call = async (method, url, body, withCookie = true) => {
      const ck = withCookie ? header(url) : '';
      const r = await fetch(base + url, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(ck ? { Cookie: ck } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
      absorb(sc);
      const text = await r.text();
      let json; try { json = JSON.parse(text); } catch (_) { json = text; }
      return { status: r.status, json, setCookie: sc, location: r.headers.get('location') };
    };
    const raw = (url) => fetch(base + url, { redirect: 'manual', headers: header(url) ? { Cookie: header(url) } : {} });
    return { call, raw, jar, header };
  };
  const adm = mk();
  const call = adm.call;
  let cookie = '';
  const G = (u) => call('GET', '/principal/General/APIBEP/' + u).then((x) => x.json);
  const C = (u) => call('GET', '/principal/General/APIConfigBEP/' + u).then((x) => x.json);
  const P = (u, b) => call('POST', '/principal/General/APIBEP/' + u, b).then((x) => x.json);

  try {
    // ---- login y seguridad ----
    eq((await call('GET', '/principal/General/APIBEP/GetListaBEP?buscar=', undefined, false)).status, 401, 'sin sesion -> 401');
    eq((await call('POST', '/auth/login', { correo: ADMIN_EMAIL, password: 'mala' }, false)).status, 401, 'clave incorrecta');
    const lg = await call('POST', '/auth/login', { correo: ADMIN_EMAIL, password: ADMIN_PASSWORD }, false);
    eq(lg.status, 200, 'login ok');
    ok(lg.setCookie.some((c) => /^bep_sesion=/.test(c) && /HttpOnly/i.test(c)), 'sesion de plataforma HttpOnly');
    eq((await call('GET', '/principal/General/APIBEP/GetListaBEP?buscar=')).status, 401, 'la sesion de plataforma no abre una empresa');
    const yo = (await call('GET', '/auth/yo')).json;
    eq([yo.usuario.superadmin, yo.empresas.map((e) => e.slug)], [true, ['principal']], 'yo: superadmin y empresas');
    const en = await call('POST', '/auth/entrar', { slug: 'principal' });
    eq([en.status, en.json.url], [200, '/principal/'], 'entrar a la empresa');
    ok(en.setCookie.some((c) => /^bep_token=/.test(c) && /Path=\/principal/.test(c) && !/HttpOnly/i.test(c)), 'cookie de empresa legible por el front y solo para su ruta');
    ok(en.setCookie.some((c) => /^bep_uso=/.test(c)), 'cookie bep_uso');
    const tok = decodeURIComponent(adm.header('/principal/').match(/bep_token=([^;]+)/)[1]);
    const payload = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString());
    eq([payload.vidusuario, payload.vPersonalId, payload.VCompaniaId, payload.rol, payload.slug], ['USBEP01', 'EMBEP01', 'CM001', 'admin', 'principal'], 'payload JWT');

    // ---- catalogos ----
    const tipos = await C('GetListaTiposBEP?buscar=&estado=true&inicio=0');
    eq(tipos.data.map((x) => x.nombre), ['Edificaciones', 'Otros'], 'lista tipos');
    eq([tipos.anterior, tipos.siguiente], [0, 0], 'paginacion sin mas paginas');
    const usos = await C('GetListaUsosBim?buscar=&estado=true&inicio=0');
    eq(usos.data.length, 10, 'pagina de 10'); ok(usos.siguiente > 0, 'hay siguiente');
    const usos2 = await C(`GetListaUsosBim?buscar=&estado=true&inicio=${usos.siguiente}`);
    eq(usos2.data[0].id, usos.siguiente + 1, 'segunda pagina continua'); ok(usos2.anterior >= 0, 'anterior presente');
    eq((await C('GetListaEspecialidades?buscar=arq&tipoBep=1&estado=true&inicio=0')).data[0].tipoBep, 'Edificaciones', 'join tipo');
    eq((await C('GetListaElementos?buscar=&tipoBep=0&espId=2&catId=0&estado=true&inicio=0')).data.length, 9, 'elementos de Arquitectura');
    eq((await C('GetSelectConfigBEP?opcion=especialidad&parametro=1')).SDTSelectConfigBEP.length, 7, 'select especialidades activas');
    const info = await G('GetInfoBEP?opcion=datos');
    eq([info.tipos.length, info.tipos[0].categorias.length, info.organizaciones.length], [2, 6, 3], 'GetInfoBEP datos');
    eq((await G('GetInfoBEP?opcion=proyectos&buscar=ejemplo 2')).campanas.length, 1, 'buscar proyecto');

    // ---- crear BEP ----
    const g1 = await P('PostGuardarBEP', { ProBepId: 0, RevProId: 0, RevBepId: 0, ProBepNombre: 'BEP Torre Norte', RevProNombre: 'Rev 1', RevBepNombre: 'Etapa Diseno', RevProOrganizacionId: 1,
      RevProCampanaId: 'CP001', RevProCompaniaId: 'CM001', RevProClienteId: 'CL001', RevProTipoId: 1, RevProCategoriaId: 1, RevProUbicacion: 'Lima', RevProPlantillaId: 0, RevProDescripcion: 'Descripcion', PersonalId: 'EMBEP01', UsuarioId: 'USBEP01' });
    eq(g1.mensaje, '1#1#1', 'PostGuardarBEP nuevo');
    const gi = await G('GetInformacionBEP?ProBepId=1&RevProId=1&RevBepId=1');
    eq([gi.ProBepNombre, gi.CampanaNombre, gi.RevProTipoId, gi.RevBepNombre], ['BEP Torre Norte', 'Proyecto de ejemplo 1', 1, 'Etapa Diseno'], 'GetInformacionBEP');
    eq((await P('PostGuardarBEP', { ...gi, ProBepNombre: 'BEP Torre Norte 2', UsuarioId: 'USBEP01' })).mensaje, '1#1#1', 'PostGuardarBEP edicion');

    // ---- registro por defecto, alcance, LOD, LOI ----
    await P('PostRegistroDefaultBEP', { SDTRegistroDefaultBEP: { ProBepId: 1, RevProId: 1, RevBepId: 1, TipoBepId: 1, PlaBepId: 0, UsuarioId: 'USBEP01', BepNuevo: true, FormaRegistro: 'TipoBep', Fecha: '2026-11-04 10:00:00' } });
    const esps = (await G('GetListaAlcanceBEP?opcion=especialidadesBEP&RevBepId=1')).SDTListaAlcanceBEP;
    eq(esps.length, 7, 'especialidades por defecto');
    const arq = esps.find((e) => e.nombre === 'Arquitectura');
    const lod = (await G(`GetListaAlcanceLOD?EspBepId=${arq.id}`)).SDTListaAlcanceLOD;
    eq(lod.length, 9, 'elementos LOD de Arquitectura'); eq(lod[0].nombreCategoria, 'Muros', 'categoria ordenada');
    const lodIds = (await G('GetListaAlcanceBEP?opcion=leyendaLOD&RevBepId=0')).SDTListaAlcanceBEP;
    eq(lodIds.length, 6, 'leyenda LOD por defecto');
    lod[0].idLOD = lodIds[2].id; lod[0].observacion = 'Obs muro'; lod[0].idUsuario = 'USBEP01';
    await P('PostGuardarDetalleLOD', { SDTListaAlcanceLOD: lod });
    await P('PostAgregarDetalleLOI', { SDTAgregarDetalleLOI: [{ ParLoiId: 0, ParLoiNombre: 'Material', DetLodId: lod[0].idDetLod, RevBepId: 1, UsuarioId: 'USBEP01' }], DetLodId: lod[0].idDetLod });
    const lod2 = (await G(`GetListaAlcanceLOD?EspBepId=${arq.id}`)).SDTListaAlcanceLOD;
    eq([lod2[0].idLOD, lod2[0].observacion, lod2[0].parametrosLOI.map((p) => p.nombreParLoi)], [lodIds[2].id, 'Obs muro', ['Material']], 'LOD+LOI guardados');
    eq((await G('GetListaAlcanceBEP?opcion=parametroLOI&parametro=mat')).SDTListaAlcanceBEP.length, 1, 'parametro LOI nuevo en catalogo');
    await P('PostActualizarDetalleLOD', { DetLodId: lod2[1].idDetLod, UsuarioId: 'USBEP01' });
    eq((await G(`GetListaAlcanceLOD?EspBepId=${arq.id}`)).SDTListaAlcanceLOD.length, 8, 'detalle LOD dado de baja');
    await P('PostAgregarDetalleLOD', { SDTAgregarDetalleLOD: [{ idElemento: lod2[1].idElemento, idCategoria: lod2[1].idCategoria, idEspBep: arq.id, idUsuario: 'USBEP01' }] });
    eq((await G(`GetListaAlcanceLOD?EspBepId=${arq.id}`)).SDTListaAlcanceLOD.length, 9, 'detalle LOD agregado');
    const cat = (await G('GetListaAlcanceBEP?opcion=categoriaElementos&RevBepId=0&EspId=2')).SDTListaAlcanceBEP;
    eq([cat.length, cat[0].elementos.length], [4, 2], 'categorias y elementos');

    // ---- contactos ----
    const roles = (await G('GetListaContactosBEP?opcion=rolBEP&RevBepId=0')).SDTListaContactosBEP;
    eq(roles.length, 5, 'roles');
    const nuevoContacto = { ConBepId: 0, RevBepId: 1, RolBepId: roles[0].id, OrgBepId: 0, OrgBepNombre: 'Constructora Sur', OrgBepTipo: 1, ConBepPersonalId: '', ConBepPermiso: 1, ConBepEstado: true, ConBepUsuarioId: 'USBEP01',
      nombres: 'Ana', apellidos: 'Perez', telefono: '999', correo: 'ana@x.com' };
    eq((await P('PostAgregarContactoBEP', { SDTAgregarContactoBEP: nuevoContacto })).mensaje, 'Guardado', 'contacto nuevo');
    const cts = (await G('GetListaContactosBEP?opcion=contactoBEP&RevBepId=1')).SDTListaContactosBEP;
    eq([cts.length, cts[0].nombres, cts[0].orgNombre, cts[0].rolNombre], [1, 'Ana', 'Constructora Sur', 'Director BIM'], 'lista contactos');
    eq((await P('PostAgregarContactoBEP', { SDTAgregarContactoBEP: { ...nuevoContacto, OrgBepId: cts[0].orgId, ConBepPersonalId: cts[0].refId } })).mensaje, 'Existe', 'contacto duplicado');
    eq((await P('PostAgregarContactoBEP', { SDTAgregarContactoBEP: { ...nuevoContacto, ConBepId: cts[0].id, OrgBepId: cts[0].orgId, ConBepPersonalId: cts[0].refId, ConBepPermiso: 2 } })).mensaje, 'Actualizado', 'contacto actualizado');
    eq((await G('GetInfoPersonal?opcion=listaCorreo&parametro=ana')).SDTInfoPersonal[0].nombres, 'Ana', 'buscar personal por correo');
    eq((await G('GetListaMatriz?opcion=organizaciones&RevBepId=1')).SDTListaMatriz.map((o) => o.nombre), ['Constructora Sur'], 'organizaciones de la etapa');

    // ---- matriz RACI ----
    const mat = (await G('GetListaMatrizRACI?RevBepId=1')).SDTListaMatrizRACI;
    eq(mat.length, 28, 'matriz RACI por defecto'); eq(mat[0].nombreActividad, 'Presentación de ofertas', 'actividad de matriz');
    const ley = (await G('GetListaMatriz?opcion=leyendaRACI&RevBepId=0')).SDTListaMatriz;
    eq(ley.map((l) => l.abreviacion), ['R', 'A', 'C', 'I'], 'leyenda RACI');
    const orgId = cts[0].orgId;
    await P('PostGuardarDetalleRACI', { SDTGuardarDetalleRACI: [{ idMatrizRaci: mat[0].idMatRaci, idLeyRaci: ley[0].id, idOrgBep: orgId, idUsuario: 'USBEP01' }, { idMatrizRaci: mat[0].idMatRaci, idLeyRaci: ley[1].id, idOrgBep: orgId, idUsuario: 'USBEP01' }], MatRaciId: mat[0].idMatRaci, OrgBepId: orgId });
    await P('PostGuardarDetalleRACI', { SDTGuardarDetalleRACI: [{ idMatrizRaci: mat[0].idMatRaci, idLeyRaci: ley[0].id, idOrgBep: orgId, idUsuario: 'USBEP01' }], MatRaciId: mat[0].idMatRaci, OrgBepId: orgId });
    eq((await G('GetListaMatrizRACI?RevBepId=1')).SDTListaMatrizRACI[0].detalle.map((d) => d.abreviatura), ['R'], 'detalle RACI reemplazado');
    const sub = (await G('GetListaMatriz?opcion=subActividades&RevBepId=0')).SDTListaMatriz;
    eq(sub.length, 6, 'actividades con subactividades');

    // ---- CRUD generico (transacciones REST) ----
    const rest = (m, u, b) => call(m, '/principal/rest/General/' + u, b);
    const ob = await rest('POST', 'ObjetivoBEP/', { ObjBepId: 0, RevBepId: 1, ObjBepNombre: 'Reducir RFI', ObjBepDescripcion: 'Menos RFI', ObjBepTipo: 'C', ObjBepFecha: '2026-11-04 10:00:00', ObjBepFechaAct: '2026-11-04 10:00:00', ObjBepEstado: true, ObjBepUsuarioId: 'USBEP01' });
    eq(ob.status, 201, 'POST BC 201'); ok(ob.json.ObjBepId > 0 && ob.json.gx_md5_hash, 'BC devuelve id y hash');
    eq((await G('GetListaObjetivosBEP?opcion=objCliente&RevBepId=1')).SDTListaObjetivosBEP.map((o) => o.nombre), ['Reducir RFI'], 'lista objetivos');
    const got = (await rest('GET', 'ObjetivoBEP/' + ob.json.ObjBepId)).json;
    eq([got.ObjBepEstado, got.ObjBepFecha], [true, '2026-11-04T10:00:00'], 'GET BC tipos');
    await rest('PUT', 'ObjetivoBEP/' + got.ObjBepId, { ...got, ObjBepEstado: false });
    eq((await G('GetListaObjetivosBEP?opcion=objCliente&RevBepId=1')).SDTListaObjetivosBEP.length, 0, 'objetivo eliminado (estado=false)');
    eq((await rest('GET', 'ObjetivoBEP/9999')).status, 404, '404 BC');
    eq((await rest('GET', 'ReunionBep/1')).status, 404, 'alias de mayusculas');
    await P('PostAgregarUsoBimBEP', { SDTAgregarUsoBimBEP: [{ idUsoBim: 1, nombreUsoBim: 'Levantamiento', descripcionUsoBim: '', idRevision: 1, idUsuario: 'USBEP01' }] });
    eq((await G('GetListaObjetivosBEP?opcion=usosBimBEP&RevBepId=1')).SDTListaObjetivosBEP[0].idUsoBim, 1, 'usos BIM del BEP');
    await rest('POST', 'HitoConstruccion/', { HitConId: 0, RevBepId: 1, HitConNombre: 'Cimentacion', HitConFechaInicio: '2026-01-10', HitConFechaFin: '2026-02-20', HitConFecha: '2026-11-04 10:00:00', HitConFechaAct: '2026-11-04 10:00:00', HitConEstado: true, HitConUsuarioId: 'USBEP01' });
    eq((await G('GetListaHitos?opcion=hConstruccion&RevBepId=1')).SDTListaHitos[0].fechaFin, '2026-02-20', 'hitos de construccion');
    await rest('POST', 'EntregableInformacion/', { EntInfId: 0, RevBepId: 1, OrgBepId: orgId, EntInfNombre: 'Modelo federado', EntInfFechaInicio: '2026-03-01', EntInfFechaEntrega: '2026-04-01', EntInfFecha: '2026-11-04 10:00:00', EntInfFechaAct: '2026-11-04 10:00:00', EntInfEstado: true, EntInfUsuarioId: 'USBEP01' });
    eq((await G('GetListaHitos?opcion=hEntrega&RevBepId=1')).SDTListaHitos[0].orgNombre, 'Constructora Sur', 'hitos de entrega');
    await rest('POST', 'ReunionBEP/', { ReuBepId: 0, RevBepId: 1, ReuBepNombre: 'Coordinacion semanal', ReuBepDescripcion: '', ReuBepPlataforma: 'Teams', ReuBepUbicacion: '', ReuBepResponsable: 'Ana', ReuBepFrecuencia: 'Semanal', ReuBepDias: 'lun-mie', ReuBepHora: '10', ReuBepMinuto: '30', ReuBepDuracion: 60, ReuBepInvolucrados: '[1,2]', ReuBepFecha: '2026-11-04 10:00:00', ReuBepFechaAct: '2026-11-04 10:00:00', ReuBepEstado: true, ReuBepUsuarioId: 'USBEP01' });
    const reu = (await G('GetListaEComunicacion?opcion=eReunion&RevBepId=1')).SDTListaEComunicacion[0];
    eq([reu.nombre, reu.duracion, reu.dias], ['Coordinacion semanal', 60, 'lun-mie'], 'estrategia de reuniones');
    eq((await rest('GET', 'ReunionBep/' + reu.id)).json.ReuBepInvolucrados, '[1,2]', 'ReunionBep alias GET');
    await rest('POST', 'CanalBEP/', { CanBepId: 0, RevBepId: 1, CanBepNombre: 'WhatsApp', CanBepProposito: 'Avisos', CanBepFecha: '2026-11-04 10:00:00', CanBepFechaAct: '2026-11-04 10:00:00', CanBepEstado: true, CanBepUsuarioId: 'USBEP01' });
    await rest('POST', 'EntornoDatosBEP/', { EcdBepId: 0, RevBepId: 1, EcdBepNombre: 'ACC', EcdBepUrl: 'https://acc.example', EcdBepComentario: 'CDE', EcdBepFecha: '2026-11-04 10:00:00', EcdBepFechaAct: '2026-11-04 10:00:00', EcdBepEstado: true, EcdBepUsuarioId: 'USBEP01' });
    eq((await G('GetListaEComunicacion?opcion=cComunicacion&RevBepId=1')).SDTListaEComunicacion.length, 1, 'canales');
    eq((await G('GetListaEComunicacion?opcion=eComunDatos&RevBepId=1')).SDTListaEComunicacion[0].url, 'https://acc.example', 'entorno de datos');

    // ---- recursos y archivos ----
    const rec = await rest('POST', 'Recurso/', { RecId: 0, RevBepId: 1, RecNombre: 'Flujo BIM', RecDescripcion: '', RecUrl: '', RecTipo: 'archivo', RecPersonalId: 'EMBEP01', RecFecha: '2026-11-04 10:00:00', RecFechaAct: '2026-11-04 10:00:00', RecEstado: true, RecUsuarioId: 'USBEP01' });
    const b64 = Buffer.from('contenido de prueba').toString('base64');
    eq((await P('PostSubirArchivo', { SDTSubirArchivo: [{ id: 0, idRecurso: rec.json.RecId, idRevision: 1, nombre: `${rec.json.RecId}_flujo.txt`, tipo: 'text/plain', peso: '0.1 KB', fileBlob: b64, usuarioId: 'USBEP01' }], RecursoId: 0 })).mensaje, 'Archivo subido correctamente', 'subir archivo');
    const recs = (await G('GetListaRecursos?RevBepId=1')).SDTListaRecursos;
    eq([recs[0].nombre, recs[0].personalNombre, recs[0].archivos.length], ['Flujo BIM', 'Administrador BEP', 1], 'lista recursos');
    const f = await adm.raw('/principal' + recs[0].archivos[0].ruta);
    eq(await f.text(), 'contenido de prueba', 'archivo servido');
    eq((await fetch(base + '/principal' + recs[0].archivos[0].ruta)).status, 401, 'archivo requiere sesion');
    eq((await P('PostSubirArchivo', { SDTSubirArchivo: [{ id: 0, idRecurso: rec.json.RecId, idRevision: 1, nombre: '../../evil.txt', tipo: 't', peso: '1', fileBlob: b64, usuarioId: 'USBEP01' }], RecursoId: 0 })).mensaje, 'Archivo subido correctamente', 'nombre malicioso');
    ok(!require('fs').existsSync(require('path').join(process.env.UPLOAD_DIR, '..', '..', 'evil.txt')), 'no escapa del directorio');

    // ---- plantilla, etapas, revisiones ----
    await P('PostGuardarPlantilla', { SDTGuardarPlantilla: { PlaBepId: 0, PlaBepNombre: 'Mi plantilla', TipoBepId: 1, PlaBepFecha: '2026-11-04 10:00:00', PlaBepFechaAct: '2026-11-04 10:00:00', PlaBepEstado: true, PlaBepUsuarioId: 'USBEP01', RevBepId: 1, ProBepId: 1 } });
    const info2 = await G('GetInfoBEP?opcion=datos');
    eq(info2.tipos[0].plantillas.map((p) => p.nombre), ['Mi plantilla'], 'plantilla guardada');
    const pla = info2.tipos[0].plantillas[0].id;
    eq((await P('PostCrearEtapa', { ProBepId: 1, RevBepId: 1, RevBepNombre: 'Etapa Construccion', RevProId: 1 })).NewRevBepId, 2, 'crear etapa');
    const e2 = (await G('GetListaAlcanceBEP?opcion=especialidadesBEP&RevBepId=2')).SDTListaAlcanceBEP;
    eq(e2.length, 7, 'etapa copia especialidades');
    const arq2 = e2.find((e) => e.nombre === 'Arquitectura');
    const lodCopy = (await G(`GetListaAlcanceLOD?EspBepId=${arq2.id}`)).SDTListaAlcanceLOD;
    eq([lodCopy.length, lodCopy[0].observacion, lodCopy[0].parametrosLOI.length], [9, 'Obs muro', 1], 'etapa copia LOD y LOI');
    eq((await G('GetListaContactosBEP?opcion=contactoBEP&RevBepId=2')).SDTListaContactosBEP.length, 1, 'etapa copia contactos');
    eq((await G('GetListaMatrizRACI?RevBepId=2')).SDTListaMatrizRACI[0].detalle.length, 1, 'etapa copia matriz');
    eq((await G('GetListaRecursos?RevBepId=2')).SDTListaRecursos[0].archivos.length, 2, 'etapa copia recursos y archivos');
    eq((await G('GetListaHitos?opcion=hConstruccion&RevBepId=2')).SDTListaHitos.length, 1, 'etapa copia hitos');
    const rv = await P('PostCrearRevision', { SDTCrearRevision: { ProBepId: 1, RevProIdPadre: 1, RevProNombre: 'Rev 2', RevProFecha: '2026-11-05 08:00:00', RevProUsuarioId: 'USBEP01', Etapas: [{ RevBepId: 1, RevBepNombre: 'Etapa Diseno R2' }, { RevBepId: 2, RevBepNombre: 'Etapa Constr R2' }] } });
    eq(rv.mensaje, 'Revision creada correctamente #2', 'crear revision');
    const revs = (await G('GetListaRevisionesBEP?ProBepId=1&ShowFechas=1')).SDTListaRevisionesBEP;
    eq(revs.map((x) => [x.nombre, x.actual, x.etapas.length]), [['Rev 1', false, 2], ['Rev 2', true, 2]], 'revisiones');
    eq(revs[1].etapas.map((x) => x.actual), [false, true], 'solo la ultima etapa queda actual');
    eq(revs[0].etapas[0].usuarioActualizacion, 'Administrador BEP', 'usuario de ultima modificacion');

    // ---- plantilla como origen ----
    const g2 = await P('PostGuardarBEP', { ProBepId: 0, ProBepNombre: 'BEP desde plantilla', RevProNombre: 'R1', RevBepNombre: 'E1', RevProTipoId: 1, RevProCategoriaId: 2, PersonalId: 'EMBEP01', UsuarioId: 'USBEP01', RevProCampanaId: '', RevProOrganizacionId: 0 });
    const ids2 = g2.mensaje.split('#').map(Number);
    await P('PostRegistroDefaultBEP', { SDTRegistroDefaultBEP: { ProBepId: ids2[0], RevProId: ids2[1], RevBepId: ids2[2], TipoBepId: 1, PlaBepId: pla, UsuarioId: 'USBEP01', BepNuevo: false, FormaRegistro: 'Plantilla', Fecha: '2026-11-04 11:00:00' } });
    eq((await G(`GetListaAlcanceBEP?opcion=especialidadesBEP&RevBepId=${ids2[2]}`)).SDTListaAlcanceBEP.length, 7, 'BEP desde plantilla');

    // ---- listado principal y reporte ----
    const lista = (await G('GetListaBEP?buscar=')).SDTListaBEP;
    eq(lista.length, 2, 'lista de BEP');
    const l1 = lista.find((x) => x.id === 1);
    eq([l1.nombre, l1.proyecto, l1.cliente, l1.personal, l1.revision, l1.etapa, l1.usuario], ['BEP Torre Norte 2', 'Proyecto de ejemplo 1', 'Org1', 'Administrador BEP', 'Rev 2', 'Etapa Constr R2', 'Administrador BEP'], 'datos de la lista');
    ok(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(l1.fechaActualizada), 'fechaActualizada con formato');
    eq((await G('GetListaBEP?buscar=plantilla')).SDTListaBEP.length, 1, 'buscar en lista');
    const rep = await P('PostReporteBEP', { ProBepId: 1, RevProId: 1, RevBepIds: [1, 2] });
    eq([rep.NombreBep, rep.Cliente, rep.Proyecto, rep.Tipo, rep.Categoria, rep.Revision, rep.Etapas.length], ['BEP Torre Norte 2', 'Org1', 'Proyecto de ejemplo 1', 'Edificaciones', 'Multifamiliares', 'Rev 1', 2], 'reporte cabecera');
    const e1 = rep.Etapas[0];
    eq([e1.Numero, e1.Seccion, e1.Especialidades.length, e1.ContactosClave[0].Rol, e1.HitosConstruccion[0].FechaInicio, e1.EstrategiaReuniones[0].HoraMinuto, e1.FlujoTrabajo[0].Archivos.length, e1.LeyendaRaci.length],
      ['2', 'Seccion1', 7, 'Director BIM', '2026-01-10', '10:30', 2, 4], 'reporte etapa');
    ok(e1.Especialidades.find((e) => e.Nombre === 'Arquitectura').DetalleLOD[0].DetalleLOI[0].Parametro === 'Material', 'reporte LOI');

    // ---- usuarios ----
    const nu = { usuarioId: '', personalId: '', rol: 'usuario', dni: '12345678', nombre: 'Luis', apellido: 'Mora', telefono: '888', correo: 'luis@x.com', direccion: 'Av 1', password: 'Clave123*', estado: true };
    eq((await call('POST', '/principal/General/APIConfigBEP/PostUsuarioGuardar', nu)).json.mensaje, 'Registrado correctamente', 'usuario nuevo');
    eq((await call('POST', '/principal/General/APIConfigBEP/PostUsuarioGuardar', nu)).json.mensaje, 'Correo ya existe', 'correo duplicado');
    const us = (await C('GetListaUsuarios?buscar=lu&estado=true&id=US000')).data;
    eq([us.length, us[0].id, us[0].correo], [1, 'US001', 'luis@x.com'], 'lista usuarios');
    const ui = await C('GetUsuarioInfo?id=US001');
    eq([ui.nombre, ui.password, ui.rol], ['Luis', '', 'usuario'], 'info usuario (sin clave)');
    eq((await call('POST', '/principal/General/APIConfigBEP/PostUsuarioGuardar', { ...ui, nombre: 'Luis Alberto', password: '' })).json.mensaje, 'Editado correctamente', 'editar usuario sin cambiar clave');
    eq((await mk().call('POST', '/auth/login', { correo: 'luis@x.com', password: 'Clave123*' }, false)).status, 200, 'login con usuario nuevo');
    await call('POST', '/principal/General/APIConfigBEP/PostUsuarioGuardar', { ...ui, password: 'Otra456*' });
    eq((await mk().call('POST', '/auth/login', { correo: 'luis@x.com', password: 'Clave123*' }, false)).status, 401, 'clave anterior ya no sirve');
    eq((await mk().call('POST', '/auth/login', { correo: 'luis@x.com', password: 'Otra456*' }, false)).status, 200, 'clave nueva');

    // ---- front estatico ----
    const idx = await adm.raw('/principal/index.html'); ok(idx.status === 200 && /html/i.test(await idx.text()), 'sirve el front de la empresa');
    eq((await fetch(base + '/', { redirect: 'manual' })).status, 200, 'sirve el portal');
    const lgi = await call('GET', '/principal/login.html'); eq([lgi.status, lgi.location], [302, '/?empresa=principal'], 'login de empresa -> portal');
    eq((await call('GET', '/principal')).location, '/principal/', 'redirige a la barra final');
    eq((await call('GET', '/General/APIBEP/GetListaBEP')).status, 404, 'URL antigua sin empresa ya no existe');
    await require('./multiempresa')({ mk, call, adm, ok, eq, base, db, G, P });
    console.log(`\nOK: ${passed} comprobaciones`);
  } catch (e) {
    console.error('\nFALLO:', e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(1, 4).join('\n'));
    process.exitCode = 1;
  } finally {
    server.close();
    try { await db.close(); } catch (_) { /* nada */ }
    try { require('fs').rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true }); } catch (_) { /* nada */ }
  }
})();
