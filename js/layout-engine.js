(function () {
  const {
    DRAG_RESIZE_MIN,
    BOARD_SCAN_EXTENSION,
    BOARD_MAX_EXTRA_SCAN,
  } = window.DashboardConfig;
  const { clamp, toRect, hasCollision, sortPanelsTopLeft } = window.DashboardHelpers;

  class DashboardLayoutEngine {
    constructor(dashboard) {
      this.dashboard = dashboard;
    }

    normalizePanelBounds(panel, board) {
      const minWidth =
        panel.type === 'square' ? DRAG_RESIZE_MIN.square : DRAG_RESIZE_MIN.rectangleWidth;
      const minHeight =
        panel.type === 'square' ? DRAG_RESIZE_MIN.square : DRAG_RESIZE_MIN.rectangleHeight;

      panel.w = clamp(panel.w, minWidth, board.width);
      panel.h = Math.max(minHeight, panel.h);

      const maxLeft = Math.max(0, board.width - panel.w);

      panel.x = clamp(panel.x, 0, maxLeft);
      panel.y = Math.max(0, panel.y);
      this.dashboard.ensureBoardHeightFor(panel.y + panel.h);
    }

    findNearestOpenSpot(panel, occupiedRects, board) {
      const step = this.dashboard.isSnapEnabled() ? this.dashboard.getDragStep() : 8;
      const maxLeft = Math.max(0, board.width - panel.w);
      const preferredX = clamp(panel.x, 0, maxLeft);
      const preferredY = Math.max(0, panel.y);

      let best = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      let scanHeight = Math.max(board.height, panel.h, preferredY + panel.h);
      const maxScanHeight = scanHeight + BOARD_MAX_EXTRA_SCAN;

      const tryCandidate = (x, y) => {
        const candidate = {
          left: x,
          top: y,
          width: panel.w,
          height: panel.h,
        };

        if (hasCollision(candidate, occupiedRects)) {
          return;
        }

        const distance = Math.abs(x - preferredX) + Math.abs(y - preferredY);
        if (distance < bestDistance) {
          best = { x, y };
          bestDistance = distance;
        }
      };

      while (!best && scanHeight <= maxScanHeight) {
        const maxTop = Math.max(0, scanHeight - panel.h);
        tryCandidate(preferredX, clamp(preferredY, 0, maxTop));

        for (let y = 0; y <= maxTop; y += step) {
          for (let x = 0; x <= maxLeft; x += step) {
            tryCandidate(x, y);
          }
          tryCandidate(maxLeft, y);
        }

        for (let x = 0; x <= maxLeft; x += step) {
          tryCandidate(x, maxTop);
        }
        tryCandidate(maxLeft, maxTop);

        if (!best) {
          scanHeight += BOARD_SCAN_EXTENSION;
        }
      }

      if (best) {
        this.dashboard.ensureBoardHeightFor(best.y + panel.h);
      }

      return best;
    }

    resolve(anchorId = null) {
      const board = this.dashboard.getBoardSize();
      const occupiedRects = [];

      const anchor = anchorId ? this.dashboard.getPanelById(anchorId) : null;
      if (anchor) {
        this.normalizePanelBounds(anchor, board);
        occupiedRects.push(toRect(anchor));
      }

      const movable = this.dashboard.panels
        .filter((panel) => panel.id !== anchorId)
        .sort((a, b) => sortPanelsTopLeft(a, b));

      for (const panel of movable) {
        this.normalizePanelBounds(panel, board);

        const currentRect = toRect(panel);
        if (hasCollision(currentRect, occupiedRects)) {
          const spot = this.findNearestOpenSpot(panel, occupiedRects, board);
          if (!spot) {
            return false;
          }
          panel.x = spot.x;
          panel.y = spot.y;
        }

        occupiedRects.push(toRect(panel));
      }

      this.dashboard.syncBoardHeight(false);
      return true;
    }
  }

  window.DashboardLayoutEngine = DashboardLayoutEngine;
})();
