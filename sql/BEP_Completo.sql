/* =====================================================================
   BEP - Script unico de base de datos (SQL Server)
   Generado por: npm run gen:sql   (no editar a mano: edite src/schema.js o src/seed.js)

   Contiene:
     1) Creacion de la base de datos [BEP]   (opcional, ver abajo)
     2) Tablas de Supervisore que BEP lee: Campana, Personal, Usuario
        -> se crean SOLO si no existen (si ya tiene Supervisore, se respetan)
     3) Las 35 tablas propias de BEP, con llaves e indices
     4) Multiempresa: tablas Empresa y UsuarioEmpresa, y la columna EmpresaId en cada tabla de datos
        (si la base ya existia, se agrega con valor 1 = "Empresa principal": no se pierde nada)
     5) Datos iniciales: catalogos de BEP, proyectos de ejemplo y el usuario administrador (superadmin)
          usuario: admin@bep.local    clave: Admin123*   (cambiela al ingresar)

   Es re-ejecutable: no duplica tablas ni datos.
   Ejecutar con SSMS / Azure Data Studio / sqlcmd (usa separadores GO),
   o con:  npm run db:init
   ===================================================================== */
SET NOCOUNT ON;
GO

/* --- 1) Base de datos. Si ya tiene una base, comente estas 2 lineas y cambie el USE --- */
IF DB_ID(N'BEP') IS NULL CREATE DATABASE [BEP];
GO
USE [BEP];
GO

/* --- 2 y 3) Tablas --- */
-- Empresa
IF OBJECT_ID(N'dbo.Empresa', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Empresa] (
    [EmpresaId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [EmpNombre] NVARCHAR(150) NULL,
    [EmpSlug] NVARCHAR(50) NULL,
    [EmpEstado] BIT NULL,
    [EmpFecha] DATETIME NULL,
    [EmpFechaAct] DATETIME NULL,
    CONSTRAINT [PK_Empresa] PRIMARY KEY ([EmpresaId])
  );
END
GO
-- Campana  (Supervisore: se crea solo si no existe)
IF OBJECT_ID(N'dbo.Campana', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Campana] (
    [CampanaId] NVARCHAR(13) NOT NULL,
    [CompaniaId] NVARCHAR(13) NOT NULL,
    [ClienteId] NVARCHAR(13) NOT NULL,
    [CampanaNombre] NVARCHAR(150) NULL,
    [CampanaEstado] NVARCHAR(20) NULL,
    [CampanaFechaInicio] DATETIME NULL,
    [CampanaFechaFin] DATETIME NULL,
    [CampanaFechaFinReal] DATETIME NULL,
    [CampanaBep] SMALLINT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Campana_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_Campana] PRIMARY KEY ([CampanaId], [CompaniaId], [ClienteId])
  );
END
GO
-- Personal  (Supervisore: se crea solo si no existe)
IF OBJECT_ID(N'dbo.Personal', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Personal] (
    [PersonalId] NVARCHAR(13) NOT NULL,
    [PersonalNombres] NVARCHAR(100) NULL,
    [PersonalApellidos] NVARCHAR(100) NULL,
    [PersonaMail] NVARCHAR(100) NULL,
    [PersonaTelefono] NVARCHAR(30) NULL,
    [personaldni] NVARCHAR(15) NULL,
    [PersonaDireccion] NVARCHAR(150) NULL,
    [PersonalEstado] BIT NULL,
    [AreaTrabajoId] NVARCHAR(13) NULL,
    [PuestoId] NVARCHAR(13) NULL,
    [DivisionPersonalId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Personal_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_Personal] PRIMARY KEY ([PersonalId])
  );
END
GO
-- Usuario  (Supervisore: se crea solo si no existe)
IF OBJECT_ID(N'dbo.Usuario', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Usuario] (
    [usuarioId] NVARCHAR(13) NOT NULL,
    [UsuarioNombre] NVARCHAR(100) NULL,
    [UsuarioKey] NVARCHAR(100) NULL,
    [UsuarioPasword] NVARCHAR(255) NULL,
    [PersonalId] NVARCHAR(13) NOT NULL,
    [RolId] NVARCHAR(13) NULL,
    [MesaId] NVARCHAR(13) NULL,
    [DivisionId] NVARCHAR(13) NULL,
    [UsuarioEstado] BIT NULL,
    [UsuarioSuper] BIT NULL,
    CONSTRAINT [PK_Usuario] PRIMARY KEY ([usuarioId])
  );
END
GO
-- UsuarioEmpresa
IF OBJECT_ID(N'dbo.UsuarioEmpresa', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[UsuarioEmpresa] (
    [UsuEmpId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [usuarioId] NVARCHAR(13) NOT NULL,
    [PersonalId] NVARCHAR(13) NULL,
    [UsuEmpRol] NVARCHAR(10) NULL,
    [UsuEmpEstado] BIT NULL,
    [UsuEmpFecha] DATETIME NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_UsuarioEmpresa_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_UsuarioEmpresa] PRIMARY KEY ([UsuEmpId])
  );
END
GO
-- Actividad
IF OBJECT_ID(N'dbo.Actividad', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Actividad] (
    [ActId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ActNombre] NVARCHAR(100) NULL,
    [ActFecha] DATETIME NULL,
    [ActEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Actividad_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_Actividad] PRIMARY KEY ([ActId])
  );
END
GO
-- SubActividad
IF OBJECT_ID(N'dbo.SubActividad', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[SubActividad] (
    [SubActId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ActId] DECIMAL(10) NOT NULL,
    [SubActNombre] NVARCHAR(255) NULL,
    [SubActDefault] BIT NULL,
    [SubActFecha] DATETIME NULL,
    [SubActFechaAct] DATETIME NULL,
    [SubActEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_SubActividad_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_SubActividad] PRIMARY KEY ([SubActId])
  );
END
GO
-- LeyendaRACI
IF OBJECT_ID(N'dbo.LeyendaRACI', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[LeyendaRACI] (
    [LeyRaciId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [LeyRaciAbreviacion] NVARCHAR(3) NULL,
    [LeyRaciNombre] NVARCHAR(40) NULL,
    [LeyRaciDescripcion] NVARCHAR(255) NULL,
    [LeyRaciColor] NVARCHAR(10) NULL,
    [LeyRaciBackground] NVARCHAR(10) NULL,
    [LeyRaciFecha] DATETIME NULL,
    [LeyRaciEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_LeyendaRACI_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_LeyendaRACI] PRIMARY KEY ([LeyRaciId])
  );
END
GO
-- UsoBIM
IF OBJECT_ID(N'dbo.UsoBIM', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[UsoBIM] (
    [UsoBimId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [UsoBimNombre] NVARCHAR(100) NULL,
    [UsoBimDescripcion] NVARCHAR(255) NULL,
    [UsoBimDefault] BIT NULL,
    [UsoBimFecha] DATETIME NULL,
    [UsoBimEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_UsoBIM_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_UsoBIM] PRIMARY KEY ([UsoBimId])
  );
END
GO
-- TipoBEP
IF OBJECT_ID(N'dbo.TipoBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[TipoBEP] (
    [TipoBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [TipoBepNombre] NVARCHAR(40) NULL,
    [TipoBepFecha] DATETIME NULL,
    [TipoBepEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_TipoBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_TipoBEP] PRIMARY KEY ([TipoBepId])
  );
END
GO
-- Especialidad
IF OBJECT_ID(N'dbo.Especialidad', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Especialidad] (
    [EspId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [TipoBepId] DECIMAL(10) NOT NULL,
    [EspNombre] NVARCHAR(40) NULL,
    [EspDefault] BIT NULL,
    [EspFecha] DATETIME NULL,
    [EspEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Especialidad_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_Especialidad] PRIMARY KEY ([EspId])
  );
END
GO
-- LeyendaLOD
IF OBJECT_ID(N'dbo.LeyendaLOD', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[LeyendaLOD] (
    [LeyLodId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [LeyLodNombre] NVARCHAR(10) NULL,
    [LeyLodDescripcion] NVARCHAR(100) NULL,
    [LeyLodDefault] BIT NULL,
    [LeyLodFecha] DATETIME NULL,
    [LeyLodEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_LeyendaLOD_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_LeyendaLOD] PRIMARY KEY ([LeyLodId])
  );
END
GO
-- CategoriaBEP
IF OBJECT_ID(N'dbo.CategoriaBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[CategoriaBEP] (
    [CatBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [TipoBepId] DECIMAL(10) NULL,
    [CatBepNombre] NVARCHAR(40) NULL,
    [CatBepFecha] DATETIME NULL,
    [CatBepEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_CategoriaBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_CategoriaBEP] PRIMARY KEY ([CatBepId])
  );
END
GO
-- RolBEP
IF OBJECT_ID(N'dbo.RolBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[RolBEP] (
    [RolBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RolBepNombre] NVARCHAR(40) NULL,
    [RolBepDescripcion] NVARCHAR(100) NULL,
    [RolBepFecha] DATETIME NULL,
    [RolBepEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_RolBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_RolBEP] PRIMARY KEY ([RolBepId])
  );
END
GO
-- CategoriaElemento
IF OBJECT_ID(N'dbo.CategoriaElemento', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[CategoriaElemento] (
    [CatEleId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [EspId] DECIMAL(10) NOT NULL,
    [CatEleNombre] NVARCHAR(40) NULL,
    [CatEleFecha] DATETIME NULL,
    [CatEleEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_CategoriaElemento_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_CategoriaElemento] PRIMARY KEY ([CatEleId])
  );
END
GO
-- Elemento
IF OBJECT_ID(N'dbo.Elemento', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Elemento] (
    [EleId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [CatEleId] DECIMAL(10) NOT NULL,
    [EleNombre] NVARCHAR(40) NULL,
    [EleObservacion] NVARCHAR(255) NULL,
    [EleDefault] BIT NULL,
    [EleFecha] DATETIME NULL,
    [EleEstado] BIT NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Elemento_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_Elemento] PRIMARY KEY ([EleId])
  );
END
GO
-- OrganizacionBEP
IF OBJECT_ID(N'dbo.OrganizacionBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[OrganizacionBEP] (
    [OrgBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [OrgBepNombre] NVARCHAR(100) NULL,
    [OrgBepTipo] SMALLINT NULL,
    [OrgBepFecha] DATETIME NULL,
    [OrgBepFechaAct] DATETIME NULL,
    [OrgBepEstado] BIT NULL,
    [OrgBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_OrganizacionBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_OrganizacionBEP] PRIMARY KEY ([OrgBepId])
  );
END
GO
-- ParametroLOI
IF OBJECT_ID(N'dbo.ParametroLOI', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ParametroLOI] (
    [ParLoiId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ParLoiNombre] NVARCHAR(100) NULL,
    [ParLoiDescripcion] NVARCHAR(255) NULL,
    [ParLoiFecha] DATETIME NULL,
    [ParLoiFechaAct] DATETIME NULL,
    [ParLoiEstado] BIT NULL,
    [ParLoiUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ParametroLOI_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_ParametroLOI] PRIMARY KEY ([ParLoiId])
  );
END
GO
-- PlantillaBEP
IF OBJECT_ID(N'dbo.PlantillaBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[PlantillaBEP] (
    [PlaBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [TipoBepId] DECIMAL(10) NOT NULL,
    [PlaBepNombre] NVARCHAR(40) NULL,
    [PlaBepFecha] DATETIME NULL,
    [PlaBepFechaAct] DATETIME NULL,
    [PlaBepEstado] BIT NULL,
    [PlaBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_PlantillaBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_PlantillaBEP] PRIMARY KEY ([PlaBepId])
  );
END
GO
-- DetallePlantilla
IF OBJECT_ID(N'dbo.DetallePlantilla', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[DetallePlantilla] (
    [DetPlaId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [PlaBepId] DECIMAL(10) NOT NULL,
    [DetPlaEspId] DECIMAL(10) NULL,
    [DetPlaCatEleId] DECIMAL(10) NULL,
    [DetPlaEleId] DECIMAL(10) NULL,
    [DetPlaFecha] DATETIME NULL,
    [DetPlaFechaAct] DATETIME NULL,
    [DetPlaEstado] BIT NULL,
    [DetPlaUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetallePlantilla_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_DetallePlantilla] PRIMARY KEY ([DetPlaId])
  );
END
GO
-- ProyectoBEP
IF OBJECT_ID(N'dbo.ProyectoBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ProyectoBEP] (
    [ProBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ProBepNombre] NVARCHAR(255) NULL,
    [ProBepDescripcion] NVARCHAR(255) NULL,
    [ProBepUbicacion] NVARCHAR(100) NULL,
    [ProBepPersonalId] NVARCHAR(13) NULL,
    [ProBepEstados] NVARCHAR(40) NULL,
    [ProBepCompleto] BIT NULL,
    [ProBepFecha] DATETIME NULL,
    [ProBepFechaAct] DATETIME NULL,
    [ProBepEstado] BIT NULL,
    [ProBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ProyectoBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_ProyectoBEP] PRIMARY KEY ([ProBepId])
  );
END
GO
-- RevisionProyecto
IF OBJECT_ID(N'dbo.RevisionProyecto', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[RevisionProyecto] (
    [RevProId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ProBepId] DECIMAL(10) NOT NULL,
    [RevProIdPadre] DECIMAL(10) NULL,
    [RevProNombre] NVARCHAR(100) NULL,
    [RevProDescripcion] NVARCHAR(255) NULL,
    [RevProCampanaId] NVARCHAR(13) NULL,
    [RevProCompaniaId] NVARCHAR(13) NULL,
    [RevProClienteId] NVARCHAR(13) NULL,
    [RevProOrganizacionId] DECIMAL(10) NULL,
    [RevProTipoId] DECIMAL(10) NULL,
    [RevProCategoriaId] DECIMAL(10) NULL,
    [RevProUbicacion] NVARCHAR(100) NULL,
    [RevProPlantillaId] DECIMAL(10) NULL,
    [RevProActual] BIT NULL,
    [RevProFecha] DATETIME NULL,
    [RevProFechaAct] DATETIME NULL,
    [RevProEstado] BIT NULL,
    [RevProUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_RevisionProyecto_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_RevisionProyecto] PRIMARY KEY ([RevProId])
  );
END
GO
-- RevisionBEP
IF OBJECT_ID(N'dbo.RevisionBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[RevisionBEP] (
    [RevBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ProBepId] DECIMAL(10) NOT NULL,
    [RevBepProId] DECIMAL(10) NULL,
    [RevBepIdPadre] DECIMAL(10) NULL,
    [RevBepCampanaId] NVARCHAR(13) NULL,
    [RevBepCompaniaId] NVARCHAR(13) NULL,
    [RevBepClienteId] NVARCHAR(13) NULL,
    [RevBepTipoId] DECIMAL(10) NULL,
    [RevBepCategoriaId] DECIMAL(10) NULL,
    [RevBepOrganizacionId] DECIMAL(10) NULL,
    [RevBepPersonalId] NVARCHAR(13) NULL,
    [RevBepPlantillaId] DECIMAL(10) NULL,
    [RevBepNombre] NVARCHAR(100) NULL,
    [RevBepDescripcion] NVARCHAR(255) NULL,
    [RevBepUbicacion] NVARCHAR(100) NULL,
    [RevBepActual] BIT NULL,
    [RevBepCompleto] BIT NULL,
    [RevBepEstados] NVARCHAR(40) NULL,
    [RevBepFecha] DATETIME NULL,
    [RevBepFechaAct] DATETIME NULL,
    [RevBepEstado] BIT NULL,
    [RevBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_RevisionBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_RevisionBEP] PRIMARY KEY ([RevBepId])
  );
END
GO
-- ContactoBEP
IF OBJECT_ID(N'dbo.ContactoBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ContactoBEP] (
    [ConBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [RolBepId] DECIMAL(10) NOT NULL,
    [OrgBepId] DECIMAL(10) NOT NULL,
    [ConBepPersonalId] NVARCHAR(13) NULL,
    [ConBepPermiso] SMALLINT NULL,
    [ConBepFecha] DATETIME NULL,
    [ConBepFechaAct] DATETIME NULL,
    [ConBepEstado] BIT NULL,
    [ConBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ContactoBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_ContactoBEP] PRIMARY KEY ([ConBepId])
  );
END
GO
-- ObjetivoBEP
IF OBJECT_ID(N'dbo.ObjetivoBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ObjetivoBEP] (
    [ObjBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [ObjBepNombre] NVARCHAR(255) NULL,
    [ObjBepDescripcion] NVARCHAR(255) NULL,
    [ObjBepTipo] NVARCHAR(40) NULL,
    [ObjBepFecha] DATETIME NULL,
    [ObjBepFechaAct] DATETIME NULL,
    [ObjBepEstado] BIT NULL,
    [ObjBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ObjetivoBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_ObjetivoBEP] PRIMARY KEY ([ObjBepId])
  );
END
GO
-- UsoBIMBEP
IF OBJECT_ID(N'dbo.UsoBIMBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[UsoBIMBEP] (
    [UsoBimBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [UsoBimIdRef] DECIMAL(10) NULL,
    [UsoBimBepNombre] NVARCHAR(100) NULL,
    [UsoBimBepDescripcion] NVARCHAR(255) NULL,
    [UsoBimBepFecha] DATETIME NULL,
    [UsoBimBepFechaAct] DATETIME NULL,
    [UsoBimBepEstado] BIT NULL,
    [UsoBimBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_UsoBIMBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_UsoBIMBEP] PRIMARY KEY ([UsoBimBepId])
  );
END
GO
-- EspecialidadBEP
IF OBJECT_ID(N'dbo.EspecialidadBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EspecialidadBEP] (
    [EspBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [EspId] DECIMAL(10) NOT NULL,
    [EspBepFecha] DATETIME NULL,
    [EspBepFechaAct] DATETIME NULL,
    [EspBepEstado] BIT NULL,
    [EspBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_EspecialidadBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_EspecialidadBEP] PRIMARY KEY ([EspBepId])
  );
END
GO
-- DetalleLOD
IF OBJECT_ID(N'dbo.DetalleLOD', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[DetalleLOD] (
    [DetLodId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [EspBepId] DECIMAL(10) NOT NULL,
    [EleId] DECIMAL(10) NOT NULL,
    [LeyLodId] DECIMAL(10) NULL,
    [DetLodCheck] BIT NULL,
    [DetLodObservacion] NVARCHAR(255) NULL,
    [DetLodFecha] DATETIME NULL,
    [DetLodFechaAct] DATETIME NULL,
    [DetLodEstado] BIT NULL,
    [DetLodUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetalleLOD_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_DetalleLOD] PRIMARY KEY ([DetLodId])
  );
END
GO
-- DetalleLOI
IF OBJECT_ID(N'dbo.DetalleLOI', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[DetalleLOI] (
    [DetLoiId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [ParLoiId] DECIMAL(10) NOT NULL,
    [DetLodId] DECIMAL(10) NOT NULL,
    [DetLoiRevBepId] DECIMAL(10) NULL,
    [DetLoiFecha] DATETIME NULL,
    [DetLoiFechaAct] DATETIME NULL,
    [DetLoiEstado] BIT NULL,
    [DetLoiUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetalleLOI_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_DetalleLOI] PRIMARY KEY ([DetLoiId])
  );
END
GO
-- MatrizRACI
IF OBJECT_ID(N'dbo.MatrizRACI', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[MatrizRACI] (
    [MatRaciId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [SubActId] DECIMAL(10) NOT NULL,
    [MatRaciActId] DECIMAL(10) NULL,
    [MatFecha] DATETIME NULL,
    [MatFechaAct] DATETIME NULL,
    [MatEstado] BIT NULL,
    [MatUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_MatrizRACI_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_MatrizRACI] PRIMARY KEY ([MatRaciId])
  );
END
GO
-- DetalleMatrizRACI
IF OBJECT_ID(N'dbo.DetalleMatrizRACI', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[DetalleMatrizRACI] (
    [DetMatrizId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [MatRaciId] DECIMAL(10) NOT NULL,
    [LeyRaciId] DECIMAL(10) NOT NULL,
    [OrgBepId] DECIMAL(10) NOT NULL,
    [DetMatrizFecha] DATETIME NULL,
    [DetMatrizFechaAct] DATETIME NULL,
    [DetMatrizEstado] BIT NULL,
    [DetMatrizUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetalleMatrizRACI_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_DetalleMatrizRACI] PRIMARY KEY ([DetMatrizId])
  );
END
GO
-- HitoConstruccion
IF OBJECT_ID(N'dbo.HitoConstruccion', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[HitoConstruccion] (
    [HitConId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [HitConNombre] NVARCHAR(255) NULL,
    [HitConFechaInicio] DATETIME NULL,
    [HitConFechaFin] DATETIME NULL,
    [HitConFecha] DATETIME NULL,
    [HitConFechaAct] DATETIME NULL,
    [HitConEstado] BIT NULL,
    [HitConUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_HitoConstruccion_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_HitoConstruccion] PRIMARY KEY ([HitConId])
  );
END
GO
-- EntregableInformacion
IF OBJECT_ID(N'dbo.EntregableInformacion', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EntregableInformacion] (
    [EntInfId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [OrgBepId] DECIMAL(10) NOT NULL,
    [EntInfNombre] NVARCHAR(255) NULL,
    [EntInfFechaInicio] DATETIME NULL,
    [EntInfFechaEntrega] DATETIME NULL,
    [EntInfFecha] DATETIME NULL,
    [EntInfFechaAct] DATETIME NULL,
    [EntInfEstado] BIT NULL,
    [EntInfUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_EntregableInformacion_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_EntregableInformacion] PRIMARY KEY ([EntInfId])
  );
END
GO
-- Recurso
IF OBJECT_ID(N'dbo.Recurso', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Recurso] (
    [RecId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [RecNombre] NVARCHAR(255) NULL,
    [RecDescripcion] NVARCHAR(255) NULL,
    [RecUrl] NVARCHAR(1000) NULL,
    [RecTipo] NVARCHAR(40) NULL,
    [RecPersonalId] NVARCHAR(13) NULL,
    [RecFecha] DATETIME NULL,
    [RecFechaAct] DATETIME NULL,
    [RecEstado] BIT NULL,
    [RecUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Recurso_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_Recurso] PRIMARY KEY ([RecId])
  );
END
GO
-- ArchivoBEP
IF OBJECT_ID(N'dbo.ArchivoBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ArchivoBEP] (
    [ArcBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [ArcBepRecursoId] DECIMAL(10) NULL,
    [ArcBepNombre] NVARCHAR(100) NULL,
    [ArcBepTipo] NVARCHAR(40) NULL,
    [ArcBepPeso] NVARCHAR(10) NULL,
    [ArcBepRuta] NVARCHAR(255) NULL,
    [ArcBepFecha] DATETIME NULL,
    [ArcBepFechaAct] DATETIME NULL,
    [ArcBepEstado] BIT NULL,
    [ArcBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ArchivoBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_ArchivoBEP] PRIMARY KEY ([ArcBepId])
  );
END
GO
-- CanalBEP
IF OBJECT_ID(N'dbo.CanalBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[CanalBEP] (
    [CanBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [CanBepNombre] NVARCHAR(100) NULL,
    [CanBepProposito] NVARCHAR(255) NULL,
    [CanBepFecha] DATETIME NULL,
    [CanBepFechaAct] DATETIME NULL,
    [CanBepEstado] BIT NULL,
    [CanBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_CanalBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_CanalBEP] PRIMARY KEY ([CanBepId])
  );
END
GO
-- EntornoDatosBEP
IF OBJECT_ID(N'dbo.EntornoDatosBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EntornoDatosBEP] (
    [EcdBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [EcdBepNombre] NVARCHAR(100) NULL,
    [EcdBepUrl] NVARCHAR(1000) NULL,
    [EcdBepComentario] NVARCHAR(MAX) NULL,
    [EcdBepFecha] DATETIME NULL,
    [EcdBepFechaAct] DATETIME NULL,
    [EcdBepEstado] BIT NULL,
    [EcdBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_EntornoDatosBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_EntornoDatosBEP] PRIMARY KEY ([EcdBepId])
  );
END
GO
-- ReunionBEP
IF OBJECT_ID(N'dbo.ReunionBEP', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ReunionBEP] (
    [ReuBepId] DECIMAL(10) IDENTITY(1,1) NOT NULL,
    [RevBepId] DECIMAL(10) NOT NULL,
    [ReuBepNombre] NVARCHAR(255) NULL,
    [ReuBepDescripcion] NVARCHAR(255) NULL,
    [ReuBepPlataforma] NVARCHAR(100) NULL,
    [ReuBepUbicacion] NVARCHAR(100) NULL,
    [ReuBepResponsable] NVARCHAR(100) NULL,
    [ReuBepInvolucrados] NVARCHAR(200) NULL,
    [ReuBepFrecuencia] NVARCHAR(100) NULL,
    [ReuBepDias] NVARCHAR(100) NULL,
    [ReuBepHora] NVARCHAR(2) NULL,
    [ReuBepMinuto] NVARCHAR(2) NULL,
    [ReuBepDuracion] SMALLINT NULL,
    [ReuBepFecha] DATETIME NULL,
    [ReuBepFechaAct] DATETIME NULL,
    [ReuBepEstado] BIT NULL,
    [ReuBepUsuarioId] NVARCHAR(13) NULL,
    [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ReunionBEP_EmpresaId] DEFAULT 1,
    CONSTRAINT [PK_ReunionBEP] PRIMARY KEY ([ReuBepId])
  );
END
GO

/* --- Multiempresa: columnas nuevas en bases ya existentes (EmpresaId = 1 por defecto) --- */
IF COL_LENGTH(N'dbo.Campana', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[Campana] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Campana_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.Personal', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[Personal] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Personal_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.UsuarioEmpresa', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[UsuarioEmpresa] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_UsuarioEmpresa_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.Actividad', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[Actividad] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Actividad_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.SubActividad', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[SubActividad] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_SubActividad_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.LeyendaRACI', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[LeyendaRACI] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_LeyendaRACI_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.UsoBIM', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[UsoBIM] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_UsoBIM_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.TipoBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[TipoBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_TipoBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.Especialidad', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[Especialidad] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Especialidad_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.LeyendaLOD', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[LeyendaLOD] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_LeyendaLOD_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.CategoriaBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[CategoriaBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_CategoriaBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.RolBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[RolBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_RolBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.CategoriaElemento', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[CategoriaElemento] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_CategoriaElemento_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.Elemento', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[Elemento] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Elemento_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.OrganizacionBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[OrganizacionBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_OrganizacionBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.ParametroLOI', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[ParametroLOI] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ParametroLOI_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.PlantillaBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[PlantillaBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_PlantillaBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.DetallePlantilla', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[DetallePlantilla] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetallePlantilla_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.ProyectoBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[ProyectoBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ProyectoBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.RevisionProyecto', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[RevisionProyecto] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_RevisionProyecto_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.RevisionBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[RevisionBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_RevisionBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.ContactoBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[ContactoBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ContactoBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.ObjetivoBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[ObjetivoBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ObjetivoBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.UsoBIMBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[UsoBIMBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_UsoBIMBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.EspecialidadBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[EspecialidadBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_EspecialidadBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.DetalleLOD', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[DetalleLOD] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetalleLOD_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.DetalleLOI', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[DetalleLOI] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetalleLOI_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.MatrizRACI', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[MatrizRACI] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_MatrizRACI_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.DetalleMatrizRACI', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[DetalleMatrizRACI] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_DetalleMatrizRACI_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.HitoConstruccion', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[HitoConstruccion] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_HitoConstruccion_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.EntregableInformacion', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[EntregableInformacion] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_EntregableInformacion_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.Recurso', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[Recurso] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_Recurso_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.ArchivoBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[ArchivoBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ArchivoBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.CanalBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[CanalBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_CanalBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.EntornoDatosBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[EntornoDatosBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_EntornoDatosBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.ReunionBEP', N'EmpresaId') IS NULL
  ALTER TABLE [dbo].[ReunionBEP] ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT [DF_ReunionBEP_EmpresaId] DEFAULT 1;
IF COL_LENGTH(N'dbo.Usuario', N'UsuarioSuper') IS NULL
  ALTER TABLE [dbo].[Usuario] ADD [UsuarioSuper] BIT NULL;
GO

/* --- Empresa principal (id 1): a ella pasan los datos que ya existian --- */
IF NOT EXISTS (SELECT 1 FROM [dbo].[Empresa] WHERE [EmpresaId] = 1)
BEGIN
  SET IDENTITY_INSERT [dbo].[Empresa] ON;
  INSERT INTO [dbo].[Empresa] ([EmpresaId], [EmpNombre], [EmpSlug], [EmpEstado], [EmpFecha], [EmpFechaAct]) VALUES (1, N'Empresa principal', N'principal', 1, GETDATE(), GETDATE());
  SET IDENTITY_INSERT [dbo].[Empresa] OFF;
END
GO

/* --- Llaves foraneas, indices y unicidad --- */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_UsuarioEmpresa_EmpresaId')
  ALTER TABLE [dbo].[UsuarioEmpresa] ADD CONSTRAINT [FK_UsuarioEmpresa_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsuarioEmpresa_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsuarioEmpresa'))
  CREATE NONCLUSTERED INDEX [IX_UsuarioEmpresa_EmpresaId] ON [dbo].[UsuarioEmpresa] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Actividad_EmpresaId')
  ALTER TABLE [dbo].[Actividad] ADD CONSTRAINT [FK_Actividad_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Actividad_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Actividad'))
  CREATE NONCLUSTERED INDEX [IX_Actividad_EmpresaId] ON [dbo].[Actividad] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SubActividad_ActId')
  ALTER TABLE [dbo].[SubActividad] ADD CONSTRAINT [FK_SubActividad_ActId] FOREIGN KEY ([ActId]) REFERENCES [dbo].[Actividad]([ActId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SubActividad_ActId' AND object_id = OBJECT_ID(N'dbo.SubActividad'))
  CREATE NONCLUSTERED INDEX [IX_SubActividad_ActId] ON [dbo].[SubActividad] ([ActId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SubActividad_EmpresaId')
  ALTER TABLE [dbo].[SubActividad] ADD CONSTRAINT [FK_SubActividad_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SubActividad_EmpresaId' AND object_id = OBJECT_ID(N'dbo.SubActividad'))
  CREATE NONCLUSTERED INDEX [IX_SubActividad_EmpresaId] ON [dbo].[SubActividad] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_LeyendaRACI_EmpresaId')
  ALTER TABLE [dbo].[LeyendaRACI] ADD CONSTRAINT [FK_LeyendaRACI_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LeyendaRACI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.LeyendaRACI'))
  CREATE NONCLUSTERED INDEX [IX_LeyendaRACI_EmpresaId] ON [dbo].[LeyendaRACI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_UsoBIM_EmpresaId')
  ALTER TABLE [dbo].[UsoBIM] ADD CONSTRAINT [FK_UsoBIM_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsoBIM_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsoBIM'))
  CREATE NONCLUSTERED INDEX [IX_UsoBIM_EmpresaId] ON [dbo].[UsoBIM] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TipoBEP_EmpresaId')
  ALTER TABLE [dbo].[TipoBEP] ADD CONSTRAINT [FK_TipoBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TipoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.TipoBEP'))
  CREATE NONCLUSTERED INDEX [IX_TipoBEP_EmpresaId] ON [dbo].[TipoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Especialidad_TipoBepId')
  ALTER TABLE [dbo].[Especialidad] ADD CONSTRAINT [FK_Especialidad_TipoBepId] FOREIGN KEY ([TipoBepId]) REFERENCES [dbo].[TipoBEP]([TipoBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Especialidad_TipoBepId' AND object_id = OBJECT_ID(N'dbo.Especialidad'))
  CREATE NONCLUSTERED INDEX [IX_Especialidad_TipoBepId] ON [dbo].[Especialidad] ([TipoBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Especialidad_EmpresaId')
  ALTER TABLE [dbo].[Especialidad] ADD CONSTRAINT [FK_Especialidad_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Especialidad_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Especialidad'))
  CREATE NONCLUSTERED INDEX [IX_Especialidad_EmpresaId] ON [dbo].[Especialidad] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_LeyendaLOD_EmpresaId')
  ALTER TABLE [dbo].[LeyendaLOD] ADD CONSTRAINT [FK_LeyendaLOD_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LeyendaLOD_EmpresaId' AND object_id = OBJECT_ID(N'dbo.LeyendaLOD'))
  CREATE NONCLUSTERED INDEX [IX_LeyendaLOD_EmpresaId] ON [dbo].[LeyendaLOD] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CategoriaBEP_TipoBepId')
  ALTER TABLE [dbo].[CategoriaBEP] ADD CONSTRAINT [FK_CategoriaBEP_TipoBepId] FOREIGN KEY ([TipoBepId]) REFERENCES [dbo].[TipoBEP]([TipoBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CategoriaBEP_TipoBepId' AND object_id = OBJECT_ID(N'dbo.CategoriaBEP'))
  CREATE NONCLUSTERED INDEX [IX_CategoriaBEP_TipoBepId] ON [dbo].[CategoriaBEP] ([TipoBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CategoriaBEP_EmpresaId')
  ALTER TABLE [dbo].[CategoriaBEP] ADD CONSTRAINT [FK_CategoriaBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CategoriaBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.CategoriaBEP'))
  CREATE NONCLUSTERED INDEX [IX_CategoriaBEP_EmpresaId] ON [dbo].[CategoriaBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RolBEP_EmpresaId')
  ALTER TABLE [dbo].[RolBEP] ADD CONSTRAINT [FK_RolBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RolBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.RolBEP'))
  CREATE NONCLUSTERED INDEX [IX_RolBEP_EmpresaId] ON [dbo].[RolBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CategoriaElemento_EspId')
  ALTER TABLE [dbo].[CategoriaElemento] ADD CONSTRAINT [FK_CategoriaElemento_EspId] FOREIGN KEY ([EspId]) REFERENCES [dbo].[Especialidad]([EspId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CategoriaElemento_EspId' AND object_id = OBJECT_ID(N'dbo.CategoriaElemento'))
  CREATE NONCLUSTERED INDEX [IX_CategoriaElemento_EspId] ON [dbo].[CategoriaElemento] ([EspId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CategoriaElemento_EmpresaId')
  ALTER TABLE [dbo].[CategoriaElemento] ADD CONSTRAINT [FK_CategoriaElemento_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CategoriaElemento_EmpresaId' AND object_id = OBJECT_ID(N'dbo.CategoriaElemento'))
  CREATE NONCLUSTERED INDEX [IX_CategoriaElemento_EmpresaId] ON [dbo].[CategoriaElemento] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Elemento_CatEleId')
  ALTER TABLE [dbo].[Elemento] ADD CONSTRAINT [FK_Elemento_CatEleId] FOREIGN KEY ([CatEleId]) REFERENCES [dbo].[CategoriaElemento]([CatEleId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Elemento_CatEleId' AND object_id = OBJECT_ID(N'dbo.Elemento'))
  CREATE NONCLUSTERED INDEX [IX_Elemento_CatEleId] ON [dbo].[Elemento] ([CatEleId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Elemento_EmpresaId')
  ALTER TABLE [dbo].[Elemento] ADD CONSTRAINT [FK_Elemento_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Elemento_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Elemento'))
  CREATE NONCLUSTERED INDEX [IX_Elemento_EmpresaId] ON [dbo].[Elemento] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OrganizacionBEP_EmpresaId')
  ALTER TABLE [dbo].[OrganizacionBEP] ADD CONSTRAINT [FK_OrganizacionBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrganizacionBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.OrganizacionBEP'))
  CREATE NONCLUSTERED INDEX [IX_OrganizacionBEP_EmpresaId] ON [dbo].[OrganizacionBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ParametroLOI_EmpresaId')
  ALTER TABLE [dbo].[ParametroLOI] ADD CONSTRAINT [FK_ParametroLOI_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ParametroLOI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ParametroLOI'))
  CREATE NONCLUSTERED INDEX [IX_ParametroLOI_EmpresaId] ON [dbo].[ParametroLOI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PlantillaBEP_TipoBepId')
  ALTER TABLE [dbo].[PlantillaBEP] ADD CONSTRAINT [FK_PlantillaBEP_TipoBepId] FOREIGN KEY ([TipoBepId]) REFERENCES [dbo].[TipoBEP]([TipoBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PlantillaBEP_TipoBepId' AND object_id = OBJECT_ID(N'dbo.PlantillaBEP'))
  CREATE NONCLUSTERED INDEX [IX_PlantillaBEP_TipoBepId] ON [dbo].[PlantillaBEP] ([TipoBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PlantillaBEP_EmpresaId')
  ALTER TABLE [dbo].[PlantillaBEP] ADD CONSTRAINT [FK_PlantillaBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PlantillaBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.PlantillaBEP'))
  CREATE NONCLUSTERED INDEX [IX_PlantillaBEP_EmpresaId] ON [dbo].[PlantillaBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetallePlantilla_PlaBepId')
  ALTER TABLE [dbo].[DetallePlantilla] ADD CONSTRAINT [FK_DetallePlantilla_PlaBepId] FOREIGN KEY ([PlaBepId]) REFERENCES [dbo].[PlantillaBEP]([PlaBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetallePlantilla_PlaBepId' AND object_id = OBJECT_ID(N'dbo.DetallePlantilla'))
  CREATE NONCLUSTERED INDEX [IX_DetallePlantilla_PlaBepId] ON [dbo].[DetallePlantilla] ([PlaBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetallePlantilla_EmpresaId')
  ALTER TABLE [dbo].[DetallePlantilla] ADD CONSTRAINT [FK_DetallePlantilla_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetallePlantilla_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetallePlantilla'))
  CREATE NONCLUSTERED INDEX [IX_DetallePlantilla_EmpresaId] ON [dbo].[DetallePlantilla] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ProyectoBEP_EmpresaId')
  ALTER TABLE [dbo].[ProyectoBEP] ADD CONSTRAINT [FK_ProyectoBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProyectoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ProyectoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ProyectoBEP_EmpresaId] ON [dbo].[ProyectoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RevisionProyecto_ProBepId')
  ALTER TABLE [dbo].[RevisionProyecto] ADD CONSTRAINT [FK_RevisionProyecto_ProBepId] FOREIGN KEY ([ProBepId]) REFERENCES [dbo].[ProyectoBEP]([ProBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionProyecto_ProBepId' AND object_id = OBJECT_ID(N'dbo.RevisionProyecto'))
  CREATE NONCLUSTERED INDEX [IX_RevisionProyecto_ProBepId] ON [dbo].[RevisionProyecto] ([ProBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RevisionProyecto_EmpresaId')
  ALTER TABLE [dbo].[RevisionProyecto] ADD CONSTRAINT [FK_RevisionProyecto_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionProyecto_EmpresaId' AND object_id = OBJECT_ID(N'dbo.RevisionProyecto'))
  CREATE NONCLUSTERED INDEX [IX_RevisionProyecto_EmpresaId] ON [dbo].[RevisionProyecto] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RevisionBEP_ProBepId')
  ALTER TABLE [dbo].[RevisionBEP] ADD CONSTRAINT [FK_RevisionBEP_ProBepId] FOREIGN KEY ([ProBepId]) REFERENCES [dbo].[ProyectoBEP]([ProBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionBEP_ProBepId' AND object_id = OBJECT_ID(N'dbo.RevisionBEP'))
  CREATE NONCLUSTERED INDEX [IX_RevisionBEP_ProBepId] ON [dbo].[RevisionBEP] ([ProBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_RevisionBEP_EmpresaId')
  ALTER TABLE [dbo].[RevisionBEP] ADD CONSTRAINT [FK_RevisionBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.RevisionBEP'))
  CREATE NONCLUSTERED INDEX [IX_RevisionBEP_EmpresaId] ON [dbo].[RevisionBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ContactoBEP_RevBepId')
  ALTER TABLE [dbo].[ContactoBEP] ADD CONSTRAINT [FK_ContactoBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ContactoBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.ContactoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ContactoBEP_RevBepId] ON [dbo].[ContactoBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ContactoBEP_RolBepId')
  ALTER TABLE [dbo].[ContactoBEP] ADD CONSTRAINT [FK_ContactoBEP_RolBepId] FOREIGN KEY ([RolBepId]) REFERENCES [dbo].[RolBEP]([RolBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ContactoBEP_RolBepId' AND object_id = OBJECT_ID(N'dbo.ContactoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ContactoBEP_RolBepId] ON [dbo].[ContactoBEP] ([RolBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ContactoBEP_OrgBepId')
  ALTER TABLE [dbo].[ContactoBEP] ADD CONSTRAINT [FK_ContactoBEP_OrgBepId] FOREIGN KEY ([OrgBepId]) REFERENCES [dbo].[OrganizacionBEP]([OrgBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ContactoBEP_OrgBepId' AND object_id = OBJECT_ID(N'dbo.ContactoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ContactoBEP_OrgBepId] ON [dbo].[ContactoBEP] ([OrgBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ContactoBEP_EmpresaId')
  ALTER TABLE [dbo].[ContactoBEP] ADD CONSTRAINT [FK_ContactoBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ContactoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ContactoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ContactoBEP_EmpresaId] ON [dbo].[ContactoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ObjetivoBEP_RevBepId')
  ALTER TABLE [dbo].[ObjetivoBEP] ADD CONSTRAINT [FK_ObjetivoBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ObjetivoBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.ObjetivoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ObjetivoBEP_RevBepId] ON [dbo].[ObjetivoBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ObjetivoBEP_EmpresaId')
  ALTER TABLE [dbo].[ObjetivoBEP] ADD CONSTRAINT [FK_ObjetivoBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ObjetivoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ObjetivoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ObjetivoBEP_EmpresaId] ON [dbo].[ObjetivoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_UsoBIMBEP_RevBepId')
  ALTER TABLE [dbo].[UsoBIMBEP] ADD CONSTRAINT [FK_UsoBIMBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsoBIMBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.UsoBIMBEP'))
  CREATE NONCLUSTERED INDEX [IX_UsoBIMBEP_RevBepId] ON [dbo].[UsoBIMBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_UsoBIMBEP_EmpresaId')
  ALTER TABLE [dbo].[UsoBIMBEP] ADD CONSTRAINT [FK_UsoBIMBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsoBIMBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsoBIMBEP'))
  CREATE NONCLUSTERED INDEX [IX_UsoBIMBEP_EmpresaId] ON [dbo].[UsoBIMBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EspecialidadBEP_RevBepId')
  ALTER TABLE [dbo].[EspecialidadBEP] ADD CONSTRAINT [FK_EspecialidadBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EspecialidadBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.EspecialidadBEP'))
  CREATE NONCLUSTERED INDEX [IX_EspecialidadBEP_RevBepId] ON [dbo].[EspecialidadBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EspecialidadBEP_EspId')
  ALTER TABLE [dbo].[EspecialidadBEP] ADD CONSTRAINT [FK_EspecialidadBEP_EspId] FOREIGN KEY ([EspId]) REFERENCES [dbo].[Especialidad]([EspId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EspecialidadBEP_EspId' AND object_id = OBJECT_ID(N'dbo.EspecialidadBEP'))
  CREATE NONCLUSTERED INDEX [IX_EspecialidadBEP_EspId] ON [dbo].[EspecialidadBEP] ([EspId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EspecialidadBEP_EmpresaId')
  ALTER TABLE [dbo].[EspecialidadBEP] ADD CONSTRAINT [FK_EspecialidadBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EspecialidadBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.EspecialidadBEP'))
  CREATE NONCLUSTERED INDEX [IX_EspecialidadBEP_EmpresaId] ON [dbo].[EspecialidadBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOD_EspBepId')
  ALTER TABLE [dbo].[DetalleLOD] ADD CONSTRAINT [FK_DetalleLOD_EspBepId] FOREIGN KEY ([EspBepId]) REFERENCES [dbo].[EspecialidadBEP]([EspBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOD_EspBepId' AND object_id = OBJECT_ID(N'dbo.DetalleLOD'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOD_EspBepId] ON [dbo].[DetalleLOD] ([EspBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOD_EleId')
  ALTER TABLE [dbo].[DetalleLOD] ADD CONSTRAINT [FK_DetalleLOD_EleId] FOREIGN KEY ([EleId]) REFERENCES [dbo].[Elemento]([EleId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOD_EleId' AND object_id = OBJECT_ID(N'dbo.DetalleLOD'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOD_EleId] ON [dbo].[DetalleLOD] ([EleId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOD_LeyLodId')
  ALTER TABLE [dbo].[DetalleLOD] ADD CONSTRAINT [FK_DetalleLOD_LeyLodId] FOREIGN KEY ([LeyLodId]) REFERENCES [dbo].[LeyendaLOD]([LeyLodId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOD_LeyLodId' AND object_id = OBJECT_ID(N'dbo.DetalleLOD'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOD_LeyLodId] ON [dbo].[DetalleLOD] ([LeyLodId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOD_EmpresaId')
  ALTER TABLE [dbo].[DetalleLOD] ADD CONSTRAINT [FK_DetalleLOD_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOD_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetalleLOD'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOD_EmpresaId] ON [dbo].[DetalleLOD] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOI_ParLoiId')
  ALTER TABLE [dbo].[DetalleLOI] ADD CONSTRAINT [FK_DetalleLOI_ParLoiId] FOREIGN KEY ([ParLoiId]) REFERENCES [dbo].[ParametroLOI]([ParLoiId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOI_ParLoiId' AND object_id = OBJECT_ID(N'dbo.DetalleLOI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOI_ParLoiId] ON [dbo].[DetalleLOI] ([ParLoiId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOI_DetLodId')
  ALTER TABLE [dbo].[DetalleLOI] ADD CONSTRAINT [FK_DetalleLOI_DetLodId] FOREIGN KEY ([DetLodId]) REFERENCES [dbo].[DetalleLOD]([DetLodId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOI_DetLodId' AND object_id = OBJECT_ID(N'dbo.DetalleLOI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOI_DetLodId] ON [dbo].[DetalleLOI] ([DetLodId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleLOI_EmpresaId')
  ALTER TABLE [dbo].[DetalleLOI] ADD CONSTRAINT [FK_DetalleLOI_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetalleLOI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOI_EmpresaId] ON [dbo].[DetalleLOI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_MatrizRACI_RevBepId')
  ALTER TABLE [dbo].[MatrizRACI] ADD CONSTRAINT [FK_MatrizRACI_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MatrizRACI_RevBepId' AND object_id = OBJECT_ID(N'dbo.MatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_MatrizRACI_RevBepId] ON [dbo].[MatrizRACI] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_MatrizRACI_SubActId')
  ALTER TABLE [dbo].[MatrizRACI] ADD CONSTRAINT [FK_MatrizRACI_SubActId] FOREIGN KEY ([SubActId]) REFERENCES [dbo].[SubActividad]([SubActId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MatrizRACI_SubActId' AND object_id = OBJECT_ID(N'dbo.MatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_MatrizRACI_SubActId] ON [dbo].[MatrizRACI] ([SubActId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_MatrizRACI_EmpresaId')
  ALTER TABLE [dbo].[MatrizRACI] ADD CONSTRAINT [FK_MatrizRACI_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MatrizRACI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.MatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_MatrizRACI_EmpresaId] ON [dbo].[MatrizRACI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleMatrizRACI_MatRaciId')
  ALTER TABLE [dbo].[DetalleMatrizRACI] ADD CONSTRAINT [FK_DetalleMatrizRACI_MatRaciId] FOREIGN KEY ([MatRaciId]) REFERENCES [dbo].[MatrizRACI]([MatRaciId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleMatrizRACI_MatRaciId' AND object_id = OBJECT_ID(N'dbo.DetalleMatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleMatrizRACI_MatRaciId] ON [dbo].[DetalleMatrizRACI] ([MatRaciId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleMatrizRACI_LeyRaciId')
  ALTER TABLE [dbo].[DetalleMatrizRACI] ADD CONSTRAINT [FK_DetalleMatrizRACI_LeyRaciId] FOREIGN KEY ([LeyRaciId]) REFERENCES [dbo].[LeyendaRACI]([LeyRaciId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleMatrizRACI_LeyRaciId' AND object_id = OBJECT_ID(N'dbo.DetalleMatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleMatrizRACI_LeyRaciId] ON [dbo].[DetalleMatrizRACI] ([LeyRaciId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleMatrizRACI_OrgBepId')
  ALTER TABLE [dbo].[DetalleMatrizRACI] ADD CONSTRAINT [FK_DetalleMatrizRACI_OrgBepId] FOREIGN KEY ([OrgBepId]) REFERENCES [dbo].[OrganizacionBEP]([OrgBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleMatrizRACI_OrgBepId' AND object_id = OBJECT_ID(N'dbo.DetalleMatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleMatrizRACI_OrgBepId] ON [dbo].[DetalleMatrizRACI] ([OrgBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_DetalleMatrizRACI_EmpresaId')
  ALTER TABLE [dbo].[DetalleMatrizRACI] ADD CONSTRAINT [FK_DetalleMatrizRACI_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleMatrizRACI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetalleMatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleMatrizRACI_EmpresaId] ON [dbo].[DetalleMatrizRACI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_HitoConstruccion_RevBepId')
  ALTER TABLE [dbo].[HitoConstruccion] ADD CONSTRAINT [FK_HitoConstruccion_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_HitoConstruccion_RevBepId' AND object_id = OBJECT_ID(N'dbo.HitoConstruccion'))
  CREATE NONCLUSTERED INDEX [IX_HitoConstruccion_RevBepId] ON [dbo].[HitoConstruccion] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_HitoConstruccion_EmpresaId')
  ALTER TABLE [dbo].[HitoConstruccion] ADD CONSTRAINT [FK_HitoConstruccion_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_HitoConstruccion_EmpresaId' AND object_id = OBJECT_ID(N'dbo.HitoConstruccion'))
  CREATE NONCLUSTERED INDEX [IX_HitoConstruccion_EmpresaId] ON [dbo].[HitoConstruccion] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EntregableInformacion_RevBepId')
  ALTER TABLE [dbo].[EntregableInformacion] ADD CONSTRAINT [FK_EntregableInformacion_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntregableInformacion_RevBepId' AND object_id = OBJECT_ID(N'dbo.EntregableInformacion'))
  CREATE NONCLUSTERED INDEX [IX_EntregableInformacion_RevBepId] ON [dbo].[EntregableInformacion] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EntregableInformacion_OrgBepId')
  ALTER TABLE [dbo].[EntregableInformacion] ADD CONSTRAINT [FK_EntregableInformacion_OrgBepId] FOREIGN KEY ([OrgBepId]) REFERENCES [dbo].[OrganizacionBEP]([OrgBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntregableInformacion_OrgBepId' AND object_id = OBJECT_ID(N'dbo.EntregableInformacion'))
  CREATE NONCLUSTERED INDEX [IX_EntregableInformacion_OrgBepId] ON [dbo].[EntregableInformacion] ([OrgBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EntregableInformacion_EmpresaId')
  ALTER TABLE [dbo].[EntregableInformacion] ADD CONSTRAINT [FK_EntregableInformacion_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntregableInformacion_EmpresaId' AND object_id = OBJECT_ID(N'dbo.EntregableInformacion'))
  CREATE NONCLUSTERED INDEX [IX_EntregableInformacion_EmpresaId] ON [dbo].[EntregableInformacion] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Recurso_RevBepId')
  ALTER TABLE [dbo].[Recurso] ADD CONSTRAINT [FK_Recurso_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Recurso_RevBepId' AND object_id = OBJECT_ID(N'dbo.Recurso'))
  CREATE NONCLUSTERED INDEX [IX_Recurso_RevBepId] ON [dbo].[Recurso] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Recurso_EmpresaId')
  ALTER TABLE [dbo].[Recurso] ADD CONSTRAINT [FK_Recurso_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Recurso_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Recurso'))
  CREATE NONCLUSTERED INDEX [IX_Recurso_EmpresaId] ON [dbo].[Recurso] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ArchivoBEP_RevBepId')
  ALTER TABLE [dbo].[ArchivoBEP] ADD CONSTRAINT [FK_ArchivoBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ArchivoBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.ArchivoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ArchivoBEP_RevBepId] ON [dbo].[ArchivoBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ArchivoBEP_EmpresaId')
  ALTER TABLE [dbo].[ArchivoBEP] ADD CONSTRAINT [FK_ArchivoBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ArchivoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ArchivoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ArchivoBEP_EmpresaId] ON [dbo].[ArchivoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CanalBEP_RevBepId')
  ALTER TABLE [dbo].[CanalBEP] ADD CONSTRAINT [FK_CanalBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CanalBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.CanalBEP'))
  CREATE NONCLUSTERED INDEX [IX_CanalBEP_RevBepId] ON [dbo].[CanalBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CanalBEP_EmpresaId')
  ALTER TABLE [dbo].[CanalBEP] ADD CONSTRAINT [FK_CanalBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CanalBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.CanalBEP'))
  CREATE NONCLUSTERED INDEX [IX_CanalBEP_EmpresaId] ON [dbo].[CanalBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EntornoDatosBEP_RevBepId')
  ALTER TABLE [dbo].[EntornoDatosBEP] ADD CONSTRAINT [FK_EntornoDatosBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntornoDatosBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.EntornoDatosBEP'))
  CREATE NONCLUSTERED INDEX [IX_EntornoDatosBEP_RevBepId] ON [dbo].[EntornoDatosBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_EntornoDatosBEP_EmpresaId')
  ALTER TABLE [dbo].[EntornoDatosBEP] ADD CONSTRAINT [FK_EntornoDatosBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntornoDatosBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.EntornoDatosBEP'))
  CREATE NONCLUSTERED INDEX [IX_EntornoDatosBEP_EmpresaId] ON [dbo].[EntornoDatosBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ReunionBEP_RevBepId')
  ALTER TABLE [dbo].[ReunionBEP] ADD CONSTRAINT [FK_ReunionBEP_RevBepId] FOREIGN KEY ([RevBepId]) REFERENCES [dbo].[RevisionBEP]([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ReunionBEP_RevBepId' AND object_id = OBJECT_ID(N'dbo.ReunionBEP'))
  CREATE NONCLUSTERED INDEX [IX_ReunionBEP_RevBepId] ON [dbo].[ReunionBEP] ([RevBepId]);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ReunionBEP_EmpresaId')
  ALTER TABLE [dbo].[ReunionBEP] ADD CONSTRAINT [FK_ReunionBEP_EmpresaId] FOREIGN KEY ([EmpresaId]) REFERENCES [dbo].[Empresa]([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ReunionBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ReunionBEP'))
  CREATE NONCLUSTERED INDEX [IX_ReunionBEP_EmpresaId] ON [dbo].[ReunionBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Campana_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Campana'))
  CREATE NONCLUSTERED INDEX [IX_Campana_EmpresaId] ON [dbo].[Campana] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Personal_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Personal'))
  CREATE NONCLUSTERED INDEX [IX_Personal_EmpresaId] ON [dbo].[Personal] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsuarioEmpresa_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsuarioEmpresa'))
  CREATE NONCLUSTERED INDEX [IX_UsuarioEmpresa_EmpresaId] ON [dbo].[UsuarioEmpresa] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Actividad_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Actividad'))
  CREATE NONCLUSTERED INDEX [IX_Actividad_EmpresaId] ON [dbo].[Actividad] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SubActividad_EmpresaId' AND object_id = OBJECT_ID(N'dbo.SubActividad'))
  CREATE NONCLUSTERED INDEX [IX_SubActividad_EmpresaId] ON [dbo].[SubActividad] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LeyendaRACI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.LeyendaRACI'))
  CREATE NONCLUSTERED INDEX [IX_LeyendaRACI_EmpresaId] ON [dbo].[LeyendaRACI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsoBIM_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsoBIM'))
  CREATE NONCLUSTERED INDEX [IX_UsoBIM_EmpresaId] ON [dbo].[UsoBIM] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_TipoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.TipoBEP'))
  CREATE NONCLUSTERED INDEX [IX_TipoBEP_EmpresaId] ON [dbo].[TipoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Especialidad_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Especialidad'))
  CREATE NONCLUSTERED INDEX [IX_Especialidad_EmpresaId] ON [dbo].[Especialidad] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LeyendaLOD_EmpresaId' AND object_id = OBJECT_ID(N'dbo.LeyendaLOD'))
  CREATE NONCLUSTERED INDEX [IX_LeyendaLOD_EmpresaId] ON [dbo].[LeyendaLOD] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CategoriaBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.CategoriaBEP'))
  CREATE NONCLUSTERED INDEX [IX_CategoriaBEP_EmpresaId] ON [dbo].[CategoriaBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RolBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.RolBEP'))
  CREATE NONCLUSTERED INDEX [IX_RolBEP_EmpresaId] ON [dbo].[RolBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CategoriaElemento_EmpresaId' AND object_id = OBJECT_ID(N'dbo.CategoriaElemento'))
  CREATE NONCLUSTERED INDEX [IX_CategoriaElemento_EmpresaId] ON [dbo].[CategoriaElemento] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Elemento_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Elemento'))
  CREATE NONCLUSTERED INDEX [IX_Elemento_EmpresaId] ON [dbo].[Elemento] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_OrganizacionBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.OrganizacionBEP'))
  CREATE NONCLUSTERED INDEX [IX_OrganizacionBEP_EmpresaId] ON [dbo].[OrganizacionBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ParametroLOI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ParametroLOI'))
  CREATE NONCLUSTERED INDEX [IX_ParametroLOI_EmpresaId] ON [dbo].[ParametroLOI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PlantillaBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.PlantillaBEP'))
  CREATE NONCLUSTERED INDEX [IX_PlantillaBEP_EmpresaId] ON [dbo].[PlantillaBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetallePlantilla_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetallePlantilla'))
  CREATE NONCLUSTERED INDEX [IX_DetallePlantilla_EmpresaId] ON [dbo].[DetallePlantilla] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ProyectoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ProyectoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ProyectoBEP_EmpresaId] ON [dbo].[ProyectoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionProyecto_EmpresaId' AND object_id = OBJECT_ID(N'dbo.RevisionProyecto'))
  CREATE NONCLUSTERED INDEX [IX_RevisionProyecto_EmpresaId] ON [dbo].[RevisionProyecto] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.RevisionBEP'))
  CREATE NONCLUSTERED INDEX [IX_RevisionBEP_EmpresaId] ON [dbo].[RevisionBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ContactoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ContactoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ContactoBEP_EmpresaId] ON [dbo].[ContactoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ObjetivoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ObjetivoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ObjetivoBEP_EmpresaId] ON [dbo].[ObjetivoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_UsoBIMBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsoBIMBEP'))
  CREATE NONCLUSTERED INDEX [IX_UsoBIMBEP_EmpresaId] ON [dbo].[UsoBIMBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EspecialidadBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.EspecialidadBEP'))
  CREATE NONCLUSTERED INDEX [IX_EspecialidadBEP_EmpresaId] ON [dbo].[EspecialidadBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOD_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetalleLOD'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOD_EmpresaId] ON [dbo].[DetalleLOD] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleLOI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetalleLOI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleLOI_EmpresaId] ON [dbo].[DetalleLOI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MatrizRACI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.MatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_MatrizRACI_EmpresaId] ON [dbo].[MatrizRACI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DetalleMatrizRACI_EmpresaId' AND object_id = OBJECT_ID(N'dbo.DetalleMatrizRACI'))
  CREATE NONCLUSTERED INDEX [IX_DetalleMatrizRACI_EmpresaId] ON [dbo].[DetalleMatrizRACI] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_HitoConstruccion_EmpresaId' AND object_id = OBJECT_ID(N'dbo.HitoConstruccion'))
  CREATE NONCLUSTERED INDEX [IX_HitoConstruccion_EmpresaId] ON [dbo].[HitoConstruccion] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntregableInformacion_EmpresaId' AND object_id = OBJECT_ID(N'dbo.EntregableInformacion'))
  CREATE NONCLUSTERED INDEX [IX_EntregableInformacion_EmpresaId] ON [dbo].[EntregableInformacion] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Recurso_EmpresaId' AND object_id = OBJECT_ID(N'dbo.Recurso'))
  CREATE NONCLUSTERED INDEX [IX_Recurso_EmpresaId] ON [dbo].[Recurso] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ArchivoBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ArchivoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ArchivoBEP_EmpresaId] ON [dbo].[ArchivoBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CanalBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.CanalBEP'))
  CREATE NONCLUSTERED INDEX [IX_CanalBEP_EmpresaId] ON [dbo].[CanalBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_EntornoDatosBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.EntornoDatosBEP'))
  CREATE NONCLUSTERED INDEX [IX_EntornoDatosBEP_EmpresaId] ON [dbo].[EntornoDatosBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ReunionBEP_EmpresaId' AND object_id = OBJECT_ID(N'dbo.ReunionBEP'))
  CREATE NONCLUSTERED INDEX [IX_ReunionBEP_EmpresaId] ON [dbo].[ReunionBEP] ([EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Empresa_EmpSlug' AND object_id = OBJECT_ID(N'dbo.Empresa'))
  CREATE UNIQUE NONCLUSTERED INDEX [UX_Empresa_EmpSlug] ON [dbo].[Empresa] ([EmpSlug]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_UsuarioEmpresa_usuarioId_EmpresaId' AND object_id = OBJECT_ID(N'dbo.UsuarioEmpresa'))
  CREATE UNIQUE NONCLUSTERED INDEX [UX_UsuarioEmpresa_usuarioId_EmpresaId] ON [dbo].[UsuarioEmpresa] ([usuarioId], [EmpresaId]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ContactoBEP_ConBepEstado' AND object_id = OBJECT_ID(N'dbo.ContactoBEP'))
  CREATE NONCLUSTERED INDEX [IX_ContactoBEP_ConBepEstado] ON [dbo].[ContactoBEP] ([ConBepEstado]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionBEP_RevBepActual' AND object_id = OBJECT_ID(N'dbo.RevisionBEP'))
  CREATE NONCLUSTERED INDEX [IX_RevisionBEP_RevBepActual] ON [dbo].[RevisionBEP] ([RevBepActual]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_RevisionProyecto_RevProActual' AND object_id = OBJECT_ID(N'dbo.RevisionProyecto'))
  CREATE NONCLUSTERED INDEX [IX_RevisionProyecto_RevProActual] ON [dbo].[RevisionProyecto] ([RevProActual]);
GO

/* --- 4) Datos iniciales (cada bloque se ejecuta solo si la tabla esta vacia) --- */
-- Campana
IF NOT EXISTS (SELECT 1 FROM [dbo].[Campana])
BEGIN
  INSERT INTO [dbo].[Campana] ([CampanaId], [CompaniaId], [ClienteId], [CampanaNombre], [CampanaEstado], [CampanaFechaInicio], [CampanaFechaFin], [CampanaFechaFinReal], [CampanaBep])
  VALUES
    (N'CP001', N'CM001', N'CL001', N'Proyecto de ejemplo 1', N'Activo', N'2026-01-05T00:00:00', N'2026-12-18T00:00:00', NULL, 1),
    (N'CP002', N'CM001', N'CL001', N'Proyecto de ejemplo 2', N'Activo', N'2026-03-02T00:00:00', N'2027-02-26T00:00:00', NULL, 1),
    (N'CP003', N'CM001', N'CL002', N'Proyecto de ejemplo 3', N'Activo', N'2026-06-01T00:00:00', N'2027-05-28T00:00:00', NULL, 1)
  ;
END
GO
-- Personal
IF NOT EXISTS (SELECT 1 FROM [dbo].[Personal] WHERE [PersonalId] = N'EMBEP01') AND NOT EXISTS (SELECT 1 FROM [dbo].[Usuario] WHERE [UsuarioNombre] = N'admin@bep.local')
BEGIN
  INSERT INTO [dbo].[Personal] ([PersonalId], [PersonalNombres], [PersonalApellidos], [PersonaMail], [PersonaTelefono], [personaldni], [PersonaDireccion], [PersonalEstado], [AreaTrabajoId], [PuestoId], [DivisionPersonalId])
  VALUES
    (N'EMBEP01', N'Administrador', N'BEP', N'admin@bep.local', N'', N'', N'', 1, NULL, NULL, NULL)
  ;
END
GO
-- Usuario
IF NOT EXISTS (SELECT 1 FROM [dbo].[Usuario] WHERE [UsuarioNombre] = N'admin@bep.local' OR [usuarioId] = N'USBEP01') AND EXISTS (SELECT 1 FROM [dbo].[Personal] WHERE [PersonalId] = N'EMBEP01')
BEGIN
  INSERT INTO [dbo].[Usuario] ([usuarioId], [UsuarioNombre], [UsuarioKey], [UsuarioPasword], [PersonalId], [RolId], [MesaId], [DivisionId], [UsuarioEstado], [UsuarioSuper])
  VALUES
    (N'USBEP01', N'admin@bep.local', N'bep-admin-salt-0001', N'949e388989fe6a3c97d525705a09c64f824dbfdee9b7c504f724f995db189f69', N'EMBEP01', N'RO00001', NULL, NULL, 1, 1)
  ;
END
GO
-- Actividad
IF NOT EXISTS (SELECT 1 FROM [dbo].[Actividad])
BEGIN
  INSERT INTO [dbo].[Actividad] ([ActNombre], [ActFecha], [ActEstado])
  VALUES
    (N'Presentación de ofertas', N'2025-07-02T14:02:00', 1),
    (N'Contratación', N'2025-07-02T14:02:00', 1),
    (N'Movilización', N'2025-07-02T14:02:00', 1),
    (N'Producción colaborativa de la información', N'2025-07-02T14:02:00', 1),
    (N'Entrega del modelo de información', N'2025-07-02T14:02:00', 1),
    (N'Fin de la Fase de Ejecución', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- SubActividad
IF NOT EXISTS (SELECT 1 FROM [dbo].[SubActividad])
BEGIN
  INSERT INTO [dbo].[SubActividad] ([ActId], [SubActNombre], [SubActDefault], [SubActFecha], [SubActFechaAct], [SubActEstado])
  VALUES
    (1, N'Designar los responsables de la función de gestión de la información BIM', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (1, N'Establecer el Plan de Ejecución BIM (BEP) Pre contrato del equipo de ejecución', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (1, N'Evaluar las aptitudes y capacidades de los equipos de trabajo', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (1, N'Establecer las aptitudes y capacidades del equipo de ejecución', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (1, N'Establecer el Plan de Movilización del equipo de ejecución', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (1, N'Establecer la Matriz de riesgos del equipo de ejecución', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (1, N'Recopilar la información del equipo de ejecución para la presentación de oferta', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Confirmar el Plan de Ejecución BIM (BEP) del equipo de ejecución', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Establecer la matriz de responsabilidad detallada del equipo de ejecución', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Establecer los requisitos de Intercambio de información del proveedor', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Establecer el/los Programa(s) de Desarrollo de Información de una Tarea (TIDP)', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Establecer el Programa General de Desarrollo de la información (MIDP)', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Completar los documentos para el perfeccionamiento del contrato del proveedor', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (2, N'Completar los documentos para la contratación de los subcontratistas', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (3, N'Movilizar recursos', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (3, N'Movilizar la tecnología de información', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (3, N'Poner a prueba los métodos y procedimientos de producción de información en la fase o etapa correspondiente', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (4, N'Comprobar la disponibilidad de la información de referencia y los recursos compartidos', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (4, N'Producir información', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (4, N'Realizar un control de calidad', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (4, N'Revisar y aprobar el intercambio de información', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (4, N'Revisar el modelo de información', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (5, N'Presentar al proveedor el Modelo de Información para su autorización', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (5, N'Revisar y autorizar el modelo de información', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (5, N'Presentar a la entidad pública el Modelo de Información para su aceptación', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (5, N'Revisar y aceptar el modelo de información', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (6, N'Archivar el Modelo de Información del Proyecto (PIM)', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1),
    (6, N'Recoger las lecciones aprendidas para futuras inversiones', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- LeyendaRACI
IF NOT EXISTS (SELECT 1 FROM [dbo].[LeyendaRACI])
BEGIN
  INSERT INTO [dbo].[LeyendaRACI] ([LeyRaciAbreviacion], [LeyRaciNombre], [LeyRaciDescripcion], [LeyRaciColor], [LeyRaciBackground], [LeyRaciFecha], [LeyRaciEstado])
  VALUES
    (N'R', N'Responsable', N'', N'#000000', N'#00C417', N'2025-07-02T14:02:00', 1),
    (N'A', N'Aprobador', N'', N'#000000', N'#018FF1', N'2025-07-02T14:02:00', 1),
    (N'C', N'Consultado', N'', N'#000000', N'#F1B101', N'2025-07-02T14:02:00', 1),
    (N'I', N'Informado', N'', N'#000000', N'#C901F1', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- UsoBIM
IF NOT EXISTS (SELECT 1 FROM [dbo].[UsoBIM])
BEGIN
  INSERT INTO [dbo].[UsoBIM] ([UsoBimNombre], [UsoBimDescripcion], [UsoBimDefault], [UsoBimFecha], [UsoBimEstado])
  VALUES
    (N'Levantamiento de condiciones existentes', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis del entorno físico', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Diseño de especialidades', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Elaboración de documentación', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Visualización 3D', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Compatibilización de la Información', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Analisis del programa arquitectónico', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Estimación de cantidades y costos', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Revisión del diseño', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis Estructural', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis Lumínico', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis Energético de las instalaciones', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis de constructibilidad', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis de otras ingenierías', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Evaluación de sostenibilidad', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Supervisión del modelo de información', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Detección de interferencias e incompatibilidades', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Planificación de la fase de ejecución', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Diseño de sistemas constructivos para ejecución', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Fabricación digital', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Planificación de obras preliminares y provisionales', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Control de equipos para montajes', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Modelado de información As-Built', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Gestión de activos', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Programación de operaciones y mantenimiento', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Análisis de los sistemas de los activos', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Gestión y seguimiento del espacio del activo', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'Planificación y prevención de desastres', N'', 1, N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- TipoBEP
IF NOT EXISTS (SELECT 1 FROM [dbo].[TipoBEP])
BEGIN
  INSERT INTO [dbo].[TipoBEP] ([TipoBepNombre], [TipoBepFecha], [TipoBepEstado])
  VALUES
    (N'Edificaciones', N'2025-07-02T14:02:00', 1),
    (N'Otros', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- Especialidad
IF NOT EXISTS (SELECT 1 FROM [dbo].[Especialidad])
BEGIN
  INSERT INTO [dbo].[Especialidad] ([TipoBepId], [EspNombre], [EspDefault], [EspFecha], [EspEstado])
  VALUES
    (1, N'Personalizado', 0, N'2025-07-02T14:02:00', 0),
    (1, N'Arquitectura', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Estructuras', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Mecánica', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Eléctrica', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Sanitaria', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Gas', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Tuberías Contra Incendio', 1, N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- LeyendaLOD
IF NOT EXISTS (SELECT 1 FROM [dbo].[LeyendaLOD])
BEGIN
  INSERT INTO [dbo].[LeyendaLOD] ([LeyLodNombre], [LeyLodDescripcion], [LeyLodDefault], [LeyLodFecha], [LeyLodEstado])
  VALUES
    (N'LOD 0', N'', 0, N'2025-07-02T14:02:00', 0),
    (N'LOD 100', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'LOD 200', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'LOD 300', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'LOD 350', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'LOD 400', N'', 1, N'2025-07-02T14:02:00', 1),
    (N'LOD 500', N'', 1, N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- CategoriaBEP
IF NOT EXISTS (SELECT 1 FROM [dbo].[CategoriaBEP])
BEGIN
  INSERT INTO [dbo].[CategoriaBEP] ([TipoBepId], [CatBepNombre], [CatBepFecha], [CatBepEstado])
  VALUES
    (1, N'Multifamiliares', N'2025-07-02T14:02:00', 1),
    (1, N'Hospitales', N'2025-07-02T14:02:00', 1),
    (1, N'Centros Comerciales', N'2025-07-02T14:02:00', 1),
    (1, N'Vivienda Unifamiliar', N'2025-07-02T14:02:00', 1),
    (1, N'Condominios', N'2025-07-02T14:02:00', 1),
    (1, N'Oficinas', N'2025-07-02T14:02:00', 1),
    (2, N'Ejem1', N'2025-07-02T14:02:00', 1),
    (2, N'Ejem2', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- RolBEP
IF NOT EXISTS (SELECT 1 FROM [dbo].[RolBEP])
BEGIN
  INSERT INTO [dbo].[RolBEP] ([RolBepNombre], [RolBepDescripcion], [RolBepFecha], [RolBepEstado])
  VALUES
    (N'Director BIM', N'', N'2025-07-02T14:02:00', 1),
    (N'Gestor BIM', N'', N'2025-07-02T14:02:00', 1),
    (N'Coordinador BIM', N'', N'2025-07-02T14:02:00', 1),
    (N'Modelador BIM', N'', N'2025-07-02T14:02:00', 1),
    (N'Supervisor BIM', N'', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- CategoriaElemento
IF NOT EXISTS (SELECT 1 FROM [dbo].[CategoriaElemento])
BEGIN
  INSERT INTO [dbo].[CategoriaElemento] ([EspId], [CatEleNombre], [CatEleFecha], [CatEleEstado])
  VALUES
    (2, N'Muros', N'2025-07-02T14:02:00', 1),
    (2, N'Columnas', N'2025-07-02T14:02:00', 1),
    (2, N'Puertas', N'2025-07-02T14:02:00', 1),
    (2, N'Ventanas', N'2025-07-02T14:02:00', 1),
    (3, N'Mamparas', N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- Elemento
IF NOT EXISTS (SELECT 1 FROM [dbo].[Elemento])
BEGIN
  INSERT INTO [dbo].[Elemento] ([CatEleId], [EleNombre], [EleObservacion], [EleDefault], [EleFecha], [EleEstado])
  VALUES
    (1, N'Muros perimetrales', N'', 1, N'2025-07-02T14:02:00', 1),
    (1, N'Interiores', N'', 1, N'2025-07-02T14:02:00', 1),
    (2, N'Sección de columnas incluye el tarrajeo', N'', 1, N'2025-07-02T14:02:00', 1),
    (3, N'Puertas principales', N'', 1, N'2025-07-02T14:02:00', 1),
    (3, N'Interiores', N'', 1, N'2025-07-02T14:02:00', 1),
    (3, N'Cortafuego', N'', 1, N'2025-07-02T14:02:00', 1),
    (4, N'Ventanas fijas', N'', 1, N'2025-07-02T14:02:00', 1),
    (4, N'Corredizas', N'', 1, N'2025-07-02T14:02:00', 1),
    (4, N'Tragaluces', N'', 1, N'2025-07-02T14:02:00', 1),
    (5, N'Mampara corrediza', N'', 1, N'2025-07-02T14:02:00', 1)
  ;
END
GO
-- OrganizacionBEP
IF NOT EXISTS (SELECT 1 FROM [dbo].[OrganizacionBEP])
BEGIN
  INSERT INTO [dbo].[OrganizacionBEP] ([OrgBepNombre], [OrgBepTipo], [OrgBepFecha], [OrgBepFechaAct], [OrgBepEstado], [OrgBepUsuarioId])
  VALUES
    (N'Org1', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1, N'USBEP01'),
    (N'Org2', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1, N'USBEP01'),
    (N'Org3', 1, N'2025-07-02T14:02:00', N'2025-07-02T14:02:00', 1, N'USBEP01')
  ;
END
GO
/* --- Usuarios existentes -> miembros de la Empresa principal (solo la primera vez, con la tabla vacia) --- */
-- El administrador queda como superadmin y admin; el resto, como usuarios (el admin de la empresa puede cambiar su rol).
IF NOT EXISTS (SELECT 1 FROM [dbo].[UsuarioEmpresa])
BEGIN
  UPDATE [dbo].[Usuario] SET [UsuarioSuper] = 1 WHERE [UsuarioNombre] = N'admin@bep.local' AND [UsuarioSuper] IS NULL;
  INSERT INTO [dbo].[UsuarioEmpresa] ([usuarioId], [PersonalId], [UsuEmpRol], [UsuEmpEstado], [UsuEmpFecha], [EmpresaId])
  SELECT u.[usuarioId], u.[PersonalId], CASE WHEN ISNULL(u.[UsuarioSuper], 0) = 1 THEN N'admin' ELSE N'usuario' END, ISNULL(u.[UsuarioEstado], 1), GETDATE(), 1 FROM [dbo].[Usuario] u;
END
GO

PRINT N'BEP: base de datos lista. Usuario: admin@bep.local';
GO
