# AppBEP (front)

Sistema web para la gestión de **BEP (BIM Execution Plan)**: crear, editar y exportar planes con objetivos, alcance, matriz RACI y estrategias de información y comunicación.

Es una aplicación de una sola página (SPA) **sin herramientas de compilación**: todo corre directo en el navegador. La sirve el backend Node (`BackNode`) en `<raíz>/<empresa>/` y habla con su API en el mismo origen (ver el README de `BackNode`).

| Tecnología | Para qué |
|---|---|
| Alpine.js | Interactividad de cada pantalla |
| Bootstrap 5 + Bootstrap Icons | Diseño e iconos |
| jQuery, Select2 | Manejo del DOM y selectores con búsqueda |
| html2pdf | Reporte en PDF |
| Notify.js | Avisos emergentes |

## Estructura

```
AppBEP/
├── index.html            carga estilos, librerías y los scripts propios en orden
├── css/                  app.css (diseño común), Bootstrap, Bootstrap Icons, Select2
├── img/                  favicon e imágenes
├── js/
│   ├── main.js           arranque: llama a iniciarApp() si hay sesión
│   ├── core/
│   │   ├── config.js     direcciones: raíz, empresa, API (baseUrl, baseUrlT) y portal
│   │   ├── session.js    lee la sesión (cookie bep_token): usuario, rol, empresa; 401; cerrarSesion()
│   │   ├── utils.js      fechas
│   │   ├── api.js        apiBackend() (API de la empresa) y apiPlataforma() (portal/empresas)
│   │   └── router.js     irA(), routeTab(), routeTabConfig(), secciones y estado de navegación, iniciarApp()
│   ├── ui/ui.js          loading, notificaciones, textareas, modo solo lectura
│   ├── ui/perfil.js      empresa y usuario del menú superior: logo, foto y popup "Mi perfil" (con Cerrar sesión)
│   └── vendor/           Alpine, Bootstrap, jQuery, Select2, Notify, html2pdf
└── pages/<nombre>/<nombre>.html + <nombre>.js     una carpeta por pantalla
```

El orden de carga está en `index.html`: librerías → `config` → `session` → `utils` → `ui` → `api` → `router` → `main`. Las funciones y variables son globales (scripts clásicos), así que cada pantalla puede usarlas directamente.

## Cómo se navega

- `irA('home')` abre `pages/home/home.html`. Al cargarse, el HTML trae su propio `<script src="./pages/home/home.js">`.
- El formulario BEP y Configuración tienen un menú lateral. Cada opción usa una **clave corta** (por ejemplo `objetivos_cliente`) y `router.js` indica a qué página corresponde en `SECCIONES_BEP` y `SECCIONES_CONFIG`.
- **Agregar una pantalla:** crear `pages/<nombre>/<nombre>.html` y `.js`, y (si va en un menú) agregar su clave en `SECCIONES_BEP` o `SECCIONES_CONFIG` y el enlace en el menú de `pages/bep` o `pages/configuracion`.

## Sesión y permisos

- Al entrar a una empresa, el servidor entrega la cookie `bep_token` (solo válida para `/<empresa>/`). `session.js` la lee para saber quién es, su rol (`admin` o `usuario`) y la empresa. Si no hay sesión válida, vuelve al portal.
- Esos datos solo sirven para dibujar la pantalla (por ejemplo, ocultar Configuración a los usuarios). **El servidor revisa rol y acceso en cada petición.**
- `cerrarSesion()` anula la sesión en el servidor y vuelve al portal.
- El superadmin ve además *Configuración → Administración → Empresas*.

## Pantallas (`pages/`)

| Carpeta | Contenido |
|---|---|
| `home`, `reporte` | Lista de BEP (ver, editar, imprimir) y plantilla del reporte PDF |
| `navbar` | Menú superior (empresa, usuario y popup de perfil) |
| `bep` | Formulario del BEP: revisiones, etapas y menú lateral |
| `bep-descripcion`, `bep-alcance` | Datos generales y alcance (elementos, especialidades, LOD, parámetros) |
| `bep-objetivos-cliente`, `-proyecto`, `-bim`, `-usos-bim` | Objetivos y usos BIM |
| `bep-matriz-contacto`, `bep-matriz-raci` | Contactos clave y matriz RACI |
| `bep-estrategia-informacion-*` | Hitos de construcción, hitos de entrega, flujo de trabajo, entorno común de datos |
| `bep-estrategia-comunicacion-reunion`, `-canal` | Reuniones y canales de comunicación |
| `configuracion` | Menú de configuración |
| `cfg-proyectos-tipos`, `-clases`, `-usos-bim`, `-campanas` | Tipos, clases, usos BIM y proyectos de la empresa |
| `cfg-alcance-*` | Especialidades, categorías, elementos, LOD, parámetros |
| `cfg-matriz-*` | Organizaciones, roles, actividades, procesos, leyenda RACI |
| `cfg-administracion-usuarios`, `-mi-empresa`, `-empresas` | Usuarios de la empresa, logo de la empresa y administración de empresas (superadmin) |

## Diseño nuevo (tema BEPcloud)

`css/tema-bep2.css` tiene el diseño nuevo (azul marino `#00216b`, naranja `#ff7800`, azules claros para fondos; tipografía Poppins, barra blanca con pastillas, franja azul claro y tarjeta). Se aplica a **todas las pantallas**: el router pone la clase `tema-bep2` en `<body>` (`js/core/router.js`). Al final de `tema-bep2.css`, la sección "componentes comunes" cambia botones, formularios, tablas, menú lateral, pestañas y ventanas.

## Cambios

Este front se edita **directamente aquí** (`BackNode/public/AppBEP`); no hay nada que compilar ni copiar. Después de un cambio basta recargar con Ctrl+F5. El `FrontEnd` original de la carpeta del proyecto queda como copia de referencia sin tocar.
