'use strict';
/* Contexto de la peticion: la empresa activa viaja con la peticion (AsyncLocalStorage) */
const { AsyncLocalStorage } = require('node:async_hooks');

const als = new AsyncLocalStorage();
const empresaId = () => { const s = als.getStore(); return s ? s.empresaId : null; };
const run = (empresa, fn) => als.run({ empresaId: empresa }, fn);

module.exports = { als, empresaId, run };
