#!/usr/bin/env python3
"""
Traduce lo que se escriba en el input del workflow de prueba a una ruta
real dentro de _posts/.

Acepta cualquiera de estas formas, porque a la hora de probar uno tiene a
mano la URL del artículo, no el nombre del archivo:

  _posts/2026-08-03-el-frente-que-no-vimos.md   ruta completa
  2026-08-03-el-frente-que-no-vimos.md          nombre del archivo
  https://surcomun.com/2026/08/03/el-frente-que-no-vimos.html    URL
  /2026/08/03/el-frente-que-no-vimos.html       ruta del sitio
  el-frente-que-no-vimos                        solo el slug
  (vacío)                                       el post más reciente

Escribe la ruta encontrada en GITHUB_OUTPUT como `path`.
"""

import glob
import os
import re
import sys

POSTS_DIR = "_posts"
DATE_PREFIX = re.compile(r"^\d{4}-\d{2}-\d{2}-")


def all_posts():
    paths = glob.glob(os.path.join(POSTS_DIR, "*.md"))
    paths += glob.glob(os.path.join(POSTS_DIR, "*.markdown"))
    # El nombre empieza con la fecha, así que ordenar alfabéticamente
    # equivale a ordenar cronológicamente.
    return sorted(paths)


def slug_of(path):
    stem = os.path.splitext(os.path.basename(path))[0]
    return DATE_PREFIX.sub("", stem)


def resolve(raw, posts):
    raw = raw.strip()

    if not raw:
        return posts[-1] if posts else None

    if os.path.isfile(raw):
        return raw

    candidate = os.path.join(POSTS_DIR, os.path.basename(raw))
    if os.path.isfile(candidate):
        return candidate

    # Reducir una URL o una ruta del sitio a su slug: nos quedamos con el
    # último segmento y le sacamos la extensión.
    tail = raw.rstrip("/").split("/")[-1]
    for suffix in (".html", ".htm", ".md", ".markdown"):
        if tail.endswith(suffix):
            tail = tail[: -len(suffix)]
            break

    tail = DATE_PREFIX.sub("", tail)
    if not tail:
        return None

    matches = [p for p in posts if slug_of(p) == tail]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        print(f"::error::'{raw}' coincide con varios posts: {matches}")
        sys.exit(1)

    return None


def main():
    raw = os.environ.get("POST_INPUT", "")
    posts = all_posts()

    if not posts:
        print(f"::error::No hay ningún post en {POSTS_DIR}/")
        return 1

    path = resolve(raw, posts)

    if not path:
        print(f"::error::No encontré ningún post que corresponda a: {raw}")
        print("Posts disponibles (los más recientes al final):")
        for candidate in posts[-10:]:
            print(f"  {candidate}")
        return 1

    if not raw.strip():
        print("Sin input: uso el post más reciente.")

    print(f"Post resuelto: {path}")

    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as fh:
            fh.write(f"path={path}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
