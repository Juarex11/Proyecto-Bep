'use strict';
/**
 * Instala/desinstala BEP como Servicio de Windows (se inicia solo con el servidor).
 * Uso (CMD como Administrador, dentro de la carpeta BackNode):
 *   npm run service:install
 *   npm run service:uninstall
 */
const path = require('path');

if (process.platform !== 'win32') {
  console.error('Este comando solo funciona en Windows.');
  process.exit(1);
}
const { Service } = require('node-windows');

const svc = new Service({
  name: 'BEP Backend',
  description: 'AppBEP - Plan de Ejecucion BIM (Node.js)',
  script: path.join(__dirname, '..', 'server.js'),
  workingDirectory: path.join(__dirname, '..'),
  wait: 2,            // segundos antes de reiniciar tras una caida
  grow: 0.5,
  maxRestarts: 10,
});

const accion = (process.argv[2] || '').toLowerCase();
svc.on('install', () => { console.log('Servicio instalado. Iniciando...'); svc.start(); });
svc.on('alreadyinstalled', () => console.log('El servicio ya estaba instalado.'));
svc.on('start', () => console.log('Servicio "BEP Backend" en ejecucion.'));
svc.on('uninstall', () => console.log('Servicio desinstalado.'));
svc.on('error', (e) => console.error('Error:', e));

if (accion === 'instalar') svc.install();
else if (accion === 'desinstalar') svc.uninstall();
else { console.error('Uso: node tools/servicio-windows.js instalar|desinstalar'); process.exit(1); }
