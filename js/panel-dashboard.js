(function () {
  const {
    GRID_SIZE,
    DRAG_RESIZE_MIN,
    DRAG_STEP_DEFAULT,
    DRAG_STEP_MIN,
    DRAG_STEP_MAX,
    EDGE_SNAP_THRESHOLD,
    BOARD_MIN_HEIGHT,
    BOARD_PADDING_BOTTOM,
    gradients,
    metricTitles,
  } = window.DashboardConfig;

  const { clamp, formatTimestamp, generateMetric } = window.DashboardHelpers;
  const { createPanelElement } = window.DashboardPanelElement;
  const DashboardLayoutEngine = window.DashboardLayoutEngine;

  class PanelDashboard {
    constructor() {
      this.dashboardEl = document.getElementById('dashboard');
      this.addSquareBtn = document.getElementById('addSquareBtn');
      this.addRectangleBtn = document.getElementById('addRectangleBtn');
      this.removeSelectedBtn = document.getElementById('removeSelectedBtn');
      this.clearAllBtn = document.getElementById('clearAllBtn');
      this.exportWidgetsBtn = document.getElementById('exportWidgetsBtn');
      this.importWidgetsBtn = document.getElementById('importWidgetsBtn');
      this.importWidgetsInput = document.getElementById('importWidgetsInput');
      this.dragStepInput = document.getElementById('dragStepInput');
      this.snapToggle = document.getElementById('snapToggle');
      this.selectionMetaEl = document.getElementById('selectionMeta');
      this.statusBadgeEl = document.getElementById('statusBadge');

      this.panels = [];
      this.selectedId = null;
      this.panelCounter = 0;
      this.dragStep = clamp(DRAG_STEP_DEFAULT, DRAG_STEP_MIN, DRAG_STEP_MAX);

      this.gradients = [...gradients];
      this.metricTitles = [...metricTitles];

      this.layoutEngine = new DashboardLayoutEngine(this);

      this.bindGlobalEvents();
      this.syncBoardHeight(true);
      this.render();

      this.addPanel('rectangle');
      this.addPanel('square');
      this.setStatus('Dashboard ready', 'ok');
    }

    bindGlobalEvents() {
      this.addSquareBtn.addEventListener('click', () => this.addPanel('square'));
      this.addRectangleBtn.addEventListener('click', () => this.addPanel('rectangle'));
      this.removeSelectedBtn.addEventListener('click', () => this.removeSelectedPanel());
      this.clearAllBtn.addEventListener('click', () => this.clearAllPanels());
      this.exportWidgetsBtn.addEventListener('click', () => this.exportWidgets());
      this.importWidgetsBtn.addEventListener('click', () => this.importWidgetsInput.click());
      this.importWidgetsInput.addEventListener('change', (event) => this.handleImportFile(event));
      this.dragStepInput.addEventListener('change', () => this.applyDragStepFromInput());
      this.dragStepInput.addEventListener('blur', () => this.applyDragStepFromInput());

      this.snapToggle.addEventListener('change', () => {
        this.commitLayoutChange(this.selectedId, () => {}, false);
        this.setStatus(this.isSnapEnabled() ? 'Snap enabled' : 'Snap disabled', 'info');
      });

      this.dashboardEl.addEventListener('mousedown', (event) => {
        if (event.target === this.dashboardEl) {
          this.selectPanel(null);
        }
      });

      window.addEventListener('resize', () => {
        this.syncBoardHeight(true);
        const ok = this.layoutEngine.resolve(this.selectedId);
        if (!ok) {
          this.layoutEngine.resolve(null);
        }
        this.render();
      });

      this.dragStepInput.min = String(DRAG_STEP_MIN);
      this.dragStepInput.max = String(DRAG_STEP_MAX);
      this.dragStepInput.step = '1';
      this.dragStepInput.value = String(this.dragStep);
      this.syncDragStepCss();
    }

    isSnapEnabled() {
      return this.snapToggle.checked;
    }

    getDragStep() {
      return clamp(this.dragStep, DRAG_STEP_MIN, DRAG_STEP_MAX);
    }

    applyDragStepFromInput() {
      const parsed = Number.parseInt(this.dragStepInput.value, 10);
      this.dragStep = clamp(
        Number.isFinite(parsed) ? parsed : DRAG_STEP_DEFAULT,
        DRAG_STEP_MIN,
        DRAG_STEP_MAX,
      );
      this.dragStepInput.value = String(this.dragStep);
      this.syncDragStepCss();
      this.setStatus(`Drag step set to ${this.dragStep}px`, 'info');
    }

    syncDragStepCss() {
      this.dashboardEl.style.setProperty('--grid-size', `${this.getDragStep()}px`);
    }

    getBoardSize() {
      return {
        width: this.dashboardEl.clientWidth,
        height: this.dashboardEl.clientHeight,
      };
    }

    getViewportBasedMinHeight() {
      return Math.max(BOARD_MIN_HEIGHT, Math.round(window.innerHeight * 0.74));
    }

    setBoardHeight(nextHeight) {
      const normalized = Math.max(this.getViewportBasedMinHeight(), Math.ceil(nextHeight));
      this.dashboardEl.style.height = `${normalized}px`;
    }

    ensureBoardHeightFor(bottomY) {
      const required = bottomY + BOARD_PADDING_BOTTOM;
      if (required > this.dashboardEl.clientHeight) {
        this.setBoardHeight(required);
      }
    }

    syncBoardHeight(shrink = false) {
      const required = this.panels.reduce(
        (maxBottom, panel) => Math.max(maxBottom, panel.y + panel.h + BOARD_PADDING_BOTTOM),
        this.getViewportBasedMinHeight(),
      );

      if (shrink || required > this.dashboardEl.clientHeight) {
        this.setBoardHeight(required);
      }
    }

    getPanelById(panelId) {
      return this.panels.find((panel) => panel.id === panelId) || null;
    }

    snapshotPanels() {
      return this.panels.map((panel) => ({ ...panel }));
    }

    restorePanels(snapshot) {
      this.panels = snapshot.map((panel) => ({ ...panel }));
    }

    commitLayoutChange(anchorId, mutator, silent = false) {
      const snapshot = this.snapshotPanels();

      mutator();
      const ok = this.layoutEngine.resolve(anchorId);

      if (!ok) {
        this.restorePanels(snapshot);
        this.layoutEngine.resolve(this.selectedId);
        this.render();
        if (!silent) {
          this.setStatus('No space available for this action', 'warn');
        }
        return false;
      }

      this.render();
      return true;
    }

    addPanel(type) {
      const board = this.getBoardSize();
      const baseSize = type === 'square' ? { w: 168, h: 168 } : { w: 336, h: 192 };
      const snapStep = this.getDragStep();

      const metric = generateMetric(type, this.panelCounter, this.metricTitles);
      const panel = {
        id: `panel-${++this.panelCounter}`,
        type,
        x: Math.round((this.panelCounter * GRID_SIZE) % Math.max(GRID_SIZE, board.width - baseSize.w)),
        y: Math.round((this.panelCounter * GRID_SIZE) % Math.max(GRID_SIZE, board.height - baseSize.h)),
        w: baseSize.w,
        h: baseSize.h,
        title: metric.title,
        value: metric.value,
        updatedAt: formatTimestamp(),
        gradient: this.gradients[this.panelCounter % this.gradients.length],
      };

      if (this.isSnapEnabled()) {
        panel.x = Math.round(panel.x / snapStep) * snapStep;
        panel.y = Math.round(panel.y / snapStep) * snapStep;
      }

      this.panels.push(panel);

      const placed = this.layoutEngine.resolve(panel.id);
      if (!placed) {
        this.panels = this.panels.filter((item) => item.id !== panel.id);
        this.render();
        this.setStatus('Could not place panel. Try moving others.', 'warn');
        return;
      }

      this.selectPanel(panel.id);
      this.render();
      this.setStatus(`${type[0].toUpperCase() + type.slice(1)} panel added`, 'ok');
    }

    buildExportPayload() {
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        panelCounter: this.panelCounter,
        dragStep: this.getDragStep(),
        snapEnabled: this.isSnapEnabled(),
        widgets: this.panels.map((panel) => ({
          id: panel.id,
          type: panel.type,
          x: panel.x,
          y: panel.y,
          w: panel.w,
          h: panel.h,
          title: panel.title,
          value: panel.value,
          updatedAt: panel.updatedAt,
          gradient: panel.gradient,
        })),
      };
    }

    exportWidgets() {
      const payload = this.buildExportPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `dashboard-widgets-${timestamp}.json`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      this.setStatus(`Exported ${payload.widgets.length} widget(s)`, 'ok');
    }

    normalizeImportedWidget(widget, index) {
      if (!widget || typeof widget !== 'object') {
        return null;
      }

      const type = widget.type === 'square' ? 'square' : 'rectangle';
      const safeNumber = (value, fallback) =>
        Number.isFinite(value) ? Number(value) : fallback;

      const panel = {
        id: typeof widget.id === 'string' && widget.id.trim() ? widget.id : `imported-${index + 1}`,
        type,
        x: safeNumber(widget.x, 0),
        y: safeNumber(widget.y, 0),
        w: safeNumber(widget.w, type === 'square' ? 168 : 336),
        h: safeNumber(widget.h, type === 'square' ? 168 : 192),
        title:
          typeof widget.title === 'string' && widget.title.trim()
            ? widget.title
            : type === 'square'
              ? 'Imported Square'
              : 'Imported Rectangle',
        value:
          typeof widget.value === 'string' && widget.value.trim()
            ? widget.value
            : type === 'square'
              ? '0'
              : '0',
        updatedAt:
          typeof widget.updatedAt === 'string' && widget.updatedAt.trim()
            ? widget.updatedAt
            : formatTimestamp(),
        gradient:
          typeof widget.gradient === 'string' && widget.gradient.trim()
            ? widget.gradient
            : this.gradients[index % this.gradients.length],
      };

      return panel;
    }

    applyImportedPayload(payload) {
      if (!payload || typeof payload !== 'object' || !Array.isArray(payload.widgets)) {
        throw new Error('Invalid JSON format. Expected a widgets array.');
      }

      const importedPanels = payload.widgets
        .map((widget, index) => this.normalizeImportedWidget(widget, index))
        .filter(Boolean);

      if (importedPanels.length === 0) {
        throw new Error('No valid widgets found in JSON.');
      }

      const snapshotPanels = this.snapshotPanels();
      const snapshotSelected = this.selectedId;
      const snapshotCounter = this.panelCounter;
      const snapshotSnap = this.isSnapEnabled();
      const snapshotDragStep = this.dragStep;

      this.panels = importedPanels;
      this.selectedId = null;
      this.panelCounter = Math.max(
        safeInt(payload.panelCounter, 0),
        importedPanels.length,
        ...importedPanels.map((panel) => safeInt(String(panel.id).replace(/\D/g, ''), 0)),
      );

      if (typeof payload.snapEnabled === 'boolean') {
        this.snapToggle.checked = payload.snapEnabled;
      }
      if (Number.isFinite(payload.dragStep)) {
        this.dragStep = clamp(Number(payload.dragStep), DRAG_STEP_MIN, DRAG_STEP_MAX);
        this.dragStepInput.value = String(this.dragStep);
        this.syncDragStepCss();
      }

      const placed = this.layoutEngine.resolve(null);
      if (!placed) {
        this.panels = snapshotPanels;
        this.selectedId = snapshotSelected;
        this.panelCounter = snapshotCounter;
        this.snapToggle.checked = snapshotSnap;
        this.dragStep = snapshotDragStep;
        this.dragStepInput.value = String(this.dragStep);
        this.syncDragStepCss();
        this.layoutEngine.resolve(this.selectedId);
        this.render();
        throw new Error('Imported layout could not be placed without overlap.');
      }

      this.syncBoardHeight(true);
      this.render();
      this.setStatus(`Imported ${importedPanels.length} widget(s)`, 'ok');
    }

    handleImportFile(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || '');
          const payload = JSON.parse(text);
          this.applyImportedPayload(payload);
        } catch (error) {
          this.setStatus(error.message || 'Invalid JSON file', 'warn');
        } finally {
          this.importWidgetsInput.value = '';
        }
      };
      reader.onerror = () => {
        this.setStatus('Unable to read file', 'warn');
        this.importWidgetsInput.value = '';
      };
      reader.readAsText(file);
    }

    removePanel(panelId) {
      const before = this.panels.length;
      this.panels = this.panels.filter((panel) => panel.id !== panelId);

      if (before === this.panels.length) {
        return;
      }

      if (this.selectedId === panelId) {
        this.selectedId = null;
      }

      this.layoutEngine.resolve(this.selectedId);
      this.syncBoardHeight(true);
      this.render();
      this.setStatus('Panel removed', 'ok');
    }

    removeSelectedPanel() {
      if (!this.selectedId) {
        this.setStatus('Select a panel to remove', 'warn');
        return;
      }
      this.removePanel(this.selectedId);
    }

    clearAllPanels() {
      this.panels = [];
      this.selectedId = null;
      this.syncBoardHeight(true);
      this.render();
      this.setStatus('All panels cleared', 'warn');
    }

    selectPanel(panelId) {
      this.selectedId = panelId;
      this.renderSelectionMeta();
    }

    startDrag(panelId, event) {
      if (event.button !== 0) {
        return;
      }

      const panel = this.getPanelById(panelId);
      if (!panel) {
        return;
      }

      event.preventDefault();
      this.selectPanel(panelId);

      const originX = event.clientX;
      const originY = event.clientY;
      const initial = { x: panel.x, y: panel.y };
      const snapStep = this.getDragStep();

      const onMove = (moveEvent) => {
        const board = this.getBoardSize();
        const target = this.getPanelById(panelId);
        if (!target) {
          return;
        }

        const dx = moveEvent.clientX - originX;
        const dy = moveEvent.clientY - originY;
        const maxLeft = Math.max(0, board.width - target.w);

        let nextX = initial.x + dx;
        let nextY = initial.y + dy;

        if (this.isSnapEnabled()) {
          nextX = Math.round(nextX / snapStep) * snapStep;
          nextY = Math.round(nextY / snapStep) * snapStep;
        }

        nextX = clamp(nextX, 0, maxLeft);
        nextY = Math.max(0, nextY);

        this.commitLayoutChange(
          panelId,
          () => {
            target.x = nextX;
            target.y = nextY;
          },
          true,
        );
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.setStatus('Panel moved', 'ok');
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    startResize(panelId, axis, event) {
      if (event.button !== 0) {
        return;
      }

      const panel = this.getPanelById(panelId);
      if (!panel) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.selectPanel(panelId);

      const originX = event.clientX;
      const originY = event.clientY;
      const initial = { w: panel.w, h: panel.h, x: panel.x, y: panel.y, type: panel.type };
      const snapStep = this.getDragStep();

      const onMove = (moveEvent) => {
        const board = this.getBoardSize();
        const target = this.getPanelById(panelId);
        if (!target) {
          return;
        }

        const dx = moveEvent.clientX - originX;
        const dy = moveEvent.clientY - originY;

        const maxWidth = board.width - initial.x;

        this.commitLayoutChange(
          panelId,
          () => {
            const minWidth =
              initial.type === 'square'
                ? DRAG_RESIZE_MIN.square
                : DRAG_RESIZE_MIN.rectangleWidth;
            const minHeight =
              initial.type === 'square'
                ? DRAG_RESIZE_MIN.square
                : DRAG_RESIZE_MIN.rectangleHeight;

            if (axis === 'width' || axis === 'both') {
              let nextW = initial.w + dx;
              if (this.isSnapEnabled()) {
                nextW = Math.round(nextW / snapStep) * snapStep;
              }
              nextW = clamp(nextW, minWidth, maxWidth);

              if (Math.abs(maxWidth - nextW) <= EDGE_SNAP_THRESHOLD) {
                nextW = maxWidth;
              }
              target.w = nextW;
            }

            if (axis === 'height' || axis === 'both') {
              let nextH = initial.h + dy;
              if (this.isSnapEnabled()) {
                nextH = Math.round(nextH / snapStep) * snapStep;
              }
              target.h = Math.max(minHeight, nextH);
            }
          },
          true,
        );
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        const action =
          axis === 'width'
            ? 'Panel width resized'
            : axis === 'height'
              ? 'Panel height resized'
              : 'Panel resized';

        this.setStatus(action, 'ok');
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    renderSelectionMeta() {
      const panel = this.selectedId ? this.getPanelById(this.selectedId) : null;

      if (!panel) {
        this.selectionMetaEl.textContent = 'No panel selected';
        return;
      }

      this.selectionMetaEl.textContent = `Selected: ${panel.type} • ${panel.w} x ${panel.h} at (${panel.x}, ${panel.y})`;
    }

    setStatus(message, tone = 'ok') {
      this.statusBadgeEl.textContent = message;

      const tones = {
        ok: 'bg-emerald-50 text-emerald-700',
        warn: 'bg-amber-50 text-amber-700',
        info: 'bg-sky-50 text-sky-700',
      };

      this.statusBadgeEl.className = `rounded-md px-2.5 py-1.5 font-medium ${tones[tone] || tones.info}`;
    }

    render() {
      const existing = new Map();
      this.dashboardEl.querySelectorAll('[data-panel-id]').forEach((element) => {
        existing.set(element.dataset.panelId, element);
      });

      for (const panel of this.panels) {
        let element = existing.get(panel.id);
        if (!element) {
          element = createPanelElement(panel, {
            onSelect: (panelId) => this.selectPanel(panelId),
            onDragStart: (panelId, event) => this.startDrag(panelId, event),
            onResizeStart: (panelId, axis, event) => this.startResize(panelId, axis, event),
            onRemove: (panelId) => this.removePanel(panelId),
          });

          this.dashboardEl.appendChild(element);
        }

        element.style.left = `${panel.x}px`;
        element.style.top = `${panel.y}px`;
        element.style.width = `${panel.w}px`;
        element.style.height = `${panel.h}px`;
        element.style.zIndex = this.selectedId === panel.id ? '20' : '10';

        if (this.selectedId === panel.id) {
          element.classList.add('ring-2', 'ring-cyan-300');
        } else {
          element.classList.remove('ring-2', 'ring-cyan-300');
        }

        existing.delete(panel.id);
      }

      for (const leftover of existing.values()) {
        leftover.remove();
      }

      this.removeSelectedBtn.disabled = !this.selectedId;
      this.renderSelectionMeta();
    }
  }

  function safeInt(value, fallback) {
    const num = Number.parseInt(value, 10);
    return Number.isFinite(num) ? num : fallback;
  }

  window.PanelDashboard = PanelDashboard;
})();
