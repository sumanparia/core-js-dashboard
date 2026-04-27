(function () {
  window.DashboardConfig = {
    GRID_SIZE: 24,
    DRAG_RESIZE_MIN: {
      square: 120,
      rectangleWidth: 168,
      rectangleHeight: 120,
    },
    DRAG_STEP_DEFAULT: 24,
    DRAG_STEP_MIN: 1,
    DRAG_STEP_MAX: 200,
    EDGE_SNAP_THRESHOLD: 16,
    BOARD_MIN_HEIGHT: 520,
    BOARD_PADDING_BOTTOM: 72,
    BOARD_SCAN_EXTENSION: 240,
    BOARD_MAX_EXTRA_SCAN: 12000,
    gradients: [
      'from-emerald-400 via-teal-500 to-cyan-600',
      'from-cyan-400 via-sky-500 to-blue-600',
      'from-rose-400 via-pink-500 to-fuchsia-600',
      'from-amber-400 via-orange-500 to-rose-500',
      'from-violet-400 via-purple-500 to-indigo-600',
    ],
    metricTitles: [
      'Freezer Temperature',
      'Warehouse Utilization',
      'Orders in Queue',
      'Power Consumption',
      'On-Time Delivery',
      'Packing Throughput',
    ],
  };
})();
