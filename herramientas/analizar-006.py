"""KZ-BROSTY-006 · mide el contraste real del botón «Ver menú» contra el fondo.

No basta con mirar la imagen: se leen los píxeles del recorte y se saca el color
medio del relleno del botón y del fondo del hero que tiene al lado, y con eso se
calcula el contraste WCAG. El umbral que importa para el borde de un componente
(que el botón se distinga de lo que hay detrás) es 3:1 (WCAG 1.4.11). Para el
texto dentro del botón, 4.5:1.

Uso: python analizar-006.py <carpeta> [etiquetas...]
"""
import json
import os
import sys

import cv2
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CARPETA = sys.argv[1] if len(sys.argv) > 1 else "."
ETIQUETAS = sys.argv[2:] or ["antes", "despues"]


def luminancia(bgr):
    """Luminancia relativa WCAG de un color BGR."""
    r, g, b = [c / 255.0 for c in (bgr[2], bgr[1], bgr[0])]
    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contraste(a, b):
    la, lb = luminancia(a), luminancia(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def rgb_a_bgr(texto):
    """'rgb(201, 31, 50)' -> (50, 31, 201) BGR."""
    n = [int(float(x)) for x in texto[texto.find("(") + 1:texto.find(")")].split(",")[:3]]
    return (n[2], n[1], n[0])


def mediana(img, x0, y0, x1, y1):
    alto, ancho = img.shape[:2]
    x0, x1 = max(0, min(x0, ancho - 1)), max(0, min(x1, ancho))
    y0, y1 = max(0, min(y0, alto - 1)), max(0, min(y1, alto))
    if x1 <= x0 or y1 <= y0:
        return None
    trozo = img[y0:y1, x0:x1].reshape(-1, 3)
    return tuple(int(v) for v in np.median(trozo, axis=0))


for etiqueta in ETIQUETAS:
    ruta_json = os.path.join(CARPETA, etiqueta + ".json")
    if not os.path.exists(ruta_json):
        print("  (falta %s.json)" % etiqueta)
        continue
    datos = json.load(open(ruta_json, encoding="utf-8"))
    print("\n═══ %s ═══" % etiqueta.upper())
    for ancho, info in datos["anchos"].items():
        clip = info["clip"]
        ruta = os.path.join(CARPETA, "%s-%s-menu-botones.png" % (etiqueta, ancho))
        img = cv2.imread(ruta)
        if img is None:
            print("  %3s px · falta la captura" % ancho)
            continue

        botones = info["botones"]
        menu = next((b for b in botones if "ver men" in b["texto"].lower()), None)
        principal = next((b for b in botones if "whatsapp" in b["texto"].lower()), None)
        if not menu:
            print("  %3s px · no encuentro el botón" % ancho)
            continue

        # coordenadas del botón dentro del recorte
        bx = menu["rect"]["x"] - clip["x"]
        by = menu["rect"]["y"] - clip["y"]
        bw, bh = menu["rect"]["w"], menu["rect"]["h"]

        # relleno: banda a la izquierda del texto, en el centro vertical
        relleno = mediana(img, bx + 10, by + bh // 2 - 6, bx + 34, by + bh // 2 + 6)
        # fondo: franja del hero a la izquierda del bloque, misma altura
        fondo_px = mediana(img, 2, by + bh // 2 - 6, max(3, bx - 6), by + bh // 2 + 6)
        if relleno is None or fondo_px is None:
            print("  %3s px · no se pudo muestrear" % ancho)
            continue

        c_borde = contraste(relleno, fondo_px)
        color_texto = rgb_a_bgr(menu["color"])
        c_texto = contraste(relleno, color_texto)

        linea = ("  %3s px · relleno #%02X%02X%02X · fondo detrás #%02X%02X%02X · "
                 "contraste botón/fondo %.2f:1 (%s) · texto/relleno %.2f:1 (%s)"
                 % (ancho, relleno[2], relleno[1], relleno[0],
                    fondo_px[2], fondo_px[1], fondo_px[0],
                    c_borde, "OK" if c_borde >= 3 else "BAJO",
                    c_texto, "OK" if c_texto >= 4.5 else "BAJO"))
        print(linea)

        if principal:
            px = principal["rect"]["x"] - clip["x"]
            py = principal["rect"]["y"] - clip["y"]
            pw, ph = principal["rect"]["w"], principal["rect"]["h"]
            relleno_p = mediana(img, px + 10, py + ph // 2 - 6, px + 34, py + ph // 2 + 6)
            if relleno_p is not None:
                dist = abs(int(relleno_p[0]) - int(relleno[0])) + abs(int(relleno_p[1]) - int(relleno[1])) + abs(int(relleno_p[2]) - int(relleno[2]))
                print("        primario «%s» relleno #%02X%02X%02X · diferencia con «Ver menú»: %d (suma de canales)"
                      % (principal["texto"], relleno_p[2], relleno_p[1], relleno_p[0], dist))
