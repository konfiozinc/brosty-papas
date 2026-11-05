/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/verificar-produccion.mjs
   KZ-BROSTY-006 · comprobación del sitio PUBLICADO en GitHub Pages

   1. HTTP: la página, sus recursos (logo, iconos, og:image, CSS, JS) y las
      rutas que NO deben existir (herramientas, evidencias, _config.yml…).
   2. Navegador: carga la URL real y cuenta errores de consola, excepciones y
      peticiones fallidas.
   3. Comprueba que la versión servida es la aprobada (portada a dos columnas,
      menú a cuatro columnas, contenedor al 90 %, logo real cargado).
   4. Capturas de escritorio y móvil para Darwin.

   Uso: node herramientas/verificar-produccion.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const BASE = 'https://konfiozinc.github.io/brosty-papas';
const RAIZ = path.resolve(import.meta.dirname, '..');
const EVID = path.join(RAIZ, 'evidencias');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const require = createRequire(import.meta.url);

fs.mkdirSync(EVID, { recursive: true });
let fallos = 0;
const check = (ok, nombre, detalle) => {
  if (!ok) fallos++;
  console.log(`${ok ? '✓' : '✗'} ${nombre}${detalle ? '  →  ' + detalle : ''}`);
};

/* ─── 1 · HTTP ───────────────────────────────────────────────────────── */
console.log('\n═══ 1 · RECURSOS QUE DEBEN SERVIRSE (HTTP 200) ═══');
const debenServirse = [
  ['la página', '/'],
  ['hoja de estilos', '/assets/css/estilos.css'],
  ['script del carrito', '/assets/js/app.js'],
  ['logo real', '/assets/img/marca/logo-brosty.jpg'],
  ['favicon SVG', '/assets/img/marca/favicon.svg'],
  ['favicon 32', '/assets/img/marca/favicon-32.png'],
  ['favicon 64', '/assets/img/marca/favicon-64.png'],
  ['apple-touch-icon', '/assets/img/marca/apple-touch-icon.png'],
  ['imagen para compartir', '/assets/img/og/og-1200x630.png']
];
const respuestas = {};
for (const [nombre, ruta] of debenServirse) {
  try {
    const r = await fetch(BASE + ruta, { redirect: 'follow' });
    const buf = Buffer.from(await r.arrayBuffer());
    respuestas[ruta] = { estado: r.status, bytes: buf.length, tipo: (r.headers.get('content-type') || '').split(';')[0] };
    respuestas[ruta].texto = /text\/html|javascript|css/.test(respuestas[ruta].tipo) ? buf.toString('utf8') : '';
    check(r.status === 200, nombre, `${r.status} · ${respuestas[ruta].tipo} · ${Math.round(buf.length / 1024 * 10) / 10} KB`);
  } catch (e) {
    check(false, nombre, 'error de red: ' + e.message.slice(0, 60));
  }
}

console.log('\n═══ 2 · RUTAS QUE NO DEBEN PUBLICARSE (HTTP 404) ═══');
const noDebenServirse = [
  ['/herramientas/', 'la carpeta de herramientas'],
  ['/herramientas/verificar-calidad-html.js', 'el verificador'],
  ['/herramientas/probar.mjs', 'las pruebas'],
  ['/evidencias/', 'las capturas e informes'],
  ['/LEEME-REVISION.txt', 'la nota interna'],
  ['/_config.yml', 'la configuración de publicación'],
  ['/.gitignore', 'el .gitignore'],
  ['/logobrosty.jpeg', 'el original del logo en la raíz'],
  ['/README.md', 'el README']
];
let excluidasOk = 0;
for (const [ruta, nombre] of noDebenServirse) {
  try {
    const r = await fetch(BASE + ruta, { redirect: 'follow' });
    check(r.status === 404, nombre, 'HTTP ' + r.status);
    if (r.status === 404) excluidasOk++;
  } catch (e) {
    check(false, nombre, 'error de red');
  }
}

/* ─── 3 · La página servida es la aprobada ───────────────────────────── */
console.log('\n═══ 3 · LA PÁGINA PUBLICADA ES LA VERSIÓN APROBADA ═══');
const html = respuestas['/'] ? respuestas['/'].texto : '';
check(/<title>BROSTY PAPAS \| Pollo Broaster y Asado<\/title>/.test(html), 'título correcto');
check(/¡El sabor que provoca repetir!/.test(html), 'eslogan del volante');
check((html.match(/class="platillo"/g) || []).length === 15, 'los 15 platos', (html.match(/class="platillo"/g) || []).length + ' tarjetas');
check(/logo-brosty\.jpg/.test(html), 'usa el logo real (JPEG)');
check(/quick__btn--whatsapp/.test(html) && /viewBox="0 0 24 24"/.test(html), 'botón flotante con icono SVG de WhatsApp');
check(/573003201296/.test(html), 'número de WhatsApp correcto');
check(/og:image" content="https:\/\/konfiozinc\.github\.io\/brosty-papas\//.test(html), 'Open Graph con URL absoluta del sitio');
check(!/\$\s?\d/.test(html), 'sin precios inventados en el HTML publicado');

/* ─── 4 · Navegador real ─────────────────────────────────────────────── */
console.log('\n═══ 4 · CARGA EN UN NAVEGADOR REAL ═══');
const candidatosPw = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
].filter(Boolean);
let chromium = null;
for (const c of candidatosPw) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('Sin Playwright'); process.exit(1); }

const navegador = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
console.log(`  navegador: ${fs.existsSync(CHROME) ? 'Google Chrome del sistema' : 'Chromium de Playwright'} v${navegador.version()}`);

const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errores = [];
const fallidas = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 140)); });
p.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 140)));
p.on('requestfailed', (req) => fallidas.push(req.url().slice(0, 90) + ' → ' + (req.failure() || {}).errorText));
p.on('response', (r) => { if (r.status() >= 400) fallidas.push(`${r.status()} ${r.url().slice(0, 90)}`); });

const respuesta = await p.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(2500);

const medido = await p.evaluate(() => {
  const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const imgs = [...document.images].map((i) => ({ src: i.getAttribute('src'), cargada: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }));
  return {
    titulo: document.title,
    imagenes: imgs,
    todasCargan: imgs.every((i) => i.cargada),
    cobertura: Math.round((document.querySelector('.contenedor-ancho') || {}).getBoundingClientRect().width / window.innerWidth * 100),
    heroColumnas: getComputedStyle(document.querySelector('.hero__interior')).gridTemplateColumns.split(' ').length,
    menuColumnas: getComputedStyle(document.querySelector('.platillos')).gridTemplateColumns.split(' ').length,
    logoCabecera: R('.cabecera__logo'),
    logoHeroe: R('.hero__placa'),
    botones: [...document.querySelectorAll('.hero__acciones .btn')].map((b) => ({ t: b.innerText.trim().slice(0, 20), w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) })),
    iconoWhatsApp: (() => { const s = document.querySelector('.quick__btn--whatsapp svg'); if (!s) return null; return { hay: true, color: getComputedStyle(document.querySelector('.quick__btn--whatsapp')).backgroundColor }; })(),
    carritoFunciona: (() => { try { window.BROSTY.sumar('combo-apanado', 'Combo con Apanado', ''); return window.BROSTY.pedido.lineas.length === 1; } catch (e) { return false; } })(),
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    protocoloHTTPS: location.protocol,
  };
});

check(respuesta && respuesta.status() === 200, 'la URL responde 200', respuesta ? 'HTTP ' + respuesta.status() : 'sin respuesta');
check(errores.length === 0, 'CERO errores en consola', errores.length ? errores[0] : '0 errores, 0 excepciones');
check(fallidas.length === 0, 'ninguna petición fallida', fallidas.length ? fallidas[0] : '0');
check(medido.todasCargan, 'todas las imágenes cargan', medido.imagenes.map((i) => `${path.basename(i.src || '')} ${i.w}×${i.h}`).join(' · '));
check(medido.protocoloHTTPS === 'https:', 'se sirve por HTTPS', medido.protocoloHTTPS);
check(medido.cobertura >= 88 && medido.cobertura <= 92, 'contenedor al 90 % en escritorio', medido.cobertura + ' %');
check(medido.heroColumnas === 2, 'portada a dos columnas', medido.heroColumnas + ' columnas');
check(medido.menuColumnas === 4, 'menú a cuatro columnas', medido.menuColumnas + ' columnas');
check(!!medido.logoCabecera && medido.logoCabecera.w > 40, 'logo real en la cabecera', medido.logoCabecera ? medido.logoCabecera.w + '×' + medido.logoCabecera.h : '—');
check(!!medido.iconoWhatsApp, 'botón flotante con icono de WhatsApp', medido.iconoWhatsApp ? medido.iconoWhatsApp.color : '—');
check(medido.botones.length === 3 && new Set(medido.botones.map((b) => b.w + 'x' + b.h)).size === 1, 'los 3 botones de la portada iguales', medido.botones.map((b) => `${b.w}×${b.h}`).join(' | '));
check(medido.carritoFunciona, 'el carrito responde en producción');
check(medido.desborde === 0, 'sin desborde horizontal', medido.desborde + ' px');

/* ─── 5 · Capturas ───────────────────────────────────────────────────── */
console.log('\n═══ 5 · CAPTURAS ═══');
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(400);
const capEscritorio = path.join(EVID, 'produccion-escritorio.png');
await p.screenshot({ path: capEscritorio });
console.log(`✓ ${path.basename(capEscritorio)} (1440×900) · ${Math.round(fs.statSync(capEscritorio).size / 1024)} KB`);

const capCompleta = path.join(EVID, 'produccion-escritorio-completa.png');
await p.screenshot({ path: capCompleta, fullPage: true });
console.log(`✓ ${path.basename(capCompleta)} (página completa) · ${Math.round(fs.statSync(capCompleta).size / 1024)} KB`);
await ctx.close();

const ctxM = await navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const pm = await ctxM.newPage();
await pm.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
await pm.waitForTimeout(1500);
const capMovil = path.join(EVID, 'produccion-movil.png');
await pm.screenshot({ path: capMovil, fullPage: true });
console.log(`✓ ${path.basename(capMovil)} (390×844, completa) · ${Math.round(fs.statSync(capMovil).size / 1024)} KB`);
await ctxM.close();

await navegador.close();

/* ─── Resumen ────────────────────────────────────────────────────────── */
console.log('\n════════════════════════════════════════════════');
console.log(fallos === 0
  ? 'PRODUCCIÓN VERIFICADA: la tarjeta de BROSTY PAPAS está en vivo y sin fallos.'
  : `PRODUCCIÓN CON ${fallos} FALLO(S)`);
console.log('URL: ' + BASE + '/');
console.log(`rutas internas correctamente ocultas: ${excluidasOk} de ${noDebenServirse.length}`);
process.exit(fallos === 0 ? 0 : 1);
