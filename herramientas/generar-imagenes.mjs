/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/generar-imagenes.mjs
   KZ-BROSTY-003 · genera los PNG e iconos a partir del LOGO REAL

   Entrada: logobrosty.jpeg (640×640, el que subió Darwin a la carpeta)
   Salida:
     assets/img/marca/logo-brosty.jpg        copia de trabajo del logo
     assets/img/marca/favicon-32.png
     assets/img/marca/favicon-64.png
     assets/img/marca/apple-touch-icon.png   (180×180)
     assets/img/marca/favicon.svg            envoltorio SVG con el logo real
     assets/img/og/og-1200x630.png           imagen para compartir

   Cómo: se dibuja la imagen en un navegador real y se captura con Playwright.
   El logo es cuadrado (640×640), así que los iconos salen limpios sin recortar.
   Uso:  node herramientas/generar-imagenes.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const RAIZ = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

const ORIGEN = path.join(RAIZ, 'logobrosty.jpeg');
if (!fs.existsSync(ORIGEN)) {
  console.error('No encuentro logobrosty.jpeg en la raíz del proyecto.');
  process.exit(1);
}

/* Copia de trabajo dentro de assets (el original de Darwin no se toca). */
const destinoJpg = path.join(RAIZ, 'assets', 'img', 'marca', 'logo-brosty.jpg');
fs.copyFileSync(ORIGEN, destinoJpg);
const LOGO = pathToFileURL(destinoJpg).href;

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('No se encontró Playwright.'); process.exit(1); }

const navegador = await chromium.launch();

/* ── 1 · iconos cuadrados desde el logo real ─────────────────────────── */
const iconos = [
  { archivo: 'favicon-32.png', tam: 32 },
  { archivo: 'favicon-64.png', tam: 64 },
  { archivo: 'apple-touch-icon.png', tam: 180 }
];

for (const icono of iconos) {
  const ctx = await navegador.newContext({ viewport: { width: icono.tam, height: icono.tam } });
  const p = await ctx.newPage();
  await p.setContent(
    '<!doctype html><meta charset="utf-8">' +
    '<body style="margin:0;background:#FFF8E9">' +
    `<img src="${LOGO}" style="display:block;width:${icono.tam}px;height:${icono.tam}px;object-fit:cover">`,
    { waitUntil: 'load' }
  );
  await p.waitForTimeout(140);
  const salida = path.join(RAIZ, 'assets', 'img', 'marca', icono.archivo);
  const b64 = (await p.screenshot({ clip: { x: 0, y: 0, width: icono.tam, height: icono.tam } })).toString('base64');
  fs.writeFileSync(salida, Buffer.from(b64, 'base64'));
  console.log(`✓ ${icono.archivo.padEnd(22)} ${icono.tam}×${icono.tam} · ${Math.round(fs.statSync(salida).size / 1024 * 10) / 10} KB`);
  await ctx.close();
}

/* ── 2 · favicon.svg: envoltorio con el logo real dentro ─────────────── */
/* Se necesita un SVG porque la Definición de Terminado exige
   `rel="icon" type="image/svg+xml"`. El logo es una foto raster, así que el
   SVG lleva el PNG incrustado: mismo dibujo, un solo archivo, sin depender de
   un trazo vectorial que no existía. */
const ctx128 = await navegador.newContext({ viewport: { width: 128, height: 128 } });
const p128 = await ctx128.newPage();
await p128.setContent(
  '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#FFF8E9">' +
  `<img src="${LOGO}" style="display:block;width:128px;height:128px;object-fit:cover">`,
  { waitUntil: 'load' }
);
await p128.waitForTimeout(140);
const png128 = (await p128.screenshot({ clip: { x: 0, y: 0, width: 128, height: 128 } })).toString('base64');
await ctx128.close();

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 128 128" width="128" height="128" role="img" aria-labelledby="t">
  <title id="t">BROSTY PAPAS</title>
  <!-- KZ-BROSTY-003 · el logo real (logobrosty.jpeg) incrustado para poder
       declararlo como icono SVG. Si algún día llega el arte vectorial, se
       reemplaza este archivo por el SVG definitivo. -->
  <image href="data:image/png;base64,${png128}" xlink:href="data:image/png;base64,${png128}"
         x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
const salidaSvg = path.join(RAIZ, 'assets', 'img', 'marca', 'favicon.svg');
fs.writeFileSync(salidaSvg, svg, 'utf8');
console.log(`✓ favicon.svg            128×128 · ${Math.round(fs.statSync(salidaSvg).size / 1024)} KB (logo real incrustado)`);

/* ── 3 · imagen para compartir (1200×630) ───────────────────────────── */
const og = await navegador.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const pagina = await og.newPage();
await pagina.setContent(`<!doctype html><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:1200px;height:630px;display:grid;grid-template-columns:1fr 360px;gap:48px;
       align-items:center;padding:54px 60px;font-family:'Segoe UI',Roboto,Arial,sans-serif;
       color:#FFF8E9;position:relative;overflow:hidden;
       background:
         radial-gradient(120% 90% at 85% 0%, rgba(255,201,40,.30), transparent 55%),
         radial-gradient(100% 80% at 0% 100%, rgba(255,122,24,.34), transparent 60%),
         linear-gradient(160deg,#C91F32 0%,#8E1222 48%,#242424 100%)}
  body::after{content:"";position:absolute;inset:0;pointer-events:none;
       background-image:radial-gradient(rgba(255,248,233,.10) 1px, transparent 1px);background-size:20px 20px}
  .texto{position:relative;z-index:1}
  h1{font-family:'Arial Black','Segoe UI Black',Impact,sans-serif;font-size:56px;line-height:1.03;
     text-transform:uppercase;color:#FFC928;text-shadow:0 4px 0 rgba(142,18,34,.55)}
  p.sub{margin-top:20px;font-size:24px;line-height:1.35;color:rgba(255,248,233,.94);max-width:640px}
  .datos{position:relative;z-index:1;display:grid;gap:14px}
  .dato{background:rgba(36,36,36,.44);border:1px solid rgba(255,248,233,.28);border-radius:18px;
        padding:15px 20px;font-size:20px;font-weight:700;display:flex;gap:12px;align-items:center}
  .placa{position:absolute;right:44px;top:44px;width:190px;height:190px;z-index:1;
        background:#FFF8E9;border-radius:26px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.42)}
  .placa img{width:100%;height:100%;object-fit:contain;border-radius:20px;display:block}
  .zinc{position:absolute;right:26px;bottom:20px;font-size:15px;letter-spacing:.22em;
        text-transform:uppercase;color:rgba(255,248,233,.55);z-index:1}
</style>
<div class="texto">
  <h1>¡El sabor que<br>provoca repetir!</h1>
  <p class="sub">Pollo broaster y asado · combos · salchipapas · limonadas.<br>Pedidos por WhatsApp.</p>
</div>
<div class="datos">
  <div class="dato">🍗 Pollo broaster y asado</div>
  <div class="dato">🛵 Domicilio disponible</div>
  <div class="dato">📍 Barrio Nueva Jerusalén</div>
  <div class="dato">💬 WhatsApp 300 320 1296</div>
</div>
<div class="placa"><img src="${LOGO}" alt=""></div>
<div class="zinc">KONFÍO ZINC</div>`, { waitUntil: 'load' });
await pagina.waitForTimeout(300);

const salidaOg = path.join(RAIZ, 'assets', 'img', 'og', 'og-1200x630.png');
await pagina.screenshot({ path: salidaOg, clip: { x: 0, y: 0, width: 1200, height: 630 } });
console.log(`✓ og-1200x630.png         1200×630 · ${Math.round(fs.statSync(salidaOg).size / 1024)} KB (con el logo real)`);

await og.close();
await navegador.close();
console.log('\nListo: iconos, favicon SVG y og:image generados desde el logo real.');
