"""KZ-BROSTY-006 · compara antes/después y comprueba que solo cambió «Ver menú».

Tres cosas:
  1. Diferencia de estilos calculados botón por botón: el primario y «Cómo llegar»
     tienen que salir IDÉNTICOS; solo «Ver menú» debe cambiar.
  2. Estados hover, foco de teclado y activo de «Ver menú».
  3. Cuánto se distinguen a la vista el primario y «Ver menú» ahora mismo: se
     comparan sus recortes píxel a píxel.
"""
import json
import os
import sys

import cv2
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CARPETA = sys.argv[1] if len(sys.argv) > 1 else "."
antes = json.load(open(os.path.join(CARPETA, "antes.json"), encoding="utf-8"))
despues = json.load(open(os.path.join(CARPETA, "despues.json"), encoding="utf-8"))

CAMPOS = ["fondo", "color", "borde", "sombra", "radio"]


def nombre(b):
    t = b["texto"].lower()
    if "whatsapp" in t:
        return "Pedir por WhatsApp"
    if "ver men" in t:
        return "Ver menú"
    return "Cómo llegar"


print("═══ 1 · ¿CAMBIÓ ALGO MÁS QUE «VER MENÚ»? ═══")
for ancho in antes["anchos"]:
    a = {nombre(b): b for b in antes["anchos"][ancho]["botones"]}
    d = {nombre(b): b for b in despues["anchos"][ancho]["botones"]}
    print("  %s px" % ancho)
    for n in a:
        iguales = [c for c in CAMPOS if a[n][c] == d[n][c]]
        distintos = [c for c in CAMPOS if a[n][c] != d[n][c]]
        medida = "medidas %s" % ("iguales" if a[n]["rect"] == d[n]["rect"] else "CAMBIARON")
        if distintos:
            print("    %-20s CAMBIA: %s   (%s)" % (n, ", ".join(distintos), medida))
            for c in distintos:
                print("        %-6s antes: %s" % (c, a[n][c]))
                print("        %-6s ahora: %s" % ("", d[n][c]))
        else:
            print("    %-20s sin cambios (%s)" % (n, medida))

print("\n═══ 2 · ESTADOS DE «VER MENÚ» (después) ═══")
for ancho, info in despues["anchos"].items():
    h = info["hover"]
    f = info["foco"]
    ac = info["activo"]
    base = next(b for b in info["botones"] if "ver men" in b["texto"].lower())
    print("  %s px" % ancho)
    print("    normal : fondo %s · texto %s · borde %s · sombra %s"
          % (base["fondo"], base["color"], base["borde"], "ninguna" if base["sombra"] == "none" else "sí"))
    print("    hover  : fondo %s · sombra %s · transform %s" % (h["fondo"], "sí" if h["sombra"] != "none" else "ninguna", h["transform"]))
    print("    foco   : alcanzado con Tab %s · :focus-visible %s · anillo %s (offset %s)"
          % (f["alcanzadoPorTeclado"], f["coincideFocusVisible"], f["contorno"], f["desplazamiento"]))
    print("    activo : fondo %s · transform %s" % (ac["fondo"], ac["transform"]))

print("\n═══ 3 · ¿SE DISTINGUEN EL PRIMARIO Y «VER MENÚ»? ═══")
for ancho in despues["anchos"]:
    ruta = os.path.join(CARPETA, "despues-%s-menu-botones.png" % ancho)
    img = cv2.imread(ruta)
    if img is None:
        continue
    info = despues["anchos"][ancho]
    clip = info["clip"]
    b = {nombre(x): x for x in info["botones"]}
    p, v = b["Pedir por WhatsApp"], b["Ver menú"]

    def recorte(boton):
        x = boton["rect"]["x"] - clip["x"]
        y = boton["rect"]["y"] - clip["y"]
        return img[y:y + boton["rect"]["h"], x:x + boton["rect"]["w"]]

    rp, rv = recorte(p), recorte(v)
    if rp.shape != rv.shape:
        rv = cv2.resize(rv, (rp.shape[1], rp.shape[0]))
    dif = np.abs(rp.astype(np.int16) - rv.astype(np.int16)).sum(axis=2)
    media = float(dif.mean())
    proporcion = 100.0 * float((dif > 20).sum()) / dif.size
    print("  %s px · diferencia media por píxel %.1f (de 765) · píxeles claramente distintos %.1f %%"
          % (ancho, media, proporcion))
