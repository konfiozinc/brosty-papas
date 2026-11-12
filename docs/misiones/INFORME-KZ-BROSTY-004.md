# INFORME KZ-BROSTY-004 — CORRECCIÓN INTEGRAL Y REDISEÑO VISUAL

**Cliente:** BROSTY PAPAS · **Agencia:** KONFÍO ZINC
**Ejecutor:** Harness · **Supervisor técnico:** ChatGPT · **Director:** Darwin Montalvo
**Fecha:** 11-nov-2026
**Rama de trabajo:** `fix/kz-brosty-004` (parte de `main` en `584d6a6`)

**Veredicto: PASS.** Todo lo pedido está corregido, medido y probado en navegador real.
No se publicó, no se desplegó y `main` no se tocó.

---

## 1 · Enlaces de la entrega

| Qué | URL |
|---|---|
| Rama | https://github.com/konfiozinc/brosty-papas/tree/fix/kz-brosty-004 |
| Commit | https://github.com/konfiozinc/brosty-papas/commit/e51489964f4a82be3333e1520b7ec7a80fd01b18 |
| Comparación contra `main` | https://github.com/konfiozinc/brosty-papas/compare/main...fix/kz-brosty-004 |
| Pull Request | **No se creó.** La misión lo deja como opcional y no se pidió revisión por PR. |

Commit: `e51489964f4a82be3333e1520b7ec7a80fd01b18` — 35 archivos, +1282 / −122.
El informe que estás leyendo va en un commit aparte, encima de ese.

**Punto de recuperación:** `584d6a6` (donde estaba `main` al empezar) y la rama
`fix/kz-brosty-004` sin los cambios. Respaldo de los tres archivos originales en
`evidencias/KZ-BROSTY-004/respaldo-antes/` (fuera del repositorio, en el equipo).

---

## 2 · Estado inicial comprobado

- Repositorio propio en `8-MENUS-DIGITALES/brosty-papas`, rama `main`, HEAD `584d6a6`.
- **Árbol de trabajo limpio:** no había cambios locales que pudieran pisarse.
- Una rama `kz-brosty-004` no existía; se creó `fix/kz-brosty-004` desde `main`.
- `main` no se modificó y no se hizo merge.
- El índice maestro de la agencia decía `15d704c`; el estado real era `584d6a6`
  (el índice está desactualizado, se anota como pendiente).

---

## 3 · Defectos encontrados y su causa real

No eran «detalles de estilo»: había una causa técnica detrás de casi todos.

### 3.1 · `[hidden]` no hacía nada — el origen del desastre visual

`.agregar`, `.stepper` y `.carrito__datos` declaran `display` en el CSS. Un
`display` de autor gana al `display:none` que el navegador aplica a `[hidden]`,
así que ocultar esos elementos nunca funcionó.

Consecuencias medidas:

- En **las 15 tarjetas** se veían a la vez el botón «+ Añadir» **y** el contador
  «− 0 +»: dos juegos de controles ocupando el ancho de la tarjeta.
- Los campos de nombre y entrega aparecían **con el pedido vacío**.

### 3.2 · Títulos partidos y precios partidos

La tarjeta era una rejilla de tres columnas (icono · texto · botones). Con los dos
juegos de botones visibles, la columna de texto se quedaba sin ancho:

- «Combo con Apanado» y «Combo con Ala» se partían en **3 líneas**;
  «Carne a la plancha» llegaba a **4 líneas**.
- «Consultar precio» se partía en **los 15 platos**.

La tipografía de titular (Arial Black) es muy ancha y, además, **en Android no
existe**: el sistema caía a una fuente cualquiera, así que el nombre del plato no
se veía igual en todos los equipos.

### 3.3 · Chips de categoría: eran anclas, pero marcaban mal

Se confirmó que son **navegación por anclas**, no filtros. El estado activo se
calculaba con un `IntersectionObserver` de banda estrecha (45 %–50 % de la
pantalla):

- Al pulsar «Pollo asado» se marcaba **«Comidas rápidas»**.
- En la portada quedaba **«Combos»** marcado sin estarlo.

### 3.4 · Encabezado fijo que tapaba los títulos

`#menu` (el `<main>`) no tenía `scroll-margin-top`. Al pulsar «Menú» en el
encabezado, el título «Nuestro menú» quedaba **por debajo de la cabecera**
(medido: `top=25 px` con la cabecera hasta `64 px`). Los títulos de categoría
quedaban a 1 px del borde de los chips.

### 3.5 · Objetivos táctiles pequeños

| Elemento | Alto medido | Ahora |
|---|---|---|
| Chips de categoría | 40 px | 44 px |
| Botones de variante | 28 px | 44 px |
| Contador − / + | 35 px | 44 px |
| Papelera de línea | 32 px | 44 px |
| Cerrar carrito | 40 px | 44 px |
| «Vaciar el pedido» | 40 px | 44 px |
| Enlaces del encabezado | 34 px | 44 px |

### 3.6 · Carrito cerrado alcanzable con el tabulador

El panel está desplazado fuera de la pantalla con `transform`, pero seguía siendo
enfocable: **5 controles invisibles** recibían el foco con Tab.

### 3.7 · La variante guardada no se recordaba al recargar

Un pedido con «Patacón (Mixto)» reaparecía con «Pollo» marcado y el contador a 0,
aunque el carrito sí tenía la línea. La tarjeta y el pedido se contradecían.

### 3.8 · Nombres inconsistentes y un `·` suelto en el pie

`data-nombre="Chuzos"` mientras Jugos y Limonadas usan singular en el pedido. Y en
el pie había un `·` fuera de `.pie__interior`, con enlaces en estilos en línea.

---

## 4 · Qué se cambió

### 4.1 · Tarjetas (rediseño)

- Dos filas: **icono + nombre/precio/variantes arriba**, **controles en su propia
  fila** alineados a la derecha. El nombre dispone de todo el ancho.
- Nombre con la tipografía de texto en negrita (1 rem, interlineado 1,25). Se ve
  igual en Windows, Android y iOS.
- Precio con un punto cálido en vez del emoji de etiqueta, en una sola línea.
- Variantes y contador a 44 px.
- **Las columnas se deciden por espacio real:** `repeat(auto-fit, minmax(min(100%, 272px), 1fr))`.
  No se fuerzan cuatro tarjetas donde no caben bien.

### 4.2 · Ilustraciones (sustitución de emojis)

**22 SVG originales** en `assets/img/iconos/`, dibujados para esta misión:

| Producto | Ilustración |
|---|---|
| Combo con Apanado | caja con papas y pieza apanada |
| Combo con Ala | caja con papas y ala |
| Pollo entero | pollo asado entero con muslos |
| Medio pollo | pieza de pollo con hueso |
| Salchipapas | papas fritas con rodajas de salchicha |
| Desgranado | vaso con maíz y acompañamientos |
| Patacón | patacón con topping |
| Hamburguesa | pan, queso, carne y base |
| Perros | perro caliente con mostaza |
| Chuzos | brocheta con tres trozos |
| Picadas | bandeja con surtido |
| Carne a la plancha | corte con marcas de parrilla |
| Filete de pollo | filete apanado con textura |
| Jugos | vaso con pitillo y líquido |
| Limonadas | vaso con rodaja de limón |

Más 7 de interfaz: carrito, cerrar, papelera, moto, ubicación, chat y pedido vacío.

Estilo: paleta del volante (crema `#FFF8E9`, amarillo `#FFC928`, naranja `#FF7A18`,
rojo `#C91F32`), sombra de apoyo, dos tonos por forma, proporción uniforme. **Ningún
emoji del sistema** queda en el HTML, el CSS ni el JS (0 en los tres).

**Cómo se integran:** las ilustraciones viven como archivos sueltos y reutilizables,
y `herramientas/generar-iconos.mjs` las empaqueta como símbolos dentro de
`index.html`, que se usan con `<use>`. Resultado: una sola fuente de verdad,
**cero peticiones extra** y sin coste de carga (12,5 KB de sprite, dentro de la
propia página; el generador es determinista y `--check` lo verifica).

### 4.3 · Categorías y desplazamiento

- Chips dentro de un `<nav>` (antes un `<div role="navigation">`), sin
  `aria-current` escrito a mano.
- Estado activo por posición, usando **las alturas** de las barras fijas.
- En móvil, el chip activo se centra en su fila horizontal (se mueve la fila,
  nunca la página).
- Altura fija de los chips + `scroll-margin-top` calculado, así el título de cada
  categoría queda siempre a la vista.

### 4.4 · Carrito y teclado

- `[hidden]` corregido: un solo juego de controles, datos de entrega solo con
  pedido.
- `visibility: hidden` con el carrito cerrado: fuera del orden de tabulación.
- Escape cierra y devuelve el foco al botón que lo abrió (ya funcionaba).
- La variante guardada se restaura en la tarjeta al cargar.

### 4.5 · Texto de precios

Antes: «Los precios se confirman por WhatsApp: aquí no publicamos cifras que el
negocio no nos haya dado.»
Ahora: «Precios por confirmar: te los pasamos por WhatsApp junto con el domicilio.
Elige tus platos y armamos el pedido contigo.»

Más comercial, **sin inventar ninguna cifra**. Los 15 platos siguen diciendo
«Consultar precio» y el total sigue diciendo «Por confirmar».

### 4.6 · Pie

`·` suelto eliminado, «Políticas de Privacidad» dentro del bloque legal, estilos en
línea fuera (ahora en clases), `rel="noopener noreferrer"` en los enlaces externos.

---

## 5 · Pruebas

Suite: `herramientas/auditar-004.mjs` (Chromium real, Playwright ya instalado en el
equipo). Mide e informa; sabe fallar.

```
node herramientas/auditar-004.mjs --salida <carpeta> --etiqueta antes|despues
```

### 5.1 · Resultado

| Momento | Comprobaciones | Fallos |
|---|---|---|
| **Antes** (código original, `584d6a6`) | 76 / 118 | **42** |
| **Después** (rama `fix/kz-brosty-004`) | **151 / 151** | **0** |

La suite creció durante la misión (se añadieron iconos, emojis en pantalla,
persistencia y un control de que la prueba vuelve de verdad al inicio). Por eso el
total no es comparable 118 vs 151; lo que sí es comparable es que **no queda ningún
fallo** y que los 42 fallos iniciales están todos cerrados.

### 5.2 · Por grupos (después)

| Grupo | OK |
|---|---|
| emojis | 12/12 |
| layout (8 anchos × 6 comprobaciones) | 48/48 |
| iconos | 16/16 |
| táctil | 8/8 |
| consola | 9/9 |
| chips | 7/7 |
| scroll | 5/5 |
| contraste | 9/9 |
| carrito | 16/16 |
| variantes | 1/1 |
| mensaje de WhatsApp | 6/6 |
| teclado | 5/5 |
| enlaces | 2/2 |
| contenido | 5/5 |
| acciones (vcf, compartir) | 2/2 |

### 5.3 · Qué se probó de verdad

- **8 anchos:** 360, 375, 390, 430, 768, 1024, 1366 y 1920 px. Sin desbordes, sin
  superposiciones, títulos a una línea, ilustraciones del mismo tamaño, consola
  limpia en todos.
- **Carrito:** añadir, sumar, restar, eliminar, cantidad guardada, pedido vacío,
  pedido con 9 líneas y 9 campos de observaciones, total sin cifras.
- **Variantes:** las 8 combinaciones de Patacón, Chuzos, Jugos y Limonadas quedan
  como líneas separadas y viajan al mensaje; la variante se restaura al recargar.
- **Mensaje de WhatsApp:** una línea por producto, variantes incluidas, nombre y
  entrega, «Total: por confirmar», y el enlace abre exactamente
  `https://wa.me/573003201296` con el texto generado (verificado comparando el texto
  del enlace con el mensaje).
- **Teclado:** con el carrito cerrado, 0 controles alcanzables; Enter abre; el foco
  entra en el panel; Escape cierra y devuelve el foco.
- **Contraste:** 9 parejas medidas en WCAG, todas por encima del mínimo (la más
  justa, 5,33:1).
- **Contenido:** 15 platos, 0 cifras de dinero, 0 coordenadas inventadas, 6 enlaces
  de WhatsApp al número oficial, logotipo real conservado, todas las imágenes con
  `alt`, todas las anclas internas existentes.

### 5.4 · La prueba sabe fallar

Durante esta misión la propia auditoría encontró **tres defectos reales** que no se
habían visto a ojo, y que se corrigieron antes de entregar:

1. Los chips marcaban la categoría anterior (holgura insuficiente frente al
   `scroll-margin-top`).
2. En la portada se marcaba «Combos»: el límite se calculaba con la **posición** de
   los chips, que en la portada aún no están pegados.
3. La variante guardada no se restauraba al recargar.

También se corrigieron **dos falsos positivos** de la propia prueba (los chips que
se salen a la derecha dentro de su carrusel horizontal no son un desborde; los
enlaces dentro de un párrafo no se miden con la regla de 44 px).

### 5.5 · Puerta de calidad de la agencia

```
node herramientas/verificar-calidad-html.js --raiz "<ruta>/brosty-papas"
```

Resultado: **OK — 1/1 páginas cumplen el estándar, incluida la consola sin errores
en Chromium. Exit 0.**

---

## 6 · Capturas

En `docs/misiones/capturas-kz-brosty-004/`:

| Archivo | Qué muestra |
|---|---|
| `comparacion-tarjetas-390.png` | tarjetas en móvil, ANTES y DESPUÉS lado a lado |
| `comparacion-tarjetas-1366.png` | tarjetas en escritorio, ANTES y DESPUÉS |
| `escritorio-pagina-completa.png` | página completa en 1366 |
| `movil-pagina-completa.png` | página completa en 390 |
| `movil-carrito.png` | carrito abierto con un pedido de ejemplo |
| `tableta-tarjetas.png` | tarjetas en 768 |

El juego completo (los 8 anchos, en antes y después, más la portada y el carrito en
cada estado) está en el equipo, fuera del repositorio:
`evidencias/KZ-BROSTY-004/{antes,despues}/`.

---

## 7 · Archivos modificados

**Modificados**

```
index.html                      · sprite de iconos, <use> por plato, chips a <nav>,
                                  nota de precios, pie, cierre y vacío del carrito
assets/css/estilos.css          · [hidden], tarjeta en dos filas, tipografía del
                                  nombre, 44 px, altura de chips, scroll-margin,
                                  visibility del carrito, estilos de iconos y pie
assets/js/app.js                · chips por posición, sincronización de variantes,
                                  papelera SVG, sin emojis
_config.yml                     · se excluye docs/ de la publicación (ver riesgos)
```

**Nuevos**

```
assets/img/iconos/*.svg                         · 22 ilustraciones originales
herramientas/generar-iconos.mjs                 · empaqueta los SVG en index.html
herramientas/auditar-004.mjs                    · auditoría antes/después (151 comprobaciones)
herramientas/capturar-004.mjs                   · capturas de entrega
docs/misiones/INFORME-KZ-BROSTY-004.md          · este informe
docs/misiones/capturas-kz-brosty-004/*.png      · 6 capturas
```

**Intactos:** `favicon.svg`, todo `assets/img/marca/` y `assets/img/og/`,
`README.md`, `LEEME-REVISION.txt`, `publicar.mjs`, `inspeccionar.mjs`,
`verificar-produccion.mjs`, `verificar-calidad-html.js`, `probar.mjs`,
`generar-imagenes.mjs`.

---

## 8 · Cómo revisar y reproducir

```bash
# 1. traer la rama
git fetch origin && git switch fix/kz-brosty-004

# 2. comprobar que el sprite del HTML está en sintonia con los SVG
node herramientas/generar-iconos.mjs --check

# 3. auditoría completa (abre Chromium, 8 anchos, carrito, teclado)
node herramientas/auditar-004.mjs --salida /tmp/auditoria --etiqueta revision

# 4. capturas
node herramientas/capturar-004.mjs --salida /tmp/capturas
```

No hace falta instalar nada: usa el Chromium de Playwright que ya está en el equipo.
**_No existe un servidor de previsualización público**: la rama no está publicada
en GitHub Pages.

---

## 9 · Riesgos y pendientes

1. **`_config.yml` cambió: se añadió `docs` a `exclude`.** El propio archivo ya
   decía que las capturas y los informes no debían servirse, pero `docs/` no
   existía. Sin esa línea, al fusionar a `main` el informe y las capturas quedarían
   públicos en el sitio del cliente. **Revisar y confirmar antes del merge.**
2. **Probado en Chromium, no en dispositivos físicos.** Las medidas son de
   emulación. Falta la pasada en un Android real y en un iPhone real, que solo puede
   hacer una persona. La consola está limpia y el CSS no usa nada exótico.
3. **No hay fotos de producto.** La misión prohíbe fotos falsas o genéricas, así que
   se usan ilustraciones propias. Si el negocio quiere fotos reales, hacen falta
   **fotos autorizadas del propio Brosty** (trabajo aparte, decisión de Darwin).
4. **Las ilustraciones son dibujos geométricos**, no ilustración encargada a un
   artista. Son coherentes y legibles a 54 px; si Darwin quiere un nivel más
   ilustrado, es una segunda iteración sobre los mismos 22 archivos.
5. **El índice maestro de la agencia está desactualizado** (`00-INDICE-MAESTRO.md`
   dice `15d704c` y el HEAD real era `584d6a6`). Se corrige en una pasada aparte.
6. **Nada publicado.** `main` intacto, sin merge, sin PR, sin tocar GitHub Pages.
   Publicar requiere autorización expresa de Darwin.
7. **El mensaje de WhatsApp no se envía en las pruebas**: se intercepta
   `window.open` y se compara el texto. No se envió ni un pedido real.
8. Los datos que se escriben en el carrito (nombre, entrega, observaciones) siguen
   **solo en el navegador** y viajan únicamente dentro del mensaje que la persona
   envía. No hay servidor ni analítica.

---

## 10 · Cierre

**PASS.**

Los 11 defectos señalados en las capturas están corregidos y medidos; los emojis se
sustituyeron por 22 ilustraciones SVG propias, una distinta por producto; el carrito
y el mensaje de WhatsApp funcionan y se probaron con las 8 combinaciones de
variantes; y las 151 comprobaciones en Chromium a 8 anchos pasan sin un solo fallo.

nada se ha publicado. La rama `fix/kz-brosty-004` está en GitHub para que ChatGPT
la revise y pida correcciones adicionales antes de que Darwin autorice la
publicación.
