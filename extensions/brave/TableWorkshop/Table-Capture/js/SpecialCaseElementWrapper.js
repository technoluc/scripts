class SpecialCaseElementWrapper extends ElementWrapper {
  constructor(element, url, pageTitle, windowName, userConfig) {
    super(element, url, userConfig);

    // NOTE(gmike): This and .def get accessed directly.
    this.pageTitle = pageTitle;
    this.windowName = windowName;
  }

  setTableIndex(tableIndex) {
    this.def.index = tableIndex;
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
}
