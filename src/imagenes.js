'use strict';
/* Imagenes de perfil: foto de cada usuario y logo de cada empresa.
 * Se guardan como archivos en <UPLOAD_DIR>/_imagenes (fuera de las carpetas de las empresas) y se validan por su contenido
 * (PNG, JPG o WEBP; nunca SVG). El navegador ya las reduce antes de subirlas. */
const fs = require('fs');
const path = require('path');

const EXTS = ['png', 'jpg', 'webp'];
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

function tipo(b) {
  if (!Buffer.isBuffer(b) || b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

module.exports = (uploadDir) => {
  const dir = path.join(uploadDir, '_imagenes');
  const base = (clave) => path.join(dir, clave);
  /** { file, ext, mime, ver } o null; ver cambia cada vez que se sube una imagen nueva */
  function buscar(clave) {
    for (const ext of EXTS) {
      const file = `${base(clave)}.${ext}`;
      try { const st = fs.statSync(file); return { file, ext, mime: MIME[ext], ver: Math.round(st.mtimeMs) }; } catch (_) { /* no existe */ }
    }
    return null;
  }
  function quitar(clave) { for (const ext of EXTS) { try { fs.unlinkSync(`${base(clave)}.${ext}`); } catch (_) { /* no existia */ } } }
  function guardar(clave, buf) {
    const t = tipo(buf);
    if (!t) { const e = new Error('La imagen debe ser PNG, JPG o WEBP'); e.status = 400; throw e; }
    try {
      fs.mkdirSync(dir, { recursive: true });
      quitar(clave);
      fs.writeFileSync(`${base(clave)}.${t}`, buf);
    } catch (err) {
      console.error('No se pudo guardar la imagen en', dir, '-', err.message);
      const e = new Error(`El servidor no puede escribir en la carpeta de imagenes (${dir}). Dele permiso de escritura a la cuenta del servicio de BEP.`); e.status = 500; throw e;
    }
    return buscar(clave);
  }
  return { buscar, guardar, quitar, claveFoto: (id) => `usuario-${String(id).replace(/[^A-Za-z0-9_-]/g, '_')}`   /* el id del usuario es texto (US001) */, claveLogo: (id) => `empresa-${Number(id)}` };
};
module.exports.tipo = tipo;
