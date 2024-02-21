class TableManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.tables_ = [];

    this.selectionNode_ = null;
    this.selectionWrapper_ = null;
    this.selectedTableWrapper_ = null;
  }

  getSelectionWrapper() {
    return this.selectionWrapper_;
  }

  clearSelection() {
    this.selectionWrapper_ = null;
    this.selectedTableWrapper_ = null;
  }

  initSelectedElement() {
    this.selectedTableWrapper_ = null;
    if (this.selectionWrapper_) {
      this.selectionWrapper_.unhighlight();
      this.selectionWrapper_ = null;
    }

    this.selectionNode_ = _tcGetSelectedNodeFromSelection();
    if (!this.selectionNode_) {
      return;
    }

    if (_tcIsNodeWithinTable(this.selectionNode_)) {
      this.selectedTableWrapper_ = this.findTableWrapperViaSelection(
        this.selectionNode_
      );
      return;
    }

    const url = window.location.href;
    this.selectionWrapper_ = new SelectionWrapper(
      this.selectionNode_,
      url,
      this.userConfig_
    );
    this.selectedTableWrapper_ = null;
  }

  getSelectedTableWrapperIndex() {
    return this.selectedTableWrapper_ && this.selectedTableWrapper_.def.index;
  }

  findTableWrapperViaSelection(node) {
    let tableNode = null;
    while (node && node != document.body) {
      if (_tcTagNameCompare(node, "TABLE")) {
        tableNode = node;
        break;
      }
      node = node.parentElement;
    }
    if (!tableNode) {
      return null;
    }
    const tableWrappers = this.tables_.filter(
      (wrapper) => wrapper.getDomElement() == tableNode
    );
    if (tableWrappers.length === 1) {
      return tableWrappers[0];
    }
    return null;
  }

  getTables() {
    return this.tables_ || [];
  }

  getTable(index) {
    return this.tables_[index];
  }

  destroy() {
    this.getTables().forEach((tableWrapper) => tableWrapper.destroy());
    this.tables_ = [];

    if (this.selectionWrapper_) {
      this.selectionWrapper_.unhighlight();
    }
  }

  getAllTableDefs() {
    return this.getTables().map((tableWrapper, i) => {
      tableWrapper.setTableIndex(i);
      return tableWrapper.toJSON();
    });
  }

  findTables() {
    const { href, hostname } = window.location;
    if (
      href &&
      href.includes("google.com/spreadsheets") &&
      !href.includes("htmlview")
    ) {
      return;
    }

    const pageTitle = document.title;
    const windowName = _tcGetWindowName(window);

    if (this.userConfig_.paidPro && this.userConfig_.recipes) {
      this.userConfig_.recipes
        .filter((r) => r.status === "active" && !r.disabled)
        .forEach((recipe) => {
          if (href.match(new RegExp(recipe.urlRegex))) {
            const element = document.querySelector(recipe.selector);
            if (element) {
              const recipeWrapper = new RecipeTableWrapper(
                recipe,
                element,
                href,
                pageTitle,
                windowName,
                this.userConfig_
              );
              this.tables_.push(recipeWrapper);
            }
          }
        });
    }

    // Domain-specific tables.
    if (hostname.endsWith(".notion.so") || hostname.endsWith(".notion.site")) {
      Array.from(document.querySelectorAll(".notion-table-view")).forEach(
        (table) => {
          this.tables_.push(
            new NotionTableWrapper(
              table,
              href,
              pageTitle,
              windowName,
              this.userConfig_
            )
          );
        }
      );
    }

    // Look for <table> tables.
    window.document.body.querySelectorAll("table").forEach((table) => {
      const wrapper = new TableWrapper(
        table,
        href,
        windowName,
        this.userConfig_
      );
      if (wrapper.isValid()) {
        this.tables_.push(wrapper);
      }
    });
  }
}
