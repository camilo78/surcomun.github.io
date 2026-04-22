---
layout: post
title: "Introducción a CSS Grid: diseña layouts modernos sin complicaciones"
categories: desarrollo
tags: [css, desarrollo-web, grid, frontend, diseño]
cover_image: "https://picsum.photos/seed/css-grid/1200/500"
---

CSS Grid transformó la forma en que los desarrolladores frontend construyen layouts. Después de años dependiendo de frameworks como Bootstrap o técnicas hacky con `float`, el navegador finalmente ofrece un sistema de cuadrícula nativo, potente y semántico.

<figure>
<img src="https://picsum.photos/seed/css-grid2/800/400" alt="Pantalla con código CSS">
<figcaption>El inspector de elementos de un navegador moderno permite visualizar las líneas del grid directamente sobre la página. <em>Foto: Redacción Sur Común</em></figcaption>
</figure>

La idea central de Grid es simple: defines filas y columnas en un contenedor, y ubicas los elementos hijos dentro de esa cuadrícula. La potencia está en que puedes hacer layouts complejos con pocas líneas de CSS:

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
```

A diferencia de Flexbox, que es unidimensional (trabaja en filas O columnas), Grid es bidimensional y permite controlar simultáneamente filas y columnas. Ambas herramientas son complementarias: Flexbox para componentes, Grid para layouts de página.

<figure>
<img src="https://picsum.photos/seed/css-grid3/800/350" alt="Diagrama de CSS Grid con filas y columnas">
<figcaption>Un diagrama básico de CSS Grid: las líneas numeradas delimitan columnas y filas que forman el sistema de coordenadas del layout. <em>Foto: Redacción Sur Común</em></figcaption>
</figure>

La compatibilidad con navegadores modernos es excelente y las herramientas de desarrollo de Firefox y Chrome facilitan enormemente la depuración. No hay excusa para no empezar a usarlo hoy.
