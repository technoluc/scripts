class SelectionWorkshopDataManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.onDataSetHandlers_ = [];

    // These are all destroyable.
    this.treatAsTable_ = true;
    this.identityColumns_ = {};
    this.elementWrapper_ = null;
    this.rows_ = 0;
    this.cols_ = 0;
    this.dataArray_ = null;
    this.popableDataArray_ = null;
    this.latestDataArray_ = null;
  }

  destroy() {
    this.treatAsTable_ = true;
    this.identityColumns_ = {};
    this.elementWrapper_ = null;
    this.rows_ = 0;
    this.cols_ = 0;
    this.dataArray_ = null;
    this.popableDataArray_ = null;
    this.latestDataArray_ = null;
  }

  addOnDataSetHandler(handler) {
    this.onDataSetHandlers_.push(handler);
  }

  setTreatAsTable(treatAsTable) {
    this.treatAsTable_ = treatAsTable;
  }

  setIdentityColumns(identityColumns) {
    this.identityColumns_ = identityColumns;
  }

  setElementWrapper(elementWrapper) {
    this.elementWrapper_ = elementWrapper;
  }

  getElementWrapper() {
    return this.elementWrapper_;
  }

  getExtractionOptions() {
    return {
      treatAsTable: this.treatAsTable_,
      identityColumns: this.identityColumns_,
    };
  }

  hasData() {
    return this.dataArray_ !== null && this.dataArray_.length > 0;
  }

  hasSubstantialData() {
    return this.dataArray_ && this.dataArray_.length > 20;
  }

  getDataAttributes() {
    return {
      rows: this.rows_,
      cols: this.cols_,
      dataArray: this.dataArray_,
    };
  }

  getRowCount(nullVal = 0) {
    return this.dataArray_ ? this.dataArray_.length : nullVal;
  }

  getDataArray(outputFormat) {
    // TODO(gmike): Possibly transform/process.
    return this.dataArray_;
  }

  getDataArrayAsString(outputFormat) {
    const str = TableUtil.arrayOfArraysToString(
      this.dataArray_,
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

  setDataArray(dataArray, popable = false) {
    this.dataArray_ = JSON.parse(JSON.stringify(dataArray));
    this.rows_ = this.dataArray_.length;
    this.cols_ = _tcSmartColCount(dataArray);

    // NOTE(gmike, 3-5-2023): I have no idea why this is a thing.
    // this.data_.dataArray = JSON.parse(JSON.stringify(this.data_.dataArray));

    if (popable) {
      this.popableDataArray_ = JSON.parse(JSON.stringify(dataArray));
    }

    this.handleDataSet_();
  }

  popData() {
    if (this.popableDataArray_) {
      this.dataArray_ = JSON.parse(JSON.stringify(this.popableDataArray_));
    }
  }

  handleDataSet_() {
    this.onDataSetHandlers_.forEach((handler) => handler());
  }

  saveDataCopy() {
    this.latestDataArray_ = JSON.parse(JSON.stringify(this.dataArray_));
  }
}
