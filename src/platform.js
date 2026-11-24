'use strict';
/* Plataforma: login unico, portal (elegir empresa) y administracion de empresas (superadmin) */
const express = require('express');
const emp = require('./empresa');
const { s, b } = require('./util');

module.exports = ({ db, base, auth, empresas, portalFile, uploadDir }) => {
  const r = express.Router();
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
    if (e.status) return res.status(e.status).json({ ok: false, mensaje: e.message });
    console.error(`[${req.method} ${req.originalUrl}]`, e);
    res.status(500).json({ ok: false, mensaje: 'Error interno' });
  });
  const img = require('./imagenes')(uploadDir || require('path').resolve(__dirname, '..', 'ArchivosBEP'));
  const cargaImg = express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '1mb' });   // la imagen viaja tal cual (sin JSON)
  const leerImg = (req) => { if (!Buffer.isBuffer(req.body) || !req.body.length) throw emp.err(400, 'Seleccione una imagen PNG, JPG o WEBP (hasta 1 MB)'); return req.body; };
  const enviarImg = (res, f) => { res.type(f.mime); res.sendFile(f.file, { cacheControl: false }); };
  const portal = (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.sendFile(portalFile); };

  // ---- portal (login + eleccion de empresa) ----
  r.get(['/', '/portal.html', '/login.html'], (req, res, next) => (req.path === '/login.html' ? res.redirect((base || '') + '/') : portal(req, res, next)));

  // ---- sesion ----
  r.post('/auth/login', h(auth.login));
  r.post('/auth/logout', h(async (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Set-Cookie', await auth.cerrar(req)); res.json({ ok: true }); }));
  r.get(['/auth/salir', '/logout'], h(async (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Set-Cookie', await auth.cerrar(req)); res.redirect((base || '') + '/'); }));
  r.get('/auth/yo', auth.requirePlat, h(async (req, res) => {
    const p = req.plat;
    const ver = (clave) => (img.buscar(clave) || {}).ver || 0;   // 0 = sin imagen
    res.json({ ok: true, usuario: { id: p.usuarioId, correo: p.correo, nombre: p.nombre, apellido: p.apellido, superadmin: p.sup, foto: ver(img.claveFoto(p.usuarioId)) },
      empresas: (await auth.misEmpresas(p)).map((e) => ({ ...e, logo: ver(img.claveLogo(e.id)) })) });
  }));

  // ---- foto del usuario (la suya) y logo de la empresa (lo cambia su administrador) ----
  r.get('/auth/foto', auth.requirePlat, h(async (req, res) => { const f = img.buscar(img.claveFoto(req.plat.usuarioId)); if (!f) return res.status(404).json({ ok: false, mensaje: 'Sin foto' }); enviarImg(res, f); }));
  r.post('/auth/foto', auth.requirePlat, cargaImg, h(async (req, res) => { const f = img.guardar(img.claveFoto(req.plat.usuarioId), leerImg(req)); res.json({ ok: true, mensaje: 'Foto actualizada', ver: f.ver }); }));
  r.delete('/auth/foto', auth.requirePlat, h(async (req, res) => { img.quitar(img.claveFoto(req.plat.usuarioId)); res.json({ ok: true, mensaje: 'Foto eliminada' }); }));
  const suEmpresa = async (req, soloAdmin) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (req.plat.sup) {   // el superadmin cambia el logo de cualquier empresa (tambien desactivada)
      const e = await empresas.porSlug(slug);
      if (!e) throw emp.err(404, 'Empresa no encontrada');
      return { id: e.id, slug: e.slug, nombre: e.nombre, rol: 'admin' };
    }
    const e = (await auth.misEmpresas(req.plat)).find((x) => x.slug === slug);
    if (!e) throw emp.err(404, 'Empresa no encontrada');
    if (soloAdmin && e.rol !== 'admin') throw emp.err(403, 'Solo el administrador de la empresa puede cambiar el logo');
    return e;
  };
  // Foto de otro usuario: la suya siempre; la de sus usuarios el administrador de su empresa; cualquiera el superadmin.
  // La foto del superadmin solo la cambia el mismo.
  const usuarioEditable = async (req) => {
    const id = String(req.params.id || '');
    if (!id || id === String(req.plat.usuarioId)) return String(req.plat.usuarioId);
    const t = (await db.query('SELECT usuarioId, COALESCE(UsuarioSuper, 0) AS sup FROM Usuario WHERE usuarioId = @u', { u: id }))[0];
    if (!t) throw emp.err(404, 'Usuario no encontrado');
    if (Number(t.sup)) throw emp.err(403, 'No puede cambiar esa foto');
    if (req.plat.sup) return String(t.usuarioId);
    const admin = (await auth.misEmpresas(req.plat)).filter((e) => e.rol === 'admin').map((e) => e.id);
    if (admin.length) {
      const m = await db.query(`SELECT 1 AS x FROM UsuarioEmpresa WHERE usuarioId = @u AND UsuEmpEstado = 1 AND EmpresaId IN (${admin.join(',')})`, { u: t.usuarioId }, { limit: 1 });
      if (m.length) return String(t.usuarioId);
    }
    throw emp.err(403, 'No tiene permiso para cambiar la foto de este usuario');
  };
  r.get('/auth/foto/:id', auth.requirePlat, h(async (req, res) => { const f = img.buscar(img.claveFoto(await usuarioEditable(req))); if (!f) return res.status(404).json({ ok: false, mensaje: 'Sin foto' }); enviarImg(res, f); }));
  r.post('/auth/foto/:id', auth.requirePlat, cargaImg, h(async (req, res) => { const id = await usuarioEditable(req); const f = img.guardar(img.claveFoto(id), leerImg(req)); res.json({ ok: true, mensaje: 'Foto actualizada', ver: f.ver }); }));
  r.delete('/auth/foto/:id', auth.requirePlat, h(async (req, res) => { img.quitar(img.claveFoto(await usuarioEditable(req))); res.json({ ok: true, mensaje: 'Foto eliminada' }); }));
  r.get('/auth/logo/:slug', auth.requirePlat, h(async (req, res) => { const e = await suEmpresa(req); const f = img.buscar(img.claveLogo(e.id)); if (!f) return res.status(404).json({ ok: false, mensaje: 'Sin logo' }); enviarImg(res, f); }));
  r.post('/auth/logo/:slug', auth.requirePlat, cargaImg, h(async (req, res) => { const e = await suEmpresa(req, true); const f = img.guardar(img.claveLogo(e.id), leerImg(req)); res.json({ ok: true, mensaje: 'Logo actualizado', ver: f.ver }); }));
  r.delete('/auth/logo/:slug', auth.requirePlat, h(async (req, res) => { const e = await suEmpresa(req, true); img.quitar(img.claveLogo(e.id)); res.json({ ok: true, mensaje: 'Logo eliminado' }); }));
  r.post('/auth/entrar', auth.requirePlat, h(auth.entrar));
  r.post('/auth/cambiar-clave', auth.requirePlat, h(auth.cambiarClave));

  // ---- administracion de empresas (solo superadmin) ----
  const sup = [auth.requirePlat, auth.requireSuper];
  const idEmp = (req) => { const n = Number(req.params.id); if (!Number.isInteger(n) || n < 1) throw emp.err(400, 'Empresa no valida'); return n; };

  r.get('/portal/empresas', sup, h(async (req, res) => {
    const rows = await db.query(`SELECT e.EmpresaId, e.EmpNombre, e.EmpSlug, e.EmpEstado, e.EmpFecha,
        (SELECT COUNT(*) FROM UsuarioEmpresa x JOIN Usuario ux ON ux.usuarioId = x.usuarioId WHERE x.EmpresaId = e.EmpresaId AND x.UsuEmpEstado = 1 AND COALESCE(ux.UsuarioSuper, 0) = 0) AS usuarios FROM Empresa e ORDER BY e.EmpresaId`);
    const admins = await db.query(`SELECT ue.EmpresaId, u.UsuarioNombre FROM UsuarioEmpresa ue JOIN Usuario u ON u.usuarioId = ue.usuarioId
        WHERE ue.UsuEmpRol = 'admin' AND ue.UsuEmpEstado = 1 AND COALESCE(u.UsuarioSuper, 0) = 0 ORDER BY ue.EmpresaId, u.UsuarioNombre`);
    res.json({ ok: true, empresas: rows.map((e) => ({ id: Number(e.EmpresaId), nombre: e.EmpNombre, slug: e.EmpSlug, activa: !!Number(e.EmpEstado), usuarios: Number(e.usuarios), url: `${base}/${e.EmpSlug}/`,
      admins: admins.filter((a) => Number(a.EmpresaId) === Number(e.EmpresaId)).map((a) => a.UsuarioNombre), logo: (img.buscar(img.claveLogo(e.EmpresaId)) || {}).ver || 0 })) });
  }));

  r.post('/portal/empresas', sup, h(async (req, res) => {
    const d = req.body || {};
    const r2 = await emp.crearEmpresa(db, { nombre: d.nombre, slug: d.slug, admin: { correo: d.adminCorreo, nombre: d.adminNombre, apellido: d.adminApellido, password: d.adminPassword } });
    empresas.invalidar();
    res.status(201).json({ ok: true, mensaje: r2.admin.existente ? 'Empresa creada. El administrador ya tenia cuenta: conserva su contraseña actual.' : 'Empresa creada', empresa: { id: r2.id, slug: r2.slug, nombre: r2.nombre, url: `${base}/${r2.slug}/` } });
  }));

  r.put('/portal/empresas/:id', sup, h(async (req, res) => {
    const id = idEmp(req); const d = req.body || {};
    const cur = (await db.query('SELECT EmpNombre, EmpSlug, EmpEstado FROM Empresa WHERE EmpresaId = @i', { i: id }))[0];
    if (!cur) throw emp.err(404, 'Empresa no encontrada');
    const nombre = d.nombre === undefined ? cur.EmpNombre : s(d.nombre).trim();
    const slug = d.slug === undefined ? cur.EmpSlug : emp.normSlug(d.slug);
    const activa = d.activa === undefined ? !!Number(cur.EmpEstado) : b(d.activa);
    if (!nombre) throw emp.err(400, 'Ingrese el nombre de la empresa');
    if (slug !== cur.EmpSlug) {
      const e = emp.validarSlug(slug); if (e) throw emp.err(400, e);
      if ((await db.query('SELECT EmpresaId FROM Empresa WHERE EmpSlug = @s AND EmpresaId <> @i', { s: slug, i: id }, { limit: 1 })).length) throw emp.err(409, 'Ya existe una empresa con esa direccion');
    }
    await db.exec('UPDATE Empresa SET EmpNombre = @n, EmpSlug = @s, EmpEstado = @e, EmpFechaAct = @f WHERE EmpresaId = @i', { n: nombre, s: slug, e: activa ? 1 : 0, f: new Date(), i: id });
    empresas.invalidar(); auth.invalidar();
    res.json({ ok: true, mensaje: 'Empresa actualizada' });
  }));

  r.get('/portal/empresas/:id/usuarios', sup, h(async (req, res) => {
    const id = idEmp(req);
    const rows = await db.query(`SELECT u.UsuarioNombre, ue.UsuEmpRol, ue.UsuEmpEstado, p.PersonalNombres, p.PersonalApellidos FROM UsuarioEmpresa ue JOIN Usuario u ON u.usuarioId = ue.usuarioId
        LEFT JOIN Personal p ON p.PersonalId = ue.PersonalId WHERE ue.EmpresaId = @i AND COALESCE(u.UsuarioSuper, 0) = 0 ORDER BY ue.UsuEmpRol, u.UsuarioNombre`, { i: id });
    res.json({ ok: true, usuarios: rows.map((x) => ({ correo: x.UsuarioNombre, nombre: `${s(x.PersonalNombres)} ${s(x.PersonalApellidos)}`.trim(), rol: x.UsuEmpRol, activo: !!Number(x.UsuEmpEstado) })) });
  }));

  // agrega (o promueve) un administrador de la empresa
  r.post('/portal/empresas/:id/admin', sup, h(async (req, res) => {
    const id = idEmp(req); const d = req.body || {};
    const mensaje = await db.tx(async (t) => {
      if (!(await t.query('SELECT EmpresaId FROM Empresa WHERE EmpresaId = @i', { i: id })).length) throw emp.err(404, 'Empresa no encontrada');
      const correo = s(d.correo).trim().toLowerCase();
      const m = (await t.query(`SELECT ue.UsuEmpId, u.UsuarioSuper FROM UsuarioEmpresa ue JOIN Usuario u ON u.usuarioId = ue.usuarioId WHERE ue.EmpresaId = @i AND LOWER(u.UsuarioNombre) = @c`, { i: id, c: correo }, { limit: 1 }))[0];
      if (m && Number(m.UsuarioSuper)) throw emp.err(400, 'Ese correo es del superadministrador de la plataforma: no figura como usuario de las empresas');
      if (m) { await t.exec(`UPDATE UsuarioEmpresa SET UsuEmpRol = 'admin', UsuEmpEstado = 1 WHERE UsuEmpId = @m`, { m: m.UsuEmpId }); return 'Ese usuario ya era de la empresa: ahora es administrador'; }
      const a = await emp.altaMiembro(t, id, { correo, nombre: d.nombre, apellido: d.apellido, password: d.password }, { rol: 'admin' });
      return a.existente ? 'Administrador agregado (ya tenia cuenta: conserva su contraseña actual)' : 'Administrador creado';
    });
    auth.invalidar();
    res.json({ ok: true, mensaje });
  }));

  return r;
};
