# INFORME KZ-BROSTY-004-B — CIERRE DEL PEDIDO WHATSAPP Y VALIDACIÓN MÓVIL

**Cliente:** BROSTY PAPAS · **Agencia:** KONFÍO ZINC
**Ejecutor:** Harness · **Director:** Darwin Montalvo
**Fecha:** 11-nov-2026
**Rama:** `fix/kz-brosty-004` · **Punto de partida:** `e9c3e9a`
**Base:** cambios de KZ-BROSTY-004 y 004-A, intactos.

**Veredicto: PASS CON RESERVAS.** Todo lo verificable en navegador está verificado y
sin fallos. La única reserva es la **prueba en teléfono físico**, que no se pudo hacer
(ver punto 6).

---

## 1 · El defecto corregido

La reserva que quedaba de 004-A era real: el respaldo automático pulsaba un enlace y
daba el intento **por bueno solo porque `.click()` no lanzaba una excepción**. Eso no
demuestra que WhatsApp se abriera, y aun así se anunciaba como éxito.

Lo que la plataforma permite saber y lo que no:

| Señal | ¿Sirve para confirmar la apertura? |
|---|---|
| `window.open(url, '_blank')` devuelve una referencia | **Sí**: el navegador creó la ventana. Un `null` es un bloqueo de verdad |
| `.click()` sobre un enlace `target="_blank"` sin excepción | **No**: no devuelve nada y no informa de si la pestaña se abrió |

### Cómo queda ahora

1. **Un solo intento automático** con `window.open`, que es la única vía confirmable.
   No se reintenta: repetirlo podría abrir pestañas duplicadas.
2. **Si está confirmada** (referencia devuelta): se corta `window.opener` en el acto
   (anti reverse tabnabbing), se cierra el carrito y el aviso lo dice.
3. **Si no se puede confirmar**: **no se anuncia nada**. Aparece una acción visible,
   **ABRIR WHATSAPP CON MI PEDIDO**, que es un `<a href="https://wa.me/…">` real con
   `target="_blank" rel="noopener noreferrer"`. La pulsa la persona.
4. **El pedido no se toca nunca**: ni se vacía ni se pierde. El carrito se queda
   abierto para poder pulsar el enlace.
5. **Una sola acción a la vista**: al mostrarse el enlace manual se retira el botón de
   intento automático, para que no puedan abrirse dos pestañas por descuido.
6. **El enlace se mantiene al día**: si la persona añade o quita productos mientras el
   enlace está a la vista, se recalcula con el pedido actual (cantidades, variantes y
   observaciones incluidas).
7. **El mensaje no se envía solo**: abrir WhatsApp solo rellena el texto. Se envía
   cuando la persona pulsa enviar dentro de WhatsApp.

Mensajes:

| Situación | Aviso | Carrito |
|---|---|---|
| Apertura confirmada | «Abrimos WhatsApp con tu pedido. Pulsa enviar para que lo reciban.» | se cierra |
| No confirmable | «Tu pedido está listo. Pulsa «Abrir WhatsApp con mi pedido».» | sigue abierto, pedido intacto |

Ningún caso vuelve a decir «el navegador bloqueó» ni anuncia una apertura sin prueba.

---

## 2 · Pruebas ejecutadas

Todas en **Chromium real**. Las peticiones a `wa.me` se interceptan con una página de
prueba: **no se contactó con WhatsApp y no se envió ningún pedido**.

### 2.1 · Regresión del envío — `herramientas/probar-envio-004.mjs`

**39 / 39 OK · 0 fallos.** No sustituye `window.open` en el caso normal: pulsa el botón
y observa la pestaña que abre el navegador de verdad.

| Caso | Comprobado |
|---|---|
| **Apertura normal** | pestaña real abierta · URL y texto del mensaje correctos · `window.opener === null` · carrito cerrado · aviso de confirmación · sin pestañas duplicadas |
| **Ventana bloqueada** | 0 pestañas · **1 solo intento** automático · aparece el enlace manual · texto, `href`, `target` y `rel` correctos · nota de que no se envía solo · **no** se anuncia éxito · **no** se culpa al navegador · carrito abierto · pedido y observaciones intactos · botón automático retirado |
| **Enlace se actualiza** | al añadir un producto, el `href` cambia y lleva el pedido nuevo |
| **Fallback manual** | al pulsar el enlace se abre WhatsApp con el pedido actual · el mensaje lleva productos, variantes y observaciones · `window.opener === null` |
| **Pedido vacío** | no se abre nada · `enviar()` no hace nada · botón desactivado · sin acción manual |
| **Persistencia** | el pedido y las observaciones sobreviven a recargar · contador restaurado |
| **Consola** | 0 errores en todos los casos |

### 2.2 · Revisión móvil — `herramientas/revisar-004-b.mjs`

**360, 375, 390 y 430 px · TODO OK en los cuatro.**

| Comprobación | 360 | 375 | 390 | 430 |
|---|---|---|---|---|
| Desbordamientos / recortes | 0 | 0 | 0 | 0 |
| Ilustraciones SVG dibujadas y distintas | 15 | 15 | 15 | 15 |
| Nombres de plato partidos de más | máx 1 línea | 1 | 1 | 1 |
| Controles por debajo de 44 px | 0 | 0 | 0 | 0 |
| Pie de página | OK | OK | OK | OK |
| Botón de enviar completo en pantalla | sí | sí | sí | sí |
| Acción manual visible y pulsable | 77 px | 54 px | 54 px | 54 px |
| Acción manual completa, sin recortes | sí | sí | sí | sí |
| Dentro del panel del carrito | sí | sí | sí | sí |
| Errores de consola | 0 | 0 | 0 | 0 |

Cubierto lo que pedía la misión: portada, menú, ilustraciones, tarjetas, botones y
cantidades, variantes, carrito, acción manual de WhatsApp y pie.

### 2.3 · Regresiones de la misión anterior

- `herramientas/auditar-004.mjs` (cubre carrito y mensaje): **151 / 151, 0 fallos**.
- Puerta de calidad de la agencia: **OK, 1/1 páginas, consola sin errores, exit 0**.

---

## 3 · Capturas

En `docs/misiones/capturas-kz-brosty-004/`:

| Archivo | Qué muestra |
|---|---|
| `004b-390-carrito-con-enlace-manual.png` | **la evidencia principal**: carrito con «ABRIR WHATSAPP CON MI PEDIDO» visible |
| `004b-360-carrito-con-enlace-manual.png` | lo mismo en 360 px (el texto ocupa dos líneas, el botón sigue completo) |
| `004b-430-carrito-con-enlace-manual.png` | lo mismo en 430 px |
| `004b-390-carrito-normal.png` | carrito normal, antes de intentar enviar |
| `004b-390-menu-tarjetas.png` | menú con las ilustraciones y las tarjetas |

El juego completo (los cuatro anchos con menú, carrito y enlace manual, más la página
completa a 390) está en el equipo, fuera del repositorio:
`evidencias/KZ-BROSTY-004/despues-b/`.

---

## 4 · Archivos modificados

```
index.html                                  · acción manual «Abrir WhatsApp con mi pedido»
                                              en el pie del carrito (enlace real, hidden)
assets/css/estilos.css                      · estilo de la nota de la acción manual
assets/js/app.js                            · construirUrl(), mostrarAccionManual(),
                                              ocultarAccionManual(), enviar() reescrita;
                                              se elimina pulsarEnlace() (intento no confirmable)
herramientas/probar-envio-004.mjs           · reescrito: 39 comprobaciones del flujo nuevo
herramientas/revisar-004-b.mjs              · NUEVO · revisión móvil + capturas
docs/misiones/INFORME-KZ-BROSTY-004-B.md    · NUEVO · este informe
docs/misiones/capturas-kz-brosty-004/004b-* · NUEVO · 5 capturas
```

Intactos: los 22 SVG de `assets/img/iconos/`, `generar-iconos.mjs` (el sprite sigue en
sintonia: `--check` lo verifica), el diseño, las tarjetas, los textos y los precios.

---

## 5 · Punto de recuperación y estado Git

| | |
|---|---|
| Punto de partida de esta misión | `e9c3e9a` |
| Respaldo de los archivos tocados | `evidencias/KZ-BROSTY-004/respaldo-004b/` |
| Rama | `fix/kz-brosty-004` |
| `main` | **intacto** en `584d6a6` |
| Merge a `main` | **no** |
| GitHub Pages | **no se tocó** |
| Publicación | **ninguna** |

---

## 6 · Prueba física: PENDIENTE

**PRUEBA FÍSICA PENDIENTE.**

No hay dispositivos conectados ni herramientas para hacerlo desde aquí: `adb` (Android)
e `idevice_id` (iPhone) **no están instalados**. Todo lo anterior es **emulación de
Chromium**, no un teléfono real. No se afirma haber probado teléfonos.

Queda pendiente una pasada manual de dos minutos en un Android y un iPhone reales:
abrir el sitio, añadir un producto, pulsar enviar y comprobar que WhatsApp se abre con
el pedido.

---

## 7 · Riesgos pendientes

1. **Prueba en teléfono físico (ver punto 6).** Es la única reserva de este PASS.
2. **El bloqueo de ventanas se prueba simulando** `window.open → null`. Es la única
   forma de reproducirlo en modo headless; conviene no leerlo como un bloqueador real
   de un navegador concreto.
3. **Comportamiento entre navegadores.** `window.open` dentro del manejador del clic
   funciona en Chromium. Si algún navegador móvil lo tratara como no solicitado, la
   persona sigue teniendo el enlace manual, que **no depende de JavaScript**.
4. **El enlace manual lleva el pedido en la URL**, incluidas las observaciones, y por
   tanto queda en el historial del navegador. Ya ocurría igual con el envío automático;
   no hay servidor, ni terceros, ni analítica. Si el negocio quiere evitarlo, habría que
   cambiar el enfoque (fuera del alcance de esta misión).
5. **`wa.me` decide** si abre la app o WhatsApp Web según el dispositivo. Desde la web
   no se puede garantizar cuál de las dos cosas ocurrirá.
6. **No añadir `.nojekyll`** al repositorio mientras la exclusión de `docs/` dependa de
   `_config.yml`: desactivaría Jekyll y con él todas las exclusiones.
7. Nada de esto se publica sin autorización expresa de Darwin.

---

## 8 · Recomendación

**GO técnico, con una condición.**

El cierre del pedido por WhatsApp queda resuelto: no se pierde el pedido, no se anuncia
nada sin prueba, y cuando la apertura no se puede confirmar hay una acción visible que
la persona pulsa, con el pedido completo y la protección contra reverse tabnabbing. Las
39 comprobaciones del flujo y las 12 de cada ancho móvil pasan sin fallos, y las
regresiones anteriores siguen en verde (151/151 y puerta de calidad en 0).

**Condición:** la prueba física pendiente del punto 6. Hecha esa pasada, la publicación
queda lista para que Darwin la autorice.

---

## 9 · Cierre

**PASS CON RESERVAS** — reserva única: **PRUEBA FÍSICA PENDIENTE**.
Sin merge, sin publicar, sin tocar `main` ni GitHub Pages, sin enviar pedidos reales.
