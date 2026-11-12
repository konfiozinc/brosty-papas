# CIERRE Y AUTORIZACIÓN DE PUBLICACIÓN — KZ-BROSTY-RELEASE-001

**Fecha:** 2026-11-12  
**Agencia:** KONFÍO ZINC  
**Proyecto:** Brosty Papas  
**Rama de preparación:** `fix/kz-brosty-004`  
**Base anterior de main:** `584d6a6535ecb9e827401f6e2a836bef79759e32`  
**Versión visual y funcional aprobada:** `9d8ad0f52b82ea066cd60fad2ec317cf408a39c2`

## Autorización de dirección

El director autorizó expresamente en la conversación del 12 de noviembre de 2026: «Ya esta correcto, cerremos ya, no más misiones, cierra todo guardar, documenta y publica ya...». La captura Android entregada muestra el botón «VER MENÚ» amarillo, legible y diferenciado del fondo.

## Evidencia previa

- 8/8 verificaciones iniciales de uso de Android físico: aprobadas, según director.
- 6/6 verificaciones adicionales de interacción de Android físico: aprobadas, según director.
- Carrito, cantidades, variantes, persistencia y preparación de pedido para `+57 300 320 1296`: confirmados por director, sin enviar pedidos reales.
- KZ-BROSTY-006: 151/151 regresiones Chromium, contraste del nuevo botón 5.63 a 5.99:1 según informe Harness.
- KZ-QUALITY GATE 0.2.0: 9/9 clases históricas, 23/23 pruebas, 45/45 aserciones en piloto aislado, según informe Codex.

## Alcance

Publicar el trabajo preparado de KZ-BROSTY-004/004-A/004-B/006 desde `fix/kz-brosty-004` mediante avance sin reescritura de `main`. Conservar los archivos de evidencia y la rama de preparación; no eliminar respaldos ni ramas.

## Reservas explícitas y no ocultadas

1. KZ-BROSTY-007, superposición **transitoria** entre aviso y enlace manual alternativo WhatsApp en móvil: no consta reparación ni prueba física específica.
2. iPhone físico: no probado.
3. Precios: no aprobados; el sitio mantiene «Consultar precio» y «Por confirmar», sin inventar cifras ni anunciar precios definitivos. Otros datos comerciales deberán revisarse con el negocio cuando estén disponibles.
4. Registro del servidor de vista previa Android: las peticiones observadas no incluyen `app.js`; las pruebas funcionales son declaraciones directas del director, no evidencia de ese archivo en el log.
5. KZ-QUALITY GATE permanece herramienta de apoyo, no certificación absoluta.

## Punto de recuperación

El commit de producción anterior es `584d6a6535ecb9e827401f6e2a836bef79759e32`. Si aparece una regresión grave, evaluar reversión controlada con permiso del director, sin `force push` ni perder historial.

## Condición posterior a la publicación

Comprobar que la referencia `main` se actualizó; intentar comprobar que GitHub Pages sirve la versión nueva. No dar por verificada la propagación sin comprobar el HTML público. Ningún pedido real se debe enviar desde pruebas.

**Estado del documento:** autorización y evidencia de prepublicación. El resultado real del avance de `main` y de la web debe verificarse por separado.
