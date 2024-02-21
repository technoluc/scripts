(function (root, module, global, define) {
  "use strict";

  const WorkshopEvent = {
    BETA: "BETA",
    CLEAR: "CLEAR",
    FRAME_EXPAND: "FRAME_EXPAND",
    MAXIMIZE: "MAXIMIZE",
    MINIMIZE: "MINIMIZE",
    REMOVE: "REMOVE",
    SEARCH: "SEARCH",
    TOOLTIP_SHOW: "TOOLTIP_SHOW",
    TOOLTIP_CLEAR: "TOOLTIP_CLEAR",
  };

  if (module && module.exports) {
    module.exports = WorkshopEvent;
  } else if (define) {
    define(function () {
      return WorkshopEvent;
    });
  } else {
    root.WorkshopEvent = WorkshopEvent;
  }
})(
  this,
  typeof module !== "undefined" ? module : undefined,
  typeof global !== "undefined" ? global : undefined,
  typeof define !== "undefined" ? define : undefined
);
