class DataProvider {
  constructor() {
    this.selectionActionCount_ = 0;
    this.selectionAttemptCount_ = 0;
    this.browserEnv_ = new BrowserEnv();

    this.getSelectionAttemptCount();
  }

  // This is a safer, synchronous version of getBackgroundPageP().
  getChromeBackgroundPage_() {
    if (typeof chrome.extension.getBackgroundPage === "function") {
      return chrome.extension.getBackgroundPage();
    }
    throw new Error(
      "Table Capture is having trouble operating; you may be in private browsing mode."
    );
  }

  isPdfPage() {
    return this.getChromeBackgroundPage_().isActiveTabPdfPage();
  }

  isXmlPage() {
    return this.getChromeBackgroundPage_().isActiveTabXmlPage();
  }

  isZillowYannPage() {
    // Limit to 2023 for now.
    if (new Date().getFullYear() > 2023) {
      return false;
    }

    const url = this.getCurrentWindowLocation();
    return (
      url &&
      (url.includes("https://zillow.com") ||
        url.includes("https://www.zillow.com"))
    );
  }

  isGoogleSheetsAppPage() {
    const url = this.getCurrentWindowLocation();
    return (
      url &&
      url.includes("docs.google.com/spreadsheets") &&
      !url.includes("htmlview")
    );
  }

  isPowerBiPage() {
    const url = this.getCurrentWindowLocation();
    return (
      url &&
      (url.includes("https://powerbi.com/") ||
        url.includes("https://app.powerbi.com/"))
    );
  }

  isAirtableAppPage() {
    const url = this.getCurrentWindowLocation();
    return (
      url &&
      (url.includes("https://airtable.com/") ||
        url.includes("https://www.airtable.com/"))
    );
  }

  getCurrentWindowLocation() {
    return this.getChromeBackgroundPage_().getPageUrlForActiveTab();
  }

  getNumTables() {
    return this.getTableDefs().tables.length;
  }

  hasTables() {
    return this.getNumTables() > 0;
  }

  triggerRefresh(tabId, popupInitiated) {
    return this.browserEnv_
      .getBackgroundPageP()
      .then((backgroundPage) =>
        backgroundPage.triggerRefresh(tabId, popupInitiated)
      );
  }

  getActiveTabId_() {
    return this.browserEnv_
      .getBackgroundPageP()
      .then((backgroundPage) => backgroundPage.getSelectedTabId());
  }

  getSelectedElementFrameId() {
    const selectedElement = this.getSelectedElementDef();
    if (selectedElement) {
      return selectedElement.frameId;
    }
    return null;
  }

  getSelectedElementDef() {
    let selectedElement = null;

    const tableDefs = this.getChromeBackgroundPage_().getActiveTableDefs();
    if (tableDefs) {
      Object.keys(tableDefs).forEach((key) => {
        if (tableDefs[key].selectedElement) {
          selectedElement = tableDefs[key].selectedElement;
        }
      });
    }
    return selectedElement;
  }

  getTableDefs() {
    const tableDefs = this.getChromeBackgroundPage_().getActiveTableDefs();
    if (tableDefs) {
      let selectedElement = null;
      let selectedTableWrapper = null;
      let tables = [];

      Object.keys(tableDefs).forEach((key) => {
        const def = tableDefs[key];
        tables = tables.concat(def.tables);

        if (def.selectedElement) {
          selectedElement = def.selectedElement;
        } else if (
          def.selectedTableWrapperIndex !== null &&
          def.tables &&
          def.selectedTableWrapperIndex < def.tables.length
        ) {
          selectedTableWrapper = def.tables[def.selectedTableWrapperIndex];
        }
      });

      // NOTE(gmike): Bela bug, 12/23/2019.
      // Filter out any bad values.
      tables = tables.filter((t) => !!t);

      tables.forEach((tableWrapper, i) => {
        tableWrapper.displayIndex = i;
      });

      return {
        selectedElement,
        selectedTableWrapper,
        tables,
      };
    }

    return {
      tables: [],
    };
  }

  sendMessageToActiveTab(params) {
    const action = params && params.action;
    return new Promise((resolve, reject) => {
      this.getActiveTabId_().then((tabId) => {
        chrome.tabs.sendMessage(tabId, params, (response) => {
          if (this.browserEnv_.hasRuntimeError()) {
            return reject(this.browserEnv_.getRuntimeError());
          }
          if (response && response.err) {
            return reject(new Error(response.err));
          }
          resolve(response);
        });
      });
    });
  }

  sendMessageToActiveTabFrame(params, frameId) {
    const action = params && params.action;
    return new Promise((resolve, reject) => {
      this.getActiveTabId_().then((tabId) => {
        chrome.tabs.sendMessage(tabId, params, { frameId }, (response) => {
          if (this.browserEnv_.hasRuntimeError()) {
            return reject(this.browserEnv_.getRuntimeError());
          }
          if (response && response.err) {
            return reject(new Error(response.err));
          }
          resolve(response);
        });
      });
    });
  }

  //// SELECTION ACTIONS

  hasAttemptedSelection() {
    return this.selectionAttemptCount_ > 0;
  }

  incrementSelectionActionCount() {
    this.selectionActionCount_++;
    this.browserEnv_
      .getSyncStorageApi()
      .setP({ [_TCAP_CONFIG.selectionEventKey]: this.selectionActionCount_ });
  }

  incrementSelectionAttemptCount() {
    this.selectionAttemptCount_++;
    this.browserEnv_.getSyncStorageApi().setP({
      [_TCAP_CONFIG.selectionAttemptKey]: this.selectionAttemptCount_,
    });
  }

  getSelectionActionCount() {
    return this.browserEnv_
      .getSyncStorageApi()
      .getP({ [_TCAP_CONFIG.selectionEventKey]: 0 })
      .then((values) => {
        this.selectionActionCount_ = values[_TCAP_CONFIG.selectionEventKey];
        return Promise.resolve(this.selectionActionCount_);
      });
  }

  getSelectionAttemptCount() {
    return this.browserEnv_
      .getSyncStorageApi()
      .getP({ [_TCAP_CONFIG.selectionAttemptKey]: 0 })
      .then((values) => {
        this.selectionAttemptCount_ = values[_TCAP_CONFIG.selectionAttemptKey];
        return Promise.resolve(this.selectionAttemptCount_);
      });
  }
}
