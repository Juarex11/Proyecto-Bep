'use strict';
/* Login + JWT HS256. Cookies propias de BEP (bep_sesion, bep_token, bep_uso): no se llaman como las de otras aplicaciones del mismo sitio (access_token) para no pisarse al cerrar sesion */
const crypto = require('crypto');
const { hashPassword } = require('./seed');

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
// El front decodifica con atob(): los caracteres no ASCII se escapan como \uXXXX para que sobrevivan
const asciiJson = (o) => JSON.stringify(o).replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

function sign(payload, secret) {
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64u(asciiJson(payload));
  const sig = b64u(crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

function verify(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
  let given;
  try { given = fromB64u(parts[2]); } catch (_) { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload;
  try { payload = JSON.parse(fromB64u(parts[1]).toString('utf8')); } catch (_) { return null; }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    const k = c.slice(0, i).trim();
    if (i > 0 && !(k in out)) out[k] = decodeURIComponent(c.slice(i + 1).trim());   // si hay duplicadas gana la primera (la de ruta mas especifica)
  });
  return out;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// todas las cookies con ese nombre (puede haber repetidas con distinta ruta)
function todas(header, name) {
  const out = [];
  String(header || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0 && c.slice(0, i).trim() === name) { try { out.push(decodeURIComponent(c.slice(i + 1).trim())); } catch (_) { /* cookie corrupta */ } }
  });
  return out;
}

module.exports = function auth({ db, env, base = '', empresas }) {
  const secret = env.JWT_SECRET || 'cambie-este-secreto';
  const hours = Number(env.SESSION_HOURS || 10);
  const secure = env.COOKIE_SECURE === 'true';
  const { asegurarSuper, codigoCompania } = require('./empresa');
  const cookie = (name, value, maxAgeSec, path, httpOnly = false) =>
    `${name}=${encodeURIComponent(value)}; Path=${path || base || '/'}; Max-Age=${maxAgeSec}; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}${secure ? '; Secure' : ''}`;
  const empPath = (slug) => `${base}/${slug}`;
  // Sesiones cerradas: aunque el navegador siguiera enviando la cookie (duplicada, otra ruta...), ese token ya no sirve
  const revocados = new Map();   // jti -> exp
  const revocar = (jti, exp) => {
    if (!jti) return;
    revocados.set(jti, exp);
    if (revocados.size > 2000) { const ahora = Math.floor(Date.now() / 1000); for (const [k, v] of revocados) if (v < ahora) revocados.delete(k); }
  };
  const revocarDe = (req) => {
    for (const nombre of ['bep_sesion', 'bep_token']) for (const t of todas(req.headers.cookie, nombre)) { const p = verify(t, secret); if (p) revocar(p.jti, p.exp); }
  };
  const getCookies = (req) => parseCookies(req.headers.cookie);

  // ---------- limite de intentos (por IP + correo) ----------
  const fallos = new Map();
  const bloqueado = (k) => { const f = fallos.get(k); return f && f.n >= 8 && Date.now() - f.t < 15 * 60 * 1000; };
  const fallo = (k) => { const f = fallos.get(k); fallos.set(k, { n: f && Date.now() - f.t < 15 * 60 * 1000 ? f.n + 1 : 1, t: Date.now() }); if (fallos.size > 5000) fallos.clear(); };

  // ---------- sesion de plataforma (identidad, sin empresa) ----------
  const diasRecordar = Number(env.REMEMBER_DAYS || 30);
  const tokenPlat = (u, horas = hours) => sign({ typ: 'plat', sub: u.usuarioId, jti: crypto.randomUUID(), iss: 'BEP', exp: Math.floor(Date.now() / 1000) + horas * 3600 }, secret);

  async function login(req, res) {
    const correo = String((req.body && (req.body.correo || req.body.usuario)) || '').trim();
    const password = String((req.body && req.body.password) || '');
    if (!correo || !password) return res.status(400).json({ ok: false, mensaje: 'Ingrese usuario y contrasena' });
    const key = `${req.ip}|${correo.toLowerCase()}`;
    if (bloqueado(key)) return res.status(429).json({ ok: false, mensaje: 'Demasiados intentos. Espere unos minutos e intente de nuevo.' });
    const u = (await db.query(
      `SELECT u.usuarioId, u.UsuarioNombre, u.UsuarioKey, u.UsuarioPasword, u.UsuarioSuper
         FROM Usuario u WHERE LOWER(u.UsuarioNombre) = @c AND u.UsuarioEstado = 1`, { c: correo.toLowerCase() }))[0];
    const calc = hashPassword(password, (u && u.UsuarioKey) || 'sin-usuario');   // mismo costo exista o no el usuario
    if (!(u && safeEqual(calc, u.UsuarioPasword || ''))) { fallo(key); return res.status(401).json({ ok: false, mensaje: 'Usuario o contrasena incorrectos' }); }
    fallos.delete(key);
    const horas = req.body && req.body.recordar === true ? diasRecordar * 24 : hours;   // "Recordar sesion": dura varios dias
    res.setHeader('Set-Cookie', [
      cookie('bep_sesion', tokenPlat(u, horas), horas * 3600, base || '/', true),
      cookie('theme', getCookies(req).theme || 'light', 365 * 86400),
      // restos de la version anterior (una sola cookie para todo el sitio)
      cookie('access_token', '', 0), cookie('usoBEP', '', 0),   // nombres de versiones anteriores
    ]);
    res.json({ ok: true, mensaje: 'Bienvenido' });
  }

  /** Middleware: exige sesion de plataforma. Deja req.plat = { usuarioId, nombre, apellido, correo, sup } leidos de la base. */
  async function requirePlat(req, res, next) {
    try {
      const p = verify(getCookies(req).bep_sesion, secret);
      if (!p || p.typ !== 'plat' || revocados.has(p.jti)) return res.status(401).json({ ok: false, error: 'No autorizado', mensaje: 'Inicie sesion' });
      const u = (await db.query(`SELECT u.usuarioId, u.UsuarioNombre, u.UsuarioEstado, u.UsuarioSuper, p.PersonalNombres, p.PersonalApellidos
          FROM Usuario u LEFT JOIN Personal p ON p.PersonalId = u.PersonalId WHERE u.usuarioId = @u`, { u: p.sub }))[0];
      if (!u || !Number(u.UsuarioEstado)) return res.status(401).json({ ok: false, error: 'No autorizado', mensaje: 'Usuario inactivo' });
      req.plat = { jti: p.jti, exp: p.exp, emp: Number(p.emp) || 0, usuarioId: u.usuarioId, correo: u.UsuarioNombre, nombre: u.PersonalNombres || '', apellido: u.PersonalApellidos || '', sup: !!Number(u.UsuarioSuper) };
      next();
    } catch (e) { next(e); }
  }
  const requireSuper = (req, res, next) => (req.plat && req.plat.sup ? next() : res.status(403).json({ ok: false, mensaje: 'Solo el superadministrador puede hacer esto' }));

  /** Empresas a las que puede entrar el usuario */
  async function misEmpresas(plat) {
    // El superadmin ve todas las empresas activas (se mueve entre ellas); los demas, solo donde son miembros
    const rows = plat.sup
      ? await db.query(`SELECT e.EmpresaId, e.EmpNombre, e.EmpSlug, 'admin' AS rol FROM Empresa e WHERE e.EmpEstado = 1 ORDER BY e.EmpNombre`)
      : await db.query(`SELECT e.EmpresaId, e.EmpNombre, e.EmpSlug, ue.UsuEmpRol AS rol FROM UsuarioEmpresa ue JOIN Empresa e ON e.EmpresaId = ue.EmpresaId
                         WHERE ue.usuarioId = @u AND ue.UsuEmpEstado = 1 AND e.EmpEstado = 1 ORDER BY e.EmpNombre`, { u: plat.usuarioId });
    const lista = rows.map((e) => ({ id: Number(e.EmpresaId), nombre: e.EmpNombre, slug: e.EmpSlug, rol: e.rol, url: `${base}/${e.EmpSlug}/` }));
    // Solo el superadmin cambia de empresa: la sesion de los demas queda fija a la primera empresa en la que entran
    return !plat.sup && plat.emp ? lista.filter((e) => e.id === plat.emp) : lista;
  }

  /** Entrar a una empresa: emite la sesion de ESA empresa (cookies solo para su ruta) */
  async function entrar(req, res) {
    const slug = String((req.body && req.body.slug) || '').trim().toLowerCase();
    const emp = await empresas.porSlug(slug);
    if (!emp || !emp.activa) return res.status(404).json({ ok: false, mensaje: 'La empresa no existe o esta desactivada' });
    const p = req.plat;
    let m;
    if (p.sup) m = await asegurarSuper(db, p.usuarioId, emp.id);
    else m = (await db.query('SELECT PersonalId, UsuEmpRol, UsuEmpEstado FROM UsuarioEmpresa WHERE usuarioId = @u AND EmpresaId = @e', { u: p.usuarioId, e: emp.id }, { limit: 1 }))[0];
    if (!m || !Number(m.UsuEmpEstado)) return res.status(403).json({ ok: false, mensaje: 'No tiene acceso a esta empresa' });
    const per = (await db.query('SELECT PersonalNombres, PersonalApellidos FROM Personal WHERE PersonalId = @p AND EmpresaId = @e', { p: m.PersonalId, e: emp.id }))[0] || {};
    if (!p.sup && p.emp && p.emp !== emp.id) return res.status(403).json({ ok: false, mensaje: 'Solo el superadministrador puede cambiar de empresa. Cierre sesion para entrar a otra.' });
    const exp = Math.floor(Date.now() / 1000) + hours * 3600;
    const token = sign({
      Compania: emp.nombre, VCompaniaId: codigoCompania(emp.id), emp: emp.id, slug: emp.slug, rol: p.sup ? 'admin' : m.UsuEmpRol, sup: p.sup ? 1 : 0, ps: p.jti,
      vnombres: per.PersonalNombres || p.nombre || '', vapellidos: per.PersonalApellidos || p.apellido || '',
      vidusuario: p.usuarioId, vAreaTrabajoNombre: '', vPersonalId: m.PersonalId || '',
      jti: crypto.randomUUID(), iss: 'BEP', exp,
    }, secret);
    // Las lee el JavaScript del front: NO HttpOnly. Solo viajan a /<empresa>/..., asi dos empresas abiertas a la vez no se pisan.
    const cookies = [
      cookie('bep_token', token, hours * 3600, empPath(emp.slug)),
      cookie('bep_uso', env.USO_BEP || 'completo', hours * 3600, empPath(emp.slug)),
    ];
    // Primera entrada de un usuario comun: su sesion queda fija a esta empresa (mismo jti y vencimiento; cerrar sesion la anula igual)
    if (!p.sup && !p.emp) {
      const resto = Math.max(1, p.exp - Math.floor(Date.now() / 1000));
      cookies.push(cookie('bep_sesion', sign({ typ: 'plat', sub: p.usuarioId, jti: p.jti, iss: 'BEP', emp: emp.id, exp: p.exp }, secret), resto, base || '/', true));
    }
    res.setHeader('Set-Cookie', cookies);
    res.json({ ok: true, url: `${base}/${emp.slug}/` });
  }

  // ---------- sesion dentro de una empresa ----------
  const membresias = new Map();
  const invalidar = () => membresias.clear();
  async function membresia(usuarioId, empresaId) {
    const k = `${usuarioId}:${empresaId}`;
    const hit = membresias.get(k);
    if (hit && Date.now() - hit.t < 10000) return hit.v;
    const r = (await db.query(`SELECT u.UsuarioEstado, u.UsuarioSuper, ue.UsuEmpRol, ue.UsuEmpEstado FROM Usuario u
        LEFT JOIN UsuarioEmpresa ue ON ue.usuarioId = u.usuarioId AND ue.EmpresaId = @e WHERE u.usuarioId = @u`, { u: usuarioId, e: empresaId }))[0];
    const v = r && Number(r.UsuarioEstado) ? { sup: !!Number(r.UsuarioSuper), rol: r.UsuEmpRol || null, activo: !!Number(r.UsuEmpEstado) } : null;
    membresias.set(k, { t: Date.now(), v });
    if (membresias.size > 5000) membresias.clear();
    return v;
  }

  /** Middleware de /<empresa>/General, /rest/General y /ArchivosBEP */
  async function requireEmpresa(req, res, next) {
    try {
      const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const token = bearer || getCookies(req).bep_token;
      const user = verify(token, secret);
      if (!user || user.typ === 'plat' || revocados.has(user.jti) || (user.ps && revocados.has(user.ps)) || !req.empresa || Number(user.emp) !== req.empresa.id) {
        return res.status(401).json({ error: 'No autorizado', mensaje: 'Sesion no valida o vencida' });
      }
      const m = await membresia(user.vidusuario, req.empresa.id);
      if (!m || (!m.sup && !m.activo)) return res.status(403).json({ error: 'Sin acceso', mensaje: 'Ya no tiene acceso a esta empresa' });
      req.user = { ...user, rol: m.sup ? 'admin' : m.rol };   // el rol sale de la base (cambios de rol rigen de inmediato)
      next();
    } catch (e) { next(e); }
  }
  const requireAdmin = (req, res, next) => (req.user && req.user.rol === 'admin' ? next() : res.status(403).json({ error: 'Sin permiso', mensaje: 'Solo el administrador de la empresa puede hacer esto' }));

  // ---------- cierre de sesion ----------
  const limpiarEmpresa = (slug) => [cookie('bep_token', '', 0, empPath(slug)), cookie('bep_uso', '', 0, empPath(slug))];
  async function limpiarTodo() {
    const slugs = (await db.query('SELECT EmpSlug FROM Empresa')).map((r) => r.EmpSlug);
    const raiz = base || '/';
    return [cookie('bep_sesion', '', 0, raiz, true), cookie('access_token', '', 0), cookie('usoBEP', '', 0), cookie('bep_token', '', 0), cookie('bep_uso', '', 0),
      // por si quedo alguna con otra ruta (versiones anteriores / otra forma de entrar)
      cookie('bep_sesion', '', 0, '/', true), cookie('bep_token', '', 0, '/'), cookie('bep_uso', '', 0, '/'), cookie('bep_token', '', 0, raiz + (raiz.endsWith('/') ? '' : '/')), ...slugs.flatMap(limpiarEmpresa)];
  }

  /** Cierra la sesion: anula los tokens (aunque el navegador los siga enviando) y devuelve las cookies a borrar */
  async function cerrar(req) { revocarDe(req); return limpiarTodo(); }

  async function cambiarClave(req, res) {
    const { actual, nueva } = req.body || {};
    if (!require('./empresa').claveValida(nueva)) return res.status(400).json({ ok: false, mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });
    const u = (await db.query('SELECT UsuarioKey, UsuarioPasword FROM Usuario WHERE usuarioId = @u', { u: req.plat.usuarioId }))[0];
    if (!u || !safeEqual(hashPassword(String(actual || ''), u.UsuarioKey || ''), u.UsuarioPasword || '')) return res.status(400).json({ ok: false, mensaje: 'La contraseña actual no es correcta' });
    const salt = crypto.randomBytes(12).toString('hex');
    await db.exec('UPDATE Usuario SET UsuarioKey = @k, UsuarioPasword = @p WHERE usuarioId = @u', { k: salt, p: hashPassword(String(nueva), salt), u: req.plat.usuarioId });
    res.json({ ok: true, mensaje: 'Contraseña actualizada' });
  }

  return { login, requirePlat, requireSuper, misEmpresas, entrar, requireEmpresa, requireAdmin, invalidar, limpiarEmpresa, limpiarTodo, cerrar, revocarDe, cambiarClave, cookie, sign, verify };
};
module.exports.sign = sign;
module.exports.verify = verify;
