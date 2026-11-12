/* ═══════════════════════════════════════════════════════════════════════
   BROSTY PAPAS · assets/js/app.js
   KZ-BROSTY-001 · carrito y acciones de la Mini Web (JavaScript puro)

   QUÉ HACE
     1. Carrito: sumar, restar, eliminar y observaciones por línea.
     2. Persistencia en el navegador (localStorage). Si el navegador no deja
        guardar, funciona igual en memoria.
     3. Enviar el pedido: arma un mensaje ordenado y abre
        https://wa.me/573003201296
     4. Acciones rápidas: guardar contacto (.vcf) y compartir (Web Share API).

   REGLAS QUE RESPETA
     · PRECIOS: no se inventa ninguno. Cada línea viaja como «Consultar precio»
       y el total siempre dice «Por confirmar». El negocio confirmó el menú,
       no las cifras.
     · UBICACIÓN: no hay coordenadas inventadas; se pide por WhatsApp.
     · Nada se envía a ningún servidor: los datos solo salen si la persona
       pulsa «Enviar pedido» y confirma en WhatsApp.
     ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var WHATSAPP = '573003201296';
  var CLAVE = 'brosty-papas-pedido-v1';

  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

  /* ───────── estado ───────── */
  var pedido = { lineas: [], nombre: '', entrega: '' };

  function leer() {
    try {
      var bruto = window.localStorage.getItem(CLAVE);
      if (!bruto) return;
      var datos = JSON.parse(bruto);
      if (datos && Array.isArray(datos.lineas)) {
        pedido.lineas = datos.lineas.filter(function (l) {
          return l && typeof l.id === 'string' && typeof l.nombre === 'string' && l.cantidad > 0;
        }).map(function (l) {
          return {
            clave: String(l.clave || l.id),
            id: l.id,
            nombre: l.nombre,
            variante: typeof l.variante === 'string' ? l.variante : '',
            cantidad: Math.min(Math.max(parseInt(l.cantidad, 10) || 1, 1), 99),
            obs: typeof l.obs === 'string' ? l.obs.slice(0, 140) : ''
          };
        });
        pedido.nombre = typeof datos.nombre === 'string' ? datos.nombre.slice(0, 60) : '';
        pedido.entrega = typeof datos.entrega === 'string' ? datos.entrega.slice(0, 120) : '';
      }
    } catch (e) {
      /* modo privado o dato corrupto: se empieza vacío, sin ruido */
    }
  }

  function guardar() {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(pedido));
    } catch (e) {
      /* si no se puede guardar, el pedido sigue vivo en esta sesión */
    }
  }

  function esc(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function unidades() {
    return pedido.lineas.reduce(function (total, l) { return total + l.cantidad; }, 0);
  }

  /* ───────── referencias del DOM ───────── */
  var carrito = $('#carrito');
  var velo = $('#velo');
  var botonAbrir = $('#abrir-carrito');
  var botonCerrar = $('#cerrar-carrito');
  var barraVer = $('#barra-ver');
  var barra = $('#barra-pedido');
  var barraResumen = $('#barra-resumen');
  var cuentaCabecera = $('#cuenta-cabecera');
  var contenedorLineas = $('#carrito-lineas');
  var vacio = $('#carrito-vacio');
  var datos = $('#carrito-datos');
  var campoNombre = $('#f-nombre');
  var campoEntrega = $('#f-entrega');
  var botonEnviar = $('#enviar-pedido');
  var toast = $('#toast');

  /* ───────── aviso flotante ───────── */
  var temporizadorToast = null;
  function avisar(mensaje) {
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.add('visible');
    window.clearTimeout(temporizadorToast);
    temporizadorToast = window.setTimeout(function () { toast.classList.remove('visible'); }, 2400);
  }

  /* ───────── carrito: abrir y cerrar ───────── */
  var ultimoFoco = null;

  function abierto() {
    return carrito && carrito.classList.contains('abierto');
  }

  function abrirCarrito() {
    if (!carrito) return;
    ultimoFoco = document.activeElement;
    carrito.classList.add('abierto');
    if (velo) { velo.classList.add('abierto'); velo.removeAttribute('tabindex'); }
    carrito.setAttribute('aria-hidden', 'false');
    if (botonAbrir) botonAbrir.setAttribute('aria-expanded', 'true');
    if (botonCerrar) botonCerrar.focus();
    document.body.style.overflow = 'hidden';
  }

  function cerrarCarrito() {
    if (!carrito) return;
    carrito.classList.remove('abierto');
    if (velo) { velo.classList.remove('abierto'); velo.setAttribute('tabindex', '-1'); }
    carrito.setAttribute('aria-hidden', 'true');
    if (botonAbrir) botonAbrir.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (ultimoFoco && typeof ultimoFoco.focus === 'function') {
      try { ultimoFoco.focus({ preventScroll: true }); } catch (e) { ultimoFoco.focus(); }
    }
  }

  if (botonAbrir) botonAbrir.addEventListener('click', abrirCarrito);
  if (barraVer) barraVer.addEventListener('click', abrirCarrito);
  if (botonCerrar) botonCerrar.addEventListener('click', cerrarCarrito);
  if (velo) velo.addEventListener('click', cerrarCarrito);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && abierto()) cerrarCarrito();
  });

  /* ───────── carrito: operaciones ───────── */
  function buscar(clave) {
    for (var i = 0; i < pedido.lineas.length; i++) {
      if (pedido.lineas[i].clave === clave) return pedido.lineas[i];
    }
    return null;
  }

  function sumar(id, nombre, variante) {
    var clave = id + '|' + (variante || '');
    var linea = buscar(clave);
    if (linea) {
      linea.cantidad = Math.min(linea.cantidad + 1, 99);
    } else {
      pedido.lineas.push({ clave: clave, id: id, nombre: nombre, variante: variante || '', cantidad: 1, obs: '' });
    }
    guardar();
    pintar();
  }

  function restar(clave) {
    var linea = buscar(clave);
    if (!linea) return;
    linea.cantidad -= 1;
    if (linea.cantidad <= 0) eliminar(clave);
    else { guardar(); pintar(); }
  }

  function eliminar(clave) {
    pedido.lineas = pedido.lineas.filter(function (l) { return l.clave !== clave; });
    guardar();
    pintar();
  }

  /* ───────── tarjetas del menú ───────── */
  var tarjetas = $$('.platillo');

  function varianteElegida(tarjeta) {
    var boton = $('.variante[aria-pressed="true"]', tarjeta);
    return boton ? boton.getAttribute('data-variante') : '';
  }

  function accionDe(tarjeta) {
    var celda = $('.platillo__accion', tarjeta);
    if (!celda) return null;
    var agregar = $('.agregar', celda);
    var stepper = $('.stepper', celda);
    if (!stepper) {
      stepper = document.createElement('span');
      stepper.className = 'stepper';
      stepper.hidden = true;
      stepper.innerHTML =
        '<button type="button" data-accion="restar" aria-label="Quitar uno">−</button>' +
        '<span aria-live="polite">0</span>' +
        '<button type="button" data-accion="sumar" aria-label="Añadir otro">+</button>';
      celda.appendChild(stepper);
    }
    return { agregar: agregar, stepper: stepper, celda: celda };
  }

  function pintarTarjetas() {
    tarjetas.forEach(function (tarjeta) {
      var piezas = accionDe(tarjeta);
      if (!piezas) return;
      var id = tarjeta.getAttribute('data-id');
      var variante = varianteElegida(tarjeta);
      var linea = buscar(id + '|' + variante);
      var cantidad = linea ? linea.cantidad : 0;

      if (piezas.agregar) {
        piezas.agregar.hidden = cantidad > 0;
        piezas.agregar.textContent = cantidad > 0 ? 'Añadido' : '+ Añadir';
      }
      piezas.stepper.hidden = cantidad === 0;
      var numero = $('span', piezas.stepper);
      if (numero) numero.textContent = String(cantidad);
      var nombre = tarjeta.getAttribute('data-nombre') + (variante ? ' (' + variante + ')' : '');
      var restarBtn = $('[data-accion="restar"]', piezas.stepper);
      var sumarBtn = $('[data-accion="sumar"]', piezas.stepper);
      if (restarBtn) restarBtn.setAttribute('aria-label', 'Quitar uno de ' + nombre);
      if (sumarBtn) sumarBtn.setAttribute('aria-label', 'Añadir otro ' + nombre);
    });
  }

  tarjetas.forEach(function (tarjeta) {
    var id = tarjeta.getAttribute('data-id');
    var nombre = tarjeta.getAttribute('data-nombre');

    var agregarBtn = $('.agregar', tarjeta);
    if (agregarBtn) {
      agregarBtn.addEventListener('click', function () {
        var variante = varianteElegida(tarjeta);
        sumar(id, nombre, variante);
        avisar('Añadido: ' + nombre + (variante ? ' (' + variante + ')' : ''));
      });
    }

    $$('.variante', tarjeta).forEach(function (boton) {
      boton.addEventListener('click', function () {
        $$('.variante', tarjeta).forEach(function (otro) {
          otro.setAttribute('aria-pressed', String(otro === boton));
        });
        pintarTarjetas();
      });
    });

    var celda = $('.platillo__accion', tarjeta);
    if (celda) {
      celda.addEventListener('click', function (e) {
        var boton = e.target.closest ? e.target.closest('[data-accion]') : null;
        if (!boton || !celda.contains(boton)) return;
        var clave = id + '|' + varianteElegida(tarjeta);
        if (boton.getAttribute('data-accion') === 'sumar') {
          sumar(id, nombre, varianteElegida(tarjeta));
        } else {
          restar(clave);
        }
      });
    }
  });

  /* ───────── pintar el carrito ───────── */
  function textoTotal() {
    return 'Por confirmar';
  }

  function pintar() {
    var n = unidades();

    if (cuentaCabecera) cuentaCabecera.textContent = String(n);
    if (barraResumen) barraResumen.textContent = n === 1 ? '1 producto' : n + ' productos';
    if (barra) barra.classList.toggle('visible', n > 0);
    if (botonEnviar) botonEnviar.disabled = n === 0;
    if (vacio) vacio.hidden = n > 0;
    if (datos) datos.hidden = n === 0;

    if (contenedorLineas) {
      contenedorLineas.innerHTML = pedido.lineas.map(function (l) {
        var nombre = esc(l.nombre) + (l.variante ? ' · ' + esc(l.variante) : '');
        return '' +
          '<div class="linea" data-clave="' + esc(l.clave) + '">' +
            '<div>' +
              '<p class="linea__nombre">' + l.cantidad + '× ' + esc(l.nombre) + '</p>' +
              (l.variante ? '<p class="linea__variante">' + esc(l.variante) + '</p>' : '') +
              '<span class="stepper" style="margin-top:.45rem">' +
                '<button type="button" data-accion="restar" aria-label="Quitar uno de ' + nombre + '">−</button>' +
                '<span>' + l.cantidad + '</span>' +
                '<button type="button" data-accion="sumar" aria-label="Añadir otro ' + nombre + '">+</button>' +
              '</span>' +
            '</div>' +
            '<button class="linea__quitar" type="button" data-accion="eliminar" aria-label="Eliminar ' + nombre + ' del pedido">' +
              '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-papelera"/></svg>' +
            '</button>' +
            '<input class="linea__obs" type="text" maxlength="140" value="' + esc(l.obs) + '" ' +
              'placeholder="Observaciones: sin salsa, bien asado…" aria-label="Observaciones para ' + nombre + '">' +
          '</div>';
      }).join('');
    }

    var etiqueta = $('#carrito-total');
    if (etiqueta) etiqueta.textContent = n === 0 ? 'Por confirmar' : textoTotal();

    if (campoNombre && campoNombre.value !== pedido.nombre) campoNombre.value = pedido.nombre;
    if (campoEntrega && campoEntrega.value !== pedido.entrega) campoEntrega.value = pedido.entrega;

    pintarTarjetas();
  }

  /* ───────── eventos del carrito ───────── */
  if (contenedorLineas) {
    contenedorLineas.addEventListener('click', function (e) {
      var boton = e.target.closest ? e.target.closest('[data-accion]') : null;
      if (!boton) return;
      var fila = boton.closest('.linea');
      if (!fila) return;
      var clave = fila.getAttribute('data-clave');
      var accion = boton.getAttribute('data-accion');
      if (accion === 'sumar') {
        var linea = buscar(clave);
        if (linea) sumar(linea.id, linea.nombre, linea.variante);
      } else if (accion === 'restar') {
        restar(clave);
      } else if (accion === 'eliminar') {
        eliminar(clave);
        avisar('Producto eliminado del pedido');
      }
    });

    contenedorLineas.addEventListener('input', function (e) {
      var campo = e.target;
      if (!campo || !campo.classList || !campo.classList.contains('linea__obs')) return;
      var fila = campo.closest('.linea');
      if (!fila) return;
      var linea = buscar(fila.getAttribute('data-clave'));
      if (linea) {
        linea.obs = campo.value.slice(0, 140);
        guardar();
      }
    });
  }

  if (campoNombre) {
    campoNombre.addEventListener('input', function () {
      pedido.nombre = campoNombre.value.slice(0, 60);
      guardar();
    });
  }
  if (campoEntrega) {
    campoEntrega.addEventListener('input', function () {
      pedido.entrega = campoEntrega.value.slice(0, 120);
      guardar();
    });
  }

  /* ───────── mensaje y envío por WhatsApp ───────── */
  function armarMensaje() {
    var lineas = ['Hola BROSTY PAPAS, quiero hacer este pedido:'];
    pedido.lineas.forEach(function (l) {
      var detalle = l.nombre + (l.variante ? ' (' + l.variante + ')' : '');
      lineas.push('• ' + l.cantidad + '× ' + detalle + ' — Consultar precio');
      if (l.obs.trim()) lineas.push('   Obs: ' + l.obs.trim());
    });
    lineas.push('');
    lineas.push('Total: por confirmar por aquí');
    if (pedido.nombre.trim()) lineas.push('Nombre: ' + pedido.nombre.trim());
    if (pedido.entrega.trim()) lineas.push('Entrega: ' + pedido.entrega.trim());
    else lineas.push('Entrega: (te confirmo la dirección por aquí)');
    lineas.push('');
    lineas.push('¿Me confirman precios y domicilio, por favor?');
    return lineas.join('\n');
  }

  function enviar() {
    if (unidades() === 0) return;
    var texto = armarMensaje();
    var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
    var ventana = null;
    try { ventana = window.open(url, '_blank', 'noopener'); } catch (e) { ventana = null; }
    if (ventana) {
      /* Se cierra el panel para que la persona vea la página y el aviso, en vez
         de quedarse con el carrito tapando la pantalla. */
      cerrarCarrito();
      avisar('Se abrió WhatsApp con tu pedido. Envíalo para que lo reciban.');
    } else {
      avisar('El navegador bloqueó la ventana: abre WhatsApp desde el botón flotante.');
    }
    return { texto: texto, url: url, abierto: !!ventana };
  }

  if (botonEnviar) botonEnviar.addEventListener('click', enviar);

  var vaciarBtn = $('#vaciar-pedido');
  if (vaciarBtn) {
    vaciarBtn.addEventListener('click', function () {
      if (!pedido.lineas.length) { avisar('El pedido ya está vacío'); return; }
      pedido.lineas = [];
      guardar();
      pintar();
      avisar('Pedido vaciado');
    });
  }

  /* Expuesto para las pruebas automáticas (no lo usa la página). */
  window.BROSTY = {
    pedido: pedido,
    armarMensaje: armarMensaje,
    enviar: enviar,
    sumar: sumar,
    restar: restar,
    eliminar: eliminar,
    abrir: abrirCarrito,
    cerrar: cerrarCarrito,
    guardar: guardar,
    pintar: pintar,
    clave: CLAVE,
    whatsapp: WHATSAPP
  };

  /* ───────── acciones rápidas: contacto y compartir ───────── */
  var guardarBtn = $('#guardar-contacto');
  if (guardarBtn) {
    guardarBtn.addEventListener('click', function () {
      var vcf = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN:BROSTY PAPAS - Pollo Broaster y Asado',
        'ORG:BROSTY PAPAS',
        'TEL;TYPE=CELL:+' + WHATSAPP,
        'NOTE:Pollo broaster y asado, combos y comidas rapidas. Ubicacion: Barrio Nueva Jerusalen (se confirma por WhatsApp).',
        'END:VCARD'
      ].join('\r\n');
      try {
        var blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
        var enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = 'brosty-papas.vcf';
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(function () { URL.revokeObjectURL(enlace.href); }, 4000);
        avisar('Descargaste brosty-papas.vcf: ábrelo y tendrás el contacto guardado.');
      } catch (e) {
        avisar('Tu navegador no permitió descargar el contacto.');
      }
    });
  }

  var compartirBtn = $('#compartir');
  if (compartirBtn) {
    compartirBtn.addEventListener('click', function () {
      var url = window.location.href.split('#')[0];
      if (navigator.share) {
        navigator.share({ title: 'BROSTY PAPAS', text: '¡El sabor que provoca repetir! Pollo broaster y asado.', url: url })
          .then(function () { avisar('Gracias por compartir.'); })
          .catch(function () { /* cancelado: sin ruido */ });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          avisar('Enlace copiado. Pégalo donde quieras compartirlo.');
        }, function () {
          avisar('No se pudo copiar. El enlace es: ' + url);
        });
      } else {
        avisar('El enlace es: ' + url);
      }
    });
  }

  /* ───────── chips de categoría: marcar el que se está viendo ───────── */
  /* Los chips son NAVEGACIÓN POR ANCLAS, no filtros. El chip activo se calcula
     por posición: es el de la última categoría que ya pasó por debajo de las
     barras fijas. Antes se usaba una banda de intersección de apenas 5 % de la
     pantalla, y en las categorías cortas marcaba la categoría siguiente (al
     pulsar «Pollo asado» se marcaba «Comidas rápidas»), además de dejar
     «Combos» marcado cuando se estaba en la portada. */
  var chips = $$('.chip');
  var secciones = $$('.categoria');

  /* Alto que ocupan las barras fijas cuando están pegadas arriba. Se usan las
     ALTURAS, no la posición actual: en la portada los chips todavía no están
     pegados y su borde inferior puede estar cientos de píxeles más abajo, con
     lo que todo contaría como «ya pasado» y se marcaría «Combos» sin estarlo. */
  function limiteDeBarras() {
    var cabecera = $('.cabecera');
    var fila = $('.chips');
    return (cabecera ? cabecera.offsetHeight : 0) + (fila ? fila.offsetHeight : 0);
  }

  function marcarChip() {
    if (!chips.length || !secciones.length) return;
    /* Un poco de holgura: al pulsar un chip, `scroll-margin-top` deja el título
       unos 10 px por debajo de las barras. Sin esa holgura la categoría recién
       abierta quedaba «por debajo» del límite y se marcaba la anterior. */
    var limite = limiteDeBarras() + 24;
    var activa = '';
    secciones.forEach(function (seccion) {
      if (seccion.getBoundingClientRect().top <= limite) activa = seccion.getAttribute('id');
    });
    var fila = $('.chips');
    chips.forEach(function (chip) {
      var esActivo = chip.getAttribute('href') === '#' + activa;
      chip.setAttribute('aria-current', String(esActivo));
      /* En móvil la fila de chips se desplaza en horizontal: el activo debe
         quedar a la vista. Se mueve solo la fila, nunca la página. */
      if (esActivo && fila && fila.scrollWidth > fila.clientWidth) {
        var destino = chip.offsetLeft - (fila.clientWidth - chip.offsetWidth) / 2;
        fila.scrollLeft = Math.max(0, destino);
      }
    });
  }

  if (chips.length) {
    var turnoPendiente = false;
    var alDesplazar = function () {
      if (turnoPendiente) return;
      turnoPendiente = true;
      window.requestAnimationFrame(function () { turnoPendiente = false; marcarChip(); });
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    window.addEventListener('resize', alDesplazar);
    marcarChip();
  }

  /* Al volver a la página, la tarjeta debe recordar qué variante se pidió.
     Sin esto, un pedido con «Patacón (Mixto)» reaparecía con «Pollo» marcado y
     el contador a 0, aunque el carrito sí tuviera la línea guardada. */
  function sincronizarVariantes() {
    tarjetas.forEach(function (tarjeta) {
      var id = tarjeta.getAttribute('data-id');
      var guardadas = pedido.lineas.filter(function (l) { return l.id === id; });
      if (!guardadas.length) return;
      var elegida = varianteElegida(tarjeta);
      var yaEsta = guardadas.some(function (l) { return l.variante === elegida; });
      if (yaEsta) return;
      var mejor = guardadas.slice().sort(function (a, b) { return b.cantidad - a.cantidad; })[0];
      $$('.variante', tarjeta).forEach(function (boton) {
        boton.setAttribute('aria-pressed', String(boton.getAttribute('data-variante') === mejor.variante));
      });
    });
  }

  /* ───────── arranque ───────── */
  leer();
  sincronizarVariantes();
  pintar();
})();
