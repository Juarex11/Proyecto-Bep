/* =====================================================================
   BEP - Paso previo: crear el login [bep_app] y la base de datos [BEP]
   Ejecutar UNA VEZ en el SQL Server (SSMS) conectado a "master" con un
   usuario administrador (sysadmin). No toca las bases de SONDA.

   Cambie SOLO el texto PON-AQUI-TU-CLAVE (primera linea) por su clave:
   minimo 16 caracteres, mayusculas, minusculas, numeros y simbolos,
   sin comillas simples. Es re-ejecutable.
   ===================================================================== */
DECLARE @clave NVARCHAR(128) = N'PON-AQUI-TU-CLAVE';
IF SUSER_ID(N'bep_app') IS NULL
    EXEC(N'CREATE LOGIN [bep_app] WITH PASSWORD = N''' + @clave + N''', CHECK_POLICY = ON, DEFAULT_DATABASE = [BEP];');
ELSE PRINT 'El login bep_app ya existe.';
GO
IF DB_ID(N'BEP') IS NULL CREATE DATABASE [BEP];
GO
USE [BEP];
GO
IF USER_ID(N'bep_app') IS NULL CREATE USER [bep_app] FOR LOGIN [bep_app];
ALTER ROLE [db_owner] ADD MEMBER [bep_app];   -- solo dentro de BEP; lo necesita "npm run db:init"
GO
SELECT name AS base, state_desc FROM sys.databases WHERE name = N'BEP';
SELECT name AS login_creado FROM sys.server_principals WHERE name = N'bep_app';
GO
