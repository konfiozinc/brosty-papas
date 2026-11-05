/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/generar-imagenes.mjs
   KZ-BROSTY-003 (base) · KZ-BROSTY-007 (corrección del og:image)

   QUÉ SE CORRIGIÓ EN ESTA MISIÓN
     El enlace compartido por WhatsApp mostraba un recuadro claro y vacío donde
     debía ir el logo. Medido sobre el PNG anterior: el 94 % de los píxeles de
     esa zona eran el color de la placa (rgb 255,248,233) y del logo no había
     nada. Causa: la imagen se cargaba desde file:// dentro de una página creada
     con setContent y la captura se tomaba antes de que el JPEG estuviera listo.

   CÓMO SE HACE AHORA
     1. El logo se incrusta como data URI base64: no hay descarga que falle ni
        llegue tarde, y la captura espera a img.decode() y a dos repintados.
     2. Se recorta el fondo blanco del JPEG con un relleno por proximidad desde
        los bordes (conserva los blancos interiores del dibujo) y se guarda un
        PNG con transparencia.
     3. La tarjeta 1200×630 se compone con el logo centrado y buen margen sobre
        el degradado rojo/amarillo de la marca: sin placas ni cuadros blancos.

   Salidas:
     assets/img/marca/logo-brosty-transparente.png
     assets/img/marca/favicon-32.png · favicon-64.png · apple-touch-icon.png
     assets/img/marca/favicon.svg
     assets/img/og/og-1200x630-v2.png

   Uso:  node herramientas/generar-imagenes.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

const ORIGEN = path.join(RAIZ, 'logobrosty.jpeg');
if (!fs.existsSync(ORIGEN)) {
  console.error('No encuentro logobrosty.jpeg en la raíz del proyecto.');
  process.exit(1);
}

/* Copia de trabajo (el original de Darwin no se toca) + data URI para incrustar. */
const destinoJpg = path.join(RAIZ, 'assets', 'img', 'marca', 'logo-brosty.jpg');
fs.copyFileSync(ORIGEN, destinoJpg);
const LOGO_B64 = 'data:image/jpeg;base64,' + fs.readFileSync(destinoJpg).toString('base64');

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('No se encontró Playwright.'); process.exit(1); }

const navegador = await chromium.launch();

/* ─── 1 · logo sin fondo blanco (relleno desde los bordes) ───────────── */
const ctxL = await navegador.newContext({ viewport: { width: 700, height: 700 } });
const pL = await ctxL.newPage();
await pL.setContent('<!doctype html><meta charset="utf-8"><body></body>', { waitUntil: 'load' });

const recorte = await pL.evaluate(async (b64) => {
  const img = new Image();
  img.src = b64;
  await img.decode();

  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const w = c.width, h = c.height;
  const datos = ctx.getImageData(0, 0, w, h);
  const px = datos.data;
  const UMBRAL = 236;                                   // casi-blanco = fondo
  const esFondo = (i) => px[i] >= UMBRAL && px[i + 1] >= UMBRAL && px[i + 2] >= UMBRAL;

  const visto = new Uint8Array(w * h);
  const cola = [];
  const encolar = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const n = y * w + x;
    if (visto[n]) return;
    if (!esFondo(n * 4)) return;
    visto[n] = 1; cola.push(n);
  };
  for (let x = 0; x < w; x++) { encolar(x, 0); encolar(x, h - 1); }
  for (let y = 0; y < h; y++) { encolar(0, y); encolar(w - 1, y); }

  let quitaron = 0;
  while (cola.length) {
    const n = cola.pop();
    px[n * 4 + 3] = 0;
    quitaron++;
    const x = n % w, y = (n - x) / w;
    encolar(x + 1, y); encolar(x - 1, y); encolar(x, y + 1); encolar(x, y - 1);
  }

  /* Borde suave: los casi-blancos pegados al recorte pasan a semitransparentes
     para que no quede halo claro alrededor del dibujo. */
  const copia = new Uint8ClampedArray(px);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const n = (y * w + x) * 4;
      if (copia[n + 3] === 0) continue;
      const vacio = copia[n - 4 + 3] === 0 || copia[n + 4 + 3] === 0 || copia[n - w * 4 + 3] === 0 || copia[n + w * 4 + 3] === 0;
      if (!vacio) continue;
      const claro = (copia[n] + copia[n + 1] + copia[n + 2]) / 3;
      if (claro > 205) px[n + 3] = Math.max(0, Math.min(255, Math.round((255 - claro) / 50 * 255)));
    }
  }

  ctx.putImageData(datos, 0, 0);
  return { png: c.toDataURL('image/png'), ancho: w, alto: h, quitados: quitaron, total: w * h };
}, LOGO_B64);

const rutaTransparente = path.join(RAIZ, 'assets', 'img', 'marca', 'logo-brosty-transparente.png');
fs.writeFileSync(rutaTransparente, Buffer.from(recorte.png.split(',')[1], 'base64'));
const pctQuitado = Math.round(recorte.quitados / recorte.total * 100);
console.log(`✓ logo-brosty-transparente.png  ${recorte.ancho}×${recorte.alto} · fondo recortado ${pctQuitado} % · ${Math.round(fs.statSync(rutaTransparente).size / 1024)} KB`);
if (pctQuitado > 92) {
  console.error('  ⚠ se recortó casi todo: el logo podría haber quedado vacío. Revisar el umbral.');
  process.exit(1);
}
await ctxL.close();

/* ─── 2 · iconos cuadrados ───────────────────────────────────────────── */
const iconos = [
  { archivo: 'favicon-32.png', tam: 32 },
  { archivo: 'favicon-64.png', tam: 64 },
  { archivo: 'apple-touch-icon.png', tam: 180 }
];
for (const icono of iconos) {
  const ctx = await navegador.newContext({ viewport: { width: icono.tam, height: icono.tam } });
  const p = await ctx.newPage();
  const lado = Math.round(icono.tam * 0.9);
  await p.setContent(
    `<!doctype html><meta charset="utf-8">
     <body style="margin:0;background:#FFC928;display:grid;place-items:center;width:${icono.tam}px;height:${icono.tam}px">
       <img id="l" src="${recorte.png}" style="width:${lado}px;height:${lado}px;object-fit:contain;display:block">
     </body>`,
    { waitUntil: 'load' }
  );
  await p.evaluate(async () => { const i = document.getElementById('l'); if (i && i.decode) { try { await i.decode(); } catch (e) {} } });
  await p.waitForTimeout(140);
  const salida = path.join(RAIZ, 'assets', 'img', 'marca', icono.archivo);
  fs.writeFileSync(salida, await p.screenshot({ clip: { x: 0, y: 0, width: icono.tam, height: icono.tam } }));
  console.log(`✓ ${icono.archivo.padEnd(22)} ${icono.tam}×${icono.tam} · ${Math.round(fs.statSync(salida).size / 1024 * 10) / 10} KB`);
  await ctx.close();
}

/* ─── 3 · favicon.svg (envoltorio con el logo recortado) ─────────────── */
const ctxS = await navegador.newContext({ viewport: { width: 128, height: 128 } });
const pS = await ctxS.newPage();
await pS.setContent(
  `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#FFC928;display:grid;place-items:center;width:128px;height:128px">
     <img id="l" src="${recorte.png}" style="width:116px;height:116px;object-fit:contain;display:block"></body>`,
  { waitUntil: 'load' }
);
await pS.evaluate(async () => { const i = document.getElementById('l'); if (i && i.decode) { try { await i.decode(); } catch (e) {} } });
await pS.waitForTimeout(140);
const png128 = (await pS.screenshot({ clip: { x: 0, y: 0, width: 128, height: 128 } })).toString('base64');
await ctxS.close();

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 128 128" width="128" height="128" role="img" aria-labelledby="t">
  <title id="t">BROSTY PAPAS</title>
  <!-- KZ-BROSTY-007 · logo real recortado sobre el amarillo de la marca.
       Si algún día llega el arte vectorial, se reemplaza este archivo. -->
  <image href="data:image/png;base64,${png128}" xlink:href="data:image/png;base64,${png128}"
         x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
const salidaSvg = path.join(RAIZ, 'assets', 'img', 'marca', 'favicon.svg');
fs.writeFileSync(salidaSvg, svg, 'utf8');
console.log(`✓ favicon.svg            128×128 · ${Math.round(fs.statSync(salidaSvg).size / 1024)} KB`);

/* ─── 4 · imagen para compartir (1200×630) ───────────────────────────── */
const ctxOg = await navegador.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const pOg = await ctxOg.newPage();
await pOg.setContent(`<!doctype html><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1200px;height:630px;position:relative;overflow:hidden;color:#FFF8E9;
       font-family:'Segoe UI',Roboto,Arial,sans-serif;
       background:
         radial-gradient(90% 72% at 50% 0%, rgba(255,201,40,.36), transparent 62%),
         radial-gradient(80% 70% at 6% 100%, rgba(255,122,24,.42), transparent 60%),
         linear-gradient(160deg,#C91F32 0%,#8E1222 46%,#242424 100%)}
  body::after{content:"";position:absolute;inset:0;pointer-events:none;
       background-image:radial-gradient(rgba(255,248,233,.10) 1px, transparent 1px);background-size:22px 22px}
  .centro{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:16px;padding:30px 70px 38px;text-align:center}
  .logo-caja{position:relative;width:280px;height:280px;display:grid;place-items:center;flex:0 0 auto}
  .logo-caja::before{content:"";position:absolute;inset:-28px;border-radius:50%;
       background:radial-gradient(circle, rgba(255,201,40,.42), rgba(255,201,40,0) 68%)}
  .logo-caja img{position:relative;width:100%;height:100%;object-fit:contain;
       filter:drop-shadow(0 10px 22px rgba(0,0,0,.45))}
  h1{font-family:'Arial Black','Segoe UI Black',Impact,sans-serif;font-size:44px;line-height:1.06;
     text-transform:uppercase;color:#FFC928;text-shadow:0 4px 0 rgba(142,18,34,.6)}
  .chapa{display:flex;align-items:center;gap:20px;padding:11px 28px;border-radius:999px;
     background:#FFC928;color:#242424;font-weight:800;font-size:22px;
     box-shadow:0 12px 28px rgba(0,0,0,.34)}
  .chapa span{white-space:nowrap}
  .firma{position:absolute;right:34px;bottom:18px;z-index:1;font-size:13px;letter-spacing:.22em;
     text-transform:uppercase;color:rgba(255,248,233,.6)}
</style>
<div class="centro">
  <div class="logo-caja"><img id="logo" src="${recorte.png}" alt="BROSTY PAPAS"></div>
  <h1>¡El sabor que<br>provoca repetir!</h1>
  <div class="chapa">
    <span>🛵 Domicilio</span><span>📍 Nueva Jerusalén</span><span>💬 300 320 1296</span>
  </div>
</div>
<div class="firma">KONFÍO ZINC</div>`, { waitUntil: 'load' });

const control = await pOg.evaluate(async () => {
  const i = document.getElementById('logo');
  if (i && i.decode) { try { await i.decode(); } catch (e) {} }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { logoCargado: i ? i.naturalWidth > 0 : false, ancho: i ? i.naturalWidth : 0, alto: i ? i.naturalHeight : 0 };
});
await pOg.waitForTimeout(250);

const salidaOg = path.join(RAIZ, 'assets', 'img', 'og', 'og-1200x630-v2.png');
await pOg.screenshot({ path: salidaOg, clip: { x: 0, y: 0, width: 1200, height: 630 } });
console.log(`✓ og-1200x630-v2.png      1200×630 · ${Math.round(fs.statSync(salidaOg).size / 1024)} KB`);
await ctxOg.close();
await navegador.close();

if (!control.logoCargado) {
  console.error('✗ el logo NO cargó en la tarjeta: la vista previa volvería a salir vacía.');
  process.exit(1);
}
console.log(`✓ control: el logo cargó dentro de la tarjeta (${control.ancho}×${control.alto})`);
console.log('\nListo: logo recortado, iconos, favicon SVG y og:image regenerados.');
