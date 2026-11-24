'use strict';
/**
 * Esquema unico de la base de datos BEP.
 * De aqui salen: el script T-SQL (tools/gen-sql.js), las tablas SQLite de demo
 * y el CRUD generico de /rest/General/<Transaccion>.
 *
 * Tipos: id=DECIMAL(10) NOT NULL, id?=DECIMAL(10) NULL, sid?=NVARCHAR(13) NULL,
 *        s:N=NVARCHAR(N) NULL, max=NVARCHAR(MAX), bit, dt=DATETIME, i16=SMALLINT
 */
const AUDIT = (p, user = true) => [
  [`${p}Fecha`, 'dt'], [`${p}FechaAct`, 'dt'], [`${p}Estado`, 'bit'],
  ...(user ? [[`${p}UsuarioId`, 'sid?']] : []),
];

// Tablas propias de BEP (en orden de creacion, respetando dependencias)
const BEP_TABLES = [
  { name: 'Actividad', pk: 'ActId', cols: [['ActNombre', 's:100'], ['ActFecha', 'dt'], ['ActEstado', 'bit']] },
  { name: 'SubActividad', pk: 'SubActId', cols: [['ActId', 'id'], ['SubActNombre', 's:255'], ['SubActDefault', 'bit'], ['SubActFecha', 'dt'], ['SubActFechaAct', 'dt'], ['SubActEstado', 'bit']], fks: [['ActId', 'Actividad']] },
  { name: 'LeyendaRACI', pk: 'LeyRaciId', cols: [['LeyRaciAbreviacion', 's:3'], ['LeyRaciNombre', 's:40'], ['LeyRaciDescripcion', 's:255'], ['LeyRaciColor', 's:10'], ['LeyRaciBackground', 's:10'], ['LeyRaciFecha', 'dt'], ['LeyRaciEstado', 'bit']] },
  { name: 'UsoBIM', pk: 'UsoBimId', cols: [['UsoBimNombre', 's:100'], ['UsoBimDescripcion', 's:255'], ['UsoBimDefault', 'bit'], ['UsoBimFecha', 'dt'], ['UsoBimEstado', 'bit']] },
  { name: 'TipoBEP', pk: 'TipoBepId', cols: [['TipoBepNombre', 's:40'], ['TipoBepFecha', 'dt'], ['TipoBepEstado', 'bit']] },
  { name: 'Especialidad', pk: 'EspId', cols: [['TipoBepId', 'id'], ['EspNombre', 's:40'], ['EspDefault', 'bit'], ['EspFecha', 'dt'], ['EspEstado', 'bit']], fks: [['TipoBepId', 'TipoBEP']] },
  { name: 'LeyendaLOD', pk: 'LeyLodId', cols: [['LeyLodNombre', 's:10'], ['LeyLodDescripcion', 's:100'], ['LeyLodDefault', 'bit'], ['LeyLodFecha', 'dt'], ['LeyLodEstado', 'bit']] },
  { name: 'CategoriaBEP', pk: 'CatBepId', cols: [['TipoBepId', 'id?'], ['CatBepNombre', 's:40'], ['CatBepFecha', 'dt'], ['CatBepEstado', 'bit']], fks: [['TipoBepId', 'TipoBEP']] },
  { name: 'RolBEP', pk: 'RolBepId', cols: [['RolBepNombre', 's:40'], ['RolBepDescripcion', 's:100'], ['RolBepFecha', 'dt'], ['RolBepEstado', 'bit']] },
  { name: 'CategoriaElemento', pk: 'CatEleId', cols: [['EspId', 'id'], ['CatEleNombre', 's:40'], ['CatEleFecha', 'dt'], ['CatEleEstado', 'bit']], fks: [['EspId', 'Especialidad']] },
  { name: 'Elemento', pk: 'EleId', cols: [['CatEleId', 'id'], ['EleNombre', 's:40'], ['EleObservacion', 's:255'], ['EleDefault', 'bit'], ['EleFecha', 'dt'], ['EleEstado', 'bit']], fks: [['CatEleId', 'CategoriaElemento']] },
  { name: 'OrganizacionBEP', pk: 'OrgBepId', cols: [['OrgBepNombre', 's:100'], ['OrgBepTipo', 'i16'], ['OrgBepFecha', 'dt'], ['OrgBepFechaAct', 'dt'], ['OrgBepEstado', 'bit'], ['OrgBepUsuarioId', 'sid?']] },
  { name: 'ParametroLOI', pk: 'ParLoiId', cols: [['ParLoiNombre', 's:100'], ['ParLoiDescripcion', 's:255'], ...AUDIT('ParLoi')] },
  { name: 'PlantillaBEP', pk: 'PlaBepId', cols: [['TipoBepId', 'id'], ['PlaBepNombre', 's:40'], ...AUDIT('PlaBep')], fks: [['TipoBepId', 'TipoBEP']] },
  { name: 'DetallePlantilla', pk: 'DetPlaId', cols: [['PlaBepId', 'id'], ['DetPlaEspId', 'id?'], ['DetPlaCatEleId', 'id?'], ['DetPlaEleId', 'id?'], ...AUDIT('DetPla')], fks: [['PlaBepId', 'PlantillaBEP']] },
  { name: 'ProyectoBEP', pk: 'ProBepId', cols: [['ProBepNombre', 's:255'], ['ProBepDescripcion', 's:255'], ['ProBepUbicacion', 's:100'], ['ProBepPersonalId', 'sid?'], ['ProBepEstados', 's:40'], ['ProBepCompleto', 'bit'], ...AUDIT('ProBep')] },
  { name: 'RevisionProyecto', pk: 'RevProId', cols: [['ProBepId', 'id'], ['RevProIdPadre', 'id?'], ['RevProNombre', 's:100'], ['RevProDescripcion', 's:255'], ['RevProCampanaId', 'sid?'], ['RevProCompaniaId', 'sid?'], ['RevProClienteId', 'sid?'], ['RevProOrganizacionId', 'id?'], ['RevProTipoId', 'id?'], ['RevProCategoriaId', 'id?'], ['RevProUbicacion', 's:100'], ['RevProPlantillaId', 'id?'], ['RevProActual', 'bit'], ...AUDIT('RevPro')], fks: [['ProBepId', 'ProyectoBEP']] },
  { name: 'RevisionBEP', pk: 'RevBepId', cols: [['ProBepId', 'id'], ['RevBepProId', 'id?'], ['RevBepIdPadre', 'id?'], ['RevBepCampanaId', 'sid?'], ['RevBepCompaniaId', 'sid?'], ['RevBepClienteId', 'sid?'], ['RevBepTipoId', 'id?'], ['RevBepCategoriaId', 'id?'], ['RevBepOrganizacionId', 'id?'], ['RevBepPersonalId', 'sid?'], ['RevBepPlantillaId', 'id?'], ['RevBepNombre', 's:100'], ['RevBepDescripcion', 's:255'], ['RevBepUbicacion', 's:100'], ['RevBepActual', 'bit'], ['RevBepCompleto', 'bit'], ['RevBepEstados', 's:40'], ...AUDIT('RevBep')], fks: [['ProBepId', 'ProyectoBEP']] },
  { name: 'ContactoBEP', pk: 'ConBepId', cols: [['RevBepId', 'id'], ['RolBepId', 'id'], ['OrgBepId', 'id'], ['ConBepPersonalId', 'sid?'], ['ConBepPermiso', 'i16'], ...AUDIT('ConBep')], fks: [['RevBepId', 'RevisionBEP'], ['RolBepId', 'RolBEP'], ['OrgBepId', 'OrganizacionBEP']] },
  { name: 'ObjetivoBEP', pk: 'ObjBepId', cols: [['RevBepId', 'id'], ['ObjBepNombre', 's:255'], ['ObjBepDescripcion', 's:255'], ['ObjBepTipo', 's:40'], ...AUDIT('ObjBep')], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'UsoBIMBEP', pk: 'UsoBimBepId', cols: [['RevBepId', 'id'], ['UsoBimIdRef', 'id?'], ['UsoBimBepNombre', 's:100'], ['UsoBimBepDescripcion', 's:255'], ...AUDIT('UsoBimBep')], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'EspecialidadBEP', pk: 'EspBepId', cols: [['RevBepId', 'id'], ['EspId', 'id'], ...AUDIT('EspBep')], fks: [['RevBepId', 'RevisionBEP'], ['EspId', 'Especialidad']] },
  { name: 'DetalleLOD', pk: 'DetLodId', cols: [['EspBepId', 'id'], ['EleId', 'id'], ['LeyLodId', 'id?'], ['DetLodCheck', 'bit'], ['DetLodObservacion', 's:255'], ...AUDIT('DetLod')], fks: [['EspBepId', 'EspecialidadBEP'], ['EleId', 'Elemento'], ['LeyLodId', 'LeyendaLOD']] },
  { name: 'DetalleLOI', pk: 'DetLoiId', cols: [['ParLoiId', 'id'], ['DetLodId', 'id'], ['DetLoiRevBepId', 'id?'], ...AUDIT('DetLoi')], fks: [['ParLoiId', 'ParametroLOI'], ['DetLodId', 'DetalleLOD']] },
  { name: 'MatrizRACI', pk: 'MatRaciId', cols: [['RevBepId', 'id'], ['SubActId', 'id'], ['MatRaciActId', 'id?'], ['MatFecha', 'dt'], ['MatFechaAct', 'dt'], ['MatEstado', 'bit'], ['MatUsuarioId', 'sid?']], fks: [['RevBepId', 'RevisionBEP'], ['SubActId', 'SubActividad']] },
  { name: 'DetalleMatrizRACI', pk: 'DetMatrizId', cols: [['MatRaciId', 'id'], ['LeyRaciId', 'id'], ['OrgBepId', 'id'], ['DetMatrizFecha', 'dt'], ['DetMatrizFechaAct', 'dt'], ['DetMatrizEstado', 'bit'], ['DetMatrizUsuarioId', 'sid?']], fks: [['MatRaciId', 'MatrizRACI'], ['LeyRaciId', 'LeyendaRACI'], ['OrgBepId', 'OrganizacionBEP']] },
  { name: 'HitoConstruccion', pk: 'HitConId', cols: [['RevBepId', 'id'], ['HitConNombre', 's:255'], ['HitConFechaInicio', 'dt'], ['HitConFechaFin', 'dt'], ...AUDIT('HitCon', true).map(c => c)], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'EntregableInformacion', pk: 'EntInfId', cols: [['RevBepId', 'id'], ['OrgBepId', 'id'], ['EntInfNombre', 's:255'], ['EntInfFechaInicio', 'dt'], ['EntInfFechaEntrega', 'dt'], ['EntInfFecha', 'dt'], ['EntInfFechaAct', 'dt'], ['EntInfEstado', 'bit'], ['EntInfUsuarioId', 'sid?']], fks: [['RevBepId', 'RevisionBEP'], ['OrgBepId', 'OrganizacionBEP']] },
  { name: 'Recurso', pk: 'RecId', cols: [['RevBepId', 'id'], ['RecNombre', 's:255'], ['RecDescripcion', 's:255'], ['RecUrl', 's:1000'], ['RecTipo', 's:40'], ['RecPersonalId', 'sid?'], ...AUDIT('Rec')], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'ArchivoBEP', pk: 'ArcBepId', cols: [['RevBepId', 'id'], ['ArcBepRecursoId', 'id?'], ['ArcBepNombre', 's:100'], ['ArcBepTipo', 's:40'], ['ArcBepPeso', 's:10'], ['ArcBepRuta', 's:255'], ...AUDIT('ArcBep')], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'CanalBEP', pk: 'CanBepId', cols: [['RevBepId', 'id'], ['CanBepNombre', 's:100'], ['CanBepProposito', 's:255'], ...AUDIT('CanBep')], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'EntornoDatosBEP', pk: 'EcdBepId', cols: [['RevBepId', 'id'], ['EcdBepNombre', 's:100'], ['EcdBepUrl', 's:1000'], ['EcdBepComentario', 'max'], ...AUDIT('EcdBep')], fks: [['RevBepId', 'RevisionBEP']] },
  { name: 'ReunionBEP', pk: 'ReuBepId', cols: [['RevBepId', 'id'], ['ReuBepNombre', 's:255'], ['ReuBepDescripcion', 's:255'], ['ReuBepPlataforma', 's:100'], ['ReuBepUbicacion', 's:100'], ['ReuBepResponsable', 's:100'], ['ReuBepInvolucrados', 's:200'], ['ReuBepFrecuencia', 's:100'], ['ReuBepDias', 's:100'], ['ReuBepHora', 's:2'], ['ReuBepMinuto', 's:2'], ['ReuBepDuracion', 'i16'], ...AUDIT('ReuBep')], fks: [['RevBepId', 'RevisionBEP']] },
];

// Plataforma multiempresa (una sola base; cada fila de datos de BEP lleva EmpresaId)
const EMPRESA_TABLE = { name: 'Empresa', pk: 'EmpresaId', cols: [['EmpNombre', 's:150'], ['EmpSlug', 's:50'], ['EmpEstado', 'bit'], ['EmpFecha', 'dt'], ['EmpFechaAct', 'dt']], uniques: [['EmpSlug']] };
// Pertenencia usuario <-> empresa, con su rol (admin | usuario) y su ficha de Personal dentro de esa empresa
const USUARIO_EMPRESA_TABLE = { name: 'UsuarioEmpresa', pk: 'UsuEmpId', tenant: true, cols: [['usuarioId', 'sid'], ['PersonalId', 'sid?'], ['UsuEmpRol', 's:10'], ['UsuEmpEstado', 'bit'], ['UsuEmpFecha', 'dt']], uniques: [['usuarioId', 'EmpresaId']] };

// Tablas de Supervisore que BEP lee. Se crean SOLO si no existen en la base.
const SUPERVISORE_TABLES = [
  { name: 'Campana', tenant: true, pkCols: ['CampanaId', 'CompaniaId', 'ClienteId'], cols: [['CampanaId', 'sid'], ['CompaniaId', 'sid'], ['ClienteId', 'sid'], ['CampanaNombre', 's:150'], ['CampanaEstado', 's:20'], ['CampanaFechaInicio', 'dt'], ['CampanaFechaFin', 'dt'], ['CampanaFechaFinReal', 'dt'], ['CampanaBep', 'i16']] },
  { name: 'Personal', tenant: true, pk: 'PersonalId', pkType: 'sid', cols: [['PersonalNombres', 's:100'], ['PersonalApellidos', 's:100'], ['PersonaMail', 's:100'], ['PersonaTelefono', 's:30'], ['personaldni', 's:15'], ['PersonaDireccion', 's:150'], ['PersonalEstado', 'bit'], ['AreaTrabajoId', 'sid?'], ['PuestoId', 'sid?'], ['DivisionPersonalId', 'sid?']] },
  { name: 'Usuario', pk: 'usuarioId', pkType: 'sid', cols: [['UsuarioNombre', 's:100'], ['UsuarioKey', 's:100'], ['UsuarioPasword', 's:255'], ['PersonalId', 'sid'], ['RolId', 'sid?'], ['MesaId', 'sid?'], ['DivisionId', 'sid?'], ['UsuarioEstado', 'bit'], ['UsuarioSuper', 'bit']], fks: [['PersonalId', 'Personal']] },
];

function norm(t, supervisore) {
  const cols = [];
  if (t.pkCols) {
    t.cols.forEach(([n, ty]) => cols.push({ name: n, type: ty, pk: t.pkCols.includes(n), identity: false, nullable: !t.pkCols.includes(n) && !['id', 'sid'].includes(ty.replace('?','')) || ty.endsWith('?') }));
  } else {
    cols.push({ name: t.pk, type: t.pkType || 'id', pk: true, identity: !t.pkType, nullable: false });
    t.cols.forEach(([n, ty]) => cols.push({ name: n, type: ty, pk: false, identity: false, nullable: ty.endsWith('?') || (!['id', 'sid'].includes(ty)) }));
  }
  const fks = (t.fks || []).map(([c, r]) => ({ col: c, ref: r }));
  // Aislamiento por empresa: toda tabla "tenant" lleva EmpresaId (por defecto 1 = empresa principal)
  if (t.tenant) {
    cols.push({ name: 'EmpresaId', type: 'id', pk: false, identity: false, nullable: false, tenantCol: true });
    if (!supervisore) fks.push({ col: 'EmpresaId', ref: 'Empresa' });
  }
  return { name: t.name, pk: t.pk || t.pkCols, cols, fks, uniques: t.uniques || [], tenant: !!t.tenant, supervisore: !!supervisore };
}

const tables = [norm(EMPRESA_TABLE, false), ...SUPERVISORE_TABLES.map(t => norm(t, true)), norm(USUARIO_EMPRESA_TABLE, false), ...BEP_TABLES.map(t => norm({ ...t, tenant: true }, false))];
const byName = Object.fromEntries(tables.map(t => [t.name, t]));

function sqlType(type, dialect) {
  const base = type.replace('?', '');
  if (base === 'id') return dialect === 'mssql' ? 'DECIMAL(10)' : 'INTEGER';
  if (base === 'sid') return dialect === 'mssql' ? 'NVARCHAR(13)' : 'TEXT';
  if (base === 'bit') return dialect === 'mssql' ? 'BIT' : 'INTEGER';
  if (base === 'dt') return dialect === 'mssql' ? 'DATETIME' : 'TEXT';
  if (base === 'i16') return dialect === 'mssql' ? 'SMALLINT' : 'INTEGER';
  if (base === 'max') return dialect === 'mssql' ? 'NVARCHAR(MAX)' : 'TEXT';
  if (base.startsWith('s:')) return dialect === 'mssql' ? `NVARCHAR(${base.slice(2)})` : 'TEXT';
  throw new Error('tipo desconocido ' + type);
}

const tenantTables = tables.filter(t => t.tenant).map(t => t.name);

module.exports = { tables, byName, sqlType, BEP_TABLES, SUPERVISORE_TABLES, tenantTables };
