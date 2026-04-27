(function () {
  function createPanelElement(panel, handlers) {
    const article = document.createElement('article');
    article.dataset.panelId = panel.id;
    article.className =
      'group absolute overflow-hidden rounded-xl border border-white/30 text-white shadow-lg ring-offset-2 transition-shadow';

    article.innerHTML = `
      <div class="absolute inset-0 bg-gradient-to-br ${panel.gradient}"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.28),_transparent_56%)]"></div>

      <header data-role="drag-handle" class="relative z-10 flex h-11 cursor-move items-center justify-between border-b border-white/20 px-3">
        <p class="truncate text-xs font-semibold uppercase tracking-[0.16em] text-white/90">${panel.type} panel</p>
        <button data-role="remove" type="button" class="rounded-md p-1 text-white/80 transition hover:bg-white/20 hover:text-white" aria-label="Remove panel">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"></path>
          </svg>
        </button>
      </header>

      <div class="relative z-10 px-4 py-3">
        <p class="text-sm font-semibold text-white/90">${panel.title}</p>
        <p class="mt-2 text-4xl font-light leading-none tracking-tight text-white drop-shadow-sm">${panel.value}</p>
        <p class="mt-3 text-xs font-medium text-white/85">Updated ${panel.updatedAt}</p>
      </div>

      <button data-role="resize-width" type="button" class="absolute right-0 top-12 z-20 h-[calc(100%-3rem)] w-2 cursor-e-resize rounded-l border-l border-white/25 bg-white/10 opacity-0 transition group-hover:opacity-100" aria-label="Resize panel width"></button>
      <button data-role="resize-height" type="button" class="absolute bottom-0 left-0 z-20 h-2 w-full cursor-s-resize rounded-t border-t border-white/25 bg-white/10 opacity-0 transition group-hover:opacity-100" aria-label="Resize panel height"></button>
      <button data-role="resize-both" type="button" class="absolute bottom-0 right-0 z-30 h-6 w-6 cursor-se-resize rounded-tl border-l border-t border-white/30 bg-white/20 opacity-0 transition group-hover:opacity-100" aria-label="Resize panel width and height"></button>
    `;

    article.addEventListener('mousedown', () => {
      handlers.onSelect(panel.id);
    });

    const dragHandle = article.querySelector('[data-role="drag-handle"]');
    dragHandle.addEventListener('mousedown', (event) => {
      if (event.target.closest('[data-role="remove"]')) {
        return;
      }
      handlers.onDragStart(panel.id, event);
    });

    article.querySelector('[data-role="resize-width"]').addEventListener('mousedown', (event) => {
      handlers.onResizeStart(panel.id, 'width', event);
    });

    article.querySelector('[data-role="resize-height"]').addEventListener('mousedown', (event) => {
      handlers.onResizeStart(panel.id, 'height', event);
    });

    article.querySelector('[data-role="resize-both"]').addEventListener('mousedown', (event) => {
      handlers.onResizeStart(panel.id, 'both', event);
    });

    article.querySelector('[data-role="remove"]').addEventListener('click', (event) => {
      event.stopPropagation();
      handlers.onRemove(panel.id);
    });

    return article;
  }

  window.DashboardPanelElement = { createPanelElement };
})();
