# Publicar BEP en IIS

IIS no ejecuta Node directamente. El esquema es:

```
Navegador → IIS (puertos 80/443, certificado HTTPS) → Node (127.0.0.1:3000, servicio de Windows) → SQL Server
```

IIS recibe a los usuarios y reenvía **todo** al Node (portal, front de cada empresa y datos), que corre como Servicio de Windows y se inicia solo con el servidor. Desde el modo multiempresa las direcciones son `http://localhost/BEP/` (portal: login y elección de empresa) y `http://localhost/BEP/<empresa>/` (el sistema de cada empresa); por eso IIS ya no sirve archivos del front, solo reenvía.

BEP se publica de dos formas (elija una):

- **A. Bajo un sitio existente, como aplicación:** `http://localhost/BEP/` (igual que `/SondaV2Portal`). Usa `deploy\iis\web.config` y `BASE_PATH=/BEP`. Todo se instala con `Instalar-BEP-en-IIS.bat`; el front se edita directamente en `BackNode\public\AppBEP` (no hay que copiar nada).
- **B. Como sitio propio:** `https://bep.miempresa.com/` (portal) y `https://bep.miempresa.com/<empresa>/`. Usa `deploy\iis\web.config.sitio-propio` (renombrado a `web.config`) y `BASE_PATH` vacío.

Esta guía describe la opción A; la B cambia solo el paso 6 y el `BASE_PATH`.

## Requisitos en el servidor

- Node.js 22 o superior (instalador LTS de nodejs.org).
- IIS con los módulos **URL Rewrite** y **Application Request Routing (ARR)** (instaladores en iis.net).
- La base `BEP` ya creada (script `sql/BEP_Completo.sql`).

## Paso a paso

**1. Copiar el proyecto**

Copie la carpeta `BackNode` a, por ejemplo, `C:\BEP\BackNode`. Si copia desde otra PC no lleve `node_modules`.

**2. Configurar `.env`** (en `C:\BEP\BackNode`)

```
PORT=3000
HOST=127.0.0.1
BASE_PATH=/BEP              (opcion A; vacio en la opcion B)
JWT_SECRET=<frase larga y propia>
COOKIE_SECURE=true          (si publica con HTTPS)
DB_CLIENT=mssql
DB_SERVER=localhost\MSSQLSERVER02
DB_PORT=
DB_NAME=BEP
DB_USER=<usuario de la base, no sa>
DB_PASSWORD=<clave>
DB_ENCRYPT=true
DB_TRUST_CERT=true
```

Con `HOST=127.0.0.1` el Node solo acepta conexiones del propio servidor: los usuarios entran únicamente por IIS.

**3. Instalar dependencias y probar**

En CMD, dentro de `C:\BEP\BackNode`:

```
npm install --omit=dev
npm start
```

Debe decir "BEP escuchando". Pruebe `http://127.0.0.1:3000/health`. Detenga con Ctrl+C.

**4. Instalar el Servicio de Windows**

Abra CMD **como Administrador** en `C:\BEP\BackNode`:

```
npm run service:install
```

Queda el servicio **BEP Backend** (verifíquelo en `services.msc`, tipo Automático). Para quitarlo: `npm run service:uninstall`.

Si la cuenta del servicio no accede a la base, en `services.msc` → BEP Backend → Propiedades → Iniciar sesión, elija una cuenta con permisos. Si usa usuario y clave de SQL esto no hace falta.

**5. Activar el proxy en ARR**

En el Administrador de IIS: clic en el nombre del servidor → *Application Request Routing Cache* → *Server Proxy Settings* → marque **Enable proxy** → Aplicar.

**6. Crear la aplicación en IIS (opción A)**

Lo más simple: ejecute `Instalar-BEP-en-IIS.bat` (doble clic, acepta permisos de Administrador). Instala URL Rewrite y ARR si faltan, activa el proxy, crea la aplicación `BEP` en *Default Web Site* con el `web.config` de reenvío y escribe `BASE_PATH=/BEP` en el `.env`.

**Si ya tenía instalada la versión anterior** (front dentro de `C:\inetpub\wwwroot\BEP`): vuelva a ejecutar `Instalar-BEP-en-IIS.bat` (o copie `deploy\iis\web.config` a esa carpeta, reemplazando el anterior). Los archivos viejos del front que queden ahí ya no se usan; puede borrarlos.

Para cambiar el front más adelante: edite los archivos en `BackNode\public\AppBEP` (estructura: `index.html`, `css\`, `js\core`, `js\ui`, `pages\<nombre>\`; ver el README de esa carpeta) y recargue el navegador con Ctrl+F5. No hace falta copiar ni reiniciar. `Subir-Front-IIS.bat` ya no copia nada: solo muestra este aviso.

A mano: cree la aplicación `BEP` bajo el sitio con ruta `C:\inetpub\wwwroot\BEP` y grupo *Sin código administrado*, y copie ahí solo `deploy\iis\web.config`.

(Opción B: sitio nuevo; copie `web.config.sitio-propio` renombrado a `web.config` y deje `BASE_PATH` vacío. Ahí Node entrega también el front.)

**7. Probar**

Abra `http://localhost/BEP/` (o la dirección de su sitio) e ingrese con `admin@bep.local` (superadmin). Cambie la clave del administrador (botón *Cambiar contraseña* del portal). Dentro del sistema, en *Configuración → Administración → Empresas* (solo lo ve el superadmin), cree las empresas; cada una queda en `http://localhost/BEP/<direccion>/`.

## Si algo falla

- **502 o 503 de IIS:** el servicio BEP Backend no está iniciado, o el puerto del `web.config` no coincide con `PORT`.
- **Pantalla sin estilos o sin datos:** `BASE_PATH` del `.env` no coincide con el alias de la aplicación (`/BEP`). Reinicie el servicio tras cambiarlo.
- **404 de IIS con la dirección del sitio:** falta URL Rewrite o ARR, o no está activado el proxy (paso 5), o el `web.config` de la carpeta es el anterior (copie el nuevo).
- **"Empresa no encontrada" al abrir `/BEP/algo/`:** esa dirección no existe como empresa (créela en el portal) o está desactivada.
- **Comparte cookies con otra aplicación del mismo sitio** (ej. SondaV2Portal): BEP usa cookies con nombre propio (`bep_sesion`, `bep_token`, `bep_uso`) solo para `/BEP` y `/BEP/<empresa>`, así que no deben chocar ni cerrarse unas a otras. Si algo raro queda de versiones anteriores, borre las cookies del sitio una vez (Ctrl+Shift+Supr).
- **Sigue "con sesión" después de cerrarla, o ve datos viejos:** el proxy de IIS (ARR) estaba guardando respuestas en caché. La versión `multiempresa-6` en adelante manda `Cache-Control: no-store` en todo lo que no es un archivo estático. Tras actualizar, reinicie IIS una vez (`iisreset` en CMD como Administrador) para vaciar lo que ya tenía guardado. Compruebe la versión en `http://localhost/BEP/health`.
- **No retiene la sesión:** si usa HTTP, ponga `COOKIE_SECURE=false`; si usa HTTPS, `true`.
- **Error al subir archivos grandes:** el `web.config` permite 100 MB. Ajuste `maxAllowedContentLength` si necesita más.
- **Errores de base de datos:** el servicio escribe su registro en la carpeta `daemon` dentro de `BackNode`.
- **Firewall:** abra solo 80/443 al exterior. El 3000 no debe estar expuesto.

## Actualizar después

1. Detenga el servicio: `net stop "BEP Backend"`.
2. Reemplace los archivos (no toque `.env` ni `ArchivosBEP`).
3. `npm install --omit=dev` y `net start "BEP Backend"`.

## Respaldo

Respalde la base `BEP` (contiene todas las empresas) y la carpeta `ArchivosBEP` (archivos subidos; cada empresa tiene su subcarpeta `emp-N`).
