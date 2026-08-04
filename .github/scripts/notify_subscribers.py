#!/usr/bin/env python3
"""
Avisa a la lista de Buttondown cuando se publica un artículo nuevo.

Reemplaza la función RSS-to-email de Buttondown, que está detrás de un
add-on de pago. La API v1 sí está disponible en el plan gratuito, así que
armamos el correo acá y se lo entregamos ya compuesto.

Lee de la entrada una lista de rutas de posts recién agregados (una por
línea) y crea un correo por cada uno.

Variables de entorno:
  BUTTONDOWN_API_KEY  (obligatoria salvo en DRY_RUN)  clave de
                      https://buttondown.com/requests
  SITE_URL            (obligatoria)  ej. https://surcomun.com
  SEND_MODE           draft | about_to_send   (por defecto: draft)
  DRY_RUN             1 para imprimir el correo sin tocar la API

Prueba local sin enviar nada:

    SITE_URL=https://surcomun.com DRY_RUN=1 \
      python3 .github/scripts/notify_subscribers.py <<< "_posts/mi-post.md"
"""

import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.request

import yaml

API_URL = "https://api.buttondown.com/v1/emails"
FILENAME_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(.+)\.(md|markdown|html)$")


def parse_front_matter(path):
    """Devuelve (dict de front matter, cuerpo) o (None, None) si no tiene."""
    with open(path, encoding="utf-8") as fh:
        content = fh.read()

    if not content.startswith("---"):
        return None, None

    parts = content.split("---", 2)
    if len(parts) < 3:
        return None, None

    return yaml.safe_load(parts[1]) or {}, parts[2].strip()


def post_date(front_matter, filename):
    """La fecha del front matter manda sobre la del nombre del archivo.

    Es la misma precedencia que aplica Jekyll para construir el permalink,
    así que las URLs coinciden aunque las dos fechas difieran.
    """
    raw = front_matter.get("date")

    if isinstance(raw, datetime.datetime):
        return raw.date()
    if isinstance(raw, datetime.date):
        return raw
    if isinstance(raw, str):
        match = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw.strip())
        if match:
            return datetime.date(*map(int, match.groups()))

    match = FILENAME_DATE.match(filename)
    if match:
        return datetime.date(int(match[1]), int(match[2]), int(match[3]))

    return None


def post_slug(front_matter, filename):
    if front_matter.get("slug"):
        return str(front_matter["slug"])

    match = FILENAME_DATE.match(filename)
    return match[4] if match else None


def build_body(front_matter, url):
    """Compone el correo en Markdown. Buttondown agrega la baja al pie."""
    lines = []

    subtitle = front_matter.get("subtitle")
    if subtitle:
        lines.append(f"*{subtitle}*")
        lines.append("")

    excerpt = front_matter.get("excerpt")
    if excerpt:
        lines.append(str(excerpt).strip())
        lines.append("")

    lines.append(f"**[Leer el artículo completo →]({url})**")

    author = front_matter.get("author")
    if author and str(author).strip().lower() != "sur común":
        lines.append("")
        lines.append(f"Por {author}")

    return "\n".join(lines)


def create_email(api_key, subject, body, send_mode):
    payload = json.dumps(
        {"subject": subject, "body": body, "status": send_mode}
    ).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    api_key = os.environ.get("BUTTONDOWN_API_KEY", "").strip()
    site_url = os.environ.get("SITE_URL", "").strip().rstrip("/")
    send_mode = os.environ.get("SEND_MODE", "draft").strip() or "draft"
    dry_run = os.environ.get("DRY_RUN", "").strip() in ("1", "true", "yes")

    if not api_key and not dry_run:
        print("BUTTONDOWN_API_KEY no está configurada; no se envía nada.")
        return 0
    if not site_url:
        print("ERROR: falta SITE_URL.", file=sys.stderr)
        return 1
    if send_mode not in ("draft", "about_to_send"):
        print(f"ERROR: SEND_MODE inválido: {send_mode}", file=sys.stderr)
        return 1

    paths = [line.strip() for line in sys.stdin if line.strip()]
    if not paths:
        print("No hay posts nuevos en este push.")
        return 0

    failures = 0

    for path in paths:
        filename = os.path.basename(path)

        if not os.path.exists(path):
            print(f"— {filename}: ya no existe en el árbol, se omite.")
            continue

        front_matter, _ = parse_front_matter(path)
        if front_matter is None:
            print(f"— {filename}: sin front matter, se omite.")
            continue

        if front_matter.get("published") is False:
            print(f"— {filename}: published: false, se omite.")
            continue

        title = front_matter.get("title")
        if not title:
            print(f"— {filename}: sin título, se omite.")
            continue

        date = post_date(front_matter, filename)
        slug = post_slug(front_matter, filename)
        if not date or not slug:
            print(f"— {filename}: no se pudo derivar fecha o slug, se omite.")
            continue

        # Jekyll no publica los posts con fecha futura, así que el enlace
        # daría 404. Cuando llegue la fecha habrá que avisar a mano.
        if date > datetime.date.today():
            print(f"— {filename}: fecha futura ({date}), se omite.")
            continue

        url = f"{site_url}/{date:%Y/%m/%d}/{slug}.html"
        body = build_body(front_matter, url)

        if dry_run:
            print(f"── {filename} ── (DRY_RUN, no se llama a la API)")
            print(f"Asunto: {title}")
            print(f"Enlace: {url}")
            print(f"Modo:   {send_mode}")
            print("Cuerpo:")
            print(body)
            print("─" * 60)
            continue

        try:
            result = create_email(api_key, str(title), body, send_mode)
        except urllib.error.HTTPError as err:
            detail = err.read().decode("utf-8", "replace")
            print(f"✗ {filename}: HTTP {err.code} — {detail}", file=sys.stderr)
            failures += 1
            continue
        except urllib.error.URLError as err:
            print(f"✗ {filename}: error de red — {err.reason}", file=sys.stderr)
            failures += 1
            continue

        estado = "borrador creado" if send_mode == "draft" else "enviado"
        print(f"✓ {filename}: {estado} — {result.get('id', 'sin id')}")
        print(f"  {url}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
