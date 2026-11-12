/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/auditar-004.mjs
   KZ-BROSTY-004 · auditoría medida antes/después (revisión visual y de compra)

   POR QUÉ EXISTE
     `probar.mjs` certifica el carrito y el mensaje, pero pasaba en verde
     mientras la página se veía rota: no medía el desbordamiento dentro de la
     tarjeta, ni los botones duplicados, ni el estado real de los chips, ni si
     el título de la sección queda tapado por las barras fijas. Esta auditoría
     mide esas cosas y tiene que saber fallar.

   USO
     node herramientas/auditar-004.mjs --salida <carpeta> [--etiqueta antes]

   No publica nada: sirve la carpeta en 127.0.0.1 y usa Chromium de Playwright.
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(import.meta.dirname, '..');
const PUERTO = 8151;
const WA = 'https://wa.me/573003201296';
const require = createRequire(import.meta.url);

/* ── argumentos ───────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const arg = (n, def) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : def; };
const SALIDA = path.resolve(arg('salida', path.join(RAIZ, 'evidencias', 'auditoria-004')));
const ETIQUETA = arg('etiqueta', path.basename(SALIDA));
fs.mkdirSync(SALIDA, { recursive: true });

/* ── Playwright ya instalado en el equipo (no se instala nada) ─────────── */
const candidatos = [
  path.join(RAIZ, 'herramientas', 'node_modules', 'playwright'),
  path.join(RAIZ, '..', '..', '6-LANDING-PAGES', 'Konfio-Zinc-Web', 'herramientas', 'node_modules', 'playwright'),
  process.env.KZ_PLAYWRIGHT || '',
].filter(Boolean);
let chromium = null;
for (const c of candidatos) { if (chromium) break; try { ({ chromium } = require(c)); } catch { /* siguiente */ } }
if (!chromium) { console.error('Sin Playwright'); process.exit(1); }

/* ── servidor local ──────────────────────────────────────────────────── */
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

/* ── registro de resultados ──────────────────────────────────────────── */
const resultados = [];
let fallos = 0;
const check = (ok, grupo, nombre, detalle) => {
  if (!ok) fallos++;
  resultados.push({ grupo, nombre, ok: !!ok, detalle: detalle === undefined ? '' : String(detalle) });
  console.log(`${ok ? 'OK  ' : 'FALLA'} · ${nombre}${detalle !== undefined && detalle !== '' ? '  →  ' + detalle : ''}`);
};

const ANCHOS = [360, 375, 390, 430, 768, 1024, 1366, 1920];

/* ═════════════════════════════════════════════════════════════════════
   0 · EMOJIS DEL SISTEMA EN EL CÓDIGO FUENTE (sin navegador)
   ═════════════════════════════════════════════════════════════════════ */
console.log(`\n═══ 0 · EMOJIS EN EL CÓDIGO (${ETIQUETA}) ═══`);
const RE_EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F300}-\u{1F5FF}]/gu;
for (const rel of ['index.html', 'assets/css/estilos.css', 'assets/js/app.js']) {
  const texto = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const hallados = texto.match(RE_EMOJI) || [];
  const unicos = [...new Set(hallados)];
  check(hallados.length === 0, 'emojis', `${rel} · sin emojis del sistema`, unicos.length ? unicos.join(' ') + ` (${hallados.length})` : '0');
}
const iconosSueltos = fs.readdirSync(path.join(RAIZ, 'assets', 'img', 'iconos')).filter((f) => f.endsWith('.svg'));
check(iconosSueltos.length >= 15, 'emojis', 'ilustraciones SVG propias disponibles', `${iconosSueltos.length} archivos en assets/img/iconos/`);

const navegador = await chromium.launch();

/* ═════════════════════════════════════════════════════════════════════
   Utilidades inyectadas en la página
   ═════════════════════════════════════════════════════════════════════ */
const AYUDAS = () => {
  window.__kz = {
    visible(el) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    },
    lineas(el) {
      const s = getComputedStyle(el);
      const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
      return Math.round(el.getBoundingClientRect().height / lh);
    },
    /* texto que se sale de su caja (la tarjeta no recorta: se vería encima) */
    seSale(el, caja) {
      const r = el.getBoundingClientRect();
      const c = caja.getBoundingClientRect();
      return r.right > c.right + 1 || r.left < c.left - 1 || r.bottom > c.bottom + 1;
    },
    solapan(a, b) {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      return x > 1 && y > 1;
    },
    /* Dentro de un carrusel horizontal (la fila de chips) salirse a la derecha
       es lo correcto: no es un desborde del documento. */
    enCarrusel(el) {
      let n = el.parentElement;
      while (n) {
        const s = getComputedStyle(n);
        if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth) return true;
        n = n.parentElement;
      }
      return false;
    },
  };
};

/* ── contraste WCAG, componiendo la transparencia del color de texto ───── */
function luminancia(c) {
  const v = c.map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contraste(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
const colorDe = (s) => {
  const m = String(s).match(/[\d.]+/g) || [];
  return { c: m.slice(0, 3).map(Number), a: m.length > 3 ? Number(m[3]) : 1 };
};
const componer = (fg, fondo) => fg.c.map((v, i) => Math.round(v * fg.a + fondo[i] * (1 - fg.a)));

/* espera a que el desplazamiento suave termine: exige varias lecturas iguales */
async function esperarScroll(page) {
  await page.waitForFunction(() => {
    const y = Math.round(window.scrollY);
    window.__kzHist = (window.__kzHist || []).concat([y]).slice(-3);
    return window.__kzHist.length === 3 && window.__kzHist.every((v) => v === y);
  }, null, { timeout: 6000, polling: 120 }).catch(() => {});
  await page.waitForTimeout(200);
}

/* salto al inicio sin animación, para medir el estado inicial de verdad.
   `behavior: 'instant'` ignora el scroll-behavior:smooth del CSS; devuelve la
   posición real para que un fallo de desplazamiento no se confunda con un
   acierto de la página. */
async function irArriba(page) {
  const y = await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return Math.round(window.scrollY);
  });
  await page.waitForTimeout(300);
  return y;
}

/* ═════════════════════════════════════════════════════════════════════
   1 · RECORRIDO POR ANCHO: desbordes, tarjetas, títulos, táctil
   ═════════════════════════════════════════════════════════════════════ */
console.log(`\n═══ 1 · LAYOUT EN ${ANCHOS.length} ANCHOS (${ETIQUETA}) ═══`);
const medidas = {};
for (const ancho of ANCHOS) {
  const ctx = await navegador.newContext({
    viewport: { width: ancho, height: ancho <= 430 ? 844 : 900 },
    isMobile: ancho <= 430, hasTouch: ancho <= 430, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 160)));
  await page.addInitScript(AYUDAS);
  await page.goto(BASE, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const kz = window.__kz;
    const fuera = [...document.querySelectorAll('body *')]
      .filter((el) => kz.visible(el) && !el.closest('#carrito') && !kz.enCarrusel(el))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .map((el) => el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName);

    const tarjetas = [...document.querySelectorAll('.platillo')].map((t) => {
      const cuerpo = t.querySelector('.platillo__cuerpo');
      const accion = t.querySelector('.platillo__accion');
      const nombre = t.querySelector('.platillo__nombre');
      const precio = t.querySelector('.platillo__precio');
      const variantes = t.querySelector('.platillo__variantes');
      const visiblesAccion = [...accion.children].filter((c) => kz.visible(c));
      const desborda = [...t.querySelectorAll('*')].some((el) => kz.visible(el) && kz.seSale(el, t));
      return {
        id: t.getAttribute('data-id'),
        nombre: nombre ? nombre.textContent.trim() : '',
        lineasTitulo: nombre ? kz.lineas(nombre) : 0,
        anchoCuerpo: cuerpo ? Math.round(cuerpo.getBoundingClientRect().width) : 0,
        desborda,
        solapaCuerpoAccion: (cuerpo && accion) ? kz.solapan(cuerpo, accion) : false,
        controlesVisibles: visiblesAccion.length,
        precioPartido: precio ? kz.lineas(precio) > 1 : false,
        variantesPartidas: variantes ? kz.lineas(variantes) > 2 : false,
      };
    });

    /* Solo controles de verdad: los enlaces dentro de un párrafo no se miden
       con la regla de 44 px (no son objetivos táctiles aislados). */
    const CONTROLES = 'button, .btn, .chip, .variante, .agregar, .cabecera__nav a, .cabecera__carrito, .quick__btn, .linea__quitar, .carrito__cerrar';
    const interactivos = [...document.querySelectorAll(CONTROLES)]
      .filter((el) => kz.visible(el) && !el.closest('#carrito'))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { etiqueta: (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 26), w: Math.round(r.width), h: Math.round(r.height) };
      });

    const iconos = [...document.querySelectorAll('.platillo')].map((t) => {
      const uso = t.querySelector('.platillo__icono use');
      const caja = t.querySelector('.platillo__icono svg');
      const r = caja ? caja.getBoundingClientRect() : null;
      return { id: t.getAttribute('data-id'), ref: uso ? uso.getAttribute('href') : '', ancho: r ? Math.round(r.width) : 0 };
    });

    return {
      desbordeDocumento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      elementosFuera: fuera,
      tarjetas,
      interactivos,
      iconos,
      emojisEnPantalla: (document.body.innerText.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu) || []).length,
      medidasBody: getComputedStyle(document.body).overflowX,
    };
  });

  medidas[ancho] = m;

  const conTituloPartido = m.tarjetas.filter((t) => t.lineasTitulo > 2);
  const conDesborde = m.tarjetas.filter((t) => t.desborda);
  const conSolape = m.tarjetas.filter((t) => t.solapaCuerpoAccion);
  const conDobleControl = m.tarjetas.filter((t) => t.controlesVisibles > 1);
  const precioPartido = m.tarjetas.filter((t) => t.precioPartido);
  const chicos = m.interactivos.filter((i) => i.h < 44 || i.w < 24);

  check(m.elementosFuera.length === 0, 'layout', `${ancho}px · nada se sale de la pantalla`, m.elementosFuera.length ? m.elementosFuera.slice(0, 6).join(', ') : '0 elementos');
  check(conDesborde.length === 0, 'layout', `${ancho}px · ninguna tarjeta tiene contenido desbordado`, conDesborde.length ? conDesborde.map((t) => t.id).join(', ') : '0');
  check(conSolape.length === 0, 'layout', `${ancho}px · el texto no choca con los controles`, conSolape.length ? conSolape.map((t) => t.id).join(', ') : '0');
  check(conDobleControl.length === 0, 'layout', `${ancho}px · un solo juego de controles por tarjeta`, conDobleControl.length ? conDobleControl.map((t) => `${t.id}(${t.controlesVisibles})`).join(', ') : '0');
  check(conTituloPartido.length === 0, 'layout', `${ancho}px · ningún título se parte en más de 2 líneas`, conTituloPartido.length ? conTituloPartido.map((t) => `"${t.nombre}"=${t.lineasTitulo}`).join(', ') : 'máx ' + Math.max(...m.tarjetas.map((t) => t.lineasTitulo)));
  check(precioPartido.length === 0, 'layout', `${ancho}px · el precio no se parte`, precioPartido.length ? precioPartido.map((t) => t.id).join(', ') : '0');

  const iconosVacios = m.iconos.filter((i) => !i.ref || i.ancho < 18);
  const refs = m.iconos.map((i) => i.ref);
  check(iconosVacios.length === 0, 'iconos', `${ancho}px · cada producto muestra su ilustración`, iconosVacios.length ? iconosVacios.map((i) => i.id).join(', ') : `${m.iconos.length} ilustraciones`);
  check(new Set(refs).size === refs.length, 'iconos', `${ancho}px · ilustración distinta por producto`, new Set(refs).size === refs.length ? `${new Set(refs).size} distintas` : 'hay repetidas');
  check(m.emojisEnPantalla === 0, 'emojis', `${ancho}px · ningún emoji del sistema en pantalla`, m.emojisEnPantalla + ' encontrados');

  check(chicos.length === 0, 'tactil', `${ancho}px · objetivos táctiles de al menos 44px de alto`, chicos.length ? chicos.slice(0, 6).map((c) => `${c.etiqueta}(${c.w}×${c.h})`).join(', ') : `${m.interactivos.length} controles`);
  check(errores.length === 0, 'consola', `${ancho}px · sin errores de consola`, errores[0] || '0');

  /* capturas: rejilla de productos + página completa en los anchos clave */
  await page.evaluate(() => { const s = document.querySelector('#rapidas'); if (s) s.scrollIntoView(); });
  await esperarScroll(page);
  await page.screenshot({ path: path.join(SALIDA, `menu-${ancho}.png`) });
  if (ancho === 360 || ancho === 1366) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await esperarScroll(page);
    await page.screenshot({ path: path.join(SALIDA, `portada-${ancho}.png`) });
  }
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   2 · CHIPS: ¿navegación por anclas? ¿marcan la categoría correcta?
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 2 · CHIPS DE CATEGORÍA ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(AYUDAS);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const estructura = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.chip')];
    return {
      sonEnlaces: chips.every((c) => c.tagName === 'A'),
      destinos: chips.map((c) => c.getAttribute('href')),
      contenedor: document.querySelector('.chips').tagName,
      rol: document.querySelector('.chips').getAttribute('role'),
    };
  });
  check(estructura.sonEnlaces && estructura.destinos.every((d) => d && d.startsWith('#')), 'chips', 'los chips son navegación por anclas', estructura.destinos.join(' '));

  /* se recorre cada categoría y se comprueba que el chip marcado es el suyo */
  const categorias = ['combos', 'pollo-asado', 'rapidas', 'bebidas'];
  for (const id of categorias) {
    await page.click(`.chip[href="#${id}"]`);
    await esperarScroll(page);
    await page.waitForTimeout(450);
    const estado = await page.evaluate((cat) => {
      const marcados = [...document.querySelectorAll('.chip')]
        .filter((c) => c.getAttribute('aria-current') === 'true')
        .map((c) => c.getAttribute('href'));
      return { marcados, esperado: '#' + cat };
    }, id);
    check(estado.marcados.length === 1 && estado.marcados[0] === estado.esperado, 'chips', `chip correcto marcado en «${id}»`, estado.marcados.join(',') || 'ninguno');
  }

  /* arriba del todo (portada) no debe haber categoría marcada */
  const yArriba = await irArriba(page);
  await page.waitForTimeout(450);
  const arriba = await page.evaluate(() => ({
    marcados: [...document.querySelectorAll('.chip')].filter((c) => c.getAttribute('aria-current') === 'true').map((c) => c.getAttribute('href')),
    scrollY: Math.round(window.scrollY),
    topCombos: Math.round(document.querySelector('#combos').getBoundingClientRect().top),
  }));
  check(yArriba === 0 && arriba.scrollY === 0, 'chips', 'la prueba vuelve de verdad al inicio', `scrollY=${arriba.scrollY} · #combos a ${arriba.topCombos}px`);
  check(arriba.marcados.length === 0, 'chips', 'en la portada ningún chip se marca como activo', arriba.marcados.join(',') || 'ninguno');
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   3 · ENCABEZADO FIJO: los títulos no deben quedar tapados
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 3 · DESPLAZAMIENTO A SECCIONES ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(AYUDAS);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const casos = [
    ['.chip[href="#combos"]', '#t-combos', 'Combos'],
    ['.chip[href="#pollo-asado"]', '#t-pollo', 'Pollo asado'],
    ['.chip[href="#rapidas"]', '#t-rapidas', 'Comidas rápidas'],
    ['.chip[href="#bebidas"]', '#t-bebidas', 'Bebidas'],
  ];
  for (const [selector, titulo, nombre] of casos) {
    await page.click(selector);
    await esperarScroll(page);
    await page.waitForTimeout(350);
    /* «Oculto» significa tapado por una barra fija, no simplemente lejos del
       borde: se comprueba solapamiento real con la cabecera y con los chips. */
    const r = await page.evaluate((sel) => {
      const solapa = (a, b) => {
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return x > 0 && y > 0;
      };
      const caja = document.querySelector(sel).getBoundingClientRect();
      const barras = [document.querySelector('.cabecera'), document.querySelector('.chips')].filter(Boolean);
      return {
        top: Math.round(caja.top),
        choques: barras.filter((el) => solapa(caja, el.getBoundingClientRect())).length,
        visible: caja.top >= 0 && caja.bottom <= window.innerHeight,
      };
    }, titulo);
    check(r.choques === 0 && r.visible, 'scroll', `el título «${nombre}» queda a la vista y sin tapar`, `top=${r.top} · tapado por ${r.choques} barra(s)`);
  }

  /* el enlace «Menú» del encabezado apunta a <main> */
  await irArriba(page);
  await page.evaluate(() => { const a = document.querySelector('.cabecera__nav a[href="#menu"]'); if (a) a.click(); });
  await esperarScroll(page);
  await page.waitForTimeout(350);
  const menu = await page.evaluate(() => {
    const solapa = (a, b) => {
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      return x > 0 && y > 0;
    };
    const caja = document.querySelector('.menu__titulo').getBoundingClientRect();
    const barras = [document.querySelector('.cabecera'), document.querySelector('.chips')].filter(Boolean);
    return {
      top: Math.round(caja.top),
      choques: barras.filter((el) => solapa(caja, el.getBoundingClientRect())).length,
      visible: caja.top >= 0 && caja.bottom <= window.innerHeight,
    };
  });
  check(menu.choques === 0 && menu.visible, 'scroll', 'el enlace «Menú» deja el título a la vista y sin tapar', `top=${menu.top} · tapado por ${menu.choques} barra(s)`);
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   4 · CONTRASTE DE TEXTO
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 4 · CONTRASTE ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.BROSTY && window.BROSTY.sumar('pollo-entero', 'Pollo entero', ''));
  await page.waitForTimeout(200);
  const pares = await page.evaluate(() => {
    const fondoDe = (el) => {
      let n = el;
      while (n && n !== document.documentElement) {
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg.match(/\d+(\.\d+)?/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.85)) return bg;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const items = [
      ['.platillo__precio', 'precio de tarjeta'],
      ['.menu__nota', 'nota de precios'],
      ['.platillo__nombre', 'nombre de plato'],
      ['.categoria__titulo', 'título de categoría'],
      ['.chip', 'chip de categoría'],
      ['.pie__legal', 'texto legal del pie'],
      ['.pie__datos', 'datos del pie'],
      ['.barra-pedido__info span', 'aviso de la barra de pedido'],
      ['.agregar', 'botón Añadir'],
    ];
    return items.map(([sel, nombre]) => {
      const el = document.querySelector(sel);
      if (!el) return { nombre, error: 'no existe' };
      return { nombre, color: getComputedStyle(el).color, fondo: fondoDe(el), tamano: parseFloat(getComputedStyle(el).fontSize), peso: getComputedStyle(el).fontWeight };
    });
  });
  for (const p of pares) {
    if (p.error) { check(false, 'contraste', `contraste · ${p.nombre}`, p.error); continue; }
    const fondo = colorDe(p.fondo);
    const fondoPlano = fondo.a >= 0.99 ? fondo.c : componer(fondo, [255, 255, 255]);
    const texto = componer(colorDe(p.color), fondoPlano);
    const ratio = contraste(texto, fondoPlano);
    const grande = p.tamano >= 24 || (p.tamano >= 18.66 && Number(p.peso) >= 700);
    const minimo = grande ? 3 : 4.5;
    check(ratio >= minimo, 'contraste', `contraste · ${p.nombre}`, `${ratio.toFixed(2)}:1 (mínimo ${minimo})`);
  }
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   5 · CARRITO: añadir, sumar, restar, eliminar, variantes, vacío
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 5 · CARRITO Y VARIANTES ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message.slice(0, 140)));
  await page.addInitScript(() => {
    window.__aperturas = [];
    /* OJO: sustituir window.open sirve para capturar la URL, pero NO prueba que
       la pestaña se abra de verdad y esconde los fallos del valor devuelto. La
       apertura real y el corte de window.opener se comprueban en
       herramientas/probar-envio-004.mjs (KZ-BROSTY-004-A). */
    window.open = function (url) { window.__aperturas.push(String(url)); return { closed: false, focus() {}, close() {} }; };
  });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  /* pedido vacío */
  const vacio = await page.evaluate(() => ({
    enviarDesactivado: document.querySelector('#enviar-pedido').disabled,
    vacioVisible: getComputedStyle(document.querySelector('#carrito-vacio')).display !== 'none',
    datosOcultos: getComputedStyle(document.querySelector('#carrito-datos')).display === 'none',
    barraOculta: getComputedStyle(document.querySelector('#barra-pedido')).display === 'none',
    cuenta: document.querySelector('#cuenta-cabecera').textContent.trim(),
  }));
  check(vacio.enviarDesactivado, 'carrito', 'con el pedido vacío no se puede enviar', String(vacio.enviarDesactivado));
  check(vacio.vacioVisible, 'carrito', 'con el pedido vacío se ve el aviso de vacío');
  check(vacio.datosOcultos, 'carrito', 'con el pedido vacío no se piden datos de entrega');
  check(vacio.barraOculta, 'carrito', 'con el pedido vacío no aparece la barra inferior');
  check(vacio.cuenta === '0', 'carrito', 'el contador empieza en 0', vacio.cuenta);

  /* añadir desde la tarjeta y volver a sumar con el + de la tarjeta */
  await page.evaluate(() => document.querySelector('#rapidas').scrollIntoView());
  await page.waitForTimeout(300);
  await page.click('[data-id="salchipapas"] .agregar');
  await page.waitForTimeout(250);
  const tras1 = await page.evaluate(() => ({
    cuenta: document.querySelector('#cuenta-cabecera').textContent.trim(),
    agregarOculto: getComputedStyle(document.querySelector('[data-id="salchipapas"] .agregar')).display === 'none',
    stepperVisible: getComputedStyle(document.querySelector('[data-id="salchipapas"] .stepper')).display !== 'none',
    controles: [...document.querySelector('[data-id="salchipapas"] .platillo__accion').children].filter((c) => getComputedStyle(c).display !== 'none').length,
  }));
  check(tras1.cuenta === '1', 'carrito', 'añadir sube la cuenta a 1', tras1.cuenta);
  check(tras1.agregarOculto && tras1.stepperVisible, 'carrito', 'al añadir, el botón deja paso al contador', `agregarOculto=${tras1.agregarOculto} stepperVisible=${tras1.stepperVisible}`);
  check(tras1.controles === 1, 'carrito', 'solo queda un juego de controles visible', String(tras1.controles));

  await page.click('[data-id="salchipapas"] .stepper [data-accion="sumar"]');
  await page.waitForTimeout(200);
  check((await page.evaluate(() => document.querySelector('#cuenta-cabecera').textContent.trim())) === '2', 'carrito', 'el + de la tarjeta suma otra unidad');

  await page.click('[data-id="salchipapas"] .stepper [data-accion="restar"]');
  await page.waitForTimeout(200);
  check((await page.evaluate(() => document.querySelector('#cuenta-cabecera').textContent.trim())) === '1', 'carrito', 'el − de la tarjeta descuenta una unidad');

  /* las cuatro variantes, cada una en su línea */
  const variantes = [
    ['patacon', 'Pollo'], ['patacon', 'Mixto'],
    ['chuzos', 'Pollo'], ['chuzos', 'Mixto'],
    ['jugos', 'En agua'], ['jugos', 'En leche'],
    ['limonadas', 'De coco'], ['limonadas', 'De cereza'],
  ];
  for (const [id, v] of variantes) {
    await page.click(`[data-id="${id}"] .variante[data-variante="${v}"]`);
    await page.waitForTimeout(120);
    await page.click(`[data-id="${id}"] .agregar`);
    await page.waitForTimeout(160);
  }
  const lineas = await page.evaluate(() => window.BROSTY.pedido.lineas.map((l) => `${l.cantidad}× ${l.nombre}${l.variante ? ' (' + l.variante + ')' : ''}`));
  const esperadas = ['Patacón (Pollo)', 'Patacón (Mixto)', 'Chuzo (Pollo)', 'Chuzo (Mixto)', 'Jugo (En agua)', 'Jugo (En leche)', 'Limonada (De coco)', 'Limonada (De cereza)'];
  const faltan = esperadas.filter((e) => !lineas.some((l) => l.includes(e)));
  check(faltan.length === 0, 'variantes', 'las 8 variantes quedan como líneas separadas', faltan.length ? 'faltan: ' + faltan.join(', ') : lineas.length + ' líneas');

  /* abrir, observar, restar, eliminar */
  await page.click('#abrir-carrito');
  await page.waitForTimeout(500);
  const abierto = await page.evaluate(() => ({
    lineas: [...document.querySelectorAll('#carrito-lineas .linea')].length,
    obs: [...document.querySelectorAll('.linea__obs')].length,
    total: document.querySelector('#carrito-total').textContent.trim(),
    enviarActivo: !document.querySelector('#enviar-pedido').disabled,
  }));
  check(abierto.lineas === lineas.length && abierto.obs === lineas.length, 'carrito', 'el carrito lista todas las líneas con observaciones', `${abierto.lineas} líneas · ${abierto.obs} campos`);
  check(/por confirmar/i.test(abierto.total), 'carrito', 'el total no inventa precio', abierto.total);
  check(abierto.enviarActivo, 'carrito', 'con productos se puede enviar');

  await page.click('#carrito-lineas .linea:nth-child(1) .linea__quitar');
  await page.waitForTimeout(250);
  check((await page.evaluate(() => window.BROSTY.pedido.lineas.length)) === lineas.length - 1, 'carrito', 'eliminar quita la línea entera');

  /* datos de entrega */
  await page.fill('#f-nombre', 'Prueba KZ');
  await page.fill('#f-entrega', 'Domicilio en el barrio');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(SALIDA, `carrito-390.png`) });

  /* mensaje de WhatsApp */
  const mensaje = await page.evaluate(() => window.BROSTY.armarMensaje());
  fs.writeFileSync(path.join(SALIDA, 'mensaje-whatsapp.txt'), mensaje + '\n', 'utf8');
  check(/Hola BROSTY PAPAS/.test(mensaje) && /Total: por confirmar/i.test(mensaje), 'mensaje', 'el mensaje saluda y no inventa total');
  check(/Nombre: Prueba KZ/.test(mensaje) && /Entrega: Domicilio/.test(mensaje), 'mensaje', 'el mensaje incluye nombre y entrega');
  check((mensaje.match(/^• /gm) || []).length === lineas.length - 1, 'mensaje', 'el mensaje lleva una línea por producto', String((mensaje.match(/^• /gm) || []).length));
  check(/\(Mixto\)/.test(mensaje) && /\(En leche\)/.test(mensaje), 'mensaje', 'las variantes viajan al mensaje');

  await page.click('#enviar-pedido');
  await page.waitForTimeout(500);
  const url = (await page.evaluate(() => window.__aperturas.slice())).pop() || '';
  check(url.startsWith(WA + '?text='), 'mensaje', 'abre el WhatsApp oficial', url.slice(0, 46) + '…');
  check(decodeURIComponent(url.split('?text=')[1] || '') === mensaje, 'mensaje', 'el texto del enlace es el mensaje generado');

  check(errores.length === 0, 'consola', 'sin errores de consola en el recorrido de compra', errores[0] || '0');
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   6 · TECLADO
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 6 · TECLADO ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  /* con el carrito cerrado, el tabulador no debe entrar en él */
  const dentroCerrado = await page.evaluate(() => {
    const carrito = document.querySelector('#carrito');
    return [...carrito.querySelectorAll('a[href],button,input,[tabindex]')]
      .filter((el) => {
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && el.tabIndex >= 0;
      }).length;
  });
  check(dentroCerrado === 0, 'teclado', 'el carrito cerrado no recibe el foco', dentroCerrado + ' controles alcanzables');

  /* abrir con el teclado, cerrar con Escape y recuperar el foco */
  await page.focus('#abrir-carrito');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const abiertoTeclado = await page.evaluate(() => ({
    abierto: document.querySelector('#carrito').classList.contains('abierto'),
    focoDentro: document.querySelector('#carrito').contains(document.activeElement),
  }));
  check(abiertoTeclado.abierto, 'teclado', 'Enter abre el carrito');
  check(abiertoTeclado.focoDentro, 'teclado', 'al abrir, el foco entra en el panel');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const trasEscape = await page.evaluate(() => ({
    abierto: document.querySelector('#carrito').classList.contains('abierto'),
    foco: document.activeElement ? (document.activeElement.id || document.activeElement.className) : '',
  }));
  check(!trasEscape.abierto, 'teclado', 'Escape cierra el carrito');
  check(String(trasEscape.foco).includes('abrir-carrito'), 'teclado', 'al cerrar, el foco vuelve al botón', String(trasEscape.foco));
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   7 · ENLACES Y CONTENIDO COMERCIAL
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 7 · ENLACES Y CONTENIDO ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const enlaces = await page.evaluate(() => {
    const anclas = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'));
    const rotas = anclas.filter((h) => h.length > 1 && !document.querySelector(h));
    const wa = [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href'));
    const externos = [...document.querySelectorAll('a[href^="http"]')].filter((a) => !a.href.includes('wa.me')).map((a) => a.getAttribute('href'));
    return {
      anclas, rotas, wa, externos,
      waCorrectos: wa.every((h) => h.startsWith('https://wa.me/573003201296')),
      dinero: (document.body.innerText.match(/\$\s?\d/g) || []).length,
      coordenadas: (document.body.innerText.match(/-?\d{1,3}\.\d{4,}/g) || []).length,
      platos: document.querySelectorAll('.platillo').length,
      consultar: [...document.querySelectorAll('.platillo__precio')].every((p) => /consultar precio/i.test(p.textContent)),
      logoReal: [...document.querySelectorAll('img')].some((i) => /logo-brosty/i.test(i.getAttribute('src') || '')),
      altTodas: [...document.querySelectorAll('img')].every((i) => i.hasAttribute('alt')),
    };
  });
  check(enlaces.rotas.length === 0, 'enlaces', 'todas las anclas internas existen', enlaces.rotas.join(',') || enlaces.anclas.length + ' anclas');
  check(enlaces.waCorrectos && enlaces.wa.length > 0, 'enlaces', 'todos los enlaces de WhatsApp al número oficial', enlaces.wa.length + ' enlaces');
  check(enlaces.dinero === 0, 'contenido', 'ninguna cifra de dinero inventada', '$=' + enlaces.dinero);
  check(enlaces.coordenadas === 0, 'contenido', 'ninguna coordenada inventada', String(enlaces.coordenadas));
  check(enlaces.platos === 15 && enlaces.consultar, 'contenido', 'los 15 platos siguen con «Consultar precio»', `${enlaces.platos} platos`);
  check(enlaces.logoReal, 'contenido', 'se conserva el logotipo real del negocio');
  check(enlaces.altTodas, 'contenido', 'todas las imágenes tienen alt');
  await ctx.close();
}

/* ═════════════════════════════════════════════════════════════════════
   8 · PERSISTENCIA Y ACCIONES RÁPIDAS
   ═════════════════════════════════════════════════════════════════════ */
console.log('\n═══ 8 · PERSISTENCIA Y ACCIONES ═══');
{
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.addInitScript(AYUDAS);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.BROSTY.sumar('patacon', 'Patacón', 'Mixto');
    window.BROSTY.sumar('jugos', 'Jugo', 'En leche');
    window.BROSTY.pedido.nombre = 'Prueba KZ';
    window.BROSTY.guardar();
    window.BROSTY.pintar();
  });
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(700);
  const tras = await page.evaluate(() => ({
    lineas: window.BROSTY.pedido.lineas.map((l) => `${l.cantidad}x ${l.nombre} (${l.variante})`),
    nombre: window.BROSTY.pedido.nombre,
    cuenta: document.querySelector('#cuenta-cabecera').textContent.trim(),
    tarjeta: getComputedStyle(document.querySelector('[data-id="patacon"] .stepper')).display !== 'none',
    agregarOculto: getComputedStyle(document.querySelector('[data-id="patacon"] .agregar')).display === 'none',
  }));
  check(tras.lineas.length === 2 && tras.cuenta === '2', 'carrito', 'el pedido sobrevive a recargar la pagina', tras.lineas.join(' | '));
  check(tras.tarjeta && tras.agregarOculto, 'carrito', 'al recargar, la tarjeta recuerda la cantidad guardada');

  const descarga = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    page.click('#guardar-contacto'),
  ]).then(([d]) => d);
  check(!!descarga && /\.vcf$/.test(descarga.suggestedFilename()), 'acciones', '«Guardar contacto» descarga un .vcf real', descarga ? descarga.suggestedFilename() : 'sin descarga');

  await page.click('#compartir');
  await page.waitForTimeout(600);
  const aviso = await page.evaluate(() => document.querySelector('#toast').textContent.trim());
  check(aviso.length > 0, 'acciones', '«Compartir» responde', aviso.slice(0, 70));
  await ctx.close();
}

/* ── cierre ──────────────────────────────────────────────────────────── */
await navegador.close();
servidor.close();

const resumen = {
  etiqueta: ETIQUETA,
  fecha: new Date().toISOString(),
  anchos: ANCHOS,
  total: resultados.length,
  fallos,
  grupos: [...new Set(resultados.map((r) => r.grupo))].map((g) => ({
    grupo: g,
    ok: resultados.filter((r) => r.grupo === g && r.ok).length,
    total: resultados.filter((r) => r.grupo === g).length,
  })),
  resultados,
  medidas: Object.fromEntries(Object.entries(medidas).map(([k, v]) => [k, {
    elementosFuera: v.elementosFuera.length,
    tarjetasConDesborde: v.tarjetas.filter((t) => t.desborde).map((t) => t.id),
    maxLineasTitulo: Math.max(...v.tarjetas.map((t) => t.lineasTitulo)),
    anchosCuerpo: v.tarjetas.map((t) => t.anchoCuerpo),
    controlesPorTarjeta: [...new Set(v.tarjetas.map((t) => t.controlesVisibles))],
    interactivosBajos: v.interactivos.filter((i) => i.h < 44).length,
  }])),
};
fs.writeFileSync(path.join(SALIDA, 'resultado.json'), JSON.stringify(resumen, null, 1), 'utf8');

console.log('\n════════════════════════════════════════');
console.log(`${ETIQUETA.toUpperCase()} · ${resultados.length - fallos}/${resultados.length} comprobaciones OK · ${fallos} fallo(s)`);
for (const g of resumen.grupos) console.log(`   ${g.grupo.padEnd(10)} ${g.ok}/${g.total}`);
console.log('capturas y resultado.json en: ' + SALIDA);
process.exit(fallos === 0 ? 0 : 1);
