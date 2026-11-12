/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/probar-envio-004.mjs
   KZ-BROSTY-004-A · regresión del envío a WhatsApp

   EL DEFECTO QUE VIGILA
     `window.open(url, '_blank', 'noopener')` devuelve SIEMPRE null, también
     cuando la pestaña se abre: con `noopener` el navegador no entrega la
     referencia. El código lo leía como «el navegador bloqueó la ventana», así
     que mostraba un aviso falso y dejaba el carrito abierto.

     La auditoría anterior NO lo detectó porque sustituía `window.open` por una
     función de mentira que devolvía un objeto. Este archivo **no toca
     `window.open`**: pulsa el botón de verdad y observa la pestaña real que
     abre el navegador. Es la única forma de que la prueba pueda fallar.

   QUÉ COMPRUEBA
     1. Al pulsar «Enviar pedido» se abre una pestaña nueva de verdad.
     2. La pestaña va a https://wa.me/573003201296 con el mensaje generado.
     3. La pestaña NO tiene acceso a window.opener (protección mantenida).
     4. El carrito se cierra y el aviso NO acusa un bloqueo inexistente.
     5. El pedido no se pierde al enviar.
     6. Si el navegador bloquea de verdad, hay un camino alternativo y el aviso
        es honesto.
     7. Con el pedido vacío no se abre nada.

   NINGÚN PEDIDO REAL: las peticiones a wa.me se interceptan y se responde con
   una página de prueba. Nunca se contacta con WhatsApp.
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

/* Página de prueba en lugar de WhatsApp: nada sale a la red. */
const STUB = '<!doctype html><meta charset="utf-8"><title>wa.me (interceptado)</title><p>pedido de prueba</p>';

async function contexto({ aceptarDescargas = false } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: aceptarDescargas });
  /* context.route cubre también las pestañas nuevas */
  await ctx.route('https://wa.me/**', (ruta) => ruta.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: STUB }));
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 140)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await esperar(400);
  return { ctx, page, errores };
}

/* pedido de ejemplo, sin enviar nada */
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
}

/* ══════════════════ 1 · ENVÍO NORMAL (el caso del defecto) ══════════════════ */
console.log('\n═══ 1 · ENVÍO REAL EN CHROMIUM (sin sustituir window.open) ═══');
let mensajeEsperado = '';
{
  const { ctx, page, errores } = await contexto();
  await prepararPedido(page);
  mensajeEsperado = await page.evaluate(() => window.BROSTY.armarMensaje());

  const antes = await page.evaluate(() => ({
    carritoAbierto: document.querySelector('#carrito').classList.contains('abierto'),
    enviarActivo: !document.querySelector('#enviar-pedido').disabled,
  }));
  check(antes.carritoAbierto && antes.enviarActivo, 'el carrito está abierto y se puede enviar');

  const [popup] = await Promise.all([
    ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null),
    page.click('#enviar-pedido'),
  ]);

  check(!!popup, 'pulsar «Enviar pedido» abre una pestaña nueva de verdad', popup ? 'pestaña abierta' : 'NINGUNA pestaña');
  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await popup.waitForURL(/wa\.me/, { timeout: 5000 }).catch(() => {});
    await esperar(250);
    const url = popup.url();
    check(url.startsWith(WA + '?text='), 'la pestaña va al WhatsApp oficial', url.slice(0, 52) + '…');
    const texto = url.includes('?text=') ? decodeURIComponent(url.split('?text=')[1]) : '';
    check(texto === mensajeEsperado, 'el texto del enlace es el mensaje generado', texto.length + ' caracteres');

    /* la protección anti-opener debe seguir en pie */
    const opener = await popup.evaluate(() => window.opener).catch(() => 'no medible');
    check(opener === null, 'la pestaña NO tiene acceso a window.opener', String(opener));
    await popup.close().catch(() => {});
  }

  await esperar(400);
  const despues = await page.evaluate(() => ({
    carritoAbierto: document.querySelector('#carrito').classList.contains('abierto'),
    aviso: document.querySelector('#toast').textContent.trim(),
    avisoVisible: document.querySelector('#toast').classList.contains('visible'),
    lineas: window.BROSTY.pedido.lineas.length,
    unidades: window.BROSTY.pedido.lineas.reduce((n, l) => n + l.cantidad, 0),
  }));

  /* ESTAS DOS SON LAS QUE FALLAN CON EL DEFECTO */
  check(!despues.carritoAbierto, 'el carrito se cierra al enviar', despues.carritoAbierto ? 'SIGUE ABIERTO' : 'cerrado');
  check(!/bloque/i.test(despues.aviso), 'el aviso NO acusa un bloqueo inexistente', despues.aviso || '(sin aviso)');
  check(/whatsapp/i.test(despues.aviso) && despues.avisoVisible, 'el aviso habla de WhatsApp y se muestra', despues.aviso);
  check(despues.lineas === 2 && despues.unidades === 2, 'el pedido no se pierde al enviar', `${despues.lineas} líneas · ${despues.unidades} unidades`);
  check(errores.length === 0, 'sin errores de consola', errores[0] || '0');

  /* el mensaje que se abriría, guardado como evidencia legible (fuera del repo) */
  const salida = path.join(os.tmpdir(), 'kz-brosty-004-a');
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, 'mensaje-enviado.txt'), mensajeEsperado + '\n', 'utf8');
  console.log('  mensaje de prueba guardado en: ' + path.join(salida, 'mensaje-enviado.txt'));
  await ctx.close();
}

/* ══════════════════ 2 · BLOQUEO REAL (simulado) ══════════════════ */
console.log('\n═══ 2 · SI EL NAVEGADOR BLOQUEA DE VERDAD (simulado) ═══');
{
  const { ctx, page, errores } = await contexto();
  await prepararPedido(page);
  /* Se simula el bloqueo: window.open devuelve null. Es la única forma de
     reproducir un bloqueador real de ventanas emergentes en modo headless. */
  await page.evaluate(() => { window.open = function () { return null; }; });

  const [popup] = await Promise.all([
    ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null),
    page.click('#enviar-pedido'),
  ]);
  check(!!popup, 'con window.open bloqueado, el camino alternativo abre WhatsApp igual', popup ? 'pestaña abierta' : 'ninguna pestaña');
  if (popup) { await popup.waitForLoadState('domcontentloaded').catch(() => {}); check(popup.url().startsWith(WA), 'la alternativa va al número oficial', popup.url().slice(0, 46) + '…'); await popup.close().catch(() => {}); }

  await esperar(400);
  const estado = await page.evaluate(() => ({
    aviso: document.querySelector('#toast').textContent.trim(),
    lineas: window.BROSTY.pedido.lineas.length,
  }));
  check(estado.aviso.length > 0, 'hay un aviso para la persona', estado.aviso);
  check(estado.lineas === 2, 'el pedido sigue intacto', `${estado.lineas} líneas`);
  check(errores.length === 0, 'sin errores de consola en el bloqueo', errores[0] || '0');
  await ctx.close();
}

/* ══════════════════ 3 · PEDIDO VACÍO ══════════════════ */
console.log('\n═══ 3 · PEDIDO VACÍO ═══');
{
  const { ctx, page } = await contexto();
  let seAbrio = false;
  const alAbrir = () => { seAbrio = true; };
  ctx.on('page', alAbrir);
  const r = await page.evaluate(() => window.BROSTY.enviar());
  await esperar(600);
  ctx.off('page', alAbrir);
  check(!seAbrio, 'con el pedido vacío no se abre ninguna pestaña');
  check(r === undefined, 'con el pedido vacío enviar() no hace nada', String(r));
  check(await page.evaluate(() => document.querySelector('#enviar-pedido').disabled), 'el botón de enviar está desactivado');
  await ctx.close();
}

await navegador.close();
servidor.close();

console.log('\n════════════════════════════════════════');
console.log(`regresión del envío · ${resultados.length - fallos}/${resultados.length} OK · ${fallos} fallo(s)`);
process.exit(fallos === 0 ? 0 : 1);
