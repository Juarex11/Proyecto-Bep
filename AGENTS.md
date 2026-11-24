# AGENTS.md — Guía de traspaso para quien continúe este proyecto

Documento para una IA (o una persona) que retoma **Lyracode BEPcloud (BackNode)**. Léelo completo antes de tocar código. La descripción general del producto está en `README.md`; aquí va lo que no cabe en un README: cómo trabajar, qué reglas no romper, qué trampas ya se encontraron y qué queda pendiente.

## 1. En una frase

Sistema multiempresa para crear el Plan de Ejecución BIM (BEP) de proyectos de construcción. Backend Node.js + Express, SQL Server en producción (SQLite para pruebas), front SPA con Alpine.js + Bootstrap sin paso de compilación. En producción: https://bep.lyracode.com.

## 2. Cómo trabajar con la persona que lo mantiene

- **Idioma:** español. Interfaz, mensajes de error, comentarios y documentación van en español.
- **Estilo de trabajo que pidió:** *paso a paso*. Cuando la guíes en una prueba o una instalación, da **un solo paso por mensaje**, con dónde hacer clic, qué escribir (con datos de ejemplo ficticios), qué debería pasar y cómo comprobarlo. No vuelques todo de golpe.
- **Explica lo que haces** y por qué, en lenguaje claro. Ella/él está aprendiendo el funcionamiento del sistema.
- Prefiere **probar de punta a punta** (Configuración → crear un BEP) para detectar fallos antes de que lleguen a producción.
- **No tienes acceso al VPS ni a SQL Server de producción.** Todo cambio en producción lo aplica la persona: tú le entregas un paquete y los comandos exactos. Nunca pidas ni uses claves de servidores; si aparecen en una captura o un chat, no las uses ni las repitas.
- **No metas datos de prueba en producción.** Prueba en una copia local con SQLite (ver §5).
- Antes de cambios grandes (modelo de datos, migraciones, modo de uso), pregunta. Para correcciones claras, hazlas y explica.

## 3. Reglas del proyecto que no debes romper

### Backend

1. **Aislamiento por empresa.** Toda tabla de datos tiene `EmpresaId`, y `src/db/tenant.js` reescribe cada consulta para filtrar por la empresa activa (que viaja con la petición en `src/ctx.js`). Si una sentencia no se puede filtrar, **se rechaza**. Usa siempre el `db` que reciben las rutas, nunca una conexión cruda para datos de empresa. Cualquier tabla nueva debe declararse como tenant.
2. **El esquema vive en `src/schema.js`.** De ahí salen el script T-SQL (`npm run gen:sql` → `sql/BEP_Completo.sql`), las tablas SQLite y el CRUD genérico `/rest/General/<Tabla>`. **No edites `BEP_Completo.sql` a mano**; cambia el esquema y regenera. El script debe seguir siendo idempotente (se ejecuta sobre bases que ya existen).
3. **Todo debe funcionar igual en SQL Server y SQLite.** La app corre en SQL Server pero las pruebas usan SQLite. Evita sintaxis exclusiva de uno; si es inevitable, resuélvelo en `src/db/mssql.js` / `src/db/sqlite.js`.
4. **Catálogos por empresa.** Al crear una empresa, `src/empresa.js` copia los catálogos de `src/seed.js` (`CATALOGOS`). **No siembra organizaciones**: el campo *Cliente* de un BEP lista solo organizaciones de tipo 1 (Propietario/Desarrollador), así que una empresa nueva debe crear una antes de su primer BEP.
5. **El superadmin** es `Usuario.UsuarioSuper = 1`. No figura como usuario en ninguna empresa (las consultas excluyen `UsuarioSuper`), pero tiene una ficha interna de administrador en cada empresa a la que entra (`asegurarSuper`). Un correo de superadmin no puede ser miembro de una empresa. No hay botón para crear superadmins: se marca en SQL.
6. **Sesión:** JWT en cookie. Solo el superadmin cambia de empresa; la sesión de los demás queda fija a su empresa (403 si intentan otra). Se aplica límite de intentos de login.
7. **Contraseñas:** hash con scrypt (`hashPassword` en `src/seed.js`). Nunca devolver claves en respuestas.
8. **Archivos subidos** van a `ArchivosBEP/emp-<id>/` (y `_imagenes/` para fotos y logos). En la base solo queda su registro. Los respaldos deben incluir base **y** carpeta.

### Front (`public/AppBEP`)

1. **Sin compilación.** Alpine.js 3, Bootstrap 5.3, jQuery + Select2, DataTables 3. No introduzcas bundlers.
2. **Una carpeta por pantalla:** `pages/<nombre>/<nombre>.html` + `.js`. El router (`js/core/router.js`) las carga. Las secciones del BEP están en `SECCIONES_BEP` y las de configuración en `URL_CONFIG`.
3. **Cada pantalla tiene su URL** (`/<empresa>/<slug>`, `/bep-<id>[-seccion]`). El servidor devuelve `index.html` para esos rutas de un segmento. Respeta `basePath` (el sistema puede colgar de `/BEP`).
4. **Tablas:** usa la directiva `x-tabla` (`js/ui/tablas.js`) para DataTables y `x-bscollapse` para los paneles que se abren. La documentación de columnas y acciones está en el encabezado de ese archivo.
5. **Estilos:** el tema está en `css/bep-bootstrap.css`, con variables CSS (`--bep-sup`, `--bep-borde`, …). **No pongas colores fijos**: usa las variables para que el **modo oscuro** (`data-bs-theme="dark"`, interruptor en el perfil, guardado en `localStorage` como `bep_tema`) siga funcionando. El informe PDF (`#contentPDF`) se fuerza a tema claro.
6. **Contraste:** cualquier botón nuevo debe verse en tema claro y oscuro. Ya hubo botones naranja sobre naranja y desactivados ilegibles; se corrigieron.
7. **Barra superior fija:** `#navbar` es *sticky* y conserva el alto de la barra grande; la clase `bep-scrolled` del `<body>` la compacta (histéresis 60/10 px). No cambies el alto del contenedor al compactar: provoca un bucle de scroll en páginas cortas.
8. **Modo de uso:** `USO_BEP` (`completo` | `soloBEP`) se guarda en una cookie **al iniciar sesión**; tras cambiarlo hay que cerrar sesión y volver a entrar. En `soloBEP` se oculta el campo *Proyecto*, la columna Proyecto y el Gantt de hitos de entrega.

## 4. Trampas ya encontradas (no las repitas)

| Síntoma | Causa | Solución aplicada |
|---|---|---|
| "Error en el servidor" al crear en cualquier catálogo | El front guarda con `POST <Tabla>/0` y el CRUD solo aceptaba `POST <Tabla>` | `rest.js` acepta `POST /:t` y `POST /:t/:id` |
| Campo *Clase* vacío al reabrir un BEP guardado | Alpine no vuelve a marcar el valor de un `<select>` cuyas opciones se dibujan después; asignar el mismo valor no dispara cambio | En `bep-descripcion.js` se pasa por vacío y se reasigna tras dos `$nextTick` |
| Barra superior que crece y se achica sin parar | Al compactarse, el documento se acortaba y el scroll volvía bajo el umbral | Contenedor con alto fijo + histéresis |
| *Cliente* vacío en una empresa nueva | No hay organizaciones de tipo Propietario | Crear una en Configuración → Matriz → Organizaciones (pendiente: mensaje o semilla) |
| Duplicados en Usos BIM | Los catálogos no validan nombres repetidos | Pendiente |
| Un `.html` de pantalla duplicado o con `<div>` sin cerrar | Reemplazos con regex sobre HTML | Revisa balance de etiquetas tras cada edición |
| Consola con un 401 de `/auth/yo` al abrir sin sesión | Es la comprobación de sesión; es normal | Opcional: silenciar |
| `tar` del respaldo ignora `--exclude` | La opción debe ir **antes** del origen | `tar czf x.tar.gz --exclude=node_modules BackNode` |
| Servidor de pruebas que "muere" entre comandos | Los procesos en segundo plano del entorno no persisten | Relanzarlo en el mismo comando de prueba |

## 5. Cómo probar

```bash
npm install
npm test        # 280 comprobaciones sobre SQLite (API, multiempresa, aislamiento, archivos, reporte)
```

**Prueba en navegador contra una copia local** (no toca producción):

```bash
DB_CLIENT=sqlite SQLITE_FILE=/tmp/bep-prueba.db PORT=3300 JWT_SECRET=prueba node server.js
```

- Entra como superadmin con el usuario inicial de `src/seed.js` y crea una empresa de prueba desde *Configuración → Administración → Empresas* (o `POST /portal/empresas`).
- Para automatizar, Playwright con Chromium funciona bien: captura respuestas HTTP ≥ 400, errores de consola y excepciones JS en cada pantalla, y haz capturas en tema claro y oscuro.
- Tras tocar la interfaz, revisa **claro y oscuro**, pantalla estrecha y que los botones se vean.
- `npm run seed:demo` carga un BEP de ejemplo completo con el servidor encendido.

**Recorrido manual de punta a punta (el que importa):**
1. Superadmin crea una empresa con su administrador.
2. Administrador entra y revisa/completa Configuración (Proyectos, Alcance, Matriz; crear una organización *Propietario*).
3. Crea usuarios y prueba el rol *Usuario* (no debe ver Empresas ni Administración).
4. Crear nuevo BEP → recorrer **todas** las secciones (objetivos, usos BIM, alcance, contactos, RACI, hitos, flujo, CDE, reuniones, canales) → recargar (F5) y comprobar que todo persiste.
5. Lista de BEP: buscar, abrir, editar, informe PDF.
6. Segunda empresa: confirmar que no ve nada de la primera.

## 6. Despliegue (lo hace la persona)

Producción: Ubuntu en Oracle Cloud, nginx → Node (`127.0.0.1:3100`) → SQL Server en otro servidor. Servicio systemd `bep-backend`. El VPS comparte máquina con otro proyecto (**SONDA**): **no tocar su carpeta ni sus servicios**; BEP vive solo en `/home/ubuntu/Bep`.

Flujo de actualización (sin tocar `.env`, `ArchivosBEP/`, `node_modules/` ni la base):

1. Tú empaquetas **solo** `public`, `src` y `server.js`:
   `tar --exclude=node_modules --exclude='*.db' --exclude='*.sqlite*' --exclude=.env -czf BEP-rediseno-bootstrap.tar.gz public src server.js`
2. La persona lo sube con `scp` y en el VPS: respalda, borra `public src server.js`, extrae, reinicia `bep-backend` y comprueba `/health` (debe decir `"db":"mssql"`).
3. Cambios solo de CSS/JS del front no necesitan reinicio; cambios en `src/` o `server.js` sí. Siempre pedir Ctrl+F5.
4. Si cambias el esquema: regenera `sql/BEP_Completo.sql` y dile que ejecute `npm run db:init` en el VPS (es idempotente).

En su PC existe también una instalación con IIS (`deploy/iis/`) y un servicio de Windows "BEP Backend" que hay que reiniciar tras actualizar `server.js`.

El repositorio git es la carpeta `BackNode` (remoto `origin` → GitHub, rama `main`). Nunca subas `.env`; revisa `git status` antes de cada commit.

## 7. Configuración

Variables en `.env` (plantilla en `.env.example`): `PORT`, `HOST`, `BASE_PATH`, `FRONT_DIR`, `UPLOAD_DIR`, `JWT_SECRET`, `SESSION_HOURS`, `REMEMBER_DAYS`, `COOKIE_SECURE`, `USO_BEP`, `DB_CLIENT`, `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_CERT`, `SQLITE_FILE`. Los secretos nunca van al repositorio ni a documentos.

## 8. Estado actual y pendientes

**Hecho:** backend Node multiempresa en producción sobre SQL Server; rediseño completo del front (Bootstrap, DataTables, modo oscuro, barra fija animada, URL por pantalla); fotos y logos; migración a SQL Server con base y login propios; correcciones de guardado en catálogos y de la Clase del BEP; README y esta guía.

**Pendiente inmediato (necesita decisión o acción de la persona):**
- Decidir `USO_BEP`: `completo` (con *Proyecto* y Gantt de entregas) o `soloBEP` (como el sistema original, sin Proyecto). Se inclina por `soloBEP`.
- Terminar la prueba de punta a punta en producción con una empresa de prueba (`zz-prueba…`) y luego desactivarla.
- Cambiar la clave del superadmin inicial y la clave temporal del login de SQL Server; convertir a otros en superadmin con SQL si hace falta.
- Respaldos automáticos de la base `BEP` y de `ArchivosBEP/`.
- Renombrar `/semco-sa` a `/semco` si lo desea (las URLs antiguas dejan de funcionar).

**Mejoras técnicas ya identificadas:**
- Validar nombres repetidos en los catálogos.
- Mensaje claro (o organización de ejemplo) cuando una empresa nueva no tiene Cliente.
- Etiquetas cortadas en el formulario *Agregar Empresa* ("Correo del administrador").
- Botón "Hacer superadmin" en la pantalla Empresas.
- Modo oscuro en login y portal.
- Integración de login con **Keycloak** (fase posterior; hoy el login es el propio de BEP).
- Reducir permisos del login de SQL Server cuando el esquema esté estable.

**Hoja de ruta funcional** (priorizada por valor/esfuerzo con el equipo): rápidas — ayuda guiada para el primer BEP, lista de recursos informáticos en lugar de solo CDE, EIR como apartado; luego LOIN detallado (base de varias otras), vínculo requisito-respuesta, matriz de responsabilidades por elemento e hito, seguimiento de hitos y comparación de revisiones; al final, copiloto de IA y sugerencia de usos BIM (antes hay que decidir proveedor y política de datos). Las migraciones que cambian el modelo conviene hacerlas pronto, con pocos datos cargados, y siempre con respaldo y probadas en copia.

## 9. Mapa rápido del código

```
server.js                  arranque Express, rutas por empresa, SPA fallback, estáticos
src/auth.js                login, sesión JWT, roles, límite de intentos, cambio de empresa
src/platform.js            portal: empresas (superadmin), fotos y logos, /auth/*
src/empresa.js             crear empresa, semilla de catálogos, altas de miembros, asegurarSuper
src/schema.js              definición única de tablas  → gen-sql, SQLite, CRUD
src/seed.js                datos iniciales y superadmin
src/db/                    mssql.js, sqlite.js, tenant.js (filtro EmpresaId)
src/routes/                apibep.js (consultas), apibep-post.js (guardados), apiconfig.js, rest.js (CRUD)
public/portal.html         login y portal
public/AppBEP/             front: index.html, css/, js/core|ui|vendor, pages/<pantalla>/
tools/                     gen-sql, run-sql, seed-demo, servicio-windows
test/                      smoke.js (API) y multiempresa.js (aislamiento)
deploy/                    linux (nginx + systemd) e iis
```

Cuando termines una tanda de trabajo: corre `npm test`, verifica en navegador (claro y oscuro), actualiza este archivo y el `README.md` si cambió algo del funcionamiento, y entrega el paquete con los comandos de despliegue.
