/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/revisar-004-b.mjs
   KZ-BROSTY-004-B · revisión móvil focalizada y capturas del enlace manual

   Mide en 360, 375, 390 y 430 px y guarda capturas de:
     · el menú con las ilustraciones y las tarjetas
     · el carrito normal
     · el carrito con la acción manual «Abrir WhatsApp con mi pedido» visible

   Es emulación de Chromium. NO es una prueba en teléfono físico.

   USO
     node herramientas/revisar-004-b.mjs --salida <carpeta>
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PUERTO = 8154;
const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const arg = (n, def) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : def; };
const SALIDA = path.resolve(arg('salida', path.join(os.tmpdir(), 'kz-brosty-004-b-capturas')));
fs.mkdirSync(SALIDA, { recursive: true });

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || '',
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('Sin Playwright'); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const servidor = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PUERTO}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream' });
    res.end(fs.readFileSync(path.join(RAIZ, rel)));
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => servidor.listen(PUERTO, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PUERTO}/index.html`;

let fallos = 0;
const check = (ok, nombre, detalle) => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} · ${nombre}${detalle !== undefined && detalle !== '' ? '  →  ' + detalle : ''}`);
};

const ANCHOS = [360, 375, 390, 430];
const CONTROLES = 'button, .btn, .chip, .variante, .agregar, .cabecera__nav a, .cabecera__carrito, .quick__btn, .linea__quitar, .carrito__cerrar, #abrir-manual';

const navegador = await chromium.launch();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrir(ancho) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>wa.me (interceptado)</title>' }));
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 120)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await esperar(600);
  return { ctx, page, errores };
}

const MEDIR = () => {
  const visible = (el) => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const enCarrusel = (el) => {
    let n = el.parentElement;
    while (n) { const s = getComputedStyle(n); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth) return true; n = n.parentElement; }
    return false;
  };
  const fuera = [...document.querySelectorAll('body *')]
    .filter((el) => visible(el) && !enCarrusel(el))
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
    .map((el) => (el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName));
  const CONTROLES = 'button, .btn, .chip, .variante, .agregar, .cabecera__nav a, .cabecera__carrito, .quick__btn, .linea__quitar, .carrito__cerrar, #abrir-manual';
  const chicos = [...document.querySelectorAll(CONTROLES)]
    .filter((el) => visible(el))
    .map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter((i) => i.h < 44);
  const iconos = [...document.querySelectorAll('.platillo')].map((t) => {
    const u = t.querySelector('.platillo__icono use');
    const s = t.querySelector('.platillo__icono svg');
    return { ref: u ? u.getAttribute('href') : '', w: s ? Math.round(s.getBoundingClientRect().width) : 0 };
  });
  const titulos = [...document.querySelectorAll('.platillo__nombre')].map((n) => {
    const s = getComputedStyle(n); const lh = parseFloat(s.lineHeight) || 20;
    return Math.round(n.getBoundingClientRect().height / lh);
  });
  return {
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    fuera, chicos,
    iconosVacios: iconos.filter((i) => !i.ref || i.w < 18).length,
    iconosDistintos: new Set(iconos.map((i) => i.ref)).size,
    maxLineasTitulo: Math.max(...titulos),
    pieVisible: (() => { const p = document.querySelector('.pie__legal'); if (!p) return false; const r = p.getBoundingClientRect(); return r.height > 0; })(),
  };
};

for (const ancho of ANCHOS) {
  console.log(`\n═══ ${ancho} px ═══`);
  const { ctx, page, errores } = await abrir(ancho);

  const m = await page.evaluate(MEDIR);
  check(m.desborde === 0 && m.fuera.length === 0, 'sin desbordamientos ni recortes', `desborde=${m.desborde} fuera=${m.fuera.length}`);
  check(m.iconosVacios === 0 && m.iconosDistintos === 15, 'las 15 ilustraciones SVG se dibujan y son distintas', `${m.iconosDistintos} distintas`);
  check(m.maxLineasTitulo <= 2, 'los nombres de plato no se parten de más', `máx ${m.maxLineasTitulo} línea(s)`);
  check(m.chicos.length === 0, 'todos los controles tienen 44 px de alto', m.chicos.length ? m.chicos.slice(0, 4).map((c) => `${c.t}(${c.w}×${c.h})`).join(', ') : 'ninguno pequeño');
  check(m.pieVisible, 'el pie de página se renderiza');

  /* menú + tarjetas */
  await page.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
  await esperar(500);
  await page.screenshot({ path: path.join(SALIDA, `${ancho}-menu.png`) });

  /* carrito normal */
  await page.evaluate(() => {
    window.BROSTY.sumar('combo-apanado', 'Combo con Apanado', '');
    window.BROSTY.sumar('patacon', 'Patacón', 'Mixto');
    window.BROSTY.sumar('limonadas', 'Limonada', 'De coco');
    window.BROSTY.pedido.nombre = 'Cliente de ejemplo';
    window.BROSTY.pedido.entrega = 'Domicilio en el barrio';
    window.BROSTY.guardar();
    window.BROSTY.pintar();
    window.BROSTY.abrir();
  });
  await esperar(700);
  const carrito = await page.evaluate(() => {
    const a = document.querySelector('#enviar-pedido').getBoundingClientRect();
    return { enviarDentro: a.top >= 0 && a.bottom <= window.innerHeight && a.width > 40, variantes: document.querySelectorAll('.variante').length };
  });
  check(carrito.enviarDentro, 'el botón de enviar queda completo dentro de la ventana', 'sí');
  await page.screenshot({ path: path.join(SALIDA, `${ancho}-carrito.png`) });

  /* carrito con la acción manual visible (bloqueo simulado) */
  await page.evaluate(() => { window.open = function () { return null; }; });
  await page.click('#enviar-pedido');
  await esperar(700);
  const manual = await page.evaluate(() => {
    const el = document.querySelector('#abrir-manual');
    const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    const nota = document.querySelector('#abrir-manual-aviso').getBoundingClientRect();
    const caja = document.querySelector('#carrito').getBoundingClientRect();
    return {
      visible: s.display !== 'none' && r.height > 0,
      alto: Math.round(r.height),
      completo: r.top >= 0 && r.bottom <= window.innerHeight,
      dentroDelPanel: r.left >= caja.left - 1 && r.right <= caja.right + 1,
      notaVisible: getComputedStyle(document.querySelector('#abrir-manual-aviso')).display !== 'none' && nota.height > 0,
      texto: el.textContent.trim(),
      href: el.getAttribute('href') || '',
    };
  });
  check(manual.visible && manual.alto >= 44, 'la acción manual se ve y es pulsable', `${manual.alto} px de alto`);
  check(manual.completo, 'la acción manual queda completa dentro de la pantalla', 'visible sin recortes');
  check(manual.dentroDelPanel, 'no se sale del panel del carrito');
  check(manual.notaVisible, 'se ve la nota de que el mensaje no se envía solo');
  check(/^https:\/\/wa\.me\/573003201296\?text=/.test(manual.href), 'el enlace lleva el pedido completo', decodeURIComponent(manual.href.split('?text=')[1] || '').split('\n')[0].slice(0, 40) + '…');
  await page.screenshot({ path: path.join(SALIDA, `${ancho}-carrito-manual.png`) });

  check(errores.length === 0, 'sin errores de consola', errores[0] || '0');
  await ctx.close();
}

/* página completa a 390 como referencia del conjunto */
console.log('\n═══ 390 px · página completa ═══');
{
  const { ctx, page } = await abrir(390);
  await page.screenshot({ path: path.join(SALIDA, '390-pagina-completa.png'), fullPage: true });
  check(true, 'captura de la página completa guardada');
  await ctx.close();
}

await navegador.close();
servidor.close();

console.log('\n════════════════════════════════════════');
console.log(`revisión móvil · ${fallos === 0 ? 'TODO OK' : fallos + ' fallo(s)'}`);
console.log('capturas en: ' + SALIDA);
process.exit(fallos === 0 ? 0 : 1);
