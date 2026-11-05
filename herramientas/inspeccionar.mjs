/* KZ-BROSTY-003 · Inspección del logo real y capturas de verificación.
   1. Lee los píxeles del logo (fondo) para elegir bien la placa donde se monta.
   2. Captura la página en escritorio, tableta y móvil, con el carrito abierto.
   Uso: node herramientas/inspeccionar.mjs */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const EVID = path.join(RAIZ, 'evidencias');
const PUERTO = 8152;
const require = createRequire(import.meta.url);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
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

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('Sin Playwright'); process.exit(1); }
const navegador = await chromium.launch();

/* ─── 1 · píxeles del logo ───────────────────────────────────────────── */
const ctx0 = await navegador.newContext();
const p0 = await ctx0.newPage();
await p0.goto(`http://127.0.0.1:${PUERTO}/assets/img/marca/logo-brosty.jpg`, { waitUntil: 'load' });
const pixeles = await p0.evaluate(async () => {
  const img = document.querySelector('img');
  if (!img) return { error: 'sin imagen' };
  await img.decode().catch(() => {});
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = (x, y) => { const d = ctx.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), 1, 1).data; return `${d[0]},${d[1]},${d[2]}`; };
  const w = c.width, h = c.height;
  const conteo = {};
  for (let x = 2; x < w; x += 6) {
    for (const y of [2, h - 3]) { const k = px(x, y); conteo[k] = (conteo[k] || 0) + 1; }
  }
  for (let y = 2; y < h; y += 6) {
    for (const x of [2, w - 3]) { const k = px(x, y); conteo[k] = (conteo[k] || 0) + 1; }
  }
  const ordenado = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    tamaño: `${w}×${h}`,
    centros: {
      izArriba: px(3, 3), derArriba: px(w - 4, 3),
      izAbajo: px(3, h - 4), derAbajo: px(w - 4, h - 4),
      centro: px(w / 2, h / 2),
    },
    coloresDelBorde: ordenado.map(([rgb, n]) => `${rgb} (${n} muestras)`),
  };
});
console.log('\n═══ EL LOGO REAL, MEDIDO ═══');
console.log(`  tamaño            : ${pixeles.tamaño}`);
console.log(`  esquinas          : ${JSON.stringify(pixeles.centros)}`);
console.log(`  color del borde   : ${pixeles.coloresDelBorde.join(' · ')}`);
await ctx0.close();

/* ─── 2 · capturas de verificación ───────────────────────────────────── */
const vistas = [
  { clave: 'escritorio', ancho: 1440, alto: 900, escala: 1 },
  { clave: 'tableta', ancho: 834, alto: 1112, escala: 1 },
  { clave: 'movil', ancho: 390, alto: 844, escala: 2 }
];

for (const v of vistas) {
  const ctx = await navegador.newContext({
    viewport: { width: v.ancho, height: v.alto },
    deviceScaleFactor: v.escala,
    isMobile: v.clave === 'movil',
    hasTouch: v.clave === 'movil'
  });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PUERTO}/index.html`, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  await p.screenshot({ path: path.join(EVID, `despues-${v.clave}-portada.png`) });

  await p.evaluate(() => document.querySelector('#rapidas').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(EVID, `despues-${v.clave}-menu.png`) });

  // carrito con pedido
  await p.evaluate(() => {
    window.BROSTY.sumar('combo-apanado', 'Combo con Apanado', '');
    window.BROSTY.sumar('pollo-entero', 'Pollo entero', '');
    window.BROSTY.sumar('limonadas', 'Limonada', 'De coco');
    window.BROSTY.pedido.nombre = 'Darwin';
    window.BROSTY.guardar();
    window.BROSTY.abrir();
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(EVID, `despues-${v.clave}-carrito.png`) });

  console.log(`✓ capturas ${v.clave} (${v.ancho}×${v.alto})`);
  await ctx.close();
}

await navegador.close();
servidor.close();
console.log('\nListo.');
