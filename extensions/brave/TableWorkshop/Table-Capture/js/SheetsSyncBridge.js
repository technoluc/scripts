class SheetsSyncBridge {
  constructor(tabId) {
    this.tabId_ = tabId;
    this.sheetWriteInterval_ = null;
    this.sheetWriteIntervalDuration_ = _TCAP_CONFIG.sheetSyncWriteInterval;
    this.writeParams_ = null;

    this.creationOperationMap_ = {};
  }

  isCreateOperationOngoing(instanceId) {
    return !!this.creationOperationMap_[instanceId];
  }

  setSheetEntry(sheet) {
    const params = {
      action: MessageAction.SHEET_LIST_UPDATE,
      sheet,
    };
    return new BrowserEnv()
      .sendMessage(params)
      .then((response) => Promise.resolve());
  }

  resetAll() {
    const params = {
      action: MessageAction.SHEET_LIST_RESET,
    };
    return new BrowserEnv().sendMessage(params);
  }

  getSheets() {
    const params = {
      action: MessageAction.SHEET_LIST,
    };
    return new BrowserEnv().sendMessage(params).then((response) => {
      return response.sheets ?? {};
    });
  }

  createSheet(instanceId, sync, sheetOptions) {
    this.creationOperationMap_[instanceId] = true;

    const params = {
      tabId: this.tabId_,
      sheetOptions,
      action: MessageAction.SHEET_SYNC_CREATE,
      host: window.location.host,
      instanceId,
    };
    return new BrowserEnv()
      .sendMessage(params)
      .then((response) => {
        if (!response || !response.sheet) {
          throw new Error("Unable to create sheet");
        }

        if (sync && !this.sheetWriteInterval_) {
          this.sheetWriteInterval_ = window.setInterval(
            this.performDataWrite_.bind(this),
            this.sheetWriteIntervalDuration_
          );
        }
        return response;
      })
      .finally(() => {
        this.creationOperationMap_[instanceId] = false;
      });
  }

  performDataWrite_() {
    return new BrowserEnv()
      .sendMessage(this.writeParams_)
      .then(this.resolve_)
      .catch(this.reject_);
  }

  writeToSheet(instanceId, sheetId, dataArray, writeNow, sheetOptions) {
    this.writeParams_ = {
      tabId: this.tabId_,
      action: MessageAction.SHEET_SYNC_WRITE,
      instanceId,
      sheetId,
      sheetOptions,
      dataArray,
    };

    return new Promise((resolve, reject) => {
      this.resolve_ = resolve;
      this.reject_ = reject;

      if (writeNow) {
        this.performDataWrite_();
      }
    });
  }

  getSheetsInSpreadsheet(sheetId) {
    const params = {
      host: window.location.host,
      tabId: this.tabId_,
      action: MessageAction.SHEET_SHEET_LIST,
      sheetId,
    };
    return new BrowserEnv().sendMessage(params);
  }
}
