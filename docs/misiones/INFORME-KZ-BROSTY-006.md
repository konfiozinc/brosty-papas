# INFORME KZ-BROSTY-006 — AJUSTE VISUAL FINAL DEL BOTÓN «VER MENÚ»

**Cliente:** BROSTY PAPAS · **Agencia:** KONFÍO ZINC
**Ejecutor:** Harness · **Director:** Darwin Montalvo
**Fecha:** 12-nov-2026
**Rama:** `fix/kz-brosty-004` · **Base:** `db1da13` · **`main`:** `584d6a6` (sin tocar)

**Veredicto: PASS CON RESERVAS.** El cambio pedido está aplicado y medido; las reservas
están al final.

---

## 1 · El defecto, medido

El director lo describió como «color visualmente inadecuado». Al medirlo resultó ser algo
más concreto: **el botón se desvanecía en el fondo de la portada**, porque era rojo sobre
un hero rojo.

Se leyeron los píxeles del recorte real (relleno del botón frente al fondo del hero que
tiene al lado) y se calculó el contraste WCAG:

| Ancho | Relleno | Fondo detrás | Contraste botón/fondo |
|---|---|---|---|
| 360 px | `#C91F32` | `#911222` | **1,61:1** |
| 390 px | `#C91F32` | `#931223` | **1,58:1** |
| 430 px | `#C91F32` | `#971324` | **1,53:1** |

El mínimo para que el borde de un componente se distinga de lo que tiene detrás es
**3:1** (WCAG 1.4.11). Estaba en la mitad. El texto de dentro sí cumplía (5,33:1): el
problema no era leerlo, era **ver el botón**.

---

## 2 · Lo que se cambió

Una sola cosa, y solo en ese botón:

| | Antes | Ahora |
|---|---|---|
| Clase | `btn--rojo` | **`btn--menu`** (nueva) |
| Fondo | `#C91F32` (rojo) | **`#FFC928`** (amarillo corporativo) |
| Texto | `#FFF8E9` (crema) | **`#242424`** (oscuro) |
| Borde | ninguno (transparente) | **2 px `#242424`** |
| Sombra | halo rojo de 28 px | **ninguna** |
| Texto del botón | «Ver menú» | «Ver menú» (igual) |
| Destino | `#menu` | `#menu` (igual) |

### Resultado medido

| Ancho | Relleno | Fondo detrás | Contraste botón/fondo | Texto/relleno |
|---|---|---|---|---|
| 360 px | `#FFC928` | `#8F1222` | **5,99:1** (antes 1,61) | **10,08:1** |
| 390 px | `#FFC928` | `#911323` | **5,87:1** (antes 1,58) | **10,08:1** |
| 430 px | `#FFC928` | `#961424` | **5,63:1** (antes 1,53) | **10,08:1** |

De **1,5:1 a 5,9:1**: el botón ahora se ve. El texto oscuro sobre el amarillo da 10,08:1,
el doble del mínimo.

### Cómo se mantuvo «Pedir por WhatsApp» como acción principal

El primario **no se tocó**: sigue en amarillo, con su halo de 28 px y con el icono de
WhatsApp, y sigue siendo el primero. El secundario es amarillo pero **plano**: sin halo y
con filo oscuro. Medido en los recortes, el primario y «Ver menú» difieren en un
**16–18 % de los píxeles** (diferencia media por píxel 52–58 de 765), que es el filo, el
halo y el icono.

> **Aquí está la reserva.** Las instrucciones 4 y 5 tiran en direcciones opuestas: la 4
> pide fondo amarillo `#FFC928` (el mismo del primario) y la 5 pide diferenciar «Ver
> menú». Con el mismo relleno, la jerarquía solo puede apoyarse en el filo, la ausencia
> de halo, el icono y el orden. Se hizo así porque la instrucción del color es explícita.
> **Si se prefiere una jerarquía más rotunda**, el cambio limpio es dejar «Ver menú» en
> amarillo *hueco* (fondo transparente, borde y texto amarillos): una línea de CSS. No se
> hizo sin preguntar porque contradice el «fondo amarillo» que se pidió.

---

## 3 · Estados comprobados (360, 390 y 430 px)

| Estado | Resultado |
|---|---|
| **Normal** | fondo `#FFC928` · texto `#242424` · borde 2 px `#242424` · sin sombra |
| **Hover** | fondo `#FFD84F` · sombra suave amarilla · sube 2 px |
| **Foco de teclado** | se llega **tabulando** · `:focus-visible` activo · anillo **3 px crema `#FFF8E9`** con 2 px de separación |
| **Activo** | fondo `#F2BC18` · vuelve a su sitio (sin desplazamiento) |

Sobre el foco: el anillo por omisión del sitio es **rojo**, y aquí habría quedado sobre el
hero rojo. Para este botón se pinta en **crema**, que sí se separa del fondo. Los otros
dos botones conservan el anillo rojo que ya tenían; **no se han tocado**.

---

## 4 · Que no se moviera nada más

Comparación de estilos calculados antes/después, botón por botón, en los tres anchos:

| Botón | Cambios |
|---|---|
| Pedir por WhatsApp | **ninguno** (fondo, color, borde, sombra y medidas idénticos) |
| **Ver menú** | fondo, color, borde y sombra (lo previsto) |
| Cómo llegar | **ninguno** |

Las medidas (ancho y alto) de los tres siguen siendo idénticas, así que la rejilla de la
portada no se movió. Desbordamiento horizontal: **0** en los tres anchos. Errores de
consola: **0**.

La clase `btn--rojo` sigue existiendo en el CSS (ya no la usa ningún botón del HTML);
se dejó por si otra parte la necesita.

---

## 5 · Pruebas

| Prueba | Resultado |
|---|---|
| `herramientas/revisar-006.mjs` — estilos, estados y capturas en 360/390/430 | OK en los 3 anchos |
| `herramientas/analizar-006.py` — contraste real leído de los píxeles | 5,63–5,99:1 (antes 1,53–1,61) |
| `herramientas/comparar-006.py` — aislamiento del cambio y estados | solo cambió «Ver menú» |
| `herramientas/auditar-004.mjs` — regresión completa (8 anchos, contraste, botones, carrito, teclado, enlaces) | **151 / 151 · 0 fallos** |
| Puerta de calidad de la agencia (`verificar-calidad-html.js`) | **OK · exit 0** · 1/1 páginas, consola sin errores |

No se ejecutó la batería del envío a WhatsApp (`probar-envio-004.mjs`): no toca este
botón y no tiene relación con el cambio.

---

## 6 · Capturas

En `docs/misiones/capturas-kz-brosty-006/`:

| Archivo | Qué muestra |
|---|---|
| `006-comparacion-390-botones.png` | **los tres botones, ANTES y DESPUÉS, lado a lado** |
| `006-comparacion-390-portada.png` | la portada completa, ANTES y DESPUÉS |
| `006-antes-390-botones.png` / `006-despues-390-botones.png` | los tres botones por separado |
| `006-despues-360-botones.png` / `006-despues-430-botones.png` | el resultado en los otros dos anchos |
| `006-despues-390-foco.png` | el anillo de foco de teclado |

El juego completo (36 imágenes: los tres anchos × cuatro estados, más las portadas) está
en el equipo, fuera del repositorio: `evidencias/KZ-BROSTY-006/`.

---

## 7 · Archivos modificados

```
assets/css/estilos.css   · nueva variante .btn--menu (amarillo plano con filo oscuro),
                           sus estados y el anillo de foco en crema
index.html               · el botón «Ver menú» pasa de btn--rojo a btn--menu
herramientas/revisar-006.mjs    · NUEVO · medidas y capturas de los tres botones
herramientas/analizar-006.py    · NUEVO · contraste real leído de los píxeles
herramientas/comparar-006.py    · NUEVO · aislamiento del cambio y estados
docs/misiones/INFORME-KZ-BROSTY-006.md              · NUEVO
docs/misiones/capturas-kz-brosty-006/*.png (9)      · NUEVO
```

Intactos: los 22 SVG, el sprite de iconos, `app.js`, las tarjetas, el carrito, los textos
y los precios. **No hay ningún cambio comercial.**

---

## 8 · Estado Git

| | |
|---|---|
| Rama | `fix/kz-brosty-004` |
| `main` | `584d6a6` (intacto) |
| Merge a `main` | **no** |
| GitHub Pages | **no se tocó** |
| Publicación | **ninguna** |

---

## 9 · Vista previa local

Se actualizó **de forma segura**:

1. La versión anterior se copió a `evidencias/KZ-BROSTY-005/vista-previa-anterior-004b/`
   (33 archivos, comprobado que contiene la versión con `btn--rojo`).
2. Solo se sustituyeron `index.html` y `assets/css/estilos.css`; el resto (22 iconos,
   `app.js`, logotipo, faviconos) sigue intacto y coincide con la rama.
3. El servidor **no se reinició**: lee los archivos en cada petición.

Comprobado que ya sirve la versión nueva: `http://192.168.1.15:8160/index.html` responde
200, contiene `btn--menu` y **ya no** contiene `btn--rojo`; el CSS servido incluye la
regla nueva.

El servidor sigue activo en **`http://192.168.1.15:8160/`**. Se detendrá cuando Darwin lo
indique, y entonces se borrará la carpeta de vista previa.

---

## 10 · Prueba física

- **Android: el director hizo 8 verificaciones, 8/8 aprobadas.** El registro del servidor
  de vista previa lo respalda: hay tres peticiones con `User-Agent` de **Android**
  (`Linux; Android 10; K · Chrome 157`) desde **192.168.1.3**, es decir, desde un teléfono
  real, no desde este equipo.

  > Nota honesta: en ese registro aparecen la página, la hoja de estilos y el logotipo,
  > pero **no** una petición de `app.js`, que debería haberse pedido también. No tengo
  > explicación para esa ausencia y **no la voy a inventar**. El resultado 8/8 es el
  > informe del director; el registro solo confirma que un Android real abrió la vista
  > previa.

- **iPhone: PENDIENTE.** No hay aparato disponible; sigue sin probarse.
- **Este cambio de color no se ha visto en un teléfono físico.** Lo verificado aquí es
  emulación de Chromium a 360, 390 y 430 px. **No se presenta como prueba física.**

---

## 11 · Riesgos y pendientes

1. **Jerarquía primario/secundario.** Los dos botones comparten relleno amarillo, como se
   pidió. La diferencia está en el filo, el halo y el icono. Si a Darwin no le basta, la
   alternativa está descrita en el punto 2.
2. **El cambio no está re-verificado en el Android físico.** Es una emulación; una mirada
   rápida en el teléfono cierra el círculo.
3. **iPhone sin probar**, ni antes ni ahora.
4. **Los otros dos botones de la portada siguen con anillo de foco rojo sobre el hero
   rojo**, que se ve poco. Es un problema anterior a esta misión y no se tocó para no
   cambiar botones fuera de alcance; queda anotado.
5. Nada publicado. La autorización de publicación es de Darwin.

---

## 12 · Cierre

**PASS CON RESERVAS.**

El botón pasó de perderse en el fondo (1,5:1) a verse con claridad (5,9:1), con el
amarillo y el texto oscuro que se pidieron, sin tocar nada más y sin romper ninguna
prueba. Las reservas son dos: la jerarquía con el primario (decisión de Darwin) y que el
cambio está medido en emulación, no en un teléfono.
