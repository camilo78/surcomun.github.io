/* crucigrama.js — Motor de crucigrama interactivo para Jekyll
 * Sin dependencias externas. Vanilla JS (ES5+).
 * Uso: window.CrucigramaInit(data, id)
 *   data: objeto YAML parseado (jekyll jsonify)
 *   id:   string identificador del crucigrama (nombre del archivo .yml)
 */
(function (global) {
  'use strict';

  function CrucigramaInit(data, id) {

    // ── 0. Validación temprana de entrada ──────────────────────────────────
    if (!data || typeof data !== 'object') {
      console.error('Crucigrama "' + id + '": data es inválido o no fue recibido.');
      return;
    }
    if (typeof data.alto !== 'number' || typeof data.ancho !== 'number' ||
        data.alto <= 0 || data.ancho <= 0) {
      console.error('Crucigrama "' + id + '": data.alto y data.ancho deben ser números positivos. ' +
                    'Recibido: alto=' + data.alto + ', ancho=' + data.ancho);
      return;
    }
    if (!Array.isArray(data.palabras) || data.palabras.length === 0) {
      console.error('Crucigrama "' + id + '": data.palabras está vacío o no es un array.');
      return;
    }

    // ── Estado ──────────────────────────────────────────────────────────────
    var grid        = [];   // grid[r][c] = {letter, wordH, wordV, number, isBlack}
    var userGrid    = [];   // userGrid[r][c] = letra escrita
    var revealed    = [];   // revealed[r][c] = true si fue revelada
    var ROWS        = data.alto;
    var COLS        = data.ancho;
    var words       = { h: [], v: [] };
    var wordMap     = {};   // wordMap[num]['h'|'v'] = wordObj
    var selectedRow = -1;
    var selectedCol = -1;
    var selectedDir = 'horizontal';
    var timerInterval  = null;
    var timerSeconds   = 0;
    var timerStarted   = false;
    var puzzleComplete = false;
    var hiddenInput    = null;

    // ── Elementos del DOM ──────────────────────────────────────────────────
    var wrap = document.getElementById('cw-' + id);
    if (!wrap) return;

    function el(suffix) { return wrap.querySelector('#cw-' + suffix + '-' + id); }

    var gridEl        = el('grid');
    var timerEl       = el('timer');
    var cluesHEl      = el('clues-h');
    var cluesVEl      = el('clues-v');
    var successEl     = el('success');
    var successTimeEl = el('success-time');
    var activeClueEl  = el('active-clue');
    var btnVerify     = el('btn-verify');
    var btnRevLetter  = el('btn-reveal-letter');
    var btnRevWord    = el('btn-reveal-word');
    var btnReset      = el('btn-reset');
    var btnShare      = el('btn-share');
    var tableWrap     = wrap.querySelector('.cw-table-wrap');

    if (!gridEl) {
      console.error('Crucigrama "' + id + '": no se encontró el elemento #cw-grid-' + id);
      return;
    }

    // ── 1. Construir grilla lógica ─────────────────────────────────────────
    (function buildGrid() {
      for (var r = 0; r < ROWS; r++) {
        grid[r]     = [];
        userGrid[r] = [];
        revealed[r] = [];
        for (var c = 0; c < COLS; c++) {
          grid[r][c]     = { letter: null, wordH: null, wordV: null, number: null, isBlack: true };
          userGrid[r][c] = '';
          revealed[r][c] = false;
        }
      }

      var palabras = data.palabras || [];
      for (var i = 0; i < palabras.length; i++) {
        var w = palabras[i];

        // Validación por palabra: campos requeridos
        if (!w || typeof w.fila !== 'number' || typeof w.columna !== 'number' ||
            typeof w.respuesta !== 'string' || w.respuesta.length === 0) {
          console.error('Crucigrama "' + id + '": palabra #' + (i + 1) +
                        ' tiene campos inválidos. Se omite.', w);
          continue;
        }

        var dir = w.direccion === 'horizontal' ? 'h' : 'v';
        var obj = {
          num:    w.numero,
          row:    w.fila,
          col:    w.columna,
          answer: w.respuesta.toUpperCase(),
          clue:   w.pista
        };

        // Validación de límites antes de escribir
        var endR = w.fila    + (dir === 'v' ? obj.answer.length - 1 : 0);
        var endC = w.columna + (dir === 'h' ? obj.answer.length - 1 : 0);
        if (w.fila < 0 || w.columna < 0 || endR >= ROWS || endC >= COLS) {
          console.error(
            'Crucigrama "' + id + '": la palabra #' + w.numero +
            ' ("' + obj.answer + '", ' + w.direccion + ') se sale del grid ' +
            ROWS + 'x' + COLS + '. Empieza en [' + w.fila + ',' + w.columna +
            '] y termina en [' + endR + ',' + endC + ']. Revisa el YAML.'
          );
          continue;
        }

        words[dir].push(obj);
        if (!wordMap[w.numero]) wordMap[w.numero] = {};
        wordMap[w.numero][dir] = obj;

        for (var k = 0; k < obj.answer.length; k++) {
          var r2 = w.fila    + (dir === 'v' ? k : 0);
          var c2 = w.columna + (dir === 'h' ? k : 0);

          // Guard adicional (defensa en profundidad)
          if (!grid[r2] || !grid[r2][c2]) {
            console.error('Crucigrama "' + id + '": celda fuera de rango [' +
                          r2 + ',' + c2 + '] para palabra #' + w.numero);
            break;
          }

          var cell = grid[r2][c2];
          cell.isBlack = false;
          cell.letter  = obj.answer[k];
          if (dir === 'h') cell.wordH = w.numero;
          else             cell.wordV = w.numero;
          if (k === 0 && cell.number === null) cell.number = w.numero;
        }
      }

      words.h.sort(function (a, b) { return a.num - b.num; });
      words.v.sort(function (a, b) { return a.num - b.num; });
    }());

    // ── 2. Cargar progreso guardado ────────────────────────────────────────
    (function loadProgress() {
      try {
        var raw = localStorage.getItem('crucigrama:' + id);
        if (!raw) return;
        var saved = JSON.parse(raw);

        // Solo restaurar si las dimensiones coinciden (evita corrupción si cambió el YAML)
        if (saved.userGrid && Array.isArray(saved.userGrid) &&
            saved.userGrid.length === ROWS &&
            Array.isArray(saved.userGrid[0]) && saved.userGrid[0].length === COLS) {
          userGrid = saved.userGrid;
        }
        if (saved.revealed && Array.isArray(saved.revealed) &&
            saved.revealed.length === ROWS) {
          revealed = saved.revealed;
        }
        if (typeof saved.timerSeconds === 'number') {
          timerSeconds = saved.timerSeconds;
        }
        if (timerEl) timerEl.textContent = formatTime(timerSeconds);
        if (timerSeconds > 0) timerStarted = true; // reanudar timer al primer keystroke
      } catch (e) {
        console.warn('Crucigrama "' + id + '": no se pudo cargar progreso guardado.', e);
      }
    }());

    // ── 3. Renderizar tabla ────────────────────────────────────────────────
    function renderGrid() {
      gridEl.innerHTML = '';
      var table = document.createElement('table');
      table.className = 'cw-table';
      table.setAttribute('role', 'grid');
      table.setAttribute('aria-label', 'Cuadrícula del crucigrama');

      for (var r = 0; r < ROWS; r++) {
        var tr = document.createElement('tr');
        for (var c = 0; c < COLS; c++) {
          // Guard defensivo: si la fila no existe por alguna razón, saltar
          if (!grid[r] || !grid[r][c]) {
            var emptyTd = document.createElement('td');
            emptyTd.className = 'cw-cell cw-cell--black';
            tr.appendChild(emptyTd);
            continue;
          }

          var cell = grid[r][c];
          var td   = document.createElement('td');

          if (cell.isBlack) {
            td.className = 'cw-cell cw-cell--black';
            td.setAttribute('aria-hidden', 'true');
          } else {
            td.className = 'cw-cell';
            td.dataset.row = r;
            td.dataset.col = c;
            td.setAttribute('role', 'gridcell');
            td.setAttribute('tabindex', '-1');

            if (cell.number !== null) {
              var numSpan = document.createElement('span');
              numSpan.className   = 'cw-num';
              numSpan.textContent = cell.number;
              numSpan.setAttribute('aria-hidden', 'true');
              td.appendChild(numSpan);
            }

            var ls = document.createElement('span');
            ls.className   = 'cw-letter';
            ls.textContent = (userGrid[r] && userGrid[r][c]) || '';
            td.appendChild(ls);

            if (revealed[r] && revealed[r][c]) td.classList.add('cw-cell--revealed');

            td.addEventListener('click', makeCellClick(r, c));
          }
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
      gridEl.appendChild(table);
    }

    function makeCellClick(r, c) {
      return function () { onCellClick(r, c); };
    }

    // ── 4. Renderizar pistas ───────────────────────────────────────────────
    function renderClues() {
      if (cluesHEl) buildClueList(words.h, 'h', cluesHEl);
      if (cluesVEl) buildClueList(words.v, 'v', cluesVEl);
    }

    function buildClueList(list, dir, listEl) {
      listEl.innerHTML = '';
      for (var i = 0; i < list.length; i++) {
        var w  = list[i];
        var li = document.createElement('li');
        li.className   = 'cw-clue-item';
        li.dataset.num = w.num;
        li.dataset.dir = dir;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');

        var numS = document.createElement('span');
        numS.className   = 'cw-clue-item__num';
        numS.textContent = w.num;

        var txtS = document.createElement('span');
        txtS.textContent = w.clue || '';

        li.appendChild(numS);
        li.appendChild(txtS);
        li.addEventListener('click', makeClueClick(w, dir));
        listEl.appendChild(li);
      }
    }

    function makeClueClick(w, dir) {
      return function () {
        selectCell(w.row, w.col, dir === 'h' ? 'horizontal' : 'vertical');
        focusInput();
      };
    }

    // ── 5. Selección de celda ──────────────────────────────────────────────
    function selectCell(r, c, dir) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      if (!grid[r] || !grid[r][c] || grid[r][c].isBlack) return;

      // Forzar dirección válida para esa celda
      if (dir === 'horizontal' && grid[r][c].wordH === null && grid[r][c].wordV !== null) dir = 'vertical';
      if (dir === 'vertical'   && grid[r][c].wordV === null && grid[r][c].wordH !== null) dir = 'horizontal';

      selectedRow = r;
      selectedCol = c;
      selectedDir = dir;

      highlightCells();
      highlightClues();
      positionInput();
      updateActiveClue();
    }

    function highlightCells() {
      var all = wrap.querySelectorAll('.cw-cell:not(.cw-cell--black)');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('cw-cell--selected', 'cw-cell--active');
      }
      if (selectedRow === -1) return;

      var wo = getWordObj(selectedRow, selectedCol, selectedDir);
      if (wo) {
        var cells = wordCells(wo, selectedDir);
        for (var k = 0; k < cells.length; k++) {
          var td = getCellEl(cells[k].r, cells[k].c);
          if (td) td.classList.add('cw-cell--active');
        }
      }

      var selTd = getCellEl(selectedRow, selectedCol);
      if (selTd) {
        selTd.classList.remove('cw-cell--active');
        selTd.classList.add('cw-cell--selected');
      }
    }

    function highlightClues() {
      var all = wrap.querySelectorAll('.cw-clue-item');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('cw-clue-item--active');
        all[i].setAttribute('aria-selected', 'false');
      }
      if (selectedRow === -1) return;

      var dk  = selectedDir === 'horizontal' ? 'h' : 'v';
      var num = selectedDir === 'horizontal' ? grid[selectedRow][selectedCol].wordH
                                             : grid[selectedRow][selectedCol].wordV;
      if (num === null) return;

      var clueEl = wrap.querySelector('.cw-clue-item[data-num="' + num + '"][data-dir="' + dk + '"]');
      if (clueEl) {
        clueEl.classList.add('cw-clue-item--active');
        clueEl.setAttribute('aria-selected', 'true');
        clueEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    function updateActiveClue() {
      if (!activeClueEl || selectedRow === -1) return;
      var dk  = selectedDir === 'horizontal' ? 'h' : 'v';
      var num = selectedDir === 'horizontal' ? grid[selectedRow][selectedCol].wordH
                                             : grid[selectedRow][selectedCol].wordV;
      if (num === null || !wordMap[num] || !wordMap[num][dk]) {
        activeClueEl.innerHTML = '';
        return;
      }
      var wo   = wordMap[num][dk];
      var dlab = selectedDir === 'horizontal' ? 'Horizontal' : 'Vertical';
      activeClueEl.innerHTML = '<strong>' + num + ' ' + dlab + '.</strong> ' + escHtml(wo.clue || '');
    }

    function escHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function getCellEl(r, c) {
      return wrap.querySelector('.cw-cell[data-row="' + r + '"][data-col="' + c + '"]');
    }

    // ── 6. Input oculto (compatibilidad móvil) ────────────────────────────
    function setupInput() {
      if (!tableWrap) return;
      hiddenInput = document.createElement('input');
      hiddenInput.type      = 'text';
      hiddenInput.className = 'cw-hidden-input';
      hiddenInput.setAttribute('autocomplete',   'off');
      hiddenInput.setAttribute('autocorrect',    'off');
      hiddenInput.setAttribute('autocapitalize', 'characters');
      hiddenInput.setAttribute('spellcheck',     'false');
      hiddenInput.setAttribute('tabindex',       '-1');
      tableWrap.style.position = 'relative';
      tableWrap.appendChild(hiddenInput);

      hiddenInput.addEventListener('keydown', onKeyDown);
      hiddenInput.addEventListener('input',   onHiddenInput);
    }

    function positionInput() {
      if (!hiddenInput || !tableWrap) return;
      hiddenInput.value = '';
      requestAnimationFrame(function () {
        var td = getCellEl(selectedRow, selectedCol);
        if (!td || !hiddenInput || !tableWrap) return;
        var rect  = td.getBoundingClientRect();
        var wRect = tableWrap.getBoundingClientRect();
        hiddenInput.style.left   = (rect.left - wRect.left + tableWrap.scrollLeft) + 'px';
        hiddenInput.style.top    = (rect.top  - wRect.top)  + 'px';
        hiddenInput.style.width  = rect.width  + 'px';
        hiddenInput.style.height = rect.height + 'px';
      });
    }

    function focusInput() {
      if (hiddenInput) { hiddenInput.focus(); hiddenInput.value = ''; }
    }

    // ── 7. Click en celda ─────────────────────────────────────────────────
    function onCellClick(r, c) {
      if (!grid[r] || !grid[r][c] || grid[r][c].isBlack) return;
      if (r === selectedRow && c === selectedCol) {
        var nd = selectedDir === 'horizontal' ? 'vertical' : 'horizontal';
        selectCell(r, c, nd);
      } else {
        selectCell(r, c, selectedDir);
      }
      focusInput();
    }

    // ── 8. Input del campo oculto ─────────────────────────────────────────
    function onHiddenInput() {
      var val = (hiddenInput.value || '').toUpperCase();
      hiddenInput.value = '';
      if (!val) return;
      var ch = val[val.length - 1];
      if (ch >= 'A' && ch <= 'Z') typeLetter(ch);
    }

    // ── 9. Teclado ────────────────────────────────────────────────────────
    function onKeyDown(e) {
      if (selectedRow === -1) return;
      var key = e.key;

      if (key.length === 1) {
        var upper = key.toUpperCase();
        if (upper >= 'A' && upper <= 'Z') {
          e.preventDefault();
          typeLetter(upper);
          return;
        }
      }

      switch (key) {
        case 'Backspace':
          e.preventDefault(); handleBackspace(); break;
        case 'Delete':
          e.preventDefault(); writeLetter(selectedRow, selectedCol, ''); break;
        case 'ArrowRight':
          e.preventDefault();
          if (selectedDir !== 'horizontal') selectCell(selectedRow, selectedCol, 'horizontal');
          else moveStep(0, 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (selectedDir !== 'horizontal') selectCell(selectedRow, selectedCol, 'horizontal');
          else moveStep(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (selectedDir !== 'vertical') selectCell(selectedRow, selectedCol, 'vertical');
          else moveStep(1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (selectedDir !== 'vertical') selectCell(selectedRow, selectedCol, 'vertical');
          else moveStep(-1, 0);
          break;
        case 'Tab':
          e.preventDefault(); jumpWord(e.shiftKey ? -1 : 1); break;
        case 'Enter':
          e.preventDefault();
          selectCell(selectedRow, selectedCol, selectedDir === 'horizontal' ? 'vertical' : 'horizontal');
          break;
      }
    }

    // ── 10. Escritura ─────────────────────────────────────────────────────
    function typeLetter(ch) {
      if (puzzleComplete) return;
      if (!timerStarted) startTimer();
      writeLetter(selectedRow, selectedCol, ch);
      var next = nextCell(selectedRow, selectedCol, selectedDir, 1);
      if (next) selectCell(next.r, next.c, selectedDir);
      saveProgress();
      if (checkComplete()) showSuccess();
    }

    function handleBackspace() {
      if (selectedRow === -1) return;
      if (userGrid[selectedRow][selectedCol] !== '') {
        writeLetter(selectedRow, selectedCol, '');
      } else {
        var prev = nextCell(selectedRow, selectedCol, selectedDir, -1);
        if (prev) { selectCell(prev.r, prev.c, selectedDir); writeLetter(prev.r, prev.c, ''); }
      }
      saveProgress();
    }

    function writeLetter(r, c, ch) {
      if (!userGrid[r]) return;
      if (revealed[r] && revealed[r][c] && ch === '') return; // no borrar reveladas
      userGrid[r][c] = ch;
      var td = getCellEl(r, c);
      if (!td) return;
      var ls = td.querySelector('.cw-letter');
      if (ls) ls.textContent = ch;
      td.classList.remove('cw-cell--error');
    }

    // ── 11. Navegación ────────────────────────────────────────────────────
    function nextCell(r, c, dir, step) {
      var wo = getWordObj(r, c, dir);
      if (!wo) return null;
      var cells = wordCells(wo, dir);
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].r === r && cells[i].c === c) {
          var ni = i + step;
          return (ni >= 0 && ni < cells.length) ? cells[ni] : null;
        }
      }
      return null;
    }

    function wordCells(wo, dir) {
      var result = [];
      for (var k = 0; k < wo.answer.length; k++) {
        result.push({
          r: wo.row + (dir === 'vertical'   ? k : 0),
          c: wo.col + (dir === 'horizontal' ? k : 0)
        });
      }
      return result;
    }

    function getWordObj(r, c, dir) {
      if (!grid[r] || !grid[r][c]) return null;
      var dk  = dir === 'horizontal' ? 'h' : 'v';
      var num = dir === 'horizontal' ? grid[r][c].wordH : grid[r][c].wordV;
      if (num === null || !wordMap[num] || !wordMap[num][dk]) return null;
      return wordMap[num][dk];
    }

    function moveStep(dr, dc) {
      var r = selectedRow + dr, c = selectedCol + dc;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        if (grid[r] && grid[r][c] && !grid[r][c].isBlack) {
          selectCell(r, c, selectedDir);
          return;
        }
        r += dr; c += dc;
      }
    }

    function jumpWord(step) {
      var all = [];
      for (var i = 0; i < words.h.length; i++) all.push({ w: words.h[i], dir: 'horizontal' });
      for (var j = 0; j < words.v.length; j++) all.push({ w: words.v[j], dir: 'vertical' });

      if (all.length === 0) return;

      var cur = 0; // default to first
      for (var k = 0; k < all.length; k++) {
        var wo    = all[k].w;
        var cells = wordCells(wo, all[k].dir);
        for (var m = 0; m < cells.length; m++) {
          if (all[k].dir === selectedDir && cells[m].r === selectedRow && cells[m].c === selectedCol) {
            cur = k; break;
          }
        }
      }

      var next = (cur + step + all.length) % all.length;
      var nw   = all[next];
      selectCell(nw.w.row, nw.w.col, nw.dir);
    }

    // ── 12. Botones ───────────────────────────────────────────────────────
    function setupControls() {
      if (btnVerify)    btnVerify.addEventListener('click',    doVerify);
      if (btnRevLetter) btnRevLetter.addEventListener('click', doRevealLetter);
      if (btnRevWord)   btnRevWord.addEventListener('click',   doRevealWord);
      if (btnReset)     btnReset.addEventListener('click',     doReset);
      if (btnShare)     btnShare.addEventListener('click',     doShare);
    }

    function doVerify() {
      var cells = wrap.querySelectorAll('.cw-cell:not(.cw-cell--black)');
      for (var i = 0; i < cells.length; i++) {
        var r = +cells[i].dataset.row, c = +cells[i].dataset.col;
        if (!grid[r] || !grid[r][c]) continue;
        if (userGrid[r][c] !== '' && userGrid[r][c] !== grid[r][c].letter) {
          cells[i].classList.add('cw-cell--error');
        }
      }
      setTimeout(function () {
        var errs = wrap.querySelectorAll('.cw-cell--error');
        for (var j = 0; j < errs.length; j++) errs[j].classList.remove('cw-cell--error');
      }, 2000);
    }

    function doRevealLetter() {
      if (selectedRow === -1) return;
      var r = selectedRow, c = selectedCol;
      if (!grid[r] || !grid[r][c]) return;
      revealed[r][c] = true;
      userGrid[r][c] = grid[r][c].letter;
      var td = getCellEl(r, c);
      if (td) {
        var ls = td.querySelector('.cw-letter');
        if (ls) ls.textContent = grid[r][c].letter;
        td.classList.add('cw-cell--revealed');
        td.classList.remove('cw-cell--error');
      }
      saveProgress();
      if (checkComplete()) showSuccess();
    }

    function doRevealWord() {
      if (selectedRow === -1) return;
      if (!window.confirm('¿Revelar toda la palabra?')) return;
      var wo = getWordObj(selectedRow, selectedCol, selectedDir);
      if (!wo) return;
      var cells = wordCells(wo, selectedDir);
      for (var i = 0; i < cells.length; i++) {
        var r = cells[i].r, c = cells[i].c;
        if (!grid[r] || !grid[r][c]) continue;
        revealed[r][c] = true;
        userGrid[r][c] = grid[r][c].letter;
        var td = getCellEl(r, c);
        if (td) {
          var ls = td.querySelector('.cw-letter');
          if (ls) ls.textContent = grid[r][c].letter;
          td.classList.add('cw-cell--revealed');
          td.classList.remove('cw-cell--error');
        }
      }
      saveProgress();
      if (checkComplete()) showSuccess();
    }

    function doReset() {
      if (!window.confirm('¿Reiniciar el crucigrama? Se perderá tu progreso.')) return;
      stopTimer();
      timerSeconds = 0; timerStarted = false; puzzleComplete = false;
      if (timerEl) timerEl.textContent = '00:00';

      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          userGrid[r][c] = '';
          revealed[r][c] = false;
        }
      }

      localStorage.removeItem('crucigrama:' + id);
      if (successEl) successEl.classList.remove('is-visible');
      if (activeClueEl) activeClueEl.textContent = 'Haz clic en una celda para comenzar';

      selectedRow = -1; selectedCol = -1;
      renderGrid();
    }

    function doShare() {
      var time  = formatTime(timerSeconds);
      var title = (data.titulo || 'Crucigrama');
      var text  = 'Resolv\u00ed el ' + title + ' en ' + time + ' \u23f1\ufe0f\n' + window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(function () { alert('Resultado copiado al portapapeles.'); })
          .catch(function () { window.prompt('Copia este texto:', text); });
      } else {
        window.prompt('Copia este texto:', text);
      }
    }

    // ── 13. Timer ─────────────────────────────────────────────────────────
    function startTimer() {
      if (timerStarted) return;
      timerStarted = true;
      timerInterval = setInterval(function () {
        timerSeconds++;
        if (timerEl) timerEl.textContent = formatTime(timerSeconds);
      }, 1000);
    }

    function stopTimer() {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    function formatTime(s) {
      var m   = Math.floor(s / 60);
      var sec = s % 60;
      return (m   < 10 ? '0' : '') + m   + ':'
           + (sec < 10 ? '0' : '') + sec;
    }

    // ── 14. Verificar completado ──────────────────────────────────────────
    function checkComplete() {
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (!grid[r] || !grid[r][c]) continue;
          if (!grid[r][c].isBlack && userGrid[r][c] !== grid[r][c].letter) return false;
        }
      }
      return true;
    }

    function showSuccess() {
      if (puzzleComplete) return;
      puzzleComplete = true;
      stopTimer();
      if (successEl) {
        successEl.classList.add('is-visible');
        if (successTimeEl) successTimeEl.textContent = 'Tiempo: ' + formatTime(timerSeconds);
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // ── 15. LocalStorage ──────────────────────────────────────────────────
    function saveProgress() {
      try {
        localStorage.setItem('crucigrama:' + id, JSON.stringify({
          userGrid:     userGrid,
          revealed:     revealed,
          timerSeconds: timerSeconds
        }));
      } catch (e) {}
    }

    // ── Arranque ──────────────────────────────────────────────────────────
    renderGrid();
    renderClues();
    setupInput();
    setupControls();

  } // fin CrucigramaInit

  global.CrucigramaInit = CrucigramaInit;

}(window));