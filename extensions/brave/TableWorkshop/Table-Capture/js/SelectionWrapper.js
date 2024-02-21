class SelectionWrapper extends ElementWrapper {
  constructor(element, url, userConfig) {
    super(element, url, userConfig);

    this.elStack_ = [];
    this.treatAsTable_ = true;
    this.define_();
  }

  isSelectionWrapper() {
    return true;
  }

  getTableId() {
    return this.def && this.def.id;
  }

  getRecipeDefinition() {
    return {
      name: "",
      description: "",
      urlRegex: `https:\/\/.*${window.location.host}\..*`,
      urlExample: window.location.href,
      selector: ``,
      disabled: false,
      autoClip: false,
    };
  }

  getReproOptions() {
    return {
      treatAsTable: this.treatAsTable_,
    };
  }

  setTreatAsTable(treatAsTable) {
    this.treatAsTable_ = treatAsTable;
  }

  define_() {
    const { id, name, className, pathTo } = this.getDomAttributes_(
      this.domElement_
    );

    this.def = {
      id,
      name,
      className,
      pathTo,
      rows: 0,
    };
    this.updateNumRows_();
  }

  updateDefine_() {
    const { id, name, className, pathTo } = this.getDomAttributes_(
      this.domElement_
    );
    this.def.id = id;
    this.def.name = name;
    this.def.className = className;
    this.def.pathTo = pathTo;
    this.updateNumRows_();
  }

  updateNumRows_() {
    this.def.rows = this.domElement_.childElementCount;
    // This is just an estimate.
    this.def.numCells = this.def.rows * 5;
  }

  setElement(node) {
    this.unhighlight();
    this.elStack_.push([]);
    this.domElement_ = node;
    this.updateDefine_();
    this.highlight();
  }

  selectParent() {
    let parent = this.domElement_.parentNode;
    if (!parent) {
      return;
    }

    this.unhighlight();

    while (parent && parent.childElementCount === 1) {
      parent = parent.parentNode;
    }

    if (!parent) {
      return;
    }

    this.elStack_.push(this.domElement_);
    this.domElement_ = parent;
    this.updateDefine_();
    this.highlight();
  }

  selectPrevious() {
    if (this.elStack_.length == 0) {
      return;
    }

    this.unhighlight();
    this.domElement_ = this.elStack_.pop();
    this.updateDefine_();
    this.highlight();
  }

  getAsArrays() {
    return TableUtil.arbNodeToAlignedArray(
      this.domElement_,
      this.userConfig_,
      this.treatAsTable_
    );
  }

  getAsString(outputFormat) {
    const alignedArray = this.getAsArrays();
    const str = TableUtil.arrayOfArraysToString(
      alignedArray,
      _TCAP_COPY_CONST.rowSeparator,
      _TCAP_COPY_CONST.colSeparator
    );
    return TableUtil.postProcessFinalString(
      str,
      outputFormat,
      _TCAP_COPY_CONST,
      this.userConfig_
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
}
