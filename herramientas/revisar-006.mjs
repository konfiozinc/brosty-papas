/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/revisar-006.mjs
   KZ-BROSTY-006 · el botón «Ver menú» de la portada

   Mide y fotografía SOLO los tres botones de la portada, en 360, 390 y 430 px,
   en sus cuatro estados (normal, hover, foco de teclado y activo). Guarda un
   JSON con los estilos calculados para poder comparar antes/después sin
   depender de mirar la imagen.

   No publica nada: sirve la carpeta en 127.0.0.1 y usa el Chromium de Playwright
   que ya está en el equipo.

   USO
     node herramientas/revisar-006.mjs --salida <carpeta> --etiqueta antes|despues
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PUERTO = 8155;
const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
const arg = (n, def) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : def; };
const SALIDA = path.resolve(arg('salida', path.join(os.tmpdir(), 'kz-brosty-006')));
const ETIQUETA = arg('etiqueta', 'antes');
fs.mkdirSync(SALIDA, { recursive: true });

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || '',
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('Sin Playwright'); process.exit(1); }

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
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

const ANCHOS = [360, 390, 430];
const navegador = await chromium.launch();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const datos = { etiqueta: ETIQUETA, anchos: {} };

const ESTILOS = () => {
  const cs = (el, p) => getComputedStyle(el)[p];
  const bloque = document.querySelector('.hero__acciones');
  const rb = bloque.getBoundingClientRect();
  const botones = [...bloque.querySelectorAll('a, button')].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      texto: el.textContent.trim(),
      href: el.getAttribute('href'),
      clases: el.className,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      enBloque: { x: Math.round(r.x - rb.x), y: Math.round(r.y - rb.y), w: Math.round(r.width), h: Math.round(r.height) },
      fondo: cs(el, 'backgroundColor'),
      color: cs(el, 'color'),
      borde: cs(el, 'borderTopWidth') + ' ' + cs(el, 'borderTopStyle') + ' ' + cs(el, 'borderTopColor'),
      sombra: cs(el, 'boxShadow'),
      radio: cs(el, 'borderTopLeftRadius'),
      foco: {
        contorno: cs(el, 'outlineWidth') + ' ' + cs(el, 'outlineStyle') + ' ' + cs(el, 'outlineColor'),
        desplazamiento: cs(el, 'outlineOffset'),
      },
    };
  });
  return {
    bloque: { x: Math.round(rb.x), y: Math.round(rb.y), w: Math.round(rb.width), h: Math.round(rb.height) },
    botones,
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

for (const ancho of ANCHOS) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 120)));
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await esperar(600);

  const info = await page.evaluate(ESTILOS);
  const verMenu = info.botones.find((b) => /ver men/i.test(b.texto));

  /* recorte con margen: incluye el fondo del hero a la izquierda para poder
     medir el contraste del botón contra lo que tiene detrás */
  const margen = 24;
  const clip = {
    x: Math.max(0, info.bloque.x - margen),
    y: Math.max(0, info.bloque.y - 8),
    width: Math.min(ancho - Math.max(0, info.bloque.x - margen), info.bloque.w + margen * 2),
    height: info.bloque.h + 16,
  };
  await page.screenshot({ path: path.join(SALIDA, `${ETIQUETA}-${ancho}-menu-botones.png`), clip });

  /* estado normal del botón, aislado */
  const objetivo = page.locator('.hero__acciones a[href="#menu"]');
  await objetivo.screenshot({ path: path.join(SALIDA, `${ETIQUETA}-${ancho}-normal.png`) });

  /* hover */
  await objetivo.hover();
  await esperar(350);
  const hover = await page.evaluate(() => {
    const el = document.querySelector('.hero__acciones a[href="#menu"]');
    const s = getComputedStyle(el);
    return { fondo: s.backgroundColor, color: s.color, sombra: s.boxShadow, transform: s.transform };
  });
  await objetivo.screenshot({ path: path.join(SALIDA, `${ETIQUETA}-${ancho}-hover.png`) });

  /* foco de teclado: se llega tabulando, que es como aparece :focus-visible */
  await page.mouse.move(5, 5);
  await page.evaluate(() => document.body.focus());
  let enfocado = false;
  for (let i = 0; i < 25 && !enfocado; i++) {
    await page.keyboard.press('Tab');
    enfocado = await page.evaluate(() => {
      const a = document.activeElement;
      return !!a && a.matches && a.matches('.hero__acciones a[href="#menu"]');
    });
  }
  await esperar(250);
  const foco = await page.evaluate(() => {
    const el = document.querySelector('.hero__acciones a[href="#menu"]');
    const s = getComputedStyle(el);
    return {
      alcanzadoPorTeclado: document.activeElement === el,
      contorno: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`,
      desplazamiento: s.outlineOffset,
      coincideFocusVisible: el.matches(':focus-visible'),
    };
  });
  await objetivo.screenshot({ path: path.join(SALIDA, `${ETIQUETA}-${ancho}-foco.png`) });

  /* activo (pulsando de verdad con el ratón) */
  const caja = await objetivo.boundingBox();
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await esperar(200);
  const activo = await page.evaluate(() => {
    const el = document.querySelector('.hero__acciones a[href="#menu"]');
    const s = getComputedStyle(el);
    return { fondo: s.backgroundColor, color: s.color, transform: s.transform };
  });
  await objetivo.screenshot({ path: path.join(SALIDA, `${ETIQUETA}-${ancho}-activo.png`) });
  await page.mouse.up();

  /* portada completa para el antes/después */
  await page.evaluate(() => window.scrollTo(0, 0));
  await esperar(300);
  await page.screenshot({ path: path.join(SALIDA, `${ETIQUETA}-${ancho}-portada.png`) });

  datos.anchos[ancho] = { ...info, clip, hover, foco, activo, errores };
  console.log(`${ancho}px · «Ver menú»: fondo ${verMenu.fondo} · texto ${verMenu.color} · borde ${verMenu.borde} · sombra ${verMenu.sombra === 'none' ? 'ninguna' : 'sí'} · desborde ${info.desborde} · errores ${errores.length}`);
  await ctx.close();
}

await navegador.close();
servidor.close();
fs.writeFileSync(path.join(SALIDA, `${ETIQUETA}.json`), JSON.stringify(datos, null, 1), 'utf8');
console.log('JSON y capturas en: ' + SALIDA);
