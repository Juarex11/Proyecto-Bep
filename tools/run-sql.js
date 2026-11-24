#!/usr/bin/env node
'use strict';
/* Ejecuta un script .sql (con separadores GO) contra SQL Server usando la config de .env */
require('dotenv').config();
const fs = require('fs');
const sql = require('mssql');

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('Uso: node tools/run-sql.js archivo.sql'); process.exit(1); }
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const batches = text.split(/^\s*GO\s*$/gim).map(s => s.trim()).filter(Boolean);
  const cfg = {
    server: process.env.DB_SERVER || 'localhost',
    ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : String(process.env.DB_SERVER || '').includes('\\') ? {} : { port: 1433 }),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: 'master',
    options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: process.env.DB_TRUST_CERT !== 'false' },
    requestTimeout: 120000,
    pool: { max: 1, min: 1 },   // USE [BD] vale por conexion: se usa una sola
  };
  const pool = await new sql.ConnectionPool(cfg).connect();
  let n = 0;
  for (const b of batches) {
    try { await pool.request().batch(b); n++; }
    catch (e) { console.error(`Error en el lote ${n + 1}:\n${b.slice(0, 300)}\n-> ${e.message}`); await pool.close(); process.exit(1); }
  }
  console.log(`OK: ${n} lotes ejecutados.`);
  await pool.close();
})();
