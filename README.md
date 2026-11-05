# BROSTY PAPAS — Mini Web gastronómica

Tarjeta digital de **BROSTY PAPAS** (pollo broaster y asado, Barrio Nueva Jerusalén).
HTML5, CSS3 y JavaScript puro, sin frameworks.

## Qué incluye

- Portada con el logotipo, el eslogan y los accesos a WhatsApp, menú y ubicación.
- Menú digital de 15 platos en cuatro categorías (Combos, Pollo asado, Comidas rápidas, Bebidas).
- Carrito con cantidades, observaciones por producto y persistencia en el navegador.
- Envío del pedido por WhatsApp con un mensaje ya estructurado.
- Acciones rápidas: contacto `.vcf` y compartir.

## Precios y ubicación

Los precios y la cobertura de domicilio **no se publican**: se confirman por WhatsApp,
porque son datos que el negocio da en el momento. La ubicación exacta se comparte igual.

## Estructura

```
index.html                      la página
assets/css/estilos.css          diseño (paleta del volante)
assets/js/app.js                carrito y acciones
assets/img/marca/               logotipo e iconos
assets/img/og/                  imagen para compartir
herramientas/                   verificador de calidad y pruebas (no se publican)
```

## Verificación

```bash
node herramientas/verificar-calidad-html.js   # Definición de Terminado: 1/1 OK
node herramientas/probar.mjs                  # 40 comprobaciones funcionales
```

---

Sitio construido por **KONFÍO ZINC** · konfiozinc@gmail.com · WhatsApp +57 320 641 1340
