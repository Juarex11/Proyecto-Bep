/* Tablas y animaciones con Bootstrap 5
 *
 *  x-tabla="{ rows: data, cols: [...], acciones: {...} }"   -> DataTables (estilo Bootstrap 5) sobre un <table>
 *  x-bscollapse="showNew"                                  -> panel que se abre/cierra con la animacion "collapse" de Bootstrap
 *
 * Columnas (cols):  { t: 'Titulo', c: 'campo', tipo: 'estado' | 'sino' | 'html', cls: 'clase', render: (fila) => 'texto',
 *                     orden: false, prioridad: 1..10000 (1 = la ultima en ocultarse en pantallas chicas) }
 * Opciones:          orden: [[0,'asc']], longitud: 10, buscador: false (oculta el buscador), exportar: true (CSV / Imprimir), vacio: 'texto'
 * Acciones:         { editar: (fila) => editar(fila), eliminar: (fila) => eliminar(fila) }   (o { fn, icono, titulo, cls })
 */
(function () {
    'use strict';

    const IDIOMA = {
        emptyTable: 'No hay datos para mostrar',
        zeroRecords: 'No se encontraron resultados',
        info: 'Mostrando _START_ a _END_ de _TOTAL_',
        infoEmpty: 'Sin resultados',
        infoFiltered: '(de _MAX_ en total)',
        lengthLabels: { '-1': 'Todos' },
        search: '',
        searchPlaceholder: 'Buscar…',
        lengthMenu: 'Mostrar _MENU_',
        loadingRecords: 'Cargando…',
        processing: 'Procesando…',
        paginate: { first: '«', previous: '‹', next: '›', last: '»' },
        aria: { orderable: 'Ordenar', orderableReverse: 'Ordenar al revés', orderableRemove: 'Quitar orden', paginate: { first: 'Primera', previous: 'Anterior', next: 'Siguiente', last: 'Última' } },
        buttons: { copy: 'Copiar', csv: 'CSV', print: 'Imprimir', copyTitle: 'Copiado', copySuccess: { _: '%d filas copiadas', 1: '1 fila copiada' } }
    };

    const ACCIONES = {
        editar: { icono: 'pencil', titulo: 'Editar', cls: 'btn-orange' },
        eliminar: { icono: 'trash', titulo: 'Eliminar', cls: 'btn-outline-secondary' },
        desactivar: { icono: 'trash', titulo: 'Desactivar', cls: 'btn-outline-secondary' },
        ver: { icono: 'eye', titulo: 'Ver', cls: 'btn-outline-primary' },
        imprimir: { icono: 'printer', titulo: 'Imprimir', cls: 'btn-outline-primary' }
    };

    window.bepEsc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /** Contenido de una celda segun el tipo de columna */
    function celda(col, fila) {
        if (typeof col.render === 'function') return col.render(fila);
        if (typeof col.texto === 'function') return esc(col.texto(fila));   // texto calculado (se escapa)
        const v = fila[col.c];
        if (col.tipo === 'estado') return v ? '<span class="badge rounded-pill bg-success-subtle text-success-emphasis">Activo</span>' : '<span class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis">Inactivo</span>';
        if (col.tipo === 'sino') return v ? '<span class="badge rounded-pill bg-primary-subtle text-primary-emphasis">Sí</span>' : '<span class="text-body-secondary">No</span>';
        if (col.tipo === 'html') return v == null ? '' : String(v);
        return esc(v);
    }

    /** Botones redondos de acciones (siempre visibles) */
    function botones(acciones, fila, idx) {
        const items = Object.keys(acciones).map((k) => {
            const def = Object.assign({}, ACCIONES[k] || { icono: 'circle', titulo: k, cls: 'btn-outline-primary' }, typeof acciones[k] === 'object' ? acciones[k] : {});
            if (def.etiqueta) return `<button type="button" class="btn ${def.cls} btn-sm bep-acc" data-acc="${esc(k)}" data-i="${idx}" title="${esc(def.titulo)}"><i class="bi bi-${esc(def.icono)}"></i> ${esc(def.etiqueta)}</button>`;
            return `<button type="button" class="btn ${def.cls} btn-sm rounded-circle bep-acc" data-acc="${esc(k)}" data-i="${idx}" title="${esc(def.titulo)}" aria-label="${esc(def.titulo)}"><i class="bi bi-${esc(def.icono)}"></i></button>`;
        });
        return `<div class="d-flex justify-content-end gap-1 flex-nowrap">${items.join('')}</div>`;
    }

    function construir(el, cfg, filas) {

        const acciones = cfg.acciones || null;
        const columns = (cfg.cols || []).map((col, i) => ({
            title: col.t,
            data: null,
            className: col.cls || '',
            orderable: col.orden !== false,
            responsivePriority: col.prioridad || (i === 0 ? 1 : 100 + i),
            width: col.ancho,
            render: (d, tipo, fila) => {
                if (tipo === 'display') return celda(col, fila);
                if (typeof col.render === 'function' && col.c == null) { const h = col.render(fila); return String(h).replace(/<[^>]*>/g, ' '); }
                if (typeof col.texto === 'function') return col.texto(fila);
                const v = fila[col.c]; return col.tipo === 'estado' ? (v ? 'Activo' : 'Inactivo') : col.tipo === 'sino' ? (v ? 'Sí' : 'No') : (v == null ? '' : v);
            }
        }));
        if (acciones) {
            columns.push({ title: '<span class="visually-hidden">Acciones</span>', data: null, orderable: false, searchable: false, className: 'text-end bep-col-acc', responsivePriority: 1,
                render: (d, tipo, fila, meta) => botones(acciones, fila, meta.row) });
        }
        const barra = { topStart: { pageLength: { menu: [10, 25, 50, 100] } }, topEnd: cfg.buscador === false ? null : 'search', bottomStart: 'info', bottomEnd: 'paging' };
        if (cfg.exportar) barra.topStart = [{ pageLength: { menu: [10, 25, 50, 100] } }, { buttons: [{ extend: 'csv', text: '<i class="bi bi-filetype-csv"></i> CSV', className: 'btn btn-outline-primary btn-sm', exportOptions: { columns: ':not(.bep-col-acc)' } }, { extend: 'print', text: '<i class="bi bi-printer"></i> Imprimir', className: 'btn btn-outline-primary btn-sm', exportOptions: { columns: ':not(.bep-col-acc)' } }] }];
        return new DataTable(el, {
            data: filas,
            columns: columns,
            order: cfg.orden || [],
            pageLength: cfg.longitud || 10,
            responsive: { details: { type: 'inline', target: 'tr' } },
            autoWidth: false,
            language: Object.assign({}, IDIOMA, cfg.vacio ? { emptyTable: cfg.vacio } : {}),
            layout: barra,
            createdRow: (tr) => { tr.classList.add('bep-fila'); }
        });
    }

        document.addEventListener('alpine:init', () => {
        /** x-tabla: la tabla se reconstruye cada vez que cambian las filas (cada llamada a la lista las reemplaza) */
        Alpine.directive('tabla', (host, { expression }, { evaluateLater, effect, cleanup }) => {
            const leer = evaluateLater(expression);
            let dt = null, tbl = null, cfgActual = null, filasActuales = [];
            const destruir = () => { if (dt) { try { dt.destroy(); } catch (e) { /* ya destruida */ } dt = null; } host.replaceChildren(); tbl = null; };

            effect(() => leer((cfg) => { try {
                const filas = Array.isArray(cfg.rows) ? cfg.rows.map((f) => Object.assign({}, f)) : [];   // al leer cada fila, Alpine detecta los cambios
                cfgActual = cfg; filasActuales = Array.isArray(cfg.rows) ? cfg.rows.slice() : [];
                // se conserva la pagina y la busqueda al refrescar (por ejemplo, despues de editar un registro)
                const pagina = dt ? dt.page() : 0, buscar = dt ? dt.search() : '';
                destruir();
                tbl = document.createElement('table');
                tbl.className = 'table table-hover align-middle w-100';
                host.append(tbl);
                try { dt = construir(tbl, cfg, filas); if (buscar) dt.search(buscar).draw(); if (pagina) dt.page(pagina).draw('page'); }
                catch (e) { console.error('Error al crear la tabla', e); }
            } catch (e) { console.error('Error en x-tabla', e); } }));

            const alClic = (ev) => {
                const b = ev.target.closest('button[data-acc]');
                if (!b || !dt || !cfgActual || !cfgActual.acciones) return;
                const act = cfgActual.acciones[b.dataset.acc];
                const fn = typeof act === 'function' ? act : (act && act.fn);
                const fila = filasActuales[Number(b.dataset.i)];
                if (typeof fn === 'function' && fila) fn(fila);
            };
            host.addEventListener('click', alClic);
            cleanup(() => { host.removeEventListener('click', alClic); destruir(); });
        });

        /** x-bscollapse="variable": abre y cierra con la animacion "collapse" de Bootstrap */
        Alpine.directive('bscollapse', (el, { expression }, { evaluateLater, effect }) => {
            const leer = evaluateLater(expression);
            el.classList.add('collapse');
            let primera = true;
            effect(() => leer((abierto) => {
                const c = bootstrap.Collapse.getOrCreateInstance(el, { toggle: false });
                if (primera) { primera = false; if (abierto) el.classList.add('show'); return; }
                if (abierto) c.show(); else c.hide();
            }));
        });
    });
})();
