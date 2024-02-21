class TableWrapper extends ElementWrapper {
  constructor(table, url, windowName, userConfig) {
    super(table, url, userConfig);

    this.domElement_ = table;
    this.inlineMenu_ = null;

    // NOTE(gmike): This and .def get accessed directly.
    this.windowName = windowName;

    this.define_();
  }

  isTableWrapper() {
    return true;
  }

  destroy() {
    super.destroy();
    // NOTE(gmike): I don't know why I'm not doing this at the ElementWrapper level.
    this.domElement_ = null;
    this.removeInlineMenu();
  }

  getRecipeDefinition() {
    const baseRecipe = super.getRecipeDefinition();
    if (!baseRecipe.selector) {
      baseRecipe.fuzzySelector = true;
      baseRecipe.selector = "table";
    }
    return {
      ...baseRecipe,
    };
  }

  setTableIndex(tableIndex) {
    this.def.index = tableIndex;
  }

  inferTableIndex() {
    const matchingIndex = Array.from(document.querySelectorAll("table"))
      .filter((t) => !t.classList.contains("tc-ignore"))
      .map((table, index) => ({ table, tableIndex: index }))
      .filter((pair) => pair.table === this.domElement_);
    if (matchingIndex.length === 1) {
      this.setTableIndex(matchingIndex[0].tableIndex);
    }
  }

  supportsInlineMenu() {
    return true;
  }

  getTableId() {
    return this.def.table.id;
  }

  isValid() {
    const numCells = this.def.numCells;
    if (numCells <= _TCAP_CONFIG.minValidNumCells) {
      return false;
    }

    // Ignore selection workshop tables.
    if (this.domElement_ && this.domElement_.classList.contains("tc-ignore")) {
      return false;
    }

    // If the user wants to ignore hidden tables, don't show them.
    if (
      this.userConfig_.ignoreHiddenTables &&
      (this.domElement_.offsetHeight < 1 || this.domElement_.offsetWidth < 1)
    ) {
      return false;
    }

    return this.def.table.columns !== 0 && this.def.table.rows !== 0;
  }

  define_() {
    const table = this.domElement_;
    const { id, adjustedId, pathTo } = this.getDomAttributes_(table);

    const rows = table.getElementsByTagName("TR");
    const nRows = rows.length;
    const nCols = this.getNumTableColumns_(rows);

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

  getNumTableColumns_(rows) {
    if (!rows || rows.length === 0) {
      return 0;
    }

    return Array.from(rows)
      .map((row) => row.childElementCount)
      .sort((a, b) => b - a)[0];
  }

  screenshot() {
    _tcLogTableWrapperMessageAction(
      this,
      MessageAction.SCREENSHOT,
      null,
      this.userConfig_
    );
    return super.screenshot();
  }

  getAsString(outputFormat) {
    const str = TableUtil.tableNodeToString(
      this.domElement_,
      _TCAP_COPY_CONST.rowSeparator,
      _TCAP_COPY_CONST.colSeparator,
      this.userConfig_
    );
    return TableUtil.postProcessFinalString(
      str,
      outputFormat,
      _TCAP_COPY_CONST,
      this.userConfig_
    );
  }

  getAsArrays() {
    return TableUtil.nodeToArrays(
      this.domElement_,
      _TCAP_COPY_CONST.rowSeparator,
      _TCAP_COPY_CONST.colSeparator,
      this.userConfig_,
      true
    );
  }

  copy(outputFormat) {
    _tcLogTableWrapperMessageAction(
      this,
      MessageAction.COPY,
      outputFormat,
      this.userConfig_
    );
    return super.copy(outputFormat);
  }

  //// INLINE MENUS

  flashInlineMessage(message) {
    const wrapper = this.inlineMenu_.querySelector(
      "._tc_inline_status_message"
    );
    wrapper.innerText = message;
    wrapper.classList.remove("_tc_not_shown");
  }

  removeInlineMenu() {
    try {
      if (this.inlineMenu_) {
        this.inlineMenu_.remove();
        this.inlineMenu_ = null;
      }
    } catch (err) {}
  }

  attachInlineMenu(inlineMenu) {
    if (this.inlineMenu_) {
      return;
    }

    // Set and update its position.
    const rect = this.domElement_.getBoundingClientRect();
    inlineMenu.style.top = rect.top + window.scrollY - 16 + "px";
    inlineMenu.style.left = rect.left + window.scrollX - 16 + "px";

    this.inlineMenu_ = inlineMenu;
    document.body.appendChild(this.inlineMenu_);
  }
}
