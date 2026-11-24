#!/usr/bin/env node
'use strict';
/* Genera sql/BEP_Completo.sql (T-SQL para SQL Server) a partir de src/schema.js + src/seed.js */
const fs = require('fs');
const path = require('path');
const { tables, sqlType } = require('../src/schema');
const { seed, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USER_ID, ADMIN_PERSONAL_ID } = require('../src/seed');

const q = (s) => `[${s}]`;
const lit = (v, type) => {
  if (v === null || v === undefined) return 'NULL';
  const base = type.replace('?', '');
  if (base === 'bit') return v ? '1' : '0';
  if (['id', 'i16'].includes(base)) return String(Number(v));
  return `N'${String(v).replace(/'/g, "''")}'`;
};

const out = [];
const push = (s = '') => out.push(s);

push(`/* =====================================================================
   BEP - Script unico de base de datos (SQL Server)
   Generado por: npm run gen:sql   (no editar a mano: edite src/schema.js o src/seed.js)

   Contiene:
     1) Creacion de la base de datos [BEP]   (opcional, ver abajo)
     2) Tablas de Supervisore que BEP lee: Campana, Personal, Usuario
        -> se crean SOLO si no existen (si ya tiene Supervisore, se respetan)
     3) Las ${tables.filter(t => !t.supervisore).length} tablas propias de BEP, con llaves e indices
     4) Multiempresa: tablas Empresa y UsuarioEmpresa, y la columna EmpresaId en cada tabla de datos
        (si la base ya existia, se agrega con valor 1 = "Empresa principal": no se pierde nada)
     5) Datos iniciales: catalogos de BEP, proyectos de ejemplo y el usuario administrador (superadmin)
          usuario: ${ADMIN_EMAIL}    clave: ${ADMIN_PASSWORD}   (cambiela al ingresar)

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
`);

push('/* --- 2 y 3) Tablas --- */');
for (const t of tables) {
  const lines = t.cols.map(c => {
    let s = `  ${q(c.name)} ${sqlType(c.type, 'mssql')}`;
    if (c.identity) s += ' IDENTITY(1,1)';
    s += c.pk || (!c.nullable) ? ' NOT NULL' : ' NULL';
    if (c.tenantCol) s += ` CONSTRAINT ${q('DF_' + t.name + '_EmpresaId')} DEFAULT 1`;
    return s;
  });
  const pkCols = (Array.isArray(t.pk) ? t.pk : [t.pk]).map(q).join(', ');
  lines.push(`  CONSTRAINT [PK_${t.name}] PRIMARY KEY (${pkCols})`);
  push(`-- ${t.name}${t.supervisore ? '  (Supervisore: se crea solo si no existe)' : ''}`);
  push(`IF OBJECT_ID(N'dbo.${t.name}', N'U') IS NULL`);
  push('BEGIN');
  push(`  CREATE TABLE [dbo].${q(t.name)} (`);
  push(lines.map(l => '  ' + l).join(',\n'));
  push('  );');
  push('END');
  push('GO');
}

push('\n/* --- Multiempresa: columnas nuevas en bases ya existentes (EmpresaId = 1 por defecto) --- */');
for (const t of tables.filter(x => x.tenant)) {
  push(`IF COL_LENGTH(N'dbo.${t.name}', N'EmpresaId') IS NULL`);
  push(`  ALTER TABLE [dbo].${q(t.name)} ADD [EmpresaId] DECIMAL(10) NOT NULL CONSTRAINT ${q('DF_' + t.name + '_EmpresaId')} DEFAULT 1;`);
}
push(`IF COL_LENGTH(N'dbo.Usuario', N'UsuarioSuper') IS NULL`);
push(`  ALTER TABLE [dbo].[Usuario] ADD [UsuarioSuper] BIT NULL;`);
push('GO');
push(`\n/* --- Empresa principal (id 1): a ella pasan los datos que ya existian --- */`);
push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[Empresa] WHERE [EmpresaId] = 1)`);
push('BEGIN');
push(`  SET IDENTITY_INSERT [dbo].[Empresa] ON;`);
push(`  INSERT INTO [dbo].[Empresa] ([EmpresaId], [EmpNombre], [EmpSlug], [EmpEstado], [EmpFecha], [EmpFechaAct]) VALUES (1, N'${seed.Empresa[0].EmpNombre}', N'${seed.Empresa[0].EmpSlug}', 1, GETDATE(), GETDATE());`);
push(`  SET IDENTITY_INSERT [dbo].[Empresa] OFF;`);
push('END');
push('GO');

push('\n/* --- Llaves foraneas, indices y unicidad --- */');
for (const t of tables.filter(x => !x.supervisore)) {
  for (const fk of t.fks) {
    const ref = tables.find(x => x.name === fk.ref);
    const refPk = Array.isArray(ref.pk) ? ref.pk[0] : ref.pk;
    const name = `FK_${t.name}_${fk.col}`;
    push(`IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'${name}')`);
    push(`  ALTER TABLE [dbo].${q(t.name)} ADD CONSTRAINT ${q(name)} FOREIGN KEY (${q(fk.col)}) REFERENCES [dbo].${q(fk.ref)}(${q(refPk)});`);
    push(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_${t.name}_${fk.col}' AND object_id = OBJECT_ID(N'dbo.${t.name}'))`);
    push(`  CREATE NONCLUSTERED INDEX ${q('IX_' + t.name + '_' + fk.col)} ON [dbo].${q(t.name)} (${q(fk.col)});`);
  }
}
for (const t of tables.filter(x => x.tenant)) {
  push(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_${t.name}_EmpresaId' AND object_id = OBJECT_ID(N'dbo.${t.name}'))`);
  push(`  CREATE NONCLUSTERED INDEX ${q('IX_' + t.name + '_EmpresaId')} ON [dbo].${q(t.name)} ([EmpresaId]);`);
}
for (const t of tables.filter(x => x.uniques && x.uniques.length)) {
  for (const u of t.uniques) {
    const nm = `UX_${t.name}_${u.join('_')}`;
    push(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'${nm}' AND object_id = OBJECT_ID(N'dbo.${t.name}'))`);
    push(`  CREATE UNIQUE NONCLUSTERED INDEX ${q(nm)} ON [dbo].${q(t.name)} (${u.map(q).join(', ')});`);
  }
}
// indices utiles para las consultas por revision
for (const [tbl, col] of [['ContactoBEP', 'ConBepEstado'], ['RevisionBEP', 'RevBepActual'], ['RevisionProyecto', 'RevProActual']]) {
  push(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_${tbl}_${col}' AND object_id = OBJECT_ID(N'dbo.${tbl}'))`);
  push(`  CREATE NONCLUSTERED INDEX ${q('IX_' + tbl + '_' + col)} ON [dbo].${q(tbl)} (${q(col)});`);
}
push('GO');

push('\n/* --- 4) Datos iniciales (cada bloque se ejecuta solo si la tabla esta vacia) --- */');
for (const t of tables) {
  const rows = seed[t.name];
  if (!rows || !rows.length || t.name === 'Empresa') continue;
  const cols = t.cols.filter(c => !c.identity && !c.tenantCol).map(c => c.name);
  push(`-- ${t.name}`);
  // Personal/Usuario: el administrador se crea si no existe (aunque Supervisore ya tenga usuarios); el resto, solo con la tabla vacia
  const guard = t.name === 'Personal' ? `IF NOT EXISTS (SELECT 1 FROM [dbo].[Personal] WHERE [PersonalId] = N'${ADMIN_PERSONAL_ID}') AND NOT EXISTS (SELECT 1 FROM [dbo].[Usuario] WHERE [UsuarioNombre] = N'${ADMIN_EMAIL}')`
    : t.name === 'Usuario' ? `IF NOT EXISTS (SELECT 1 FROM [dbo].[Usuario] WHERE [UsuarioNombre] = N'${ADMIN_EMAIL}' OR [usuarioId] = N'${ADMIN_USER_ID}') AND EXISTS (SELECT 1 FROM [dbo].[Personal] WHERE [PersonalId] = N'${ADMIN_PERSONAL_ID}')`
    : `IF NOT EXISTS (SELECT 1 FROM [dbo].${q(t.name)})`;
  push(guard);
  push('BEGIN');
  push(`  INSERT INTO [dbo].${q(t.name)} (${cols.map(q).join(', ')})`);
  push('  VALUES');
  push(rows.map(r => '    (' + t.cols.filter(c => !c.identity && !c.tenantCol).map(c => lit(r[c.name], c.type)).join(', ') + ')').join(',\n'));
  push('  ;');
  push('END');
  push('GO');
}
push(`/* --- Usuarios existentes -> miembros de la Empresa principal (solo la primera vez, con la tabla vacia) --- */
-- El administrador queda como superadmin y admin; el resto, como usuarios (el admin de la empresa puede cambiar su rol).`);
push(`IF NOT EXISTS (SELECT 1 FROM [dbo].[UsuarioEmpresa])`);
push('BEGIN');
push(`  UPDATE [dbo].[Usuario] SET [UsuarioSuper] = 1 WHERE [UsuarioNombre] = N'${ADMIN_EMAIL}' AND [UsuarioSuper] IS NULL;`);
push(`  INSERT INTO [dbo].[UsuarioEmpresa] ([usuarioId], [PersonalId], [UsuEmpRol], [UsuEmpEstado], [UsuEmpFecha], [EmpresaId])`);
push(`  SELECT u.[usuarioId], u.[PersonalId], CASE WHEN ISNULL(u.[UsuarioSuper], 0) = 1 THEN N'admin' ELSE N'usuario' END, ISNULL(u.[UsuarioEstado], 1), GETDATE(), 1 FROM [dbo].[Usuario] u;`);
push('END');
push('GO');
push(`\nPRINT N'BEP: base de datos lista. Usuario: ${ADMIN_EMAIL}';\nGO\n`);

const file = path.join(__dirname, '..', 'sql', 'BEP_Completo.sql');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, '﻿' + out.join('\n'), 'utf8');
console.log('Generado', file, `(${out.length} lineas)`);
