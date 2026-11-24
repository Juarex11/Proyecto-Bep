#!/usr/bin/env node
'use strict';
/**
 * Crea un BEP de ejemplo completo usando la propia API (el servidor debe estar en marcha).
 *   node tools/seed-demo.js [URL] [correo] [clave]
 *   node tools/seed-demo.js [URL] [correo] [clave] [empresa]
 * Por defecto: http://localhost:3000  admin@bep.local  Admin123*  principal
 * (con IIS: node tools/seed-demo.js http://localhost/BEP)
 */
const base = (process.argv[2] || process.env.BEP_URL || 'http://localhost:3000').replace(/\/$/, '');
const correo = process.argv[3] || process.env.BEP_USER || 'admin@bep.local';
const password = process.argv[4] || process.env.BEP_PASS || 'Admin123*';
const empresa = process.argv[5] || process.env.BEP_EMPRESA || 'principal';
let cookie = '';
let E = '';
const now = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');

async function call(method, url, body) {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (r.status >= 400) throw new Error(`${method} ${url} -> ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}
const G = (u) => call('GET', `/${empresa}/General/APIBEP/` + u);
const P = (u, b) => call('POST', `/${empresa}/General/APIBEP/` + u, b);
const R = (t, b) => call('POST', `/${empresa}/rest/General/` + t + '/', b);

(async () => {
  const lg = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo, password }) });
  if (!lg.ok) throw new Error('Login fallido: ' + (await lg.text()));
  const jar = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  cookie = jar(lg);
  // entrar a la empresa (emite la sesion de esa empresa)
  const en = await fetch(base + '/auth/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ slug: empresa }) });
  if (!en.ok) throw new Error('No se pudo entrar a la empresa ' + empresa + ': ' + (await en.text()));
  cookie = jar(en);
  const tok = JSON.parse(Buffer.from(decodeURIComponent(cookie.match(/bep_token=([^;]+)/)[1]).split('.')[1], 'base64url').toString());
  const U = tok.vidusuario, PER = tok.vPersonalId, COMP = tok.VCompaniaId, f = now();
  const info = await G('GetInfoBEP?opcion=datos');
  const tipo = info.tipos[0]; const cat = tipo.categorias[0]; const org0 = info.organizaciones[0];
  const conProyecto = COMP === 'CM001';   // los proyectos de ejemplo solo existen en la empresa principal

  const g = await P('PostGuardarBEP', { ProBepId: 0, RevProId: 0, RevBepId: 0, ProBepNombre: 'BEP Edificio Multifamiliar Las Palmeras', RevProNombre: 'Revisión 1', RevBepNombre: 'Etapa de Diseño',
    RevProOrganizacionId: org0 ? org0.id : 0, RevProCampanaId: conProyecto ? 'CP001' : '', RevProCompaniaId: conProyecto ? 'CM001' : '', RevProClienteId: conProyecto ? 'CL001' : '', RevProTipoId: tipo.id, RevProCategoriaId: cat.id, RevProUbicacion: 'Lima, Perú', RevProPlantillaId: 0,
    RevProDescripcion: 'Edificio multifamiliar de 12 pisos con 2 sótanos. Modelo BIM coordinado entre arquitectura, estructuras e instalaciones.', PersonalId: PER, UsuarioId: U });
  const [proId, rpId, rbId] = g.mensaje.split('#').map(Number);
  await P('PostRegistroDefaultBEP', { SDTRegistroDefaultBEP: { ProBepId: proId, RevProId: rpId, RevBepId: rbId, TipoBepId: tipo.id, PlaBepId: 0, UsuarioId: U, BepNuevo: true, FormaRegistro: 'TipoBep', Fecha: f } });

  for (const [tipo, nombre, desc] of [['C', 'Entregar el proyecto en plazo', 'Cumplir el cronograma contractual con el modelo coordinado'], ['P', 'Reducir interferencias en obra', 'Detectar y resolver incompatibilidades antes de construir'],
    ['B', 'Modelo federado único', 'Mantener un modelo federado actualizado semanalmente']]) {
    await R('ObjetivoBEP', { ObjBepId: 0, RevBepId: rbId, ObjBepNombre: nombre, ObjBepDescripcion: desc, ObjBepTipo: tipo, ObjBepFecha: f, ObjBepFechaAct: f, ObjBepEstado: true, ObjBepUsuarioId: U });
  }
  const usos = (await G('GetListaObjetivosBEP?opcion=usosBim&RevBepId=0')).SDTListaObjetivosBEP.slice(0, 4);
  await P('PostAgregarUsoBimBEP', { SDTAgregarUsoBimBEP: usos.map((u) => ({ idUsoBim: u.id, nombreUsoBim: u.nombre, descripcionUsoBim: u.descripcion, idRevision: rbId, idUsuario: U })) });

  const lods = (await G('GetListaAlcanceBEP?opcion=leyendaLOD&RevBepId=0')).SDTListaAlcanceBEP;
  const esps = (await G(`GetListaAlcanceBEP?opcion=especialidadesBEP&RevBepId=${rbId}`)).SDTListaAlcanceBEP;
  for (const e of esps.filter((x) => ['Arquitectura', 'Estructuras'].includes(x.nombre))) {
    const det = (await G(`GetListaAlcanceLOD?EspBepId=${e.id}`)).SDTListaAlcanceLOD;
    det.forEach((d, i) => { d.idLOD = lods[2 + (i % 2)].id; d.observacion = i === 0 ? 'Según planos de licitación' : ''; d.idUsuario = U; });
    if (det.length) await P('PostGuardarDetalleLOD', { SDTListaAlcanceLOD: det });
  }

  const roles = (await G('GetListaContactosBEP?opcion=rolBEP&RevBepId=0')).SDTListaContactosBEP;
  let orgId = 0;
  for (const [i, c] of [['Carla', 'Vega', 'carla.vega@ejemplo.com', 'Constructora Andina'], ['Marco', 'Torres', 'marco.torres@ejemplo.com', 'Constructora Andina'], ['Elena', 'Rojas', 'elena.rojas@ejemplo.com', 'Estudio de Arquitectura Rojas']].entries()) {
    const existing = orgId && i < 2 ? orgId : 0;
    await P('PostAgregarContactoBEP', { SDTAgregarContactoBEP: { ConBepId: 0, RevBepId: rbId, RolBepId: roles[i].id, OrgBepId: existing, OrgBepNombre: c[3], OrgBepTipo: 1, ConBepPersonalId: '', ConBepPermiso: 1, ConBepEstado: true, ConBepUsuarioId: U,
      nombres: c[0], apellidos: c[1], telefono: '99900000' + i, correo: c[2] } });
    if (!orgId) orgId = (await G(`GetListaContactosBEP?opcion=contactoBEP&RevBepId=${rbId}`)).SDTListaContactosBEP[0].orgId;
  }
  const mat = (await G(`GetListaMatrizRACI?RevBepId=${rbId}`)).SDTListaMatrizRACI;
  const ley = (await G('GetListaMatriz?opcion=leyendaRACI&RevBepId=0')).SDTListaMatriz;
  const orgs = (await G(`GetListaMatriz?opcion=organizaciones&RevBepId=${rbId}`)).SDTListaMatriz;
  for (const m of mat.slice(0, 4)) {
    for (const [i, o] of orgs.entries()) {
      await P('PostGuardarDetalleRACI', { SDTGuardarDetalleRACI: [{ idMatrizRaci: m.idMatRaci, idLeyRaci: ley[(i + m.idMatRaci) % 4].id, idOrgBep: o.id, idUsuario: U }], MatRaciId: m.idMatRaci, OrgBepId: o.id });
    }
  }
  await R('HitoConstruccion', { HitConId: 0, RevBepId: rbId, HitConNombre: 'Excavación y cimentación', HitConFechaInicio: '2026-02-01', HitConFechaFin: '2026-04-30', HitConFecha: f, HitConFechaAct: f, HitConEstado: true, HitConUsuarioId: U });
  await R('HitoConstruccion', { HitConId: 0, RevBepId: rbId, HitConNombre: 'Estructura', HitConFechaInicio: '2026-05-01', HitConFechaFin: '2026-10-31', HitConFecha: f, HitConFechaAct: f, HitConEstado: true, HitConUsuarioId: U });
  await R('EntregableInformacion', { EntInfId: 0, RevBepId: rbId, OrgBepId: orgs[0].id, EntInfNombre: 'Modelo de arquitectura LOD 300', EntInfFechaInicio: '2026-01-15', EntInfFechaEntrega: '2026-03-15', EntInfFecha: f, EntInfFechaAct: f, EntInfEstado: true, EntInfUsuarioId: U });
  await R('Recurso', { RecId: 0, RevBepId: rbId, RecNombre: 'Protocolo de modelado', RecDescripcion: '', RecUrl: 'https://ejemplo.com/protocolo', RecTipo: 'url', RecPersonalId: PER, RecFecha: f, RecFechaAct: f, RecEstado: true, RecUsuarioId: U });
  await R('EntornoDatosBEP', { EcdBepId: 0, RevBepId: rbId, EcdBepNombre: 'Autodesk Construction Cloud', EcdBepUrl: 'https://acc.autodesk.com', EcdBepComentario: 'Entorno común de datos del proyecto', EcdBepFecha: f, EcdBepFechaAct: f, EcdBepEstado: true, EcdBepUsuarioId: U });
  await R('ReunionBEP', { ReuBepId: 0, RevBepId: rbId, ReuBepNombre: 'Coordinación BIM semanal', ReuBepDescripcion: 'Revisión de interferencias', ReuBepPlataforma: 'Microsoft Teams', ReuBepUbicacion: '', ReuBepResponsable: 'Coordinador BIM', ReuBepFrecuencia: 'Semanal', ReuBepDias: 'Lunes', ReuBepHora: '10', ReuBepMinuto: '00', ReuBepDuracion: 60, ReuBepInvolucrados: '[1,2]', ReuBepFecha: f, ReuBepFechaAct: f, ReuBepEstado: true, ReuBepUsuarioId: U });
  await R('CanalBEP', { CanBepId: 0, RevBepId: rbId, CanBepNombre: 'Correo del proyecto', CanBepProposito: 'Comunicaciones formales', CanBepFecha: f, CanBepFechaAct: f, CanBepEstado: true, CanBepUsuarioId: U });
  console.log(`BEP de ejemplo creado (ProBepId=${proId}, RevProId=${rpId}, RevBepId=${rbId}).`);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
