/*
 * Sustituye la pantalla previa de un vídeo por el reproductor real.
 *
 * Hasta que alguien hace clic, YouTube no recibe ninguna petición: la
 * miniatura se sirve desde nuestro propio dominio. Usa delegación de
 * eventos para que funcione con cualquier cantidad de vídeos en la
 * página, incluidos los que se inserten después.
 */
(function () {
  'use strict';

  function cargar(facade) {
    var id = facade.dataset.id;
    if (!id) return;

    var iframe = document.createElement('iframe');
    iframe.src =
      'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=1';
    iframe.title = facade.dataset.title || 'Vídeo';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';

    facade.parentNode.replaceChild(iframe, facade);
  }

  document.addEventListener('click', function (e) {
    var facade = e.target.closest('.yt-facade');
    if (facade) cargar(facade);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var facade = e.target.closest('.yt-facade');
    if (facade) {
      e.preventDefault();
      cargar(facade);
    }
  });
})();
