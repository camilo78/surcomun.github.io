# Sur Común

Sitio web de periodismo independiente construido con Jekyll. Cubre varis temáticas.

---

## Stack tecnológico

| Capa | Tecnología |
| ---- | --------- |
| Generador estático | [Jekyll](https://jekyllrb.com/) (Ruby) |
| Tema base | [Minima v3](https://github.com/jekyll/minima) (personalizado) |
| Plantillas | Liquid |
| Estilos | SCSS → CSS (vía Jekyll/Sass) |
| Interactividad | JavaScript vanilla |
| Contenido | Markdown (GFM via kramdown) |
| Dependencias Ruby | Bundler + Gemfile |

---

## Lenguajes

- **Ruby** — configuración del entorno (`Gemfile`, `_config.yml`)
- **Liquid** — sistema de plantillas de Jekyll (`_layouts/`, `_includes/`)
- **Markdown** — contenido de posts y páginas (`_posts/`, `*.md`)
- **SCSS** — estilos con variables CSS personalizadas (`_sass/`)
- **HTML** — layouts, includes y estructura semántica
- **JavaScript** — modo oscuro, búsqueda, menú hamburger (vanilla, sin dependencias)
- **YAML** — front matter de posts, configuración del sitio

---

## Plugins Jekyll

| Plugin | Función |
| ------ | ------- |
| `jekyll-feed` | Genera feed RSS/Atom |
| `jekyll-seo-tag` | Meta tags SEO automáticos |
| `jekyll-paginate-v2` | Paginación avanzada (6 posts por página) |
| `jekyll-toc` | Tabla de contenidos automática en posts |

---

## Tipografía

Las fuentes se cargan desde Google Fonts:

| Fuente | Uso |
| ------ | --- |
| [Newsreader](https://fonts.google.com/specimen/Newsreader) | Cuerpo de texto, titulares de posts |
| [Libre Franklin](https://fonts.google.com/specimen/Libre+Franklin) | Navegación, UI, etiquetas |
| [UnifrakturMaguntia](https://fonts.google.com/specimen/UnifrakturMaguntia) | Logotipo del sitio |

---

## Características principales

- **Modo oscuro/claro** — toggle manual + detección automática por sistema operativo (`prefers-color-scheme`). Estado persistido en `localStorage`. Implementado con atributo `data-theme` en `<html>` y CSS custom properties (`--minima-*`).
- **Búsqueda** — overlay de búsqueda con JavaScript vanilla que consume `search.json` generado por Jekyll. Filtra por título, extracto y categoría.
- **Categorías dinámicas** — el navbar lista automáticamente solo las categorías que tienen al menos un post publicado. Cada categoría tiene su propia página con layout `category`.
- **Crucigrama interactivo** — sección de pasatiempos con crucigrama custom, estilos propios en `assets/css/crucigrama.css` y lógica en `assets/js/`.
- **Integración Ko-fi** — botón de apoyo configurable desde `_config.yml` (`kofi.username`).
- **Tabla de contenidos** — generada automáticamente en todos los posts vía `jekyll-toc`.
- **Diseño responsive** — menú hamburger en móvil, grid adaptable.
- **Schema de color** — variables CSS definidas en `_sass/minima/custom-variables.scss`, overrides en `_sass/minima/custom-styles.scss`.

---

## Estructura del proyecto

```
.
├── _config.yml              # Configuración principal del sitio
├── _data/                   # Datos YAML reutilizables
├── _includes/
│   ├── header.html          # Cabecera: logo, navbar, búsqueda, toggle de tema
│   ├── footer.html          # Pie: columnas de navegación, redes sociales
│   ├── apoyo.html           # Bloque Ko-fi
│   └── crucigrama.html      # Componente de crucigrama
├── _layouts/
│   ├── home.html            # Página de inicio con grid de artículos
│   ├── post.html            # Artículo individual con TOC lateral
│   └── category.html        # Listado de posts por categoría
├── _posts/                  # Artículos en Markdown (YYYY-MM-DD-titulo.md)
├── _sass/
│   └── minima/
│       ├── custom-variables.scss  # Variables CSS y overrides de Minima
│       └── custom-styles.scss     # Estilos del sitio (header, footer, cards, etc.)
├── assets/
│   ├── css/crucigrama.css   # Estilos del crucigrama
│   ├── img/                 # Imágenes del sitio (logo.png, etc.)
│   └── js/                  # Scripts de interactividad
├── categorias/              # Páginas de categoría (layout: category)
├── search.json              # Índice de búsqueda generado por Jekyll
└── index.html               # Página de inicio
```

---

## Desarrollo local

Requisitos: Ruby y Bundler instalados.

```bash
# Instalar dependencias
bundle install

# Servidor de desarrollo
bundle exec jekyll serve

# Con recarga en vivo
bundle exec jekyll serve --livereload
```

El sitio queda disponible en `http://localhost:4000`.

---

## Configuración del sitio

Las opciones principales se gestionan en `_config.yml`:

```yaml
title: Sur Común
minima:
  skin: auto          # classic | dark | auto | solarized
  nav_pages:          # Páginas adicionales en el navbar
    - about.md
    - apoyar.md
kofi:
  username: usuario   # Nombre de usuario Ko-fi
toc:
  min_level: 2
  max_level: 3
```

---

## Licencia

Contenido editorial © Sur Común. El código del tema base está bajo [MIT License](http://opensource.org/licenses/MIT).
