(function (root, module, global, define) {
  "use strict";

  const OutputFormat = {
    AIRTABLE: "AIRTABLE",
    CLIPBOARD: "CLIPBOARD",
    CLIPBOARD_DOCUMENT: "CLIPBOARD_DOCUMENT",
    HTML: "HTML",
    MARKDOWN: "MARKDOWN",
    CSV: "CSV",
    EXCEL: "EXCEL",
    GOOG: "GOOG",
    OFFICE365: "OFFICE365",
    UNKNOWN: "UNKNOWN",
  };

  if (module && module.exports) {
    module.exports = OutputFormat;
  } else if (define) {
    define(function () {
      return OutputFormat;
    });
  } else {
    root.OutputFormat = OutputFormat;
  }
})(
  this,
  typeof module !== "undefined" ? module : undefined,
  typeof global !== "undefined" ? global : undefined,
  typeof define !== "undefined" ? define : undefined
);
