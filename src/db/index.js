'use strict';
/* Selecciona el motor segun DB_CLIENT (mssql por defecto, sqlite para demo/pruebas) */
module.exports = function createDb(cfg = process.env) {
  const client = (cfg.DB_CLIENT || 'mssql').toLowerCase();
  if (client === 'sqlite') return require('./sqlite')(cfg);
  if (client === 'mssql') return require('./mssql')(cfg);
  throw new Error(`DB_CLIENT desconocido: ${client} (use mssql o sqlite)`);
};
