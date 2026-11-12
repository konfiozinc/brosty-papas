/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/capturar-004.mjs
   KZ-BROSTY-004 · capturas de entrega (las que revisa ChatGPT)

   Genera el juego de capturas que pide la misión: portada, menú completo,
   tarjetas corregidas, versión móvil y carrito. Sirve la carpeta en local y
   usa el Chromium de Playwright que ya está en el equipo (no instala nada).

   USO
     node herramientas/capturar-004.mjs --salida <carpeta>
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PUERTO = 8152;
const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
const arg = (n, def) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : def; };
const SALIDA = path.resolve(arg('salida', path.join(RAIZ, 'evidencias', 'capturas-004')));
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

const navegador = await chromium.launch();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function sesion(ancho, alto, movil) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    isMobile: movil, hasTouch: movil, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.open = () => ({ closed: false, focus() {}, close() {} }); });
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await esperar(700);
  return { ctx, page };
}

async function instantanea(page, nombre) {
  const ruta = path.join(SALIDA, nombre + '.png');
  await page.screenshot({ path: ruta });
  console.log('  ' + nombre + '.png  ' + Math.round(fs.statSync(ruta).size / 1024) + ' KB');
}

/* ── escritorio 1366 ─────────────────────────────────────────────────── */
console.log('escritorio 1366');
{
  const { ctx, page } = await sesion(1366, 900, false);
  await instantanea(page, 'escritorio-portada');
  await page.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
  await esperar(500);
  await instantanea(page, 'escritorio-tarjetas');
  await page.screenshot({ path: path.join(SALIDA, 'escritorio-pagina-completa.png'), fullPage: true });
  console.log('  escritorio-pagina-completa.png  ' + Math.round(fs.statSync(path.join(SALIDA, 'escritorio-pagina-completa.png')).size / 1024) + ' KB');
  await ctx.close();
}

/* ── móvil 390 ───────────────────────────────────────────────────────── */
console.log('movil 390');
{
  const { ctx, page } = await sesion(390, 844, true);
  await instantanea(page, 'movil-portada');
  await page.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
  await esperar(500);
  await instantanea(page, 'movil-tarjetas');
  await page.screenshot({ path: path.join(SALIDA, 'movil-pagina-completa.png'), fullPage: true });
  console.log('  movil-pagina-completa.png  ' + Math.round(fs.statSync(path.join(SALIDA, 'movil-pagina-completa.png')).size / 1024) + ' KB');

  /* carrito con un pedido real de prueba (no se envía nada) */
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
  await instantanea(page, 'movil-carrito');
  await page.evaluate(() => window.BROSTY.cerrar());
  await esperar(400);
  await ctx.close();
}

/* ── tableta 768 ─────────────────────────────────────────────────────── */
console.log('tableta 768');
{
  const { ctx, page } = await sesion(768, 1024, false);
  await page.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
  await esperar(500);
  await instantanea(page, 'tableta-tarjetas');
  await ctx.close();
}

await navegador.close();
servidor.close();
console.log('\ncapturas en: ' + SALIDA);
