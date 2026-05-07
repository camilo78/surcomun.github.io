(function () {
  'use strict';

  var COLLAPSE_HEIGHT = 88; // px — debe coincidir con max-height en CSS

  document.querySelectorAll('.post-content table').forEach(function (table) {

    // ── 1. Envolver tabla en .sc-wrap ────────────────────────────
    var wrap = document.createElement('div');
    wrap.className = 'sc-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);

    // ── 2. Botón de alternancia (tarjeta ↔ tabla completa) ───────
    var toggleRow = document.createElement('div');
    toggleRow.className = 'sc-toggle-row';
    var toggleBtn = document.createElement('button');
    toggleBtn.className = 'sc-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.textContent = 'Ver tabla completa ↔';
    toggleRow.appendChild(toggleBtn);
    wrap.insertBefore(toggleRow, table);

    toggleBtn.addEventListener('click', function () {
      var full = wrap.classList.toggle('sc-full');
      toggleBtn.textContent = full ? '← Vista compacta' : 'Ver tabla completa ↔';
    });

    // ── 3. Agregar data-label a cada td ─────────────────────────
    var headers = Array.from(
      table.querySelectorAll('thead th')
    ).map(function (th) { return th.textContent.trim(); });

    table.querySelectorAll('tbody tr').forEach(function (tr) {
      tr.querySelectorAll('td').forEach(function (td, i) {
        if (headers[i]) td.setAttribute('data-label', headers[i]);
      });
    });

    // ── 4. Celdas colapsables (todas salvo la primera) ───────────
    table.querySelectorAll('tbody td[data-label]').forEach(function (td) {

      // Envolver contenido en .sc-td-inner
      var inner = document.createElement('div');
      inner.className = 'sc-td-inner';
      while (td.firstChild) inner.appendChild(td.firstChild);
      td.appendChild(inner);

      // Botón Leer más / Leer menos
      var btn = document.createElement('button');
      btn.className = 'sc-btn';
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Leer más ↓';
      btn.style.display = 'none'; // ocultado hasta verificar altura
      td.appendChild(btn);

      btn.addEventListener('click', function () {
        var open = inner.classList.toggle('sc-open');
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Leer menos ↑' : 'Leer más ↓';
      });
    });

    // ── 5. Mostrar botones solo donde el contenido supere el límite
    //       Se ejecuta tras el primer pintado del navegador ────────
    requestAnimationFrame(function () {
      table.querySelectorAll('.sc-td-inner').forEach(function (inner) {
        // scrollHeight = altura real del contenido (sin límite CSS)
        // COLLAPSE_HEIGHT = límite aplicado por CSS en móvil
        if (inner.scrollHeight > COLLAPSE_HEIGHT + 12) {
          var btn = inner.parentNode.querySelector('.sc-btn');
          if (btn) btn.style.display = '';
        }
      });
    });

  });
}());
