/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/probar-envio-004.mjs
   KZ-BROSTY-004-A y 004-B · regresión del envío a WhatsApp

   HISTORIA DE LOS DOS DEFECTOS QUE VIGILA

   004-A · `window.open(url, '_blank', 'noopener')` devuelve SIEMPRE null,
           también cuando la pestaña se abre. El código lo leía como «bloqueado»,
           así que avisaba de un bloqueo falso y dejaba el carrito abierto.

   004-B · el respaldo automático pulsaba un enlace y daba el intento por bueno
           solo porque `.click()` no lanzaba una excepción. Eso NO demuestra que
           WhatsApp se abriera, y aun así se anunciaba como éxito. Ahora: un solo
           intento automático y, si no se puede confirmar, un enlace real
           «Abrir WhatsApp con mi pedido» que pulsa la persona. El pedido no se
           toca nunca.

   ESTE ARCHIVO NO SUSTITUYE `window.open` en el caso normal: pulsa el botón y
   observa la pestaña que abre el navegador de verdad. Si lo sustituyera, el
   defecto de 004-A volvería a quedar escondido. Solo se simula el bloqueo
   cuando se prueba el bloqueo, que es lo único que no se puede provocar de otro
   modo en modo headless.

   NINGÚN PEDIDO REAL: las peticiones a wa.me se interceptan con una página de
   prueba. Nunca se contacta con WhatsApp ni se envía nada.
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PUERTO = 8153;
const WA = 'https://wa.me/573003201296';
const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
const arg = (n, def) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : def; };
const SALIDA = path.resolve(arg('salida', path.join(os.tmpdir(), 'kz-brosty-004-b')));
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
const resultados = [];
const check = (ok, nombre, detalle) => {
  if (!ok) fallos++;
  resultados.push({ nombre, ok: !!ok, detalle: detalle === undefined ? '' : String(detalle) });
  console.log(`${ok ? 'OK  ' : 'FALLA'} · ${nombre}${detalle !== undefined && detalle !== '' ? '  →  ' + detalle : ''}`);
};

const navegador = await chromium.launch();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const STUB = '<!doctype html><meta charset="utf-8"><title>wa.me (interceptado)</title><p>pedido de prueba</p>';

async function contexto() {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.route('https://wa.me/**', (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: STUB }));
  const page = await ctx.newPage();
  const errores = [];
  const aperturas = [];
  ctx.on('page', (p) => aperturas.push(p));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 140)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await esperar(400);
  return { ctx, page, errores, aperturas };
}

async function estadoCarrito(page) {
  return page.evaluate(() => {
    const t = (s) => document.querySelector(s);
    const visible = (s) => { const e = t(s); return !!e && getComputedStyle(e).display !== 'none'; };
    const manual = t('#abrir-manual');
    return {
      abierto: t('#carrito').classList.contains('abierto'),
      aviso: t('#toast').textContent.trim(),
      avisoVisible: t('#toast').classList.contains('visible'),
      enviarVisible: visible('#enviar-pedido'),
      enviarDesactivado: t('#enviar-pedido').disabled,
      manualVisible: visible('#abrir-manual'),
      manualHref: manual ? manual.getAttribute('href') : '',
      manualTarget: manual ? manual.getAttribute('target') : '',
      manualRel: manual ? manual.getAttribute('rel') : '',
      manualTexto: manual ? manual.textContent.trim() : '',
      avisoManualVisible: visible('#abrir-manual-aviso'),
      lineas: window.BROSTY.pedido.lineas.map((l) => `${l.cantidad}x ${l.nombre}${l.variante ? ' (' + l.variante + ')' : ''}${l.obs ? ' [' + l.obs + ']' : ''}`),
      urlActual: window.BROSTY.construirUrl(),
    };
  });
}

async function prepararPedido(page) {
  await page.evaluate(() => {
    window.BROSTY.sumar('combo-apanado', 'Combo con Apanado', '');
    window.BROSTY.sumar('patacon', 'Patacón', 'Mixto');
    window.BROSTY.pedido.nombre = 'Prueba KZ';
    window.BROSTY.pedido.entrega = 'Domicilio de prueba';
    window.BROSTY.guardar();
    window.BROSTY.pintar();
    window.BROSTY.abrir();
  });
  await esperar(500);
  await page.fill('#carrito-lineas .linea:nth-child(1) .linea__obs', 'Sin salsa, bien asado');
  await esperar(250);
}

/* ══════════════════ 1 · APERTURA NORMAL ══════════════════ */
console.log('\n═══ 1 · APERTURA NORMAL (window.open real, sin sustituirlo) ═══');
let mensajeEsperado = '';
{
  const { ctx, page, errores, aperturas } = await contexto();
  await prepararPedido(page);
  mensajeEsperado = await page.evaluate(() => window.BROSTY.armarMensaje());

  const antes = await estadoCarrito(page);
  check(antes.abierto && antes.enviarVisible && !antes.enviarDesactivado, 'el carrito está abierto y se puede enviar');
  check(!antes.manualVisible, 'la acción manual no aparece antes de intentar nada');

  await page.click('#enviar-pedido');
  await esperar(900);

  const popup = aperturas[0] || null;
  check(!!popup, 'pulsar «Enviar pedido» abre una pestaña nueva de verdad', popup ? '1 pestaña' : 'NINGUNA');
  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await popup.waitForURL(/wa\.me/, { timeout: 5000 }).catch(() => {});
    await esperar(250);
    const url = popup.url();
    check(url.startsWith(WA + '?text='), 'la pestaña va al WhatsApp oficial', url.slice(0, 52) + '…');
    const texto = url.includes('?text=') ? decodeURIComponent(url.split('?text=')[1]) : '';
    check(texto === mensajeEsperado, 'el texto del enlace es el mensaje generado', texto.length + ' caracteres');
    const opener = await popup.evaluate(() => window.opener).catch(() => 'no medible');
    check(opener === null, 'la pestaña NO tiene acceso a window.opener', String(opener));
    await popup.close().catch(() => {});
  }

  const d = await estadoCarrito(page);
  check(!d.abierto, 'el carrito se cierra cuando la apertura está confirmada', d.abierto ? 'SIGUE ABIERTO' : 'cerrado');
  check(/abrimos whatsapp/i.test(d.aviso) && d.avisoVisible, 'el aviso confirma la apertura que sí ocurrió', d.aviso);
  check(/sin salsa/i.test(decodeURIComponent(d.urlActual)), 'el pedido conserva las observaciones', 'obs presente');
  check(d.lineas.length === 2 && d.lineas.some((l) => /Mixto/.test(l)) && d.lineas.some((l) => /Sin salsa/.test(l)),
    'el pedido conserva productos, variantes y observaciones', d.lineas.join(' | '));
  check(!aperturas.slice(1).length, 'no se abrieron pestañas duplicadas', `${aperturas.length} pestaña(s)`);
  check(errores.length === 0, 'sin errores de consola', errores[0] || '0');
  await ctx.close();
}

/* ══════════════════ 2 · VENTANA BLOQUEADA ══════════════════ */
console.log('\n═══ 2 · VENTANA BLOQUEADA (window.open devuelve null) ═══');
let urlTrasBloqueo = '';
{
  const { ctx, page, errores, aperturas } = await contexto();
  await prepararPedido(page);
  /* Se simula el bloqueo: es la única forma de reproducir un bloqueador real. */
  await page.evaluate(() => { window.__intentos = 0; window.open = function () { window.__intentos++; return null; }; });

  await page.click('#enviar-pedido');
  await esperar(900);

  check(aperturas.length === 0, 'no se abre ninguna pestaña cuando el navegador bloquea', `${aperturas.length} pestaña(s)`);
  const intentos = await page.evaluate(() => window.__intentos);
  check(intentos === 1, 'se hace UN solo intento automático (no se duplican pestañas)', `${intentos} intento(s)`);

  const d = await estadoCarrito(page);
  urlTrasBloqueo = d.manualHref;

  /* Requisito 3: la acción visible aparece y es un enlace de verdad */
  check(d.manualVisible, 'aparece la acción «Abrir WhatsApp con mi pedido»');
  check(/abrir whatsapp con mi pedido/i.test(d.manualTexto), 'el texto de la acción es el pedido', d.manualTexto);
  check(d.manualHref === d.urlActual && d.manualHref.startsWith(WA + '?text='), 'el enlace manual lleva al WhatsApp oficial con este pedido', d.manualHref.slice(0, 52) + '…');
  check(d.manualTarget === '_blank' && /noopener/.test(d.manualRel) && /noreferrer/.test(d.manualRel),
    'el enlace manual mantiene la protección anti reverse tabnabbing', `target=${d.manualTarget} rel=${d.manualRel}`);
  check(d.avisoManualVisible, 'se explica que el mensaje no se envía solo');

  /* Requisito 2: nada de anunciar éxito sin evidencia */
  check(!/abrimos whatsapp/i.test(d.aviso), 'NO se anuncia una apertura que no se puede confirmar', d.aviso);
  check(!/bloque/i.test(d.aviso), 'tampoco se culpa al navegador de un bloqueo no comprobado', d.aviso);
  check(/pulsa/i.test(d.aviso), 'el aviso invita a pulsar la acción manual', d.aviso);

  /* Requisito 1: el pedido no se pierde */
  check(d.abierto, 'el carrito sigue abierto para poder pulsar el enlace', d.abierto ? 'abierto' : 'cerrado');
  check(d.lineas.length === 2 && /sin salsa/i.test(decodeURIComponent(d.manualHref)),
    'el pedido y sus observaciones siguen intactos', d.lineas.join(' | '));
  check(!d.enviarVisible, 'el botón de intento automático se retira (una sola acción visible)', `visible=${d.enviarVisible}`);

  /* El enlace se mantiene al día si cambia el pedido */
  await page.evaluate(() => { window.BROSTY.sumar('limonadas', 'Limonada', 'De coco'); });
  await esperar(350);
  const d2 = await estadoCarrito(page);
  check(d2.manualHref !== d.manualHref && /Limonada/.test(decodeURIComponent(d2.manualHref)),
    'si se añade un producto, el enlace manual se actualiza', 'enlace al día');

  console.log('\n   ══ 3 · FALLBACK MANUAL: la persona pulsa el enlace ══');
  const antesDePulsar = aperturas.length;
  await page.click('#abrir-manual');
  await esperar(1200);
  const popupManual = aperturas[antesDePulsar] || null;
  check(!!popupManual, 'pulsar «Abrir WhatsApp con mi pedido» abre WhatsApp', popupManual ? 'pestaña abierta' : 'ninguna pestaña');
  if (popupManual) {
    await popupManual.waitForLoadState('domcontentloaded').catch(() => {});
    await popupManual.waitForURL(/wa\.me/, { timeout: 5000 }).catch(() => {});
    await esperar(250);
    check(popupManual.url() === d2.manualHref, 'abre exactamente el enlace del pedido actual', popupManual.url().slice(0, 52) + '…');
    const texto = decodeURIComponent(popupManual.url().split('?text=')[1] || '');
    check(/Combo con Apanado/.test(texto) && /\(Mixto\)/.test(texto) && /Limonada/.test(texto) && /Sin salsa/.test(texto),
      'el mensaje lleva productos, variantes y observaciones', texto.split('\n').filter((l) => l.startsWith('•')).length + ' líneas');
    const opener = await popupManual.evaluate(() => window.opener).catch(() => 'no medible');
    check(opener === null, 'el enlace manual tampoco entrega window.opener', String(opener));
    await popupManual.close().catch(() => {});
  }
  check(errores.length === 0, 'sin errores de consola en el camino manual', errores[0] || '0');
  await ctx.close();
}

/* ══════════════════ 4 · PEDIDO VACÍO ══════════════════ */
console.log('\n═══ 4 · PEDIDO VACÍO ═══');
{
  const { ctx, page, aperturas } = await contexto();
  const r = await page.evaluate(() => window.BROSTY.enviar());
  await esperar(600);
  check(aperturas.length === 0, 'con el pedido vacío no se abre ninguna pestaña');
  check(r === undefined, 'con el pedido vacío enviar() no hace nada', String(r));
  check(await page.evaluate(() => document.querySelector('#enviar-pedido').disabled), 'el botón de enviar está desactivado');
  const vacio = await estadoCarrito(page);
  check(!vacio.manualVisible, 'con el pedido vacío no aparece la acción manual');
  await ctx.close();
}

/* ══════════════════ 5 · PERSISTENCIA ══════════════════ */
console.log('\n═══ 5 · PERSISTENCIA DEL PEDIDO ═══');
{
  const { ctx, page, errores } = await contexto();
  await prepararPedido(page);
  await page.evaluate(() => window.BROSTY.guardar());
  await page.reload({ waitUntil: 'load' });
  await esperar(800);
  const d = await estadoCarrito(page);
  check(d.lineas.length === 2, 'el pedido sobrevive a recargar la página', d.lineas.join(' | '));
  check(/sin salsa/i.test(decodeURIComponent(d.urlActual)), 'las observaciones se conservan al recargar', 'obs presente');
  check(await page.evaluate(() => document.querySelector('#cuenta-cabecera').textContent.trim()) === '2', 'el contador del encabezado se restaura');
  check(errores.length === 0, 'sin errores de consola al recargar', errores[0] || '0');
  await ctx.close();
}

await navegador.close();
servidor.close();

fs.writeFileSync(path.join(SALIDA, 'mensaje-enviado.txt'), mensajeEsperado + '\n', 'utf8');
console.log('\nmensaje de prueba guardado en: ' + path.join(SALIDA, 'mensaje-enviado.txt'));
console.log('════════════════════════════════════════');
console.log(`regresión del envío · ${resultados.length - fallos}/${resultados.length} OK · ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
