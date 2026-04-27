(function () {
  const helpers = {
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    },

    toRect(panel) {
      return {
        left: panel.x,
        top: panel.y,
        width: panel.w,
        height: panel.h,
      };
    },

    overlaps(rectA, rectB) {
      return (
        rectA.left < rectB.left + rectB.width &&
        rectA.left + rectA.width > rectB.left &&
        rectA.top < rectB.top + rectB.height &&
        rectA.top + rectA.height > rectB.top
      );
    },

    hasCollision(rect, occupiedRects) {
      return occupiedRects.some((other) => helpers.overlaps(rect, other));
    },

    sortPanelsTopLeft(a, b) {
      const byTop = a.y - b.y;
      if (byTop !== 0) {
        return byTop;
      }
      return a.x - b.x;
    },

    formatTimestamp() {
      const now = new Date();
      return now.toLocaleString([], {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    },

    generateMetric(type, panelCounter, metricTitles) {
      const title = metricTitles[panelCounter % metricTitles.length];

      if (title === 'Freezer Temperature') {
        return { title, value: '-18.42 C' };
      }

      if (title === 'On-Time Delivery') {
        return { title, value: `${94 + (panelCounter % 5)}%` };
      }

      if (type === 'square') {
        return { title, value: `${(120 + panelCounter * 17).toLocaleString()}` };
      }

      return { title, value: `${(4200 + panelCounter * 93).toLocaleString()}` };
    },
  };

  window.DashboardHelpers = helpers;
})();
