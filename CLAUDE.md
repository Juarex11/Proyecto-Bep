# CLAUDE.md

Lee primero `AGENTS.md` (guía de traspaso: reglas, trampas, pruebas, despliegue y pendientes) y luego `README.md` (descripción del producto).

Resumen de lo esencial:

- Responde y escribe todo en español. Guía a la persona **un paso a la vez**.
- No tienes acceso a producción; la persona despliega. No toques SONDA.
- El esquema vive en `src/schema.js`; regenera con `npm run gen:sql`. Toda tabla lleva `EmpresaId`.
- Front sin compilación (Alpine + Bootstrap). Usa variables CSS para que el modo oscuro funcione.
- Prueba con `npm test` y en navegador contra una copia local con SQLite; nunca metas datos de prueba en producción.
- Nunca subas `.env` ni claves al repositorio.
