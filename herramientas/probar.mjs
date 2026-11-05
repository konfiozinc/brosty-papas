/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/probar.mjs
   KZ-BROSTY-001 · prueba funcional + capturas para la revisión de Darwin

   Comprueba en un navegador real: carrito (sumar, restar, eliminar,
   observaciones, persistencia), variantes, mensaje de WhatsApp, botones
   rápidos, responsive en 360/375/390/430 y cero errores de consola.
   Genera las capturas y el archivo con el mensaje exacto.
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const EVID = path.join(RAIZ, 'evidencias');
const PUERTO = 8150;
const WA = 'https://wa.me/573003201296';
const require = createRequire(import.meta.url);

const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || ''
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

let fallos = 0;
const check = (ok, nombre, detalle) => {
  if (!ok) fallos++;
  console.log(`${ok ? '✓' : '✗'} ${nombre}${detalle ? '  →  ' + detalle : ''}`);
};

fs.mkdirSync(EVID, { recursive: true });
const navegador = await chromium.launch();

/* ═══════════ 1 · ESCRITORIO: estructura, menú y carrito ═══════════ */
const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
await p.addInitScript(() => {
  window.__aperturas = [];
  window.open = function (url) { window.__aperturas.push(String(url)); return { closed: false, focus() {}, close() {} }; };
});
const errores = [];
p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 140)); });
p.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 140)));

await p.goto(`http://127.0.0.1:${PUERTO}/index.html`, { waitUntil: 'load', timeout: 45000 });
await p.waitForTimeout(700);

console.log('\n═══ 1 · estructura y contenido del volante ═══');
const base = await p.evaluate(() => {
  const txt = document.body.innerText;
  return {
    titulo: document.title,
    slogan: (document.querySelector('.hero__slogan') || {}).textContent,
    categorias: [...document.querySelectorAll('.categoria')].map((c) => ({
      id: c.id,
      titulo: c.querySelector('.categoria__titulo').textContent.trim(),
      platos: [...c.querySelectorAll('.platillo')].map((x) => x.getAttribute('data-nombre')),
    })),
    preciosVisibles: [...document.querySelectorAll('.platillo__precio')].map((x) => x.textContent.trim()),
    dineroEnTexto: (txt.match(/\$\s?\d/g) || []).length,
    coordenadas: (txt.match(/-?\d{1,3}\.\d{4,}/g) || []).length,
    nuevaJerusalen: /Nueva Jerusal[ée]n/i.test(txt),
    domicilio: /Domicilio/i.test(txt),
    whatsappEnlaces: [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href')),
    altTodas: [...document.querySelectorAll('img')].every((i) => i.hasAttribute('alt')),
  };
});
check(base.titulo === 'BROSTY PAPAS | Pollo Broaster y Asado', 'título exacto de la misión', base.titulo);
check(/provoca repetir/i.test(base.slogan || ''), 'el eslogan del volante está en la portada', base.slogan);
check(base.categorias.length === 4, 'cuatro categorías', base.categorias.map((c) => `${c.titulo}(${c.platos.length})`).join(' · '));
const totalPlatos = base.categorias.reduce((n, c) => n + c.platos.length, 0);
check(totalPlatos === 15, 'quince platos del volante', 'total=' + totalPlatos);
check(base.preciosVisibles.length === totalPlatos && base.preciosVisibles.every((t) => /consultar precio/i.test(t)), 'todos los platos dicen «Consultar precio»', base.preciosVisibles[0]);
check(base.dineroEnTexto === 0, 'ninguna cifra de dinero inventada en la página', '$ encontrados: ' + base.dineroEnTexto);
check(base.coordenadas === 0, 'ninguna coordenada inventada', 'patrones tipo -75.xxxx: ' + base.coordenadas);
check(base.nuevaJerusalen, 'el barrio del volante aparece tal cual');
check(base.domicilio, 'indicador de domicilio presente');
check(base.whatsappEnlaces.every((h) => h.startsWith('https://wa.me/573003201296')), 'todos los enlaces de WhatsApp al número oficial', base.whatsappEnlaces.length + ' enlaces');
check(base.altTodas, 'todas las imágenes tienen alt');

console.log('\n═══ 2 · carrito: sumar, variantes, observaciones ═══');
await p.evaluate(() => document.querySelector('#combos').scrollIntoView());
await p.waitForTimeout(300);
await p.click('[data-id="combo-apanado"] .agregar');
await p.waitForTimeout(150);
await p.click('[data-id="combo-apanado"] .agregar');
await p.waitForTimeout(150);

// Patacón con variante Mixto
await p.click('[data-id="patacon"] .variante[data-variante="Mixto"]');
await p.waitForTimeout(120);
await p.click('[data-id="patacon"] .agregar');
await p.waitForTimeout(200);

const trasSumar = await p.evaluate(() => ({
  cuenta: document.querySelector('#cuenta-cabecera').textContent,
  lineas: window.BROSTY.pedido.lineas.map((l) => `${l.cantidad}× ${l.nombre}${l.variante ? ' (' + l.variante + ')' : ''}`),
  barraVisible: document.querySelector('#barra-pedido') ? getComputedStyle(document.querySelector('#barra-pedido')).display : null,
  resumenBarra: (document.querySelector('#barra-resumen') || {}).textContent,
}));
check(trasSumar.cuenta === '3', 'suma y cuenta correctamente (2 + 1)', 'unidades=' + trasSumar.cuenta);
check(trasSumar.lineas.some((l) => /Patacón \(Mixto\)/.test(l)), 'la variante elegida viaja al pedido', trasSumar.lineas.join(' | '));
check(trasSumar.resumenBarra === '3 productos', 'la barra inferior resume el pedido', trasSumar.resumenBarra);

await p.click('#abrir-carrito');
await p.waitForTimeout(450);
const carritoAbierto = await p.evaluate(() => {
  const c = document.querySelector('#carrito');
  return {
    abierto: c.classList.contains('abierto'),
    aria: c.getAttribute('aria-hidden'),
    lineas: [...document.querySelectorAll('#carrito-lineas .linea')].length,
    observaciones: [...document.querySelectorAll('.linea__obs')].length,
    total: document.querySelector('#carrito-total').textContent.trim(),
    enviarActivo: !document.querySelector('#enviar-pedido').disabled,
  };
});
check(carritoAbierto.abierto && carritoAbierto.aria === 'false', 'el carrito se abre', 'líneas=' + carritoAbierto.lineas);
check(carritoAbierto.lineas === 2, 'dos líneas en el carrito', String(carritoAbierto.lineas));
check(carritoAbierto.observaciones === 2, 'cada línea admite observaciones', carritoAbierto.observaciones + ' campos');
check(/por confirmar/i.test(carritoAbierto.total), 'el total NO inventa un precio', carritoAbierto.total);
check(carritoAbierto.enviarActivo, 'el botón de enviar está activo');

// Observaciones + nombre + entrega
await p.fill('#carrito-lineas .linea:nth-child(1) .linea__obs', 'Sin salsa, bien asado');
await p.fill('#f-nombre', 'Darwin');
await p.fill('#f-entrega', 'Domicilio en el barrio');
await p.waitForTimeout(200);

// capturas con el carrito abierto
await p.screenshot({ path: path.join(EVID, 'escritorio-carrito.png') });

console.log('\n═══ 3 · persistencia en localStorage ═══');
const antesDeRecargar = await p.evaluate(() => JSON.stringify(window.BROSTY.pedido));
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(600);
const trasRecargar = await p.evaluate(() => ({
  lineas: window.BROSTY.pedido.lineas.length,
  cuenta: document.querySelector('#cuenta-cabecera').textContent,
  obs: (window.BROSTY.pedido.lineas.find((l) => l.obs) || {}).obs,
  nombre: window.BROSTY.pedido.nombre,
  guardado: !!localStorage.getItem(window.BROSTY.clave),
}));
check(trasRecargar.lineas === 2 && trasRecargar.cuenta === '3', 'el pedido sobrevive a recargar la página', `líneas=${trasRecargar.lineas} · unidades=${trasRecargar.cuenta}`);
check(/Sin salsa/.test(trasRecargar.obs || ''), 'las observaciones se guardan', trasRecargar.obs);
check(trasRecargar.nombre === 'Darwin', 'el nombre se guarda', trasRecargar.nombre);

console.log('\n═══ 4 · restar y eliminar ═══');
await p.click('#abrir-carrito');
await p.waitForTimeout(350);
await p.click('#carrito-lineas .linea:nth-child(1) .stepper [data-accion="restar"]');
await p.waitForTimeout(250);
const trasRestar = await p.evaluate(() => ({
  unidades: window.BROSTY.pedido.lineas.reduce((n, l) => n + l.cantidad, 0),
  lineas: window.BROSTY.pedido.lineas.length,
}));
check(trasRestar.unidades === 2, 'restar descuenta una unidad', 'unidades=' + trasRestar.unidades);

await p.click('#carrito-lineas .linea:nth-child(2) .linea__quitar');
await p.waitForTimeout(250);
const trasEliminar = await p.evaluate(() => ({
  lineas: window.BROSTY.pedido.lineas.length,
  vacio: document.querySelector('#carrito-vacio').hidden,
}));
check(trasEliminar.lineas === 1, 'eliminar quita la línea entera', 'líneas=' + trasEliminar.lineas);

// Volver a dejar un pedido rico para las capturas y el mensaje
await p.evaluate(() => {
  window.BROSTY.sumar('combo-apanado', 'Combo con Apanado', '');
  window.BROSTY.sumar('pollo-entero', 'Pollo entero', '');
  window.BROSTY.sumar('limonadas', 'Limonada', 'De coco');
  window.BROSTY.pedido.nombre = 'Darwin';
  window.BROSTY.pedido.entrega = 'Domicilio en el barrio';
  window.BROSTY.guardar();
  window.BROSTY.pintar();
});
await p.waitForTimeout(300);

console.log('\n═══ 5 · mensaje y envío a WhatsApp ═══');
const mensaje = await p.evaluate(() => window.BROSTY.armarMensaje());
fs.writeFileSync(path.join(EVID, 'mensaje-whatsapp.txt'), mensaje + '\n', 'utf8');
check(/Hola BROSTY PAPAS/.test(mensaje), 'el mensaje saluda al negocio');
check(/• \d+× /.test(mensaje), 'el mensaje estructura los productos en líneas', mensaje.split('\n').filter((l) => l.startsWith('•')).length + ' líneas');
check(/Consultar precio/.test(mensaje), 'cada línea avisa «Consultar precio»');
check(/Total: por confirmar/i.test(mensaje), 'el total no inventa cifra');
check(/Nombre: Darwin/.test(mensaje) && /Entrega: Domicilio/.test(mensaje), 'incluye nombre y entrega');

await p.click('#enviar-pedido');
await p.waitForTimeout(350);
const envio = await p.evaluate(() => window.__aperturas.slice());
const url = envio[envio.length - 1] || '';
check(url.startsWith(WA + '?text='), 'abre exactamente https://wa.me/573003201296', url.slice(0, 52) + '…');
const textoUrl = url.includes('?text=') ? decodeURIComponent(url.split('?text=')[1]) : '';
check(textoUrl === mensaje, 'el texto del enlace es el mensaje generado', textoUrl.length + ' caracteres');

console.log('\n═══ 6 · acciones rápidas ═══');
/* Se cierra el carrito con su propia función: cerrar a mano la clase dejaba el
   velo abierto e interceptaba los clics (fallo de la primera versión del test). */
await p.evaluate(() => window.BROSTY.cerrar());
await p.waitForTimeout(350);
const descarga = await Promise.all([
  p.waitForEvent('download', { timeout: 8000 }).catch(() => null),
  p.click('#guardar-contacto'),
]).then(([d]) => d);
check(!!descarga && /\.vcf$/.test(descarga.suggestedFilename()), '«Guardar contacto» descarga un .vcf real', descarga ? descarga.suggestedFilename() : 'sin descarga');

await p.click('#compartir');
await p.waitForTimeout(500);
const avisoCompartir = await p.evaluate(() => document.querySelector('#toast').textContent.trim());
check(avisoCompartir.length > 0, '«Compartir» responde (menú del sistema o copiar enlace)', avisoCompartir.slice(0, 60));

check(errores.length === 0, 'sin errores de consola en escritorio', errores.length ? errores[0] : '0');

/* capturas de escritorio: portada y menú */
await p.evaluate(() => { window.BROSTY.cerrar(); window.scrollTo(0, 0); });
await p.waitForTimeout(400);
await p.screenshot({ path: path.join(EVID, 'escritorio-portada.png') });
await p.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(EVID, 'escritorio-menu.png') });
await ctx.close();

/* ═══════════ 2 · MÓVIL: 360, 375, 390 y 430 ═══════════ */
console.log('\n═══ 7 · responsive 360 / 375 / 390 / 430 ═══');
for (const ancho of [360, 375, 390, 430]) {
  const cm = await navegador.newContext({ viewport: { width: ancho, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const pm = await cm.newPage();
  const errs = [];
  pm.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  pm.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 120)));
  await pm.goto(`http://127.0.0.1:${PUERTO}/index.html`, { waitUntil: 'load' });
  await pm.waitForTimeout(500);
  const m = await pm.evaluate(() => ({
    desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tarjetasFuera: [...document.querySelectorAll('.platillo, .carrito, .cabecera, .hero__acciones .btn')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1; }).length,
    botonesBajos: [...document.querySelectorAll('.agregar, .chip, .cabecera__carrito, .btn')]
      .filter((b) => b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().height < 40).length,
  }));
  check(m.desborde === 0 && m.tarjetasFuera === 0, `sin desbordes a ${ancho}px`, `desborde=${m.desborde} · elementos fuera=${m.tarjetasFuera}`);
  check(m.botonesBajos === 0, `botones con tamaño táctil suficiente a ${ancho}px`, m.botonesBajos + ' por debajo de 40px');
  check(errs.length === 0, `sin errores de consola a ${ancho}px`, errs[0] || '0');
  await cm.close();
}

/* capturas móviles a 390 px */
const cm = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pm = await cm.newPage();
await pm.addInitScript(() => { window.open = function () { return { closed: false, focus() {}, close() {} }; }; });
await pm.goto(`http://127.0.0.1:${PUERTO}/index.html`, { waitUntil: 'load' });
await pm.waitForTimeout(600);
await pm.screenshot({ path: path.join(EVID, 'movil-portada.png') });
await pm.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
await pm.waitForTimeout(500);
await pm.screenshot({ path: path.join(EVID, 'movil-menu.png') });
await pm.click('#abrir-carrito');
await pm.waitForTimeout(600);
await pm.screenshot({ path: path.join(EVID, 'movil-carrito.png') });
await cm.close();

/* ═══════════ 3 · Vista del mensaje generado ═══════════ */
const cv = await navegador.newContext({ viewport: { width: 920, height: 760 }, deviceScaleFactor: 1 });
const pv = await cv.newPage();
const lineasMsg = mensaje.split('\n').map((l) => `<div>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || '&nbsp;'}</div>`).join('');
await pv.setContent(`<!doctype html><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{width:920px;min-height:760px;padding:34px 38px;background:#0B141A;
       font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#E9EDEF}
  .cab{display:flex;align-items:center;gap:12px;margin-bottom:20px}
  .cab .avatar{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
       background:linear-gradient(150deg,#FFC928,#FF7A18);font-size:22px}
  .cab h1{font-size:17px;font-weight:700}
  .cab p{font-size:12.5px;color:#8696A0}
  .burbuja{background:#005C4B;border-radius:12px 12px 12px 2px;padding:16px 18px;
       max-width:640px;font-size:14.5px;line-height:1.55;white-space:pre-wrap;
       box-shadow:0 2px 6px rgba(0,0,0,.35)}
  .hora{display:block;margin-top:10px;font-size:11px;color:#8FA9A1;text-align:right}
  .url{margin-top:18px;font-size:11.5px;color:#8696A0;word-break:break-all}
  .nota{margin-top:22px;font-size:12px;color:#8696A0;border-top:1px solid #223;
        padding-top:14px;max-width:760px}
</style>
<div class="cab">
  <div class="avatar">🍗</div>
  <div><h1>BROSTY PAPAS</h1><p>+57 300 320 1296 · vista previa del mensaje generado</p></div>
</div>
<div class="burbuja">${lineasMsg}<span class="hora">Generado por la página · listo para enviar</span></div>
<div class="url">Enlace que abre el navegador: https://wa.me/573003201296?text=…</div>
<div class="nota">Esto es una <strong>vista previa del texto</strong> que la página entrega a WhatsApp. No es una captura de la aplicación de WhatsApp: el mensaje se envía desde el teléfono de la persona, que puede editarlo antes.</div>`, { waitUntil: 'load' });
await pv.waitForTimeout(250);
await pv.screenshot({ path: path.join(EVID, 'mensaje-whatsapp.png'), clip: { x: 0, y: 0, width: 920, height: 760 } });
await cv.close();

await navegador.close();
servidor.close();

console.log('\n════════════════════════════════════════');
console.log(fallos === 0 ? 'PRUEBA FUNCIONAL: TODO OK' : `PRUEBA FUNCIONAL: ${fallos} FALLO(S)`);
console.log('capturas en evidencias/: ' + fs.readdirSync(EVID).filter((f) => f.endsWith('.png')).join(', '));
process.exit(fallos === 0 ? 0 : 1);
