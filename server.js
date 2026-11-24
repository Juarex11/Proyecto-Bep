'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const fs = require('fs');

// '/BEP/' | 'BEP' -> '/BEP'   ;   '' | '/' -> ''
function normBase(v) {
  const s = String(v || '').trim().replace(/^\/+|\/+$/g, '');
  return s ? '/' + s : '';
}

/**
 * Estructura (multiempresa):
 *   <base>/                       portal: login + elegir empresa (+ administracion de empresas para el superadmin)
 *   <base>/auth/*, /portal/*      API de la plataforma
 *   <base>/<empresa>/             el sistema BEP de esa empresa (front, /General, /rest/General, /ArchivosBEP)
 */
function createApp(env = process.env, rawDb = require('./src/db')(env)) {
  const app = express();
  const base = normBase(env.BASE_PATH);          // '' (raiz) o '/BEP' (bajo un sitio, ej. http://localhost/BEP/)
  const r = express.Router();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');   // detras de IIS / Nginx (proxy inverso en el mismo servidor)
  // Nada con datos de usuario se guarda en cache (ni en el navegador ni en el proxy IIS/ARR, que si no puede devolver
  // una respuesta vieja o de otra persona, p. ej. seguir "con sesion" despues de cerrarla). Solo los archivos estaticos (js/css/imagenes) se revalidan.
  app.use((req, res, next) => {
    const estatico = /\.(js|css|png|jpe?g|gif|svg|ico|woff2?|ttf|map)$/i.test(req.path) && !/\/ArchivosBEP\//i.test(req.path);
    res.setHeader('Cache-Control', estatico ? 'no-cache' : 'no-store, no-cache, must-revalidate, private');
    if (!estatico) { res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0'); }
    next();
  });
  r.use(express.json({ limit: '60mb' }));

  const ctx = require('./src/ctx');
  const { scope } = require('./src/db/tenant');
  const db = scope(rawDb);                                   // TODO el codigo de BEP usa esta: siempre filtrada por la empresa de la peticion
  const empresas = require('./src/empresa').crearRegistro(rawDb);
  const auth = require('./src/auth')({ db: rawDb, env, base, empresas });
  const frontDir = path.resolve(__dirname, env.FRONT_DIR || './public/AppBEP');
  const uploadDir = path.resolve(__dirname, env.UPLOAD_DIR || './ArchivosBEP');
  fs.mkdirSync(uploadDir, { recursive: true });
  // archivos subidos antes del modo multiempresa pertenecen a la empresa 1
  try {
    const old = fs.readdirSync(uploadDir, { withFileTypes: true }).filter((d) => d.isFile());
    if (old.length) {
      fs.mkdirSync(path.join(uploadDir, 'emp-1'), { recursive: true });
      for (const f of old) fs.renameSync(path.join(uploadDir, f.name), path.join(uploadDir, 'emp-1', f.name));
    }
  } catch (e) { console.warn('No se pudieron reubicar los archivos antiguos:', e.message); }

  // --- publico ---
  r.get('/health', (req, res) => res.json({ ok: true, db: rawDb.kind, version: 'multiempresa-12' }));

  // --- plataforma: portal, login, empresas ---
  const portalFile = path.join(__dirname, 'public', 'portal.html');
  r.use('/_portal', express.static(path.join(__dirname, 'public', 'portal'), { index: false, maxAge: '1h' }));   // imagenes del login (antes de /:empresa)
  r.use(require('./src/platform')({ db: rawDb, base, auth, empresas, portalFile, uploadDir }));

  // --- cada empresa en /<empresa>/ ---
  const apibep = require('./src/routes/apibep')(db, { UPLOAD_DIR: uploadDir });
  const apiconfig = require('./src/routes/apiconfig')(db, auth, require('./src/imagenes')(uploadDir));
  const rest = require('./src/routes/rest')(db);
  const tenant = express.Router();
  tenant.get('/login.html', (req, res) => res.redirect(`${base}/?empresa=${encodeURIComponent(req.empresa.slug)}`));
  tenant.get('/logout', (req, res) => { auth.revocarDe(req); res.setHeader('Cache-Control', 'no-store'); res.setHeader('Set-Cookie', auth.limpiarEmpresa(req.empresa.slug)); res.redirect(`${base}/`); });
  tenant.use('/General', auth.requireEmpresa, apibep, apiconfig);
  tenant.use('/rest/General', auth.requireEmpresa, apibep, apiconfig, rest);
  tenant.use('/ArchivosBEP', auth.requireEmpresa, (req, res, next) => express.static(path.join(uploadDir, 'emp-' + req.empresa.id), { index: false })(req, res, next));
  if (fs.existsSync(frontDir)) {
    // las paginas HTML no se guardan en cache: al cerrar sesion y volver "atras" no debe verse el sistema
    const sinCache = { setHeaders: (res, f) => { if (/\.html?$/i.test(f)) res.setHeader('Cache-Control', 'no-store'); } };
    tenant.use('/AppBEP', express.static(frontDir, { index: ['index.html'], ...sinCache }));
    tenant.use('/', express.static(frontDir, sinCache));
    // Cada pantalla tiene su direccion (/<empresa>/empresas, /<empresa>/bep-12 ...): al recargar se entrega la aplicacion y ella abre esa pantalla
    tenant.get(/^\/[A-Za-z0-9_-]+$/, (req, res, next) => {
      if (!/text\/html/.test(req.headers.accept || '')) return next();
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(frontDir, 'index.html'));
    });
  } else {
    tenant.get('/', (req, res) => res.status(200).send(`API BEP activa. No se encontro el front en ${frontDir} (variable FRONT_DIR).`));
  }

  r.use('/:empresa', async (req, res, next) => {
    try {
      const e = await empresas.porSlug(req.params.empresa);
      if (!e) return res.status(404).type('text').send('Empresa no encontrada');
      if (!e.activa) return res.status(403).type('text').send('Esta empresa esta desactivada');
      // /BEP/acme (sin barra final) -> /BEP/acme/ : si no, las rutas relativas del front (js/..., css/...) se rompen
      if (req.path === '/' && !req.originalUrl.split('?')[0].endsWith('/')) return res.redirect(req.originalUrl.replace(/(\?|$)/, '/$1'));
      req.empresa = e;
      ctx.run(e.id, () => tenant(req, res, next));   // la empresa viaja con toda la peticion (filtro automatico en la base)
    } catch (err) { next(err); }
  });

  app.use(base || '/', r);
  if (base) app.get('/', (req, res) => res.redirect(base + '/'));
  if (base) app.get(base, (req, res) => res.redirect(base + '/'));

  app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
    if (!err.status || err.status >= 500) console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  });
  return { app, db: rawDb };
}

module.exports = { createApp };

if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('cambie')) console.warn('AVISO: defina un JWT_SECRET propio y largo en .env (los tokens se firman con el).');
  const { app, db } = createApp();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';   // con IIS use HOST=127.0.0.1
  db.connect().then(() => {
    app.listen(port, host, () => console.log(`BEP escuchando en http://${host === '0.0.0.0' ? 'localhost' : host}:${port}  (BD: ${db.kind})`));
  }).catch((e) => { console.error('No se pudo conectar a la base de datos:', e.message); process.exit(1); });
}
