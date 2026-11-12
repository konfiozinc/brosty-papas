# INFORME KZ-BROSTY-004-A — CORRECCIÓN DEL ENVÍO A WHATSAPP

**Cliente:** BROSTY PAPAS · **Agencia:** KONFÍO ZINC
**Ejecutor:** Harness · **Supervisor técnico:** ChatGPT · **Director:** Darwin Montalvo
**Fecha:** 11-nov-2026
**Rama:** `fix/kz-brosty-004` (sin merge a `main`, sin publicar)
**Base:** informe y cambios de KZ-BROSTY-004, intactos.

**Veredicto: PASS.** El hallazgo de ChatGPT se reprodujo, se corrigió y queda cubierto
por una prueba que falla con el código anterior.

---

## 1 · El hallazgo

ChatGPT avisó de que `window.open(url, '_blank', 'noopener')` puede devolver `null`
aunque WhatsApp se haya abierto, y que el código lo interpretaba como bloqueo.

**Es exactamente así, y la reproducción lo confirma.** `noopener` hace que el
navegador cree la ventana en otro contexto y **no entregue la referencia**, así que el
valor devuelto es `null` siempre. Medido en Chromium, con el código anterior:

| Comprobación | Resultado con el código anterior |
|---|---|
| Pulsar «Enviar pedido» abre una pestaña | **SÍ** (pestaña real, medida) |
| La pestaña va al WhatsApp oficial con el mensaje | **SÍ** |
| La pestaña pierde `window.opener` | **SÍ** (`null`) |
| El carrito se cierra | **NO — se queda abierto** |
| El aviso no acusa un bloqueo inexistente | **NO** — decía «El navegador bloqueó la ventana: abre WhatsApp desde el botón flotante.» |

O sea: se abría WhatsApp **y** se le decía a la persona que el navegador lo había
bloqueado, con el pedido tapando la pantalla. Un aviso falso sobre una acción que sí
había funcionado.

### Por qué la auditoría anterior no lo detectó

`herramientas/auditar-004.mjs` sustituía `window.open` por una función de mentira que
devolvía un objeto, precisamente para capturar la URL. Ese apaño devolvía un valor
«verdadero», así que la rama del error nunca se ejecutaba. **El fallo estaba en la
prueba, no solo en el código.** Se deja anotado en el propio archivo para que no vuelva
a pasar.

Además se descubrió un segundo hueco, en el mismo sitio: si el navegador bloqueaba de
verdad, **no había ningún camino alternativo** — solo un aviso que mandaba a la persona
a buscar el botón flotante.

---

## 2 · La corrección

Una sola función nueva, `abrirWhatsApp()`, y `enviar()` reducida a armarla:

1. **Se abre sin la marca `noopener`** para que el valor devuelto vuelva a significar
   algo: ventana creada, o `null` = bloqueo real.
2. **La protección se mantiene**, pero a mano: `ventana.opener = null` en el acto,
   antes de que la página de destino pueda ejecutar una línea. Es la misma protección
   que da `noopener`, y se comprueba en la prueba midiendo `window.opener` desde la
   pestaña abierta.
3. **Si el `null` es real**, se pulsa un enlace de verdad (`<a target="_blank"
   rel="noopener noreferrer">`). Los enlaces no pasan por el bloqueador de ventanas,
   así que la persona llega a WhatsApp igual. Ese camino sí usa `noopener` y
   `noreferrer` de serie.
4. **Si tampoco se puede**, el pedido **no se toca** y el aviso dice la verdad.

Mensajes, ahora coherentes con lo que pasa:

| Situación | Aviso | Carrito |
|---|---|---|
| La pestaña se abre | «Abrimos WhatsApp con tu pedido. Pulsa enviar para que lo reciban.» | se cierra |
| Bloqueo real, el enlace funciona | «Abrimos WhatsApp con tu pedido. Si no la ves, usa el botón verde de WhatsApp.» | se cierra |
| No se puede abrir de ninguna forma | «No pudimos abrir WhatsApp automáticamente. Tu pedido sigue guardado: ábrelo desde el botón verde.» | se queda abierto, pedido intacto |

Ningún mensaje vuelve a decir «bloqueó» cuando la ventana sí se abrió.

---

## 3 · La prueba de regresión

Nuevo archivo: `herramientas/probar-envio-004.mjs`.

**No sustituye `window.open` en el caso principal.** Pulsa el botón y observa la
pestaña que abre el navegador de verdad (`context.waitForEvent('page')`). Las
peticiones a `wa.me` se interceptan y se responde con una página de prueba: **no se
contacta con WhatsApp y no se envía ningún pedido.**

### Resultado

| Código | Comprobaciones | Fallos |
|---|---|---|
| **Anterior (con el defecto)** | 14 / 17 | **3** |
| **Corregido** | **18 / 18** | **0** |

Los 3 fallos con el código anterior eran justo el hallazgo: el carrito seguía abierto,
el aviso acusaba un bloqueo inexistente y no había camino alternativo ante un bloqueo
real. La prueba se ejecutó **primero contra el código sin corregir** para demostrar que
sabe fallar.

### Qué comprueba ahora

1. Pulsar «Enviar pedido» abre una pestaña nueva **de verdad**.
2. La pestaña va a `https://wa.me/573003201296?text=…` y el texto coincide con el
   mensaje generado (251 caracteres en el pedido de prueba).
3. La pestaña **no tiene acceso a `window.opener`** (medido dentro de la pestaña: `null`).
4. El carrito se cierra al enviar.
5. El aviso no acusa un bloqueo inexistente.
6. El pedido no se pierde al enviar (2 líneas, 2 unidades).
7. Con `window.open` bloqueado (simulado) el camino alternativo abre WhatsApp igual.
8. Con el pedido vacío no se abre nada y `enviar()` no hace nada.
9. Sin errores de consola en ninguno de los casos.

### Suite afectada

`herramientas/auditar-004.mjs` (cubre el mensaje y el enlace de WhatsApp, por eso se
ejecuta): **151 / 151, 0 fallos.** No hay regresión.

---

## 4 · Revisión de datos sensibles en `docs/`

Herramienta: `herramientas/revisar-004-a.mjs`.

Archivos públicos versionados en `docs/`: 1 informe (16 KB) y 6 capturas PNG.

Buscado en el texto: rutas absolutas de Windows, rutas de usuario, correos, tokens de
GitHub, claves de Google/OpenAI, claves privadas, contraseñas y secuencias de 9 a 13
dígitos.

**Resultado: un solo hallazgo, y no es sensible.**

- `573003201296` — es el **WhatsApp comercial de BROSTY PAPAS**, ya público en el
  propio sitio (6 enlaces `wa.me` y el número escrito en el pie). No es un dato
  privado.
- Sin rutas `C:\…`, sin correos, sin credenciales, sin contraseñas.
- Las capturas no contienen datos de nadie: el carrito de las fotos se rellenó con
  **«Cliente de ejemplo» / «Domicilio en el barrio»**, que son textos de mentira
  creados para la captura. No hay pedidos reales, ni teléfonos, ni direcciones.

**Matiz que conviene tener claro:** excluir `docs/` de GitHub Pages **no** lo hace
privado en GitHub. El repositorio es público, así que el informe y las capturas se
pueden leer en GitHub aunque el sitio no los sirva. Lo que hay ahí son notas internas
de la agencia (riesgos, pendientes, proceso) **sin credenciales ni datos personales de
terceros**. Si Darwin prefiere que esas notas no estén en un repositorio público, hay
que moverlas al repositorio interno de la agencia; no se ha hecho porque la misión
anterior pedía el informe en la rama para que lo revisara ChatGPT.

---

## 5 · ¿`_config.yml` excluye `docs/` en el build real de Pages?

No se asumió: se comprobó.

| Evidencia | Resultado |
|---|---|
| `.nojekyll` en el repositorio | **no existe** → Jekyll construye el sitio, así que `_config.yml` se aplica |
| `.github/workflows/` | **no existe** → no hay una construcción propia que pueda ignorarlo |
| `_config.yml` de la rama | contiene `- docs` |
| Sitio publicado: `assets/css/estilos.css` | **HTTP 200** (el sitio sirve los recursos) |
| Sitio publicado: `herramientas/probar.mjs` | **HTTP 404** (la exclusión funciona de verdad) |
| Sitio publicado: `README.md` | **HTTP 404** |
| Sitio publicado: `_config.yml` | **HTTP 404** |
| Sitio publicado: `evidencias/` | **HTTP 404** |
| API `/repos/…/pages` | no accesible sin credenciales (HTTP 404): la conclusión se apoya en el sitio |

**Conclusión: VERIFICADA.** El mismo mecanismo de `exclude` que hoy devuelve 404 para
`herramientas/`, `README.md` y `evidencias/` es el que lleva `docs`, que está en la
misma lista. No se pudo pedir `docs/…` al sitio publicado porque esa carpeta todavía no
existe en `main` — es una limitación real de la comprobación, y se declara como tal.

**Advertencia para el futuro:** si alguien añade un archivo `.nojekyll` al repositorio,
Jekyll se desactiva y **todas** las exclusiones dejan de aplicarse: `docs/`,
`herramientas/` y `evidencias/` pasarían a ser públicos. No se ha añadido, y no
conviene añadirlo mientras se dependa de esta lista.

---

## 6 · Estado Git

- Rama: `fix/kz-brosty-004`. Sin merge a `main`, sin tocar `main`
  (`main` sigue en `584d6a6`), sin publicar en GitHub Pages.
- Se conservan íntegros todos los cambios de KZ-BROSTY-004 (SVG, diseño, tarjetas,
  chips, carrito, teclado, textos).

**Archivos modificados en esta misión**

```
assets/js/app.js                        · abrirWhatsApp() + pulsarEnlace(); enviar() delega
herramientas/probar-envio-004.mjs       · NUEVO · regresión del envío (pestaña real)
herramientas/revisar-004-a.mjs          · NUEVO · revisión de docs/ y del build de Pages
herramientas/auditar-004.mjs            · comentario: el stub de window.open esconde fallos
docs/misiones/INFORME-KZ-BROSTY-004-A.md · NUEVO · este informe
```

---

## 7 · Qué queda pendiente

1. **Nada publicado.** Publicar exige autorización expresa de Darwin.
2. **Pasada en dispositivos reales** (Android e iPhone). Lo medido es Chromium.
3. **Decisión de Darwin** sobre si las notas internas de `docs/` deben estar en un
   repositorio público (ver punto 4).
4. **No añadir `.nojekyll`** mientras la exclusión dependa de `_config.yml`.
5. El aviso de fallo total («No pudimos abrir WhatsApp…») es difícil de provocar en un
   navegador real; queda cubierto por código, no por una prueba en navegador.

---

## 8 · Cierre

**PASS.** El hallazgo está corregido: WhatsApp se abre de verdad, la pestaña no tiene
acceso a `window.opener`, el carrito se cierra, el aviso ya no miente, y si el navegador
bloquea hay un camino alternativo que funciona. La prueba de regresión falla con el
código anterior (3 fallos) y pasa con el corregido (18/18). Sin regresiones: 151/151 en
la suite afectada.
