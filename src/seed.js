'use strict';
/** Datos iniciales (catalogos de BEP + usuario administrador + proyectos de ejemplo). */
const crypto = require('crypto');

const F = '2025-07-02T14:02:00';
const ADMIN_EMAIL = 'admin@bep.local';
const ADMIN_PASSWORD = 'Admin123*';
const ADMIN_SALT = 'bep-admin-salt-0001';
// Ids propios (no chocan con los EM0001/US001 que ya pueden existir en Supervisore)
const ADMIN_PERSONAL_ID = 'EMBEP01';
const ADMIN_USER_ID = 'USBEP01';

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), String(salt), 32).toString('hex');
}

const aud = (p, extra = {}) => ({ [`${p}Fecha`]: F, [`${p}FechaAct`]: F, [`${p}Estado`]: 1, ...extra });

const ACT = [
  ['Presentación de ofertas', [
    'Designar los responsables de la función de gestión de la información BIM',
    'Establecer el Plan de Ejecución BIM (BEP) Pre contrato del equipo de ejecución',
    'Evaluar las aptitudes y capacidades de los equipos de trabajo',
    'Establecer las aptitudes y capacidades del equipo de ejecución',
    'Establecer el Plan de Movilización del equipo de ejecución',
    'Establecer la Matriz de riesgos del equipo de ejecución',
    'Recopilar la información del equipo de ejecución para la presentación de oferta']],
  ['Contratación', [
    'Confirmar el Plan de Ejecución BIM (BEP) del equipo de ejecución',
    'Establecer la matriz de responsabilidad detallada del equipo de ejecución',
    'Establecer los requisitos de Intercambio de información del proveedor',
    'Establecer el/los Programa(s) de Desarrollo de Información de una Tarea (TIDP)',
    'Establecer el Programa General de Desarrollo de la información (MIDP)',
    'Completar los documentos para el perfeccionamiento del contrato del proveedor',
    'Completar los documentos para la contratación de los subcontratistas']],
  ['Movilización', [
    'Movilizar recursos', 'Movilizar la tecnología de información',
    'Poner a prueba los métodos y procedimientos de producción de información en la fase o etapa correspondiente']],
  ['Producción colaborativa de la información', [
    'Comprobar la disponibilidad de la información de referencia y los recursos compartidos',
    'Producir información', 'Realizar un control de calidad',
    'Revisar y aprobar el intercambio de información', 'Revisar el modelo de información']],
  ['Entrega del modelo de información', [
    'Presentar al proveedor el Modelo de Información para su autorización',
    'Revisar y autorizar el modelo de información',
    'Presentar a la entidad pública el Modelo de Información para su aceptación',
    'Revisar y aceptar el modelo de información']],
  ['Fin de la Fase de Ejecución', [
    'Archivar el Modelo de Información del Proyecto (PIM)',
    'Recoger las lecciones aprendidas para futuras inversiones']],
];

const USOS = ['Levantamiento de condiciones existentes', 'Análisis del entorno físico', 'Diseño de especialidades',
  'Elaboración de documentación', 'Visualización 3D', 'Compatibilización de la Información',
  'Analisis del programa arquitectónico', 'Estimación de cantidades y costos', 'Revisión del diseño',
  'Análisis Estructural', 'Análisis Lumínico', 'Análisis Energético de las instalaciones',
  'Análisis de constructibilidad', 'Análisis de otras ingenierías', 'Evaluación de sostenibilidad',
  'Supervisión del modelo de información', 'Detección de interferencias e incompatibilidades',
  'Planificación de la fase de ejecución', 'Diseño de sistemas constructivos para ejecución', 'Fabricación digital',
  'Planificación de obras preliminares y provisionales', 'Control de equipos para montajes',
  'Modelado de información As-Built', 'Gestión de activos', 'Programación de operaciones y mantenimiento',
  'Análisis de los sistemas de los activos', 'Gestión y seguimiento del espacio del activo',
  'Planificación y prevención de desastres'];

// Orden de insercion = orden de creacion de tablas (los ids son autonumericos)
const seed = {
  Empresa: [
    { EmpNombre: 'Empresa principal', EmpSlug: 'principal', EmpEstado: 1, EmpFecha: F, EmpFechaAct: F },
  ],
  TipoBEP: [
    { TipoBepNombre: 'Edificaciones', TipoBepFecha: F, TipoBepEstado: 1 },
    { TipoBepNombre: 'Otros', TipoBepFecha: F, TipoBepEstado: 1 },
  ],
  CategoriaBEP: [
    ...['Multifamiliares', 'Hospitales', 'Centros Comerciales', 'Vivienda Unifamiliar', 'Condominios', 'Oficinas']
      .map(n => ({ TipoBepId: 1, CatBepNombre: n, CatBepFecha: F, CatBepEstado: 1 })),
    { TipoBepId: 2, CatBepNombre: 'Ejem1', CatBepFecha: F, CatBepEstado: 1 },
    { TipoBepId: 2, CatBepNombre: 'Ejem2', CatBepFecha: F, CatBepEstado: 1 },
  ],
  OrganizacionBEP: ['Org1', 'Org2', 'Org3'].map(n => ({ OrgBepNombre: n, OrgBepTipo: 1, OrgBepFecha: F, OrgBepFechaAct: F, OrgBepEstado: 1, OrgBepUsuarioId: ADMIN_USER_ID })),
  Actividad: ACT.map(([n]) => ({ ActNombre: n, ActFecha: F, ActEstado: 1 })),
  SubActividad: ACT.flatMap(([, subs], i) => subs.map(n => ({ ActId: i + 1, SubActNombre: n, SubActDefault: 1, SubActFecha: F, SubActFechaAct: F, SubActEstado: 1 }))),
  UsoBIM: USOS.map(n => ({ UsoBimNombre: n, UsoBimDescripcion: '', UsoBimDefault: 1, UsoBimFecha: F, UsoBimEstado: 1 })),
  Especialidad: [
    ['Personalizado', 0, 0], ['Arquitectura', 1, 1], ['Estructuras', 1, 1], ['Mecánica', 1, 1], ['Eléctrica', 1, 1],
    ['Sanitaria', 1, 1], ['Gas', 1, 1], ['Tuberías Contra Incendio', 1, 1],
  ].map(([n, e, d]) => ({ TipoBepId: 1, EspNombre: n, EspDefault: d, EspFecha: F, EspEstado: e })),
  LeyendaLOD: [['LOD 0', 0, 0], ['LOD 100', 1, 1], ['LOD 200', 1, 1], ['LOD 300', 1, 1], ['LOD 350', 1, 1], ['LOD 400', 1, 1], ['LOD 500', 1, 1]]
    .map(([n, e, d]) => ({ LeyLodNombre: n, LeyLodDescripcion: '', LeyLodDefault: d, LeyLodFecha: F, LeyLodEstado: e })),
  CategoriaElemento: [['Muros', 2], ['Columnas', 2], ['Puertas', 2], ['Ventanas', 2], ['Mamparas', 3]]
    .map(([n, esp]) => ({ EspId: esp, CatEleNombre: n, CatEleFecha: F, CatEleEstado: 1 })),
  Elemento: [[1, 'Muros perimetrales'], [1, 'Interiores'], [2, 'Sección de columnas incluye el tarrajeo'], [3, 'Puertas principales'],
    [3, 'Interiores'], [3, 'Cortafuego'], [4, 'Ventanas fijas'], [4, 'Corredizas'], [4, 'Tragaluces'], [5, 'Mampara corrediza']]
    .map(([c, n]) => ({ CatEleId: c, EleNombre: n, EleObservacion: '', EleDefault: 1, EleFecha: F, EleEstado: 1 })),
  RolBEP: ['Director BIM', 'Gestor BIM', 'Coordinador BIM', 'Modelador BIM', 'Supervisor BIM']
    .map(n => ({ RolBepNombre: n, RolBepDescripcion: '', RolBepFecha: F, RolBepEstado: 1 })),
  LeyendaRACI: [['R', 'Responsable', '#00C417'], ['A', 'Aprobador', '#018FF1'], ['C', 'Consultado', '#F1B101'], ['I', 'Informado', '#C901F1']]
    .map(([a, n, bg]) => ({ LeyRaciAbreviacion: a, LeyRaciNombre: n, LeyRaciDescripcion: '', LeyRaciColor: '#000000', LeyRaciBackground: bg, LeyRaciFecha: F, LeyRaciEstado: 1 })),
  // --- Datos que en Supervisore ya existen. Solo se insertan si las tablas estan vacias ---
  Campana: [
    { CampanaId: 'CP001', CompaniaId: 'CM001', ClienteId: 'CL001', CampanaNombre: 'Proyecto de ejemplo 1', CampanaEstado: 'Activo', CampanaFechaInicio: '2026-01-05T00:00:00', CampanaFechaFin: '2026-12-18T00:00:00', CampanaFechaFinReal: null, CampanaBep: 1 },
    { CampanaId: 'CP002', CompaniaId: 'CM001', ClienteId: 'CL001', CampanaNombre: 'Proyecto de ejemplo 2', CampanaEstado: 'Activo', CampanaFechaInicio: '2026-03-02T00:00:00', CampanaFechaFin: '2027-02-26T00:00:00', CampanaFechaFinReal: null, CampanaBep: 1 },
    { CampanaId: 'CP003', CompaniaId: 'CM001', ClienteId: 'CL002', CampanaNombre: 'Proyecto de ejemplo 3', CampanaEstado: 'Activo', CampanaFechaInicio: '2026-06-01T00:00:00', CampanaFechaFin: '2027-05-28T00:00:00', CampanaFechaFinReal: null, CampanaBep: 1 },
  ],
  Personal: [
    { PersonalId: ADMIN_PERSONAL_ID, PersonalNombres: 'Administrador', PersonalApellidos: 'BEP', PersonaMail: ADMIN_EMAIL, PersonaTelefono: '', personaldni: '', PersonaDireccion: '', PersonalEstado: 1, AreaTrabajoId: null, PuestoId: null, DivisionPersonalId: null },
  ],
  Usuario: [
    { usuarioId: ADMIN_USER_ID, UsuarioNombre: ADMIN_EMAIL, UsuarioKey: ADMIN_SALT, UsuarioPasword: hashPassword(ADMIN_PASSWORD, ADMIN_SALT), PersonalId: ADMIN_PERSONAL_ID, RolId: 'RO00001', MesaId: null, DivisionId: null, UsuarioEstado: 1, UsuarioSuper: 1 },
  ],
};

module.exports = { seed, hashPassword, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USER_ID, ADMIN_PERSONAL_ID };
