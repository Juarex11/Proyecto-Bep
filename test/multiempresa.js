'use strict';
/* Pruebas de multiempresa: superadmin, roles, aislamiento de datos entre empresas, cuentas compartidas */
const fs = require('fs');
const path = require('path');

module.exports = async ({ mk, adm, ok, eq, db, base }) => {
  const login = async (c, correo, password) => (await c.call('POST', '/auth/login', { correo, password }, false));
  const entrar = (c, slug) => c.call('POST', '/auth/entrar', { slug });
  const API = (slug) => ({
    G: (c, u) => c.call('GET', `/${slug}/General/APIBEP/${u}`).then((x) => x.json),
    P: (c, u, b) => c.call('POST', `/${slug}/General/APIBEP/${u}`, b).then((x) => x.json),
    C: (c, u) => c.call('GET', `/${slug}/General/APIConfigBEP/${u}`).then((x) => x.json),
    rest: (c, m, u, b) => c.call(m, `/${slug}/rest/General/${u}`, b),
  });
  const P1 = API('principal'); const A = API('acme');

  // ---------- el superadmin crea empresas ----------
  const sinSesion = mk();
  eq((await sinSesion.call('GET', '/portal/empresas', undefined, false)).status, 401, 'administrar empresas requiere sesion');
  const nueva = { nombre: 'Acme SAC', slug: 'acme', adminCorreo: 'boss@acme.com', adminNombre: 'Boss', adminApellido: 'Acme', adminPassword: 'Boss12345' };
  const c1 = await adm.call('POST', '/portal/empresas', nueva); if (c1.status !== 201) console.error('crear empresa:', c1.status, JSON.stringify(c1.json));
  eq([c1.status, c1.json.empresa.slug], [201, 'acme'], 'superadmin crea empresa');
  eq((await adm.call('POST', '/portal/empresas', nueva)).status, 409, 'direccion repetida');
  eq((await adm.call('POST', '/portal/empresas', { ...nueva, slug: 'Auth' })).status, 400, 'direccion reservada o invalida');
  eq((await adm.call('POST', '/portal/empresas', { ...nueva, slug: 'a b' })).status, 400, 'direccion con espacios');
  eq((await adm.call('POST', '/portal/empresas', { ...nueva, slug: 'otra', adminCorreo: 'nuevo@otra.com', adminPassword: 'corta' })).status, 400, 'clave inicial corta');
  const lista = (await adm.call('GET', '/portal/empresas')).json.empresas;
  eq(lista.map((e) => [e.slug, e.activa, e.usuarios, e.admins]), [['principal', true, 1, []], ['acme', true, 1, ['boss@acme.com']]], 'lista de empresas');

  // ---------- el administrador de la empresa nueva ----------
  const boss = mk();
  eq((await login(boss, 'boss@acme.com', 'Boss12345')).status, 200, 'login del admin de la empresa');
  const yo = (await boss.call('GET', '/auth/yo')).json;
  eq([yo.usuario.superadmin, yo.empresas.map((e) => [e.slug, e.rol])], [false, [['acme', 'admin']]], 'su unica empresa');
  eq((await boss.call('GET', '/portal/empresas')).status, 403, 'no es superadmin');
  eq((await boss.call('POST', '/portal/empresas', nueva)).status, 403, 'no puede crear empresas');
  eq((await entrar(boss, 'principal')).status, 403, 'no puede entrar a una empresa ajena');
  eq((await entrar(boss, 'acme')).status, 200, 'entra a su empresa');
  const tokAcme = JSON.parse(Buffer.from(decodeURIComponent(boss.header('/acme/').match(/bep_token=([^;]+)/)[1]).split('.')[1], 'base64url').toString());
  eq([tokAcme.slug, tokAcme.rol, tokAcme.VCompaniaId, tokAcme.Compania], ['acme', 'admin', 'CM002', 'Acme SAC'], 'token de la empresa');

  // ---------- datos propios: catalogos iniciales y nada de la otra empresa ----------
  eq((await A.G(boss, 'GetListaBEP?buscar=')).SDTListaBEP.length, 0, 'empresa nueva sin BEP');
  const infoA = await A.G(boss, 'GetInfoBEP?opcion=datos');
  eq([infoA.tipos.length, infoA.tipos[0].categorias.length, infoA.organizaciones.length], [2, 6, 0], 'catalogos propios copiados; sin organizaciones de la otra');
  eq((await A.G(boss, 'GetInfoBEP?opcion=proyectos&buscar=')).campanas.map((c) => c.campanaNombre), ['Proyecto general'], 'proyecto inicial propio (no los de ejemplo)');
  eq((await A.C(boss, 'GetListaTiposBEP?buscar=&estado=true&inicio=0')).data.map((x) => x.nombre), ['Edificaciones', 'Otros'], 'tipos propios');
  const usosA = await A.C(boss, 'GetListaUsosBim?buscar=&estado=true&inicio=0');
  eq(usosA.data.length, 10, 'usos BIM propios');
  const tiposA = (await A.C(boss, 'GetListaTiposBEP?buscar=&estado=true&inicio=0')).data.map((x) => x.id);
  eq((await A.C(boss, `GetListaEspecialidades?buscar=arq&tipoBep=${tiposA[0]}&estado=true&inicio=0`)).data[0].tipoBep, 'Edificaciones', 'catalogos enlazados correctamente (FK remapeadas)');
  eq((await A.C(boss, 'GetListaElementos?buscar=&tipoBep=0&espId=0&catId=0&estado=true&inicio=0')).data.map((x) => x.especialidad).filter((v, i, a) => a.indexOf(v) === i), ['Arquitectura', 'Estructuras'].slice(0, 1).concat(['Estructuras']), 'elementos enlazados a especialidades propias');

  // ids de catalogos propios distintos de los de la empresa principal
  const idsA = (await A.C(boss, 'GetListaTiposBEP?buscar=&estado=true&inicio=0')).data.map((x) => x.id);
  const idsP = (await P1.C(adm, 'GetListaTiposBEP?buscar=&estado=true&inicio=0')).data.map((x) => x.id);
  ok(idsA.every((i) => !idsP.includes(i)), 'cada empresa tiene sus propios registros de catalogo');

  // ---------- crear un BEP completo en la empresa nueva ----------
  const tipoA = idsA[0];
  const g = await A.P(boss, 'PostGuardarBEP', { ProBepId: 0, RevProId: 0, RevBepId: 0, ProBepNombre: 'BEP Acme Torre', RevProNombre: 'Rev 1', RevBepNombre: 'Etapa 1', RevProOrganizacionId: 0, RevProCampanaId: 'CP001', RevProCompaniaId: 'CM002', RevProClienteId: 'CL001',
    RevProTipoId: tipoA, RevProCategoriaId: 0, RevProUbicacion: 'Cusco', RevProPlantillaId: 0, RevProDescripcion: 'x', PersonalId: tokAcme.vPersonalId, UsuarioId: tokAcme.vidusuario });
  const [proA, rpA, rbA] = g.mensaje.split('#').map(Number);
  ok(proA > 0 && rbA > 0, 'BEP creado en Acme');
  await A.P(boss, 'PostRegistroDefaultBEP', { SDTRegistroDefaultBEP: { ProBepId: proA, RevProId: rpA, RevBepId: rbA, TipoBepId: tipoA, PlaBepId: 0, UsuarioId: tokAcme.vidusuario, BepNuevo: true, FormaRegistro: 'TipoBep', Fecha: '2026-11-04 10:00:00' } });
  eq((await A.G(boss, `GetListaAlcanceBEP?opcion=especialidadesBEP&RevBepId=${rbA}`)).SDTListaAlcanceBEP.length, 7, 'BEP de Acme con alcance por defecto (catalogos propios)');
  eq((await A.G(boss, `GetListaMatrizRACI?RevBepId=${rbA}`)).SDTListaMatrizRACI.length, 28, 'matriz RACI de Acme');
  eq((await A.P(boss, 'PostAgregarContactoBEP', { SDTAgregarContactoBEP: { ConBepId: 0, RevBepId: rbA, RolBepId: (await A.G(boss, 'GetListaContactosBEP?opcion=rolBEP&RevBepId=0')).SDTListaContactosBEP[0].id, OrgBepId: 0, OrgBepNombre: 'Acme Constructora', OrgBepTipo: 1, ConBepPersonalId: '', ConBepPermiso: 1, ConBepEstado: true, ConBepUsuarioId: tokAcme.vidusuario, nombres: 'Rosa', apellidos: 'Quispe', telefono: '1', correo: 'rosa@acme.com' } })).mensaje, 'Guardado', 'contacto en Acme');
  const lA = (await A.G(boss, 'GetListaBEP?buscar=')).SDTListaBEP;
  eq([lA.length, lA[0].nombre, lA[0].proyecto, lA[0].cliente], [1, 'BEP Acme Torre', 'Proyecto general', ''], 'lista de Acme');

  // ---------- aislamiento ----------
  const lP = (await P1.G(adm, 'GetListaBEP?buscar=')).SDTListaBEP;
  ok(lP.every((x) => x.nombre !== 'BEP Acme Torre'), 'la empresa principal no ve el BEP de Acme');
  eq((await P1.G(adm, 'GetInfoBEP?opcion=datos')).organizaciones.map((o) => o.nombre).includes('Acme Constructora'), false, 'ni sus organizaciones');
  eq((await P1.G(adm, 'GetInfoPersonal?opcion=listaCorreo&parametro=rosa')).SDTInfoPersonal.length, 0, 'ni su personal/contactos (correos)');
  eq((await A.G(boss, 'GetInfoPersonal?opcion=listaCorreo&parametro=ana')).SDTInfoPersonal.length, 0, 'Acme no ve el personal de la principal');
  // intentar leer/editar/borrar por id los registros de la otra empresa
  const obP = (await P1.rest(adm, 'POST', 'ObjetivoBEP/', { ObjBepId: 0, RevBepId: 1, ObjBepNombre: 'Objetivo privado principal', ObjBepDescripcion: '', ObjBepTipo: 'C', ObjBepFecha: '2026-11-04 10:00:00', ObjBepFechaAct: '2026-11-04 10:00:00', ObjBepEstado: true, ObjBepUsuarioId: 'USBEP01' })).json;
  eq((await A.rest(boss, 'GET', 'ObjetivoBEP/' + obP.ObjBepId)).status, 404, 'Acme no puede leer un registro de otra empresa por su id');
  eq((await A.rest(boss, 'PUT', 'ObjetivoBEP/' + obP.ObjBepId, { ...obP, ObjBepNombre: 'HACKEADO' })).status, 404, 'ni editarlo');
  await A.rest(boss, 'DELETE', 'ObjetivoBEP/' + obP.ObjBepId);
  eq((await P1.rest(adm, 'GET', 'ObjetivoBEP/' + obP.ObjBepId)).json.ObjBepNombre, 'Objetivo privado principal', 'ni borrarlo: sigue intacto');
  eq((await A.rest(boss, 'GET', 'ObjetivoBEP')).json.length, 0, 'listado REST de Acme sin datos ajenos');
  const gi = await A.G(boss, 'GetInformacionBEP?ProBepId=1&RevProId=1&RevBepId=1');
  eq(gi.ProBepNombre, '', 'Acme no puede abrir un BEP de otra empresa por su id');
  const repX = await A.P(boss, 'PostReporteBEP', { ProBepId: 1, RevProId: 1, RevBepIds: [1] });
  eq([repX.NombreBep, repX.Revision, repX.Etapas[0].Id, repX.Etapas[0].Especialidades.length, repX.Etapas[0].ContactosClave.length], ['', '', 0, 0, 0], 'ni su reporte (sale vacio)');
  eq((await A.G(boss, 'GetListaContactosBEP?opcion=contactoBEP&RevBepId=1')).SDTListaContactosBEP.length, 0, 'ni sus contactos');
  // no se puede forzar EmpresaId desde el cliente
  const forz = await A.rest(boss, 'POST', 'ObjetivoBEP/', { ObjBepId: 0, EmpresaId: 1, RevBepId: rbA, ObjBepNombre: 'Intento', ObjBepDescripcion: '', ObjBepTipo: 'C', ObjBepFecha: '2026-11-04 10:00:00', ObjBepFechaAct: '2026-11-04 10:00:00', ObjBepEstado: true, ObjBepUsuarioId: 'x' });
  eq(forz.status, 201, 'registro creado');
  eq((await db.query('SELECT EmpresaId FROM ObjetivoBEP WHERE ObjBepNombre = @n', { n: 'Intento' }))[0].EmpresaId, 2, 'EmpresaId lo fija el servidor, no el cliente');
  ok(!('EmpresaId' in forz.json), 'EmpresaId no se expone al front');
  // el token de una empresa no sirve en otra
  const cruzado = mk(); cruzado.jar.set('bep_token|/acme', decodeURIComponent(adm.header('/principal/').match(/bep_token=([^;]+)/)[1]));
  eq((await cruzado.call('GET', '/acme/General/APIBEP/GetListaBEP?buscar=')).status, 401, 'el token de la principal no abre Acme');
  const cruzado2 = mk(); cruzado2.jar.set('bep_token|/principal', decodeURIComponent(boss.header('/acme/').match(/bep_token=([^;]+)/)[1]));
  eq((await cruzado2.call('GET', '/principal/General/APIBEP/GetListaBEP?buscar=')).status, 401, 'ni el de Acme abre la principal');
  const plat = mk(); plat.jar.set('bep_token|/acme', decodeURIComponent(boss.header('/x').match(/bep_sesion=([^;]+)/)[1]));
  eq((await plat.call('GET', '/acme/General/APIBEP/GetListaBEP?buscar=')).status, 401, 'la sesion de plataforma no vale como sesion de empresa');
  // consulta no filtrable -> se rechaza
  const { bind } = require('../src/db/tenant');
  let rechazo = false; try { await bind(db, 1).query('SELECT * FROM Recurso r, Elemento e'); } catch (e) { rechazo = true; }
  ok(rechazo, 'una consulta que no se puede filtrar por empresa se rechaza');

  // ---------- archivos por empresa ----------
  const b64 = Buffer.from('secreto de acme').toString('base64');
  const recA = (await A.rest(boss, 'POST', 'Recurso/', { RecId: 0, RevBepId: rbA, RecNombre: 'Doc', RecDescripcion: '', RecUrl: '', RecTipo: 'archivo', RecPersonalId: tokAcme.vPersonalId, RecFecha: '2026-11-04 10:00:00', RecFechaAct: '2026-11-04 10:00:00', RecEstado: true, RecUsuarioId: tokAcme.vidusuario })).json;
  await A.P(boss, 'PostSubirArchivo', { SDTSubirArchivo: [{ id: 0, idRecurso: recA.RecId, idRevision: rbA, nombre: 'secreto.txt', tipo: 'text/plain', peso: '1', fileBlob: b64, usuarioId: tokAcme.vidusuario }], RecursoId: 0 });
  eq(await (await boss.raw('/acme/ArchivosBEP/secreto.txt')).text(), 'secreto de acme', 'Acme descarga su archivo');
  eq((await adm.raw('/principal/ArchivosBEP/secreto.txt')).status, 404, 'la principal no lo encuentra en su carpeta');
  ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, 'emp-2', 'secreto.txt')), 'cada empresa guarda en su carpeta');

  // ---------- roles dentro de la empresa ----------
  const nuevoU = { usuarioId: '', personalId: '', rol: 'usuario', dni: '11112222', nombre: 'Pedro', apellido: 'Gil', telefono: '1', correo: 'pedro@acme.com', direccion: '', password: 'Pedro12345', estado: true };
  const us = (c, b) => c.call('POST', '/acme/General/APIConfigBEP/PostUsuarioGuardar', b).then((x) => x.json.mensaje);
  eq(await us(boss, { ...nuevoU, password: 'corta' }), 'La contraseña debe tener al menos 8 caracteres', 'clave corta en usuario nuevo');
  eq(await us(boss, nuevoU), 'Registrado correctamente', 'el admin crea un usuario');
  eq(await us(boss, nuevoU), 'Correo ya existe', 'correo repetido en la empresa');
  const pedro = mk(); eq((await login(pedro, 'pedro@acme.com', 'Pedro12345')).status, 200, 'login del usuario');
  eq((await entrar(pedro, 'acme')).status, 200, 'el usuario entra a su empresa');
  eq((await entrar(pedro, 'principal')).status, 403, 'no a otras');
  eq((await fetch(base + '/auth/logo/acme', { method: 'POST', headers: { 'Content-Type': 'image/png', Cookie: pedro.header('/auth/logo/acme') }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') })).status, 403, 'un usuario comun no cambia el logo de la empresa');
  eq((await A.G(pedro, 'GetListaBEP?buscar=')).SDTListaBEP.length, 1, 'el usuario trabaja con los BEP');
  eq((await pedro.call('GET', '/acme/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).status, 403, 'usuario sin rol admin: no ve la lista de usuarios');
  eq((await pedro.call('POST', '/acme/General/APIConfigBEP/PostUsuarioGuardar', { ...nuevoU, correo: 'x@acme.com' })).status, 403, '403 al crear usuarios');
  eq((await pedro.call('GET', '/acme/General/APIConfigBEP/GetListaTiposBEP?buscar=&estado=true&inicio=0')).status, 403, 'ni la configuracion');
  eq((await A.rest(pedro, 'POST', 'TipoBEP/', { TipoBepId: 0, TipoBepNombre: 'Mio', TipoBepFecha: '2026-11-04 10:00:00', TipoBepEstado: true })).status, 403, 'ni modifica catalogos');
  eq((await A.C(pedro, 'GetSelectConfigBEP?opcion=tipoBEP')).SDTSelectConfigBEP.length, 2, 'pero si usa los selects de los formularios');
  eq((await A.rest(pedro, 'POST', 'ObjetivoBEP/', { ObjBepId: 0, RevBepId: rbA, ObjBepNombre: 'Obj de Pedro', ObjBepDescripcion: '', ObjBepTipo: 'C', ObjBepFecha: '2026-11-04 10:00:00', ObjBepFechaAct: '2026-11-04 10:00:00', ObjBepEstado: true, ObjBepUsuarioId: 'x' })).status, 201, 'y edita datos del BEP');
  // el admin lo asciende: el rol rige de inmediato
  const infoPedro = (await boss.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=' + (await boss.call('GET', '/acme/General/APIConfigBEP/GetListaUsuarios?buscar=pedro&estado=true&id=US000')).json.data[0].id)).json;
  eq(infoPedro.rol, 'usuario', 'info de usuario con rol');
  eq(await us(boss, { ...infoPedro, rol: 'admin', password: '' }), 'Editado correctamente', 'ascender a administrador');
  await new Promise((r) => setTimeout(r, 10));
  eq((await pedro.call('GET', '/acme/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).status, 200, 'rol nuevo rige (cache corta)');
  // ... y se protege a la empresa de quedarse sin administrador propio
  const lu = (await boss.call('GET', '/acme/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).json.data;
  const bossRow = lu.find((u) => u.correo === 'boss@acme.com');
  eq(await us(boss, { ...(await boss.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=' + bossRow.id)).json, rol: 'usuario' }), 'Editado correctamente', 'con otro admin activo puede bajarse el rol');
  await entrar(boss, 'acme');   // vuelve a emitir token; el rol vigente sale de la base
  eq((await boss.call('GET', '/acme/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).status, 403, 'rol vigente = el de la base, no el del token viejo');
  const pedroInfo2 = (await pedro.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=' + lu.find((u) => u.correo === 'pedro@acme.com').id)).json;
  eq(await us(pedro, { ...pedroInfo2, rol: 'usuario' }), 'La empresa debe tener al menos un administrador activo', 'no se puede dejar sin administrador');
  eq(await us(pedro, { ...(await pedro.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=' + bossRow.id)).json, rol: 'admin' }), 'Editado correctamente', 'restituye al admin original');

  // ---------- usuarios y cuentas compartidas entre empresas ----------
  eq((await us(boss, { ...nuevoU, correo: 'luis@x.com', nombre: '', apellido: '', password: '' })).startsWith('Registrado correctamente'), true, 'el admin de Acme agrega un correo que ya tiene cuenta (luis@x.com, de la principal)');
  const luis = mk(); eq((await login(luis, 'luis@x.com', 'Otra456*')).status, 200, 'conserva su clave');
  eq((await luis.call('GET', '/auth/yo')).json.empresas.map((e) => e.slug).sort(), ['acme', 'principal'], 've las dos empresas en el portal');
  eq((await entrar(luis, 'acme')).status, 200, 'entra a una de sus empresas');
  const rLock = await entrar(luis, 'principal');
  eq(rLock.status, 403, 'solo el superadmin cambia de empresa: la sesion queda fija a la primera');
  ok(/superadministrador/.test(rLock.json.mensaje), 'con un mensaje claro');
  eq((await luis.call('GET', '/auth/yo')).json.empresas.map((e) => e.slug), ['acme'], 'y su portal ya solo muestra esa empresa');
  eq((await luis.call('GET', '/acme/General/APIBEP/GetListaBEP?buscar=')).status, 200, 'trabaja normal en su empresa');
  const tokDe = (c, slug) => JSON.parse(Buffer.from(decodeURIComponent(c.header(`/${slug}/`).match(/bep_token=([^;]+)/)[1]).split('.')[1], 'base64url').toString());
  const tokL = (slug) => tokDe(luis, slug);
  eq(tokL('acme').rol, 'usuario', 'con su rol de esa empresa');
  eq([(await entrar(adm, 'principal')).status, (await entrar(adm, 'acme')).status], [200, 200], 'el superadmin si entra a ambas');
  eq((await adm.call('GET', '/principal/General/APIBEP/GetListaBEP?buscar=')).status, 200, 'dos empresas abiertas a la vez (cookies por ruta)');
  eq((await adm.call('GET', '/acme/General/APIBEP/GetListaBEP?buscar=')).status, 200, '... sin pisarse');
  eq([tokDe(adm, 'principal').slug, tokDe(adm, 'acme').slug], ['principal', 'acme'], 'cada empresa tiene su propia sesion');
  ok(tokDe(adm, 'principal').vPersonalId !== tokDe(adm, 'acme').vPersonalId, 'y su propia ficha de personal');
  const luisInfo = (await boss.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=' + tokL('acme').vidusuario)).json;
  ok((await us(boss, { ...luisInfo, password: 'Hackeo1234' })).includes('otras empresas'), 'el admin de Acme NO puede cambiar la clave de una cuenta compartida');
  ok((await us(boss, { ...luisInfo, correo: 'otro@acme.com' })).includes('otras empresas'), 'ni su correo');
  eq((await login(mk(), 'luis@x.com', 'Hackeo1234')).status, 401, 'la clave no cambio');
  eq(await us(boss, { ...luisInfo, estado: false, password: '' }), 'Editado correctamente', 'pero si puede desactivarlo en SU empresa');
  eq((await entrar(luis, 'acme')).status, 403, 'luis ya no entra a Acme');
  eq((await luis.call('GET', '/acme/General/APIBEP/GetListaBEP?buscar=')).status, 403, 'ni con su sesion anterior (membresia revocada)');
  const luis2 = mk(); await login(luis2, 'luis@x.com', 'Otra456*');
  eq((await entrar(luis2, 'principal')).status, 200, 'con una sesion nueva sigue entrando a la principal');
  // el admin de Acme no ve ni toca a usuarios de la principal
  eq((await boss.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=USBEP01')).json.usuarioId, '', 'no ve usuarios de otras empresas');
  eq(await us(boss, { usuarioId: 'USBEP01', correo: 'admin@bep.local', nombre: 'x', rol: 'usuario', estado: false, password: 'Hackeo1234' }), 'Usuario no encontrado', 'ni los modifica');

  // ---------- el superadmin se mueve entre empresas, pero NO figura como usuario en ellas ----------
  eq((await adm.call('GET', '/auth/yo')).json.empresas.map((e) => e.slug).sort(), ['acme', 'principal'], 'su portal le muestra todas las empresas activas');
  eq((await entrar(adm, 'acme')).status, 200, 'superadmin entra a Acme');
  eq((await A.G(adm, 'GetListaBEP?buscar=')).SDTListaBEP.length, 1, 'y trabaja con los datos de Acme');
  const luAcme = (await adm.call('GET', '/acme/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).json;
  eq(luAcme.data.map((u) => u.correo).sort(), ['boss@acme.com', 'pedro@acme.com'], 'con permisos de administrador, pero no figura en la lista de usuarios de Acme');
  eq((await adm.call('GET', '/acme/General/APIConfigBEP/GetUsuarioInfo?id=USBEP01')).json.usuarioId, '', 'ni se puede consultar como usuario');
  eq(await us(boss, { usuarioId: 'USBEP01', correo: 'admin@bep.local', nombre: 'x', rol: 'usuario', estado: false, password: 'Hackeo1234' }), 'Usuario no encontrado', 'el admin de la empresa no puede tocar al superadmin');
  eq((await adm.call('GET', '/acme/General/APIBEP/GetInfoPersonal?opcion=listaCorreo&parametro=admin@bep')).json.SDTInfoPersonal.length, 0, 'tampoco sale al buscar contactos por correo');
  eq((await adm.call('GET', '/acme/General/APIBEP/GetInfoPersonal?opcion=listaCorreo&parametro=boss@')).json.SDTInfoPersonal.length, 1, '(la busqueda por correo si funciona para los demas)');
  eq((await adm.call('POST', '/portal/empresas/2/admin', { correo: 'ceo@acme.com', nombre: 'Ceo', apellido: 'Acme', password: 'Ceo123456' })).json.mensaje, 'Administrador creado', 'superadmin agrega administrador');
  eq((await adm.call('POST', '/portal/empresas/2/admin', { correo: 'admin@bep.local' })).status, 400, 'no puede agregarse a si mismo como administrador visible');
  eq((await adm.call('GET', '/portal/empresas/2/usuarios')).json.usuarios.filter((u) => u.rol === 'admin').map((u) => u.correo).sort(), ['boss@acme.com', 'ceo@acme.com', 'pedro@acme.com'], 'usuarios de la empresa (vista del superadmin, sin el)');
  eq((await adm.call('GET', '/portal/empresas')).json.empresas.map((e) => [e.slug, e.usuarios]), [['principal', 1], ['acme', 3]], 'los conteos no lo incluyen');
  eq((await entrar(adm, 'principal')).status, 200, 'vuelve a su propia empresa');

  // ---------- proyectos (Campana) de la empresa ----------
  const adminA = mk(); await login(adminA, 'ceo@acme.com', 'Ceo123456'); await entrar(adminA, 'acme');
  const pc = (c, b) => c.call('POST', '/acme/General/APIConfigBEP/PostCampanaGuardar', b);
  eq((await pc(adminA, { campanaId: '', nombre: 'Hospital Cusco', fechaInicio: '2026-01-05', fechaFin: '2026-12-31', estado: true })).json.mensaje, 'Registrado correctamente', 'crear proyecto');
  eq((await pc(adminA, { campanaId: '', nombre: '', estado: true })).json.mensaje, 'Ingrese el nombre del proyecto', 'nombre obligatorio');
  const camps = (await adminA.call('GET', '/acme/General/APIConfigBEP/GetListaCampanas?buscar=&estado=true')).json.data;
  eq(camps.map((c) => [c.campanaId, c.companiaId, c.nombre]), [['CP001', 'CM002', 'Proyecto general'], ['CP002', 'CM002', 'Hospital Cusco']], 'proyectos de la empresa con ids propios');
  eq((await pc(adminA, { ...camps[1], nombre: 'Hospital Cusco II' })).json.mensaje, 'Editado correctamente', 'editar proyecto');
  eq((await pc(adminA, { ...camps[1], estado: false })).json.mensaje, 'Editado correctamente', 'desactivar proyecto');
  eq((await A.G(adminA, 'GetInfoBEP?opcion=proyectos&buscar=hospital')).campanas.length, 0, 'un proyecto inactivo no aparece al crear BEP');
  eq((await adm.call('GET', '/principal/General/APIConfigBEP/GetListaCampanas?buscar=&estado=true')).json.data.map((c) => c.nombre), ['Proyecto de ejemplo 1', 'Proyecto de ejemplo 2', 'Proyecto de ejemplo 3'], 'la principal conserva solo sus proyectos');
  eq((await pc(pedro, { campanaId: '', nombre: 'X', estado: true })).status, 200, 'Pedro ahora es admin (asciende) y puede');
  eq((await pc(luis, { campanaId: '', nombre: 'X', estado: true })).status, 403, 'quien no es admin no crea proyectos');

  // ---------- desactivar una empresa ----------
  eq((await adm.call('PUT', '/portal/empresas/2', { activa: false })).status, 200, 'superadmin desactiva Acme');
  eq((await A.G(adminA, 'GetListaBEP?buscar=')) === undefined, false, 'respuesta');
  eq((await adminA.call('GET', '/acme/General/APIBEP/GetListaBEP?buscar=')).status, 403, 'la empresa desactivada bloquea el acceso');
  eq((await entrar(adminA, 'acme')).status, 404, 'y no se puede entrar');
  eq((await adm.call('GET', '/auth/yo')).json.empresas.map((e) => e.slug), ['principal'], 'no aparece en el portal');
  eq((await adm.call('PUT', '/portal/empresas/2', { activa: true, nombre: 'Acme Peru', slug: 'acme-peru' })).status, 200, 'reactivar y cambiar de direccion');
  eq((await adm.call('PUT', '/portal/empresas/2', { slug: 'principal' })).status, 409, 'direccion ya usada');
  eq((await entrar(adm, 'acme-peru')).json.url, '/acme-peru/', 'entra por la nueva direccion');
  eq((await adm.call('GET', '/acme/General/APIBEP/GetListaBEP')).status, 404, 'la direccion anterior ya no existe');

  // ---------- foto del usuario y logo de la empresa ----------
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const subir = (c, url, buf, ct = 'image/png') => fetch(base + url, { method: 'POST', headers: { 'Content-Type': ct, ...(c.header(url) ? { Cookie: c.header(url) } : {}) }, body: buf }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
  const ver = (c, url) => c.raw(url);
  eq((await mk().call('GET', '/auth/foto', undefined, false)).status, 401, 'la foto requiere sesion');
  eq((await boss.call('GET', '/auth/foto')).status, 404, 'sin foto al inicio');
  eq((await subir(boss, '/auth/foto', PNG)).status, 200, 'sube su foto');
  const rf = await ver(boss, '/auth/foto'); eq([rf.status, rf.headers.get('content-type')], [200, 'image/png'], 'la foto se descarga');
  ok(((await boss.call('GET', '/auth/yo')).json.usuario.foto) > 0, '/auth/yo indica que tiene foto');
  eq((await subir(boss, '/auth/foto', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml')).status, 400, 'no se aceptan SVG');
  eq((await subir(boss, '/auth/foto', Buffer.from('esto no es una imagen, solo texto de relleno'), 'image/png')).status, 400, 'se valida el contenido, no solo el tipo declarado');
  eq((await subir(boss, '/auth/foto', Buffer.alloc(0), 'image/png')).status, 400, 'imagen vacia');
  eq((await subir(boss, '/auth/foto', Buffer.alloc(1100 * 1024, 1), 'image/png')).status, 413, 'imagen demasiado grande');
  eq((await pedro.call('GET', '/auth/foto')).status, 404, 'la foto es de cada usuario');
  eq((await boss.call('DELETE', '/auth/foto')).status, 200, 'quita su foto');
  eq((await boss.call('GET', '/auth/foto')).status, 404, 'ya no tiene foto');
  eq((await subir(boss, '/auth/logo/acme-peru', PNG)).status, 200, 'el administrador sube el logo');
  const rl = await ver(pedro, '/auth/logo/acme-peru'); eq(rl.status, 200, 'los miembros ven el logo');
  ok(((await boss.call('GET', '/auth/yo')).json.empresas.find((e) => e.slug === 'acme-peru').logo) > 0, '/auth/yo indica el logo de la empresa');
  eq((await boss.call('GET', '/auth/logo/principal')).status, 404, 'no ve el logo de una empresa ajena');
  eq((await subir(boss, '/auth/logo/principal', PNG)).status, 404, 'ni lo cambia');
  eq((await adm.call('GET', '/auth/logo/acme-peru')).status, 200, 'el superadmin ve el logo de cualquier empresa');
  eq((await boss.call('DELETE', '/auth/logo/acme-peru')).status, 200, 'el administrador quita el logo');
  eq((await boss.call('GET', '/auth/logo/acme-peru')).status, 404, 'sin logo');

  // ---------- quien puede cambiar la foto / el logo de quien ----------
  eq((await entrar(boss, 'acme-peru')).status, 200, 'el administrador vuelve a entrar a su empresa');
  const plano = { ...nuevoU, correo: 'plano@acme.com', nombre: 'Rosa', apellido: 'Paz', dni: '33334444', password: 'Plano12345' };
  eq((await boss.call('POST', '/acme-peru/General/APIConfigBEP/PostUsuarioGuardar', plano)).json.mensaje, 'Registrado correctamente', 'se crea un usuario comun');
  const luP = (await boss.call('GET', '/acme-peru/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).json.data;
  const idPlano = luP.find((u) => u.correo === 'plano@acme.com').id; const idBoss = luP.find((u) => u.correo === 'boss@acme.com').id;
  const rosa = mk(); await login(rosa, 'plano@acme.com', 'Plano12345'); await entrar(rosa, 'acme-peru');
  const idSuper = (await adm.call('GET', '/auth/yo')).json.usuario.id;
  eq((await subir(rosa, '/auth/foto/' + idPlano, PNG)).status, 200, 'el usuario cambia su propia foto');
  eq((await subir(rosa, '/auth/foto/' + idBoss, PNG)).status, 403, 'el usuario comun NO cambia la de otro');
  eq((await rosa.call('DELETE', '/auth/foto/' + idBoss)).status, 403, 'ni la quita');
  eq((await subir(boss, '/auth/foto/' + idPlano, PNG)).status, 200, 'su administrador si puede cambiarla');
  ok((await boss.call('GET', '/acme-peru/General/APIConfigBEP/GetListaUsuarios?buscar=&estado=true&id=US000')).json.data.find((u) => u.id === idPlano).foto > 0, 'la lista de usuarios indica quien tiene foto');
  eq((await boss.call('GET', '/auth/foto/' + idPlano)).status, 200, 'el administrador la ve');
  eq((await rosa.call('GET', '/auth/foto')).status, 200, 'y ella la ve como suya');
  eq((await boss.call('DELETE', '/auth/foto/' + idPlano)).status, 200, 'el administrador la quita');
  eq((await subir(adm, '/auth/foto/' + idPlano, PNG)).status, 200, 'el superadmin cambia la de cualquiera');
  eq((await subir(boss, '/auth/foto/' + idSuper, PNG)).status, 403, 'nadie cambia la del superadmin salvo el mismo');
  eq((await subir(boss, '/auth/foto/NOEXISTE', PNG)).status, 404, 'usuario inexistente');
  eq((await subir(luis2, '/auth/foto/' + idPlano, PNG)).status, 403, 'un usuario de otra empresa NO toca a usuarios ajenos');
  eq((await subir(rosa, '/auth/logo/acme-peru', PNG)).status, 403, 'el usuario comun no cambia el logo de su empresa');
  eq((await subir(boss, '/auth/logo/principal', PNG)).status, 404, 'el administrador no cambia el logo de otra empresa');
  eq((await subir(adm, '/auth/logo/principal', PNG)).status, 200, 'el superadmin cambia el logo de cualquiera (principal)');
  eq((await subir(adm, '/auth/logo/acme-peru', PNG)).status, 200, '... (acme)');
  eq((await adm.call('GET', '/portal/empresas')).json.empresas.every((e) => e.logo > 0), true, 'la lista de empresas indica los logos');
  eq((await adm.call('PUT', '/portal/empresas/2', { activa: false })).status, 200, 'se desactiva Acme');
  eq((await subir(adm, '/auth/logo/acme-peru', PNG)).status, 200, 'el superadmin cambia el logo aunque la empresa este desactivada');
  eq((await adm.call('PUT', '/portal/empresas/2', { activa: true })).status, 200, 'se reactiva');
  eq((await adm.call('DELETE', '/auth/logo/principal')).status, 200, 'el superadmin quita un logo');
  eq((await adm.call('DELETE', '/auth/logo/acme-peru')).status, 200, '... y otro');
  eq((await adm.call('DELETE', '/auth/foto/' + idPlano)).status, 200, 'limpia la foto de prueba');

  // ---------- cuenta ----------
  eq((await boss.call('POST', '/auth/cambiar-clave', { actual: 'mala', nueva: 'Nueva12345' })).status, 400, 'cambiar clave exige la actual');
  eq((await boss.call('POST', '/auth/cambiar-clave', { actual: 'Boss12345', nueva: 'corta' })).status, 400, 'clave nueva corta');
  eq((await boss.call('POST', '/auth/cambiar-clave', { actual: 'Boss12345', nueva: 'Nueva12345' })).status, 200, 'cambiar clave');
  eq([(await login(mk(), 'boss@acme.com', 'Boss12345')).status, (await login(mk(), 'boss@acme.com', 'Nueva12345')).status], [401, 200], 'la clave nueva rige');
  const cap = (h, n) => { const m = String(h || '').match(new RegExp(n + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : null; };
  await entrar(boss, 'acme-peru');
  const tokPlat = cap(boss.header('/x'), 'bep_sesion'); const tokEmp = cap(boss.header('/acme-peru/'), 'bep_token');
  ok(tokPlat && tokEmp, 'se capturaron los tokens antes de salir');
  const sal = await boss.call('GET', '/auth/salir'); eq([sal.status, sal.location], [302, '/'], 'cerrar sesion');
  eq((await boss.call('GET', '/auth/yo')).status, 401, 'sesion cerrada');
  eq((await boss.call('GET', '/acme-peru/General/APIBEP/GetListaBEP?buscar=')).status, 401, 'tambien la de la empresa');
  // aunque el navegador siguiera enviando las cookies viejas (repetidas, otra ruta...), la sesion cerrada ya no sirve
  const viejo = mk(); viejo.jar.set('bep_sesion|/', tokPlat); viejo.jar.set('bep_token|/acme-peru', tokEmp);
  eq((await viejo.call('GET', '/auth/yo')).status, 401, 'el token de plataforma anterior quedo anulado');
  eq((await viejo.call('GET', '/acme-peru/General/APIBEP/GetListaBEP?buscar=')).status, 401, 'y el de la empresa tambien');
  const out2 = mk(); await login(out2, 'ceo@acme.com', 'Ceo123456'); await entrar(out2, 'acme-peru');
  eq((await out2.call('POST', '/auth/logout', {})).status, 200, 'cerrar sesion por POST');
  eq((await out2.call('GET', '/auth/yo')).status, 401, 'queda sin sesion');
  // intentos de login limitados
  const brute = mk(); let ultimo = 0;
  for (let i = 0; i < 10; i++) ultimo = (await login(brute, 'nadie@acme.com', 'x' + i)).status;
  eq(ultimo, 429, 'demasiados intentos fallidos -> 429');
  eq((await login(mk(), 'boss@acme.com', 'Nueva12345')).status, 200, 'otro usuario no se ve afectado');
};
