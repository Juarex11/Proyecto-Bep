# Lyracode BEPcloud (BackNode)

Sistema web para crear, mantener y consultar el **Plan de Ejecución BIM (BEP, *BIM Execution Plan*)** de proyectos de construcción, alineado con la **NTP ISO 19650**.

Este repositorio contiene todo lo necesario para ponerlo en marcha: el **backend en Node.js** (reemplaza al backend GeneXus original), el **front** (`public/AppBEP`, una SPA sin paso de compilación) y **un solo script SQL** con las tablas y los datos iniciales.

Es **multiempresa**: un mismo dominio atiende a varias empresas, cada una con sus propios datos, su administrador y sus usuarios.

## Contexto

- **Qué es un BEP.** Es el documento donde un proyecto define *cómo* se gestionará la información BIM: qué objetivos persigue, qué se modela y con qué nivel de detalle, quién es responsable de qué, cuándo se entregan los datos y cómo se comunica el equipo.
- **Origen.** El sistema nació como un módulo ligado a *Supervisore* (sistema de supervisión de obra) con backend en GeneXus y base SQL Server. Este repositorio lo vuelve **independiente de Supervisore**, con backend Node.js, un único script de base de datos y soporte multiempresa. El inicio de sesión es el propio de BEP; la integración con **Keycloak** queda para una fase posterior.
- **Producto.** Se publica como *Lyracode BEPcloud*. El front se rediseñó solo con Bootstrap (azul marino + naranja, botones tipo píldora, tablas DataTables, modo oscuro).
- **Estado.** Funciona en producción sobre **Linux (nginx + systemd) con SQL Server**, bajo un dominio propio. También puede publicarse en Windows con IIS (ver *Despliegue*). Hay un modo demo con SQLite para probar sin instalar nada.

## Arquitectura

```
Navegador ──HTTPS──▶ nginx / IIS (proxy inverso) ──▶ Node + Express (127.0.0.1:<puerto>) ──▶ SQL Server (base BEP)
                                                              └──▶ carpeta ArchivosBEP/ (archivos e imágenes subidos)
```

- **Node/Express** sirve el front, la API y el inicio de sesión. Todo en el mismo origen.
- **SQL Server** guarda toda la información estructurada. Una sola base para todas las empresas.
- **Archivos subidos** (adjuntos del flujo de trabajo, fotos y logos) van a disco, en `ArchivosBEP/`, separados por empresa. En SQL Server solo queda su registro.
- **Sesión:** token JWT en cookie. El servidor decide la empresa activa a partir del token.

### Rutas

```
/                       portal: inicio de sesión, elegir empresa
/<empresa>/             el sistema de esa empresa (ej. /acme/)
/<empresa>/<pantalla>   cada pantalla tiene su propia URL: sobrevive a recargar y a Atrás/Adelante
/<empresa>/General/APIBEP/…      API de BEP (consultas y guardados por sección)
/<empresa>/General/APIConfigBEP/…  API de configuración (listas paginadas, usuarios…)
/<empresa>/rest/General/<Tabla>[/<id>]  CRUD genérico de tablas (el front guarda con POST <Tabla>/0)
/auth/…  /portal/…      login, perfil, fotos y logos, administración de empresas (superadmin)
/health                 estado del servicio y motor de base de datos
```

Con BASE_PATH (ej. `/BEP`) todo cuelga de ese prefijo.

## Qué hace cada módulo

**Crear nuevo BEP** abre la ficha del proyecto; al guardarla se habilitan las demás secciones:

| Sección | Para qué sirve |
|---|---|
| Descripción del proyecto | Nombre, cliente, tipo, clase, ubicación, plantilla y descripción. |
| Estrategia del proyecto | Objetivos del cliente, del proyecto y BIM, y los usos BIM previstos. |
| Alcance de modelado | Especialidades, categorías y elementos a modelar, con su nivel de detalle (LOD) y parámetros LOI. Se puede guardar como plantilla. |
| Matriz de responsabilidades | Contactos del proyecto y matriz RACI (quién es responsable, aprueba, es consultado o informado en cada actividad). |
| Estrategia de información | Hitos de construcción, hitos de entrega, flujo de trabajo (archivos) y entorno común de datos (CDE). |
| Estrategia de comunicación | Reuniones y canales de comunicación. |

Un BEP tiene **revisiones** y **etapas**. Se puede consultar, editar e imprimir el informe en PDF.

**Configuración** (administrador de la empresa) mantiene los catálogos que alimentan esas secciones:

- *Proyectos:* tipos, clases, usos BIM y proyectos.
- *Alcance:* especialidades, categorías, elementos, LOD y parámetros.
- *Matriz:* organizaciones, roles, actividades, procesos y leyenda RACI.
- *Administración:* empresas (solo superadmin), mi empresa (logo) y usuarios.

Dato importante: el campo **Cliente** de un BEP lista solo las organizaciones de tipo *Propietario/Desarrollador*, y **Clase** depende del **Tipo** elegido.

## Contenido del repositorio

```
BackNode/
  server.js              Servidor Express (API + front + login)
  .env.example           Plantilla de configuración (copiar a .env)
  sql/BEP_Completo.sql   Script ÚNICO: base BEP, tablas, índices, FKs y datos iniciales (idempotente)
  sql/00_crear_bd_y_login_BEP.sql  Paso previo opcional: crea la base y un login propio con permisos solo en BEP
  public/AppBEP/         Front: index.html, css/, img/, js/ (core, ui, vendor), pages/<nombre>/ (ver su README)
  public/portal.html     Portal: inicio de sesión, elección de empresa y administración de empresas
  src/                   Rutas (APIBEP, APIConfigBEP, CRUD de tablas), BD, esquema, autenticación
  tools/                 gen-sql, run-sql, seed-demo, servicio-windows
  test/                  Pruebas automáticas (API completa y multiempresa/aislamiento)
  deploy/linux/          nginx + systemd (Ubuntu)
  deploy/iis/            Proxy inverso para IIS + Servicio de Windows
```

El esquema de la base vive en `src/schema.js`; de ahí salen el script T-SQL (`npm run gen:sql`), las tablas SQLite del demo y el CRUD genérico. **No edite `BEP_Completo.sql` a mano.**

## Puesta en marcha con SQL Server

1. Instale dependencias: `npm install` (Node 22 o superior).
2. Cree la base y un login propio (opcional, recomendado): ejecute `sql/00_crear_bd_y_login_BEP.sql` como administrador de SQL Server, cambiando antes la clave del script.
3. Copie `.env.example` a `.env` y complete `DB_SERVER`, `DB_USER`, `DB_PASSWORD` y un `JWT_SECRET` largo y propio.
4. Cree las tablas y los datos iniciales: `npm run db:init` (o ejecute `sql/BEP_Completo.sql` en SSMS / `sqlcmd`). Es idempotente: crea solo lo que falta, así que puede repetirse sin perder datos.
5. Inicie con `npm start` y abra http://localhost:3000
6. Ingrese como **superadmin** con el usuario inicial del script (`admin@bep.local`; su clave inicial está en `src/seed.js`) y **cámbiela de inmediato** desde el menú del perfil.

Comprobación rápida: `GET /health` debe responder `{"ok":true,"db":"mssql",…}`.

### Modo demo sin SQL Server (SQLite)

En `.env` ponga `DB_CLIENT=sqlite` y ejecute `npm start`. Crea `bep-demo.sqlite` con los mismos datos iniciales. Para cargar un BEP completo de ejemplo con el servidor encendido: `npm run seed:demo`.

## Configuración (.env)

| Variable | Descripción |
|---|---|
| `PORT`, `HOST` | Puerto y dirección de escucha. Con proxy inverso use `HOST=127.0.0.1`. |
| `BASE_PATH` | Prefijo si se publica bajo un sitio (ej. `/BEP`); vacío si va en la raíz. |
| `FRONT_DIR`, `UPLOAD_DIR` | Carpeta del front y carpeta de archivos subidos. |
| `JWT_SECRET` | **Obligatorio y propio** en producción (cadena larga y aleatoria). |
| `SESSION_HOURS`, `REMEMBER_DAYS` | Duración de la sesión y de "Recordar sesión". |
| `COOKIE_SECURE` | `true` si se publica con HTTPS. |
| `USO_BEP` | `completo` (muestra el campo Proyecto) o `soloBEP` (lo oculta, junto con el Gantt de hitos de entrega). Se aplica al iniciar sesión. |
| `DB_CLIENT` | `mssql` (por defecto) o `sqlite`. |
| `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a SQL Server. En una instancia con nombre deje `DB_PORT` vacío. |
| `DB_ENCRYPT`, `DB_TRUST_CERT` | Cifrado de la conexión (por defecto `false` y `true`). |
| `SQLITE_FILE` | Archivo de la base SQLite (solo demo). |

El `.env` **nunca se sube a git** (ya está en `.gitignore`).

## Multiempresa

```
http://servidor/            (o /BEP/)         portal: login + elegir empresa (igual para todos)
http://servidor/<empresa>/                    el sistema BEP de esa empresa (ej. /acme/)
```

- **Una sola base de datos.** Cada tabla de datos lleva `EmpresaId`; el servidor filtra **automáticamente** toda consulta por la empresa activa (y rechaza cualquier consulta que no pueda filtrar), así que una empresa nunca ve ni toca datos de otra, aunque conozca los números de registro.
- **Superadmin:** crea, edita, desactiva empresas y les agrega administradores desde *Configuración → Administración → Empresas* (opción que solo ve él). Se mueve entre todas las empresas y trabaja en ellas como administrador, pero **no figura como usuario**: no aparece en las listas de usuarios, ni en los conteos ni en la búsqueda de contactos de ninguna empresa, y ningún administrador de empresa puede verlo ni modificarlo.
- **Administrador de empresa:** configura el catálogo de su empresa, sus proyectos y sus usuarios (rol *Administrador* o *Usuario*).
- **Usuario:** trabaja con los BEP de su empresa; no ve la configuración ni la lista de usuarios.
- Una persona puede estar en **varias empresas** con la misma cuenta; al ingresar elige a cuál ir. Su correo y contraseña son suyos: el administrador de una empresa no puede cambiarlos si la cuenta también pertenece a otra.
- **Cambio de empresa:** solo el superadmin cambia de empresa. La sesión de cualquier otro usuario queda fija a la primera empresa en la que entra (el servidor rechaza entrar a otra con 403).
- **Empresa nueva:** recibe una copia de los catálogos iniciales (tipos, clases, usos BIM, especialidades, LOD, roles, RACI…) y un proyecto inicial (`Proyecto general`). **No** recibe organizaciones: el administrador debe crear al menos una de tipo *Propietario/Desarrollador* para poder elegir Cliente al crear su primer BEP.
- Dirección de la empresa: de 2 a 30 caracteres (minúsculas, números y guiones), sin repetirse y fuera de los nombres reservados (`admin`, `api`, `auth`, `portal`, `login`, `bep`, entre otros).
- Archivos subidos: carpeta propia por empresa (`ArchivosBEP/emp-N`).
- Si ya había datos: al ejecutar el script nuevo, todo lo existente pasa a la **Empresa principal** (`/principal/`).

### Crear otro superadmin

No hay botón: se marca en la base. Cree primero a la persona (por ejemplo como administrador de una empresa) y luego, en SQL Server:

```sql
UPDATE Usuario SET UsuarioSuper = 1 WHERE UsuarioNombre = 'correo@dominio.com';
```

Deja de aparecer en las listas de usuarios de las empresas. Para revertirlo, use `0`.

## Front (public/AppBEP)

SPA sin compilación: Alpine.js 3, Bootstrap 5.3, DataTables, jQuery/Select2. Detalles en `public/AppBEP/README.md`.

- **Rediseño:** solo Bootstrap, azul marino + naranja, botones tipo píldora, animaciones de Bootstrap, DataTables con estilo Bootstrap 5, pie de página translúcido.
- **Barra superior fija** que se compacta al bajar. Conserva el alto de la barra grande para no provocar rebotes de scroll en páginas cortas.
- **Modo oscuro:** interruptor en el menú del perfil (se recuerda en el navegador). Paleta neutra, logo blanco automático. Aún no aplica al login ni al portal.
- **URL por pantalla:** `/<empresa>/empresas`, `/usuarios`, `/crear`, `/bep-<id>[-seccion]`, etc.; el servidor devuelve `index.html` para esas rutas.
- **Fotos y logos:** cada usuario sube su foto desde el menú del perfil; el logo de la empresa se sube en *Mi empresa* (el superadmin puede cambiar el de cualquiera). Se aceptan PNG, JPG y WEBP de hasta 1 MB; nunca SVG. Se guardan en `ArchivosBEP/_imagenes/`.

## Despliegue

### Linux (nginx + systemd)

Guía en `deploy/linux/LEEME-LINUX.md`. Resumen:

- Código en `/home/<usuario>/Bep/BackNode`, servicio `bep-backend` (systemd) y nginx como proxy inverso con HTTPS.
- La configuración vive en `.env` (permisos `600`). El servicio escucha solo en `127.0.0.1`.

**Actualizar el código (sin tocar datos ni configuración):**

```bash
cd /home/<usuario>/Bep
mkdir -p respaldo
tar czf respaldo/BackNode-$(date +%F-%H%M).tar.gz --exclude=node_modules BackNode   # respaldo previo
cd BackNode && rm -rf public src server.js
tar xzf ../paquete.tar.gz -C .      # el paquete contiene public/, src/ y server.js
cd .. && rm paquete.tar.gz
sudo systemctl restart bep-backend
curl -s http://127.0.0.1:<puerto>/health
```

No se pisan `.env`, `ArchivosBEP/`, `node_modules/` ni la base de datos. Después, refrescar el navegador con Ctrl+F5. Un cambio solo de CSS o JS del front no necesita reiniciar el servicio; uno de servidor (`src/`, `server.js`) sí.

### Windows (IIS)

Guía en `deploy/iis/LEEME-IIS.md`: proxy inverso con `deploy/iis/web.config` y Node como Servicio de Windows (`npm run service:install`).

## Operación

- **Respaldos:** hay que respaldar **dos cosas juntas**: la base de datos `BEP` (respaldo de SQL Server) y la carpeta `ArchivosBEP/` (incluye `_imagenes/`). Si se pierde solo una, quedan registros que apuntan a archivos inexistentes.
- **SQL Server:** use un login propio para BEP (`db_owner` solo dentro de la base `BEP`, que necesita `npm run db:init` para crear tablas) y no el administrador. Puede restringirse después a lectura/escritura si el esquema ya está creado.
- **Secretos:** `JWT_SECRET`, clave de la base y claves de usuarios no van en el repositorio. Cambie la clave inicial del superadmin al primer ingreso.
- **Desactivar vs. borrar una empresa:** desde *Empresas → Editar* se desactiva (conserva los datos). No hay borrado desde la interfaz.

## Pruebas

`npm test` ejecuta 280 comprobaciones sobre SQLite: API, CRUD, copias de etapas, subida de archivos, reporte, y multiempresa (roles, aislamiento entre empresas, cuentas compartidas, empresas desactivadas, límite de intentos de login).

## Qué incluye el script SQL

- Tablas de BEP (tipos, categorías, usos BIM, especialidades, LOD, elementos, RACI, hitos, flujo de trabajo, reuniones, etc.).
- 3 tablas que antes vivían en Supervisore y BEP necesita: `Campana` (proyectos), `Personal` y `Usuario`. Se crean solo si no existen; si ya usa la base de Supervisore, no se tocan.
- Multiempresa: tablas `Empresa` y `UsuarioEmpresa` y la columna `EmpresaId` en cada tabla de datos (en una base existente se agrega con valor 1).
- Datos iniciales: la Empresa principal, catálogos (28 usos BIM, 28 subactividades, especialidades, LOD, roles, leyenda RACI…), proyectos de ejemplo y el usuario administrador (superadmin).

### Base compartida con Supervisore

Si apunta `DB_NAME` a la base de Supervisore, BEP usará sus `Campana`, `Personal` y `Usuario`. Las claves de Supervisore (Encrypt64) no pueden validarse aquí, por lo que solo ingresan los usuarios creados desde BEP (clave con scrypt).

## Diferencias respecto al backend GeneXus

- Copiar una etapa ahora también copia el detalle LOI; se conserva el `UsuarioId` en las copias.
- Las claves se guardan con hash; la consulta de usuario nunca devuelve la clave (clave vacía al editar = se mantiene).
- La paginación `siguiente` respeta los mismos filtros que la lista.
- Cada operación de guardado es transaccional.
- El CRUD genérico acepta el guardado nuevo como `POST <Tabla>` y como `POST <Tabla>/0`, que es como lo envía el front.

## Limitaciones y puntos conocidos

- Todas las empresas comparten una base y un mismo origen web. El aislamiento depende del código del servidor (filtro por `EmpresaId`); si en el futuro una empresa exige separación física, se puede pasar a una base por empresa.
- Si la base es la de Supervisore, las tablas `Campana` y `Personal` reciben también `EmpresaId` (valor 1 para lo existente).
- Los catálogos no impiden crear registros con nombre repetido (por ejemplo, un uso BIM duplicado).
- Una empresa nueva no trae organizaciones; hasta crear una de tipo *Propietario/Desarrollador*, la lista de Cliente queda vacía y el sistema no lo explica.
- El modo oscuro no cubre el login ni el portal.
- En producción use HTTPS y `COOKIE_SECURE=true`.

## Hoja de ruta (priorización valor / esfuerzo)

Funcionalidades evaluadas, de menor a mayor esfuerzo:

- **Rápidas:** guía de ayuda para crear el primer BEP, lista de recursos informáticos en lugar de solo CDE, EIR como apartado del BEP.
- **Apuestas estratégicas:** LOIN detallado por propósito, hito y elemento (base de varias de las siguientes); vínculo requisito-respuesta; matriz de responsabilidades por elemento e hito; seguimiento de hitos y comparación de revisiones; copiloto de IA y sugerencia de usos BIM (requiere decidir proveedor y política de datos).
- **Pendientes técnicos:** integración con Keycloak, botón para crear superadmins desde la interfaz, validación de nombres repetidos en catálogos y mensaje claro cuando falta una organización cliente.

Las migraciones que cambian el modelo de datos conviene hacerlas pronto, mientras hay pocos datos cargados.
