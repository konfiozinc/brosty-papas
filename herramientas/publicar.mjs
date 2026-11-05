/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · herramientas/publicar.mjs
   KZ-BROSTY-004 · crea el repositorio en GitHub y activa GitHub Pages.

   Necesita un token con permiso para crear repositorios y configurar Pages
   (token clásico con scope `repo`). Se lee de una de estas fuentes:
     1. variable de entorno GITHUB_TOKEN
     2. archivo indicado en GITHUB_TOKEN_FILE
     3. .secrets/github_token.txt del proyecto

   Uso:
     node herramientas/publicar.mjs            # comprueba y no crea nada
     node herramientas/publicar.mjs --aplicar  # crea el repo y activa Pages

   No hace push: eso lo hace `git push` por SSH (la llave del equipo).
   ═══════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';

const PROPIETARIO = 'konfiozinc';
const REPO = 'brosty-papas';
const RAIZ = path.resolve(import.meta.dirname, '..');
const APLICAR = process.argv.includes('--aplicar');

function leerToken() {
  if (process.env.GITHUB_TOKEN) return { token: process.env.GITHUB_TOKEN.trim(), origen: 'variable GITHUB_TOKEN' };
  if (process.env.GITHUB_TOKEN_FILE && fs.existsSync(process.env.GITHUB_TOKEN_FILE)) {
    return { token: fs.readFileSync(process.env.GITHUB_TOKEN_FILE, 'utf8').trim(), origen: process.env.GITHUB_TOKEN_FILE };
  }
  const local = path.join(RAIZ, '.secrets', 'github_token.txt');
  if (fs.existsSync(local)) return { token: fs.readFileSync(local, 'utf8').trim(), origen: local };
  return null;
}

const credencial = leerToken();
if (!credencial || !credencial.token) {
  console.error('Sin token. Define GITHUB_TOKEN o crea .secrets/github_token.txt en el proyecto.');
  process.exit(1);
}
const CABECERAS = {
  Authorization: 'Bearer ' + credencial.token,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'kz-brosty-004',
  'X-GitHub-Api-Version': '2022-11-28'
};

async function pedir(metodo, ruta, cuerpo) {
  const r = await fetch('https://api.github.com' + ruta, {
    method: metodo,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CABECERAS),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = { crudo: texto.slice(0, 200) }; }
  return { estado: r.status, datos };
}

/* ── 0 · ¿el token sirve? ───────────────────────────────────────────── */
const yo = await pedir('GET', '/user');
if (yo.estado !== 200) {
  console.error(`Token rechazado (HTTP ${yo.estado}): ${yo.datos && yo.datos.message}`);
  console.error('Origen del token: ' + credencial.origen);
  process.exit(1);
}
console.log(`✓ token válido · usuario ${yo.datos.login} (origen: ${credencial.origen})`);

/* ── 1 · estado del repositorio ─────────────────────────────────────── */
const existe = await pedir('GET', `/repos/${PROPIETARIO}/${REPO}`);
if (existe.estado === 200) {
  console.log(`✓ el repositorio ${PROPIETARIO}/${REPO} ya existe · rama ${existe.datos.default_branch} · Pages: ${existe.datos.has_pages}`);
} else if (existe.estado === 404) {
  console.log(`· el repositorio ${PROPIETARIO}/${REPO} todavía no existe`);
  if (APLICAR) {
    const creado = await pedir('POST', '/user/repos', {
      name: REPO,
      description: 'Tarjeta digital de BROSTY PAPAS · pollo broaster y asado (KONFÍO ZINC)',
      homepage: `https://${PROPIETARIO}.github.io/${REPO}/`,
      private: false,
      has_issues: true,
      has_wiki: false,
      has_projects: false,
      auto_init: false
    });
    if (creado.estado === 201) console.log(`✓ repositorio creado: ${creado.datos.html_url} (público)`);
    else { console.error(`No se pudo crear (HTTP ${creado.estado}): ${creado.datos && creado.datos.message}`); process.exit(1); }
  }
} else {
  console.error(`Consulta del repositorio falló (HTTP ${existe.estado}).`);
  process.exit(1);
}

/* ── 2 · Pages (solo si ya hay contenido en main) ───────────────────── */
const rama = await pedir('GET', `/repos/${PROPIETARIO}/${REPO}/branches/main`);
if (rama.estado !== 200) {
  console.log('· la rama main todavía no tiene contenido: primero hay que hacer push.');
  console.log('  Cuando esté: git push -u origin main');
  process.exit(0);
}
console.log(`✓ main existe · ${rama.datos.commit.sha.slice(0, 7)}`);

const pages = await pedir('GET', `/repos/${PROPIETARIO}/${REPO}/pages`);
if (pages.estado === 200) {
  console.log(`✓ Pages ya está activo · ${pages.datos.html_url} · estado ${pages.datos.status}`);
} else if (pages.estado === 404) {
  console.log('· Pages no está activado');
  if (APLICAR) {
    const activado = await pedir('POST', `/repos/${PROPIETARIO}/${REPO}/pages`, {
      source: { branch: 'main', path: '/' }
    });
    if (activado.estado === 201 || activado.estado === 202) {
      console.log(`✓ Pages activado desde main / (raíz) · ${activado.datos.html_url || ''}`);
    } else {
      console.error(`No se pudo activar Pages (HTTP ${activado.estado}): ${activado.datos && activado.datos.message}`);
      process.exit(1);
    }
  }
}

console.log(`\nURL del sitio: https://${PROPIETARIO}.github.io/${REPO}/`);
