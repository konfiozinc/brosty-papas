/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/generar-iconos.mjs
   KZ-BROSTY-004 · empaqueta las ilustraciones SVG dentro de index.html

   POR QUÉ
     Las ilustraciones viven como archivos independientes y reutilizables en
     assets/img/iconos/*.svg (así se pueden revisar y reutilizar sueltas),
     pero la página NO las pide una por una: se empaquetan como símbolos SVG
     dentro de index.html y se usan con <use>. Resultado: una sola fuente de
     verdad, cero peticiones extra y ningún efecto al cargar.

   USO
     node herramientas/generar-iconos.mjs            (escribe index.html)
     node herramientas/generar-iconos.mjs --check    (solo comprueba; exit 1 si
                                                      index.html está desfasado)

   Es determinista: mismo SVG de entrada, mismo HTML de salida.
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR = path.join(RAIZ, 'assets', 'img', 'iconos');
const HTML = path.join(RAIZ, 'index.html');
const INICIO = '<!-- KZ-ICONOS:INICIO -->';
const FIN = '<!-- KZ-ICONOS:FIN -->';
const soloComprobar = process.argv.includes('--check');

/* Los de producto se dibujan en 64; los de interfaz en 24. */
const ORDEN = [
  'combo-apanado', 'combo-ala', 'pollo-entero', 'medio-pollo', 'salchipapas',
  'desgranado', 'patacon', 'hamburguesa', 'perros', 'chuzos', 'picadas',
  'carne-plancha', 'filete-pollo', 'jugos', 'limonadas',
  'carrito', 'cerrar', 'papelera', 'moto', 'pin', 'chat', 'vacio',
];

const archivos = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort();
const faltan = ORDEN.filter((n) => !archivos.includes(n + '.svg'));
if (faltan.length) {
  console.error('Faltan ilustraciones: ' + faltan.join(', '));
  process.exit(1);
}

/* Orden estable: primero el orden declarado, luego lo que sobre alfabéticamente. */
const lista = [
  ...ORDEN.filter((n) => archivos.includes(n + '.svg')).map((n) => n + '.svg'),
  ...archivos.filter((f) => !ORDEN.includes(f.replace(/\.svg$/, ''))),
];

const simbolos = [];
let bytesSvg = 0;
for (const archivo of lista) {
  const nombre = archivo.replace(/\.svg$/, '');
  const bruto = fs.readFileSync(path.join(DIR, archivo), 'utf8');
  bytesSvg += Buffer.byteLength(bruto);
  const apertura = bruto.match(/<svg[^>]*>/i);
  if (!apertura) { console.error('Sin etiqueta <svg>: ' + archivo); process.exit(1); }
  const vb = apertura[0].match(/viewBox="([^"]+)"/i);
  if (!vb) { console.error('Sin viewBox: ' + archivo); process.exit(1); }
  /* el <title> solo sirve para el archivo suelto: dentro del sprite no aporta */
  const interior = bruto
    .slice(apertura.index + apertura[0].length, bruto.lastIndexOf('</svg>'))
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .trim();
  simbolos.push(`    <symbol id="i-${nombre}" viewBox="${vb[1]}">${interior}</symbol>`);
}

const html = fs.readFileSync(HTML, 'utf8');
/* Respeta el fin de línea del archivo: si index.html usa CRLF, el bloque se
   escribe con CRLF. Mezclar finales de línea hace que git avise en cada diff. */
const SALTO = html.includes('\r\n') ? '\r\n' : '\n';

const bloque = [
  INICIO,
  '  <!-- Generado por herramientas/generar-iconos.mjs desde assets/img/iconos/*.svg.',
  '       No editar a mano: se sobrescribe. Para cambiar un icono, edita su SVG y',
  '       vuelve a ejecutar el generador. -->',
  '  <svg class="kz-iconos" aria-hidden="true" focusable="false" width="0" height="0">',
  '    <defs>',
  ...simbolos,
  '    </defs>',
  '  </svg>',
  FIN,
].join(SALTO);

const i = html.indexOf(INICIO);
const f = html.indexOf(FIN);
if (i < 0 || f < 0 || f < i) {
  console.error(`No encuentro los marcadores KZ-ICONOS en index.html`);
  process.exit(1);
}
const nuevo = html.slice(0, i) + bloque + html.slice(f + FIN.length);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
if (soloComprobar) {
  const iguales = nuevo === html;
  console.log(`${iguales ? 'AL DIA' : 'DESFASADO'} · ${lista.length} iconos · sprite ${kb(bloque)} de ${bytesSvg} B de SVG`);
  process.exit(iguales ? 0 : 1);
}

fs.writeFileSync(HTML, nuevo, 'utf8');
console.log(`iconos empaquetados: ${lista.length}`);
console.log(`  SVG sueltos : ${bytesSvg} B`);
console.log(`  sprite      : ${kb(bloque)} dentro de index.html`);
console.log(`  index.html  : ${kb(html)} -> ${kb(nuevo)}`);
