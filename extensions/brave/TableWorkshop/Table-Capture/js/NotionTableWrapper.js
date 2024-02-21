class NotionTableWrapper extends SpecialCaseElementWrapper {
  constructor(element, url, pageTitle, windowName, userConfig) {
    super(element, url, pageTitle, windowName, userConfig);

    this.define_();
  }

  getTableId() {
    return "notion-table";
  }

  isValid() {
    return (
      !!this.domElement_ &&
      window.location &&
      (window.location.hostname.endsWith("notion.so") ||
        window.location.hostname.endsWith("notion.site"))
    );
  }

  define_() {
    const { id, adjustedId, pathTo } = this.getDomAttributes_(this.domElement_);

    const rows = Array.from(
      this.domElement_.querySelectorAll(".notion-collection-item")
    );
    const nRows = rows.length;
    const nCols =
      rows && rows.length
        ? rows.map((row) => row.childElementCount).sort((a, b) => b - a)[0]
        : 0;

    // Note: Trailing space is intended.
    const size = `(${nRows} x ${nCols}) `;

    this.def = {
      pathTo,
      numCells: nRows * nCols,
      table: {
        id: size + id,
        adjusted: size + adjustedId,
        rows: nRows,
        columns: nCols,
        windowName: this.windowName,
      },
    };
  }

  getAsArrays() {
    const notionTableViewToArray = (node, userConfig) => {
      const allRows = [];
      Array.from(node.querySelectorAll(".notion-collection-item")).forEach(
        (rowNode) => {
          let ucNodeName = _tcGetUCNodeName(rowNode);
          let path = `root.${ucNodeName}`;

          const row = [];
          _tcArbNodeToArray(rowNode, userConfig, false, 1, "", allRows, row);
          allRows.push(row);
        }
      );
      return TableUtil.arbAlign(allRows, true);
    };

    return notionTableViewToArray(this.domElement_, this.userConfig_);
  }
}
