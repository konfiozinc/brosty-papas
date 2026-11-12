/* KZ-BROSTY-004-A · revisión de docs/ y comprobación real de la exclusión en Pages
   No modifica nada: solo lee archivos y hace peticiones GET de lectura. */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RAIZ = 'C:\\Users\\usuario29\\Documents\\KONFIO_ZINC\\8-MENUS-DIGITALES\\brosty-papas';
const SITIO = 'https://konfiozinc.github.io/brosty-papas/';

/* ── 1 · ¿Qué archivos de docs/ son públicos? ────────────────────────── */
const versionados = execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean);

const docs = versionados.filter((f) => f.startsWith('docs/'));
console.log('═══ 1 · ARCHIVOS DE docs/ VERSIONADOS ═══');
for (const f of docs) {
  const abs = path.join(RAIZ, f);
  const kb = fs.existsSync(abs) ? Math.round(fs.statSync(abs).size / 1024) : 0;
  console.log(`  ${String(kb).padStart(5)} KB  ${f}`);
}

/* ── 2 · Buscar datos sensibles en los archivos de texto de docs/ ────── */
const PATRONES = [
  ['ruta absoluta de Windows', /[A-Za-z]:\\[^\s"'`<>|]+/g],
  ['ruta de usuario', /C:[\\/]Users[\\/][^\s"'`<>|]+/gi],
  ['correo electrónico', /[\w.+-]+@[\w-]+\.[\w.]{2,}/g],
  ['token GitHub', /(ghp_|github_pat_)[A-Za-z0-9_]{10,}/g],
  ['clave Google', /AIza[0-9A-Za-z_-]{20,}/g],
  ['clave OpenAI', /sk-[A-Za-z0-9]{16,}/g],
  ['clave privada', /-----BEGIN [A-Z ]*PRIVATE KEY/g],
  ['contraseña', /(password|passwd|contrasena|contraseña)\s*[:=]\s*\S+/gi],
  ['secuencia de 9-13 dígitos', /\b\d{9,13}\b/g],
];

console.log('\n═══ 2 · DATOS SENSIBLES EN docs/ (texto) ═══');
let hallazgos = 0;
for (const f of docs.filter((x) => /\.(md|txt|html|js|json|yml|yaml|svg|csv)$/i.test(x))) {
  const texto = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  const encontrados = [];
  for (const [nombre, re] of PATRONES) {
    const m = texto.match(re);
    if (m) encontrados.push(`${nombre}: ${[...new Set(m)].slice(0, 3).join(' · ')}`);
  }
  if (encontrados.length) {
    hallazgos += encontrados.length;
    console.log(`  AVISO ${f}`);
    for (const e of encontrados) console.log(`        ${e}`);
  } else {
    console.log(`  limpio  ${f}`);
  }
}

/* ── 3 · ¿El sitio publicado sirve las carpetas internas? ────────────── */
const RUTAS = [
  ['raíz del sitio (debe ser 200)', ''],
  ['assets/css/estilos.css (debe ser 200)', 'assets/css/estilos.css'],
  ['index.html (debe ser 200)', 'index.html'],
  ['herramientas/probar.mjs (excluida -> 404)', 'herramientas/probar.mjs'],
  ['herramientas/auditar-004.mjs (excluida -> 404)', 'herramientas/auditar-004.mjs'],
  ['README.md (excluido -> 404)', 'README.md'],
  ['_config.yml (empieza por _ -> 404)', '_config.yml'],
  ['evidencias/ (excluida -> 404)', 'evidencias/'],
  ['docs/misiones/INFORME-KZ-BROSTY-004.md (rama no publicada -> 404)', 'docs/misiones/INFORME-KZ-BROSTY-004.md'],
];

console.log('\n═══ 3 · QUÉ SIRVE HOY EL SITIO PUBLICADO (main) ═══');
const estatus = {};
for (const [etiqueta, ruta] of RUTAS) {
  try {
    const r = await fetch(SITIO + ruta, { redirect: 'follow', headers: { 'User-Agent': 'kz-brosty-004-a' } });
    estatus[ruta] = r.status;
    console.log(`  HTTP ${String(r.status).padEnd(4)} ${etiqueta}`);
  } catch (e) {
    estatus[ruta] = 'ERROR';
    console.log(`  ERROR    ${etiqueta}  (${e.message.slice(0, 50)})`);
  }
}

/* ── 4 · Cómo construye Pages este repositorio ───────────────────────── */
console.log('\n═══ 4 · MÉTODO DE CONSTRUCCIÓN ═══');
const nojekyll = fs.existsSync(path.join(RAIZ, '.nojekyll'));
const workflows = fs.existsSync(path.join(RAIZ, '.github', 'workflows'));
const config = fs.readFileSync(path.join(RAIZ, '_config.yml'), 'utf8');
const excluyeDocs = /^\s*-\s*docs\s*$/m.test(config);
console.log(`  .nojekyll en el repositorio        : ${nojekyll ? 'SÍ (Jekyll desactivado)' : 'no (Jekyll activo)'}`);
console.log(`  .github/workflows                  : ${workflows ? 'SÍ' : 'no (no hay build propio)'}`);
console.log(`  _config.yml contiene "- docs"      : ${excluyeDocs ? 'SÍ' : 'NO'}`);

/* ── 5 · Verificación por API (lectura) ──────────────────────────────── */
console.log('\n═══ 5 · API DE GITHUB ═══');
try {
  const r = await fetch('https://api.github.com/repos/konfiozinc/brosty-papas/pages', {
    headers: { 'User-Agent': 'kz-brosty-004-a', Accept: 'application/vnd.github+json' },
  });
  if (r.ok) {
    const j = await r.json();
    console.log(`  fuente de Pages: ${j.source ? j.source.branch + ' /' + j.source.path : 'build_type=' + j.build_type}`);
    console.log(`  build_type     : ${j.build_type || '(no informado)'}`);
    console.log(`  estado         : ${j.status || '(no informado)'}`);
  } else {
    console.log(`  la API no expone /pages sin credenciales (HTTP ${r.status}): se concluye por evidencia del sitio`);
  }
} catch (e) {
  console.log('  API no consultable: ' + e.message.slice(0, 60));
}

/* ── 6 · Conclusión ─────────────────────────────────────────────────── */
const jekyll = !nojekyll && !workflows;
const pruebaExclusion = estatus['herramientas/probar.mjs'] === 404 || estatus['herramientas/auditar-004.mjs'] === 404;
const pruebaAssets = estatus['assets/css/estilos.css'] === 200;

console.log('\n═══ 6 · CONCLUSIÓN ═══');
console.log(`  Jekyll construye el sitio (sin .nojekyll ni workflows) : ${jekyll ? 'SÍ' : 'NO'}`);
console.log(`  El sitio sirve assets (200)                             : ${pruebaAssets ? 'SÍ' : 'NO'}`);
console.log(`  El sitio NO sirve herramientas/ (404)                   : ${pruebaExclusion ? 'SÍ' : 'NO'}`);
console.log(`  _config.yml del repo excluye docs/                      : ${excluyeDocs ? 'SÍ' : 'NO'}`);
const veredicto = jekyll && pruebaExclusion && pruebaAssets && excluyeDocs;
console.log(`  => la exclusión de docs/ en el build real               : ${veredicto ? 'VERIFICADA' : 'NO VERIFICADA'}`);
console.log(`  avisos de datos sensibles en docs/                      : ${hallazgos}`);
