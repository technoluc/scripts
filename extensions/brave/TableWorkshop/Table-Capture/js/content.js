const tableMan = {};
let contextMenuEl = null;
let selectionWorkshop = null;
let alertTimeout = null;

//// WATCHERS

function handleWatchElementAction(req, cb) {
  // TODO(gmike): Implement this.
}

////

function handlePagingContinuation(req) {
  let {
    tabId,
    pathToElement,
    pathToPager,
    pagerSelector,
    pageCount,
    userConfig,
    continuationKey,
    treatAsTable,
    autoPageTable,
    firstPageSize,
    dataAttributes,
  } = req;

  if (selectionWorkshop) {
    // No-op. Already paging for this continuation event.
    if (
      selectionWorkshop.isPaging(continuationKey) ||
      selectionWorkshop.isOnSamePage(pageCount)
    ) {
      return;
    }

    selectionWorkshop.destroy(false);
  }

  const workshopNode = _tcGetElementByXpath(pathToElement);
  selectionWorkshop = new SelectionWorkshop(tabId, userConfig, workshopNode);
  selectionWorkshop.setPagingData(
    dataAttributes.dataArray,
    pageCount,
    continuationKey,
    treatAsTable,
    pathToElement,
    pathToPager,
    pagerSelector,
    autoPageTable,
    firstPageSize
  );
  selectionWorkshop.renderPagingMode(false);
}

function handleInlineToWorkshopEvent({ tabId, tableWrapper, userConfig }) {
  const manager = getTableManagerForWindow();
  if (manager) {
    manager.destroy();
  }

  if (selectionWorkshop) {
    selectionWorkshop.destroy(true);
  }

  const workshopNode = tableWrapper.getDomElement();
  selectionWorkshop = new SelectionWorkshop(tabId, userConfig, workshopNode);
  selectionWorkshop.renderSelectionMode();
}

function handleRecipeWorkshopClipEvent({ userConfig, recipe }) {
  if (window == top) {
    const dataClipper = new DataClipper(userConfig);
    dataClipper.clipAndSaveRecipe(recipe, true);
  }
}

function handleRecipeWorkshopEvent({ tabId, userConfig, recipe, onLoad }) {
  if (onLoad) {
    try {
      eval(`() => { ${recipe.onLoadFn} }`)();
    } catch (err) {
      console.log("Recipe OnLoad: Error Caught, NBD");
      console.error(err);
    }
    return;
  }

  if (selectionWorkshop) {
    selectionWorkshop.destroy(true);
  }

  if (window == top) {
    const workshopNode = document.querySelector(recipe.selector);
    selectionWorkshop = new SelectionWorkshop(tabId, userConfig, workshopNode);
    selectionWorkshop.renderRecipeMode(recipe);
  }
}

function handleSelectionWorkshopEvent(
  { tabId, hasSelection, forTable, userConfig },
  tableWrapper = null
) {
  if (selectionWorkshop) {
    selectionWorkshop.destroy(true);
  }

  let selectionNode = null;
  if (forTable && tableWrapper) {
    selectionNode = tableWrapper.getDomElement();
  } else {
    selectionNode = _tcGetSelectedNodeFromSelection();
  }

  const workshopNode = selectionNode || contextMenuEl;

  // If the background page thinks we have a section and the content script doesn't,
  // we are operating on the wrong frame.
  if ((hasSelection && selectionNode) || !hasSelection) {
    selectionWorkshop = new SelectionWorkshop(tabId, userConfig, workshopNode);
    selectionWorkshop.renderSelectionMode();
  } else if (window == top) {
    const framesWithSelection = Array.from(document.querySelectorAll("iframe"))
      .filter((frame) => !frame.src)
      .filter((frame) => frame.contentWindow.getSelection().toString());
    if (framesWithSelection && framesWithSelection.length == 1) {
      const frame = framesWithSelection[0];

      selectionWorkshop = new SelectionWorkshop(
        tabId,
        userConfig,
        workshopNode
      );
      selectionWorkshop.bindToWindowFrame(frame);
      selectionWorkshop.renderSelectionMode();
    } else if (workshopNode && workshopNode.shadowRoot) {
      selectionNode = _tcGetSelectedNodeFromShadowRootSelection(
        workshopNode.shadowRoot
      );
      if (selectionNode) {
        selectionWorkshop = new SelectionWorkshop(
          tabId,
          userConfig,
          selectionNode
        );
        selectionWorkshop.renderSelectionMode();
      }
    }
  } else {
    if (_TCAP_CONFIG.devDebug) {
      const isTopWindow = window == top;
      const noOpContext = `top: ${isTopWindow}, hasSelection: ${hasSelection}, selectionNode: ${!!selectionNode}, Tab#${tabId}`;
      console.log(
        `content.js::handleSelectionWorkshopEvent() -> No-op (${noOpContext})`
      );
    }
  }
}

function performRepro({ repro, userConfig }, cb) {
  const el = _tcGetElementByXpath(repro.pathTo);
  if (!el) {
    return _tcPageToast("Unable to find table element.", "error");
  }

  if (!userConfig.paidPro) {
    return _tcPageToast("Upgrade to Pro for action replay.", "upgrade");
  }

  const url = window.location.href;
  const config = {
    ...userConfig,
    ...repro.extractConfig,
  };
  const isTableWrapper = _tcTagNameCompare(el, "TABLE");
  const wrapper = isTableWrapper
    ? new TableWrapper(el, url, null, config)
    : new SelectionWrapper(el, url, config);

  if (repro.hasOwnProperty("treatAsTable") && !isTableWrapper) {
    wrapper.setTreatAsTable(repro.treatAsTable);
  }

  wrapper
    .performRepro(repro)
    .then(() => {
      _tcPageToast("Done");
      if (repro.outputFormat && repro.outputFormat === OutputFormat.GOOG) {
        return _tcOpenGoogleSheets(userConfig.enablePastePrompt);
      }
    })
    .catch((err) =>
      _tcPageToast("There was an error performing this action.", "error")
    )
    .finally(() => cb({}));
}

function initTableMan() {
  // Listen for the context menu.
  document.addEventListener("contextmenu", (e) => {
    contextMenuEl = e.target;
  });

  const isPdf = checkIsPagePdf();
  const isXml = checkIsPageXml();
  const id = getSetWindowId(window);

  getExtensionUserConfig()
    .then((userConfig) => {
      const hasBody = window.document && !!window.document.body;
      if (!hasBody) {
        window.setTimeout(initTableMan, 250);
        return;
      }

      const manager = new TableManager(userConfig);
      tableMan[id] = manager;

      manager.findTables();
      manager.initSelectedElement();

      const selectionWrapper = manager.getSelectionWrapper();
      const selectedElement = selectionWrapper && selectionWrapper.toJSON();

      // Manage GSheet names
      const sheetData = userConfig.enableGDriveWrite ? _tcGetSheetData() : null;

      const tables = manager.getAllTableDefs();
      const params = {
        action: MessageAction.HELLO,
        pageUrl: window.location.href,
        windowName: id,
        topWindow: window == top,
        isPdf,
        isXml,
        tables,
        selectedElement,
        selectedTableWrapperIndex: manager.getSelectedTableWrapperIndex(),
        sheetData,
      };

      chrome.runtime.sendMessage(params, () => {});
    })
    .catch((err) => _tcContentSwallowError(err, "content.js::initTableMan()"));
}

function _tcPageToast(message, className = "") {
  const messageWrapper = document.createElement("tctoast");
  className && messageWrapper.classList.add(className);
  messageWrapper.innerHTML = `
    <span>${message}</span>
    <tcremoveicon>×</tcremoveicon>
  `;
  document.body.appendChild(messageWrapper);
  messageWrapper.addEventListener("click", () => {
    messageWrapper.classList.add("gone");
    window.setTimeout(() => {
      messageWrapper.remove();
    }, 500);
    if (className === "upgrade") {
      window.open(chrome.extension.getURL("/upgrade.html?ref=starred-action"));
    } else if (className === "airtable") {
      window.open(_TCAP_CONFIG.airtableExtension);
    } else if (className === "powerbi") {
      window.open(_TCAP_CONFIG.powerBiExtension);
    }
  });
  if (className === "warning") {
    window.setTimeout(() => {
      messageWrapper.classList.add("gone");
      window.setTimeout(() => {
        messageWrapper.remove();
      }, 500);
    }, 5000);
  }
}

function _tcPromptUserToPaste(cb, message) {
  if (alertTimeout || window !== top) {
    return cb({ alerted: false });
  }

  alertTimeout = setTimeout(() => {
    alert(message);
    cb({ alerted: true });
  }, 3 * 1000);
}

function _tcGetSelectedTablesData({ indexes }, cb, manager) {
  try {
    const datasets = indexes
      .map((index) => manager.getTable(index))
      .map((tableWrapper) => tableWrapper.getAsArrays());
    cb({ datasets });
  } catch (err) {
    cb({ err });
  }
}

function _tcPerformExcelDatasetBuild(
  datasets,
  filenameTemplate,
  singleSheetExcelExport,
  userConfig
) {
  const filename = ExcelUtil.idToName(null, filenameTemplate);

  const opts = {
    numberAsNumber: userConfig.numberAsNumber,
    numDecimalChar: userConfig.numDecimalChar,
    numThousandChar: userConfig.numThousandChar,
  };

  if (singleSheetExcelExport) {
    const sheetname = "Sheet 1 via Table Capture";
    let data = [];
    datasets.forEach((dataset) => {
      data = [...data, ...dataset, []];
    });
    return ExcelUtil.exportArrayOfArraysToExcelP(
      data,
      sheetname,
      filename,
      opts
    );
  }

  return ExcelUtil.multiSheetExport(datasets, filename, opts);
}

function _tcExcelDatasets(
  { datasets, filenameTemplate, singleSheetExcelExport, userConfig },
  cb
) {
  return _tcPerformExcelDatasetBuild(
    datasets,
    filenameTemplate,
    singleSheetExcelExport,
    userConfig
  )
    .then(() => cb({}))
    .catch((err) => cb({ err: err.message }));
}

function _tcExcelSelectedTables(req, cb, manager) {
  const { indexes, filenameTemplate, singleSheetExcelExport, userConfig } = req;

  const datasets = indexes
    .map((index) => manager.getTable(index))
    .map((tableWrapper) => tableWrapper.getAsArrays());
  return _tcPerformExcelDatasetBuild(
    datasets,
    filenameTemplate,
    singleSheetExcelExport,
    userConfig
  )
    .then(() => cb({}))
    .catch((err) => cb({ err: err.message }));
}

function _tcCopySelectedTables(req, manager) {
  const tableWrappers = [];
  const { indexes, outputFormat } = req;

  let allCopy = "";
  for (var i = 0; i < indexes.length; i++) {
    const wrapper = manager.getTable(indexes[i]);
    tableWrappers.push(wrapper);

    allCopy += wrapper.getAsString(outputFormat);
    allCopy += _TCAP_COPY_CONST.rowSeparator + _TCAP_COPY_CONST.rowSeparator;
  }

  const action = MessageAction.COPY_TABLE_STRING;
  const params = {
    action,
    tableString: allCopy,
    logInfo: {
      url: window.location.href,
      pageTitle: document.title,
      action,
      outputFormat,
      tableWrapperDefs: tableWrappers.map((wrapper) => wrapper.toJSON()),
    },
  };

  new BrowserEnv()
    .sendMessage(params)
    .catch((err) =>
      _tcContentSwallowError(err, "content.js::_tcCopySelectedTables()")
    );
}

function getTableManagerForWindow() {
  const id = window["tcap-id"];
  return tableMan[id];
}

function destroyManagerForWindow() {
  const id = window.getProperty("tcap-id");
  tableMan[id].destroy();
  tableMan[id] = null;
}

function _tcPromiseThenReturn(promise, cb) {
  promise.then(() => cb({})).catch((err) => cb({ err: err.message }));
  return true;
}

function handleExtensionRequest(req, sender, cb) {
  const { action, tabId, popupInitiated } = req;
  const isRefreshAction = MessageAction.REFRESH == action;

  if (_TCAP_CONFIG.devDebug) {
    console.log(
      `content.js::handleExtensionRequest() - Action = ${action}, Tab: ${tabId}`
    );
  }

  if (!action) {
    _TCAP_CONFIG.devDebug &&
      console.log(
        `content.js::handleExtensionRequest() - Early Quit: No Action`
      );
    cb({ status: "content.js::EARLY_QUIT_NO_ACTION" });
    return false;
  }

  const topWindow = window == top;
  const windowName = _tcGetWindowName(window);
  if (req.windowName && req.windowName !== windowName) {
    _TCAP_CONFIG.devDebug &&
      console.log(
        `content.js::handleExtensionRequest() - Early Quit: Window name (${req.windowName} vs. ${windowName})`
      );

    // Don't respond. Let the proper window respond.
    if (req.swallowEarlyQuit) {
      return false;
    }

    cb({ status: "content.js::EARLY_QUIT_WINDOW_NAME" });
    return false;
  }

  const manager = getTableManagerForWindow();
  if (!manager) {
    _TCAP_CONFIG.devDebug &&
      console.log(
        `content.js::handleExtensionRequest() - Early Quit: No manager`
      );
    cb({});
    return false;
  }

  // Override Airtable and other special pages
  const { isAirtablePage, isPowerBiPage } = checkIsSpecialPage();
  const specialPageAction =
    action === MessageAction.DISPLAY_INLINE ||
    action === MessageAction.SELECTION_WORKSHOP;
  if (specialPageAction) {
    if (isPowerBiPage) {
      return _tcPageToast(
        "PowerBI exports require a purpose-built extension.",
        "powerbi"
      );
    }
    if (isAirtablePage) {
      return _tcPageToast(
        "Airtable exports require a purpose-built extension.",
        "airtable"
      );
    }
  }

  if (MessageAction.WATCH_ELEMENT === action) {
    handleWatchElementAction(req, cb);
    cb({});
    return true;
  }

  if (MessageAction.REPRO_PERFORM === action) {
    performRepro(req, cb);
    return true;
  }

  if (MessageAction.SELECTION_WORKSHOP_RECIPE_CLIP === action) {
    handleRecipeWorkshopClipEvent(req);
    cb({});
    return false;
  }

  if (MessageAction.SELECTION_WORKSHOP_RECIPE === action) {
    handleRecipeWorkshopEvent(req);
    cb({});
    return false;
  }

  if (MessageAction.SELECTION_WORKSHOP == action) {
    let wrapper = null;
    if (req.forTable && req.tableIdentification) {
      wrapper = manager.getTable(req.tableIdentification.index);
    }
    handleSelectionWorkshopEvent(req, wrapper);
    cb({});
    return false;
  }

  if (MessageAction.PAGING_CONTINUATION == action) {
    handlePagingContinuation(req);
    cb({ handled: true });
    return false;
  }

  if (MessageAction.PAGING_CONTINUATION_PAGE_REFRESH == action) {
    window.location.reload();
    cb({ handled: true });
    return false;
  }

  // Remove the workshop if we're not workshopping.
  if (selectionWorkshop && popupInitiated) {
    selectionWorkshop.destroy(true);
    selectionWorkshop = null;

    const workshop = document.querySelector("tc-workshop");
    if (workshop) {
      workshop.remove();
    }
  }

  if (selectionWorkshop && selectionWorkshop.isPaging()) {
    // Swallow the background page trying to do work.
    cb({});
    return false;
  }

  const isPdf = checkIsPagePdf();
  const isXml = checkIsPageXml();

  if (MessageAction.INIT === action || isRefreshAction) {
    if (isRefreshAction) {
      manager.destroy();
    }

    manager.findTables();
    manager.initSelectedElement();

    const selectionWrapper = manager.getSelectionWrapper();
    const selectedElement = selectionWrapper && selectionWrapper.toJSON();

    if (isRefreshAction && popupInitiated && selectionWrapper) {
      selectionWrapper.highlight();
    }

    const tables = manager.getAllTableDefs();
    cb({
      pageUrl: window.location.href,
      isPdf,
      isXml,
      windowName,
      topWindow,
      tables,
      selectedElement,
      selectedTableWrapperIndex: manager.getSelectedTableWrapperIndex(),
    });
    return false;
  }

  if (MessageAction.PROMPT_PASTE === action) {
    _tcPromptUserToPaste(cb, chrome.i18n.getMessage("pasteToCaptureMessage"));
    return true;
  }

  if (MessageAction.DESTROY === action) {
    destroyManagerForWindow();
    cb({});
    return false;
  }

  if (MessageAction.DISPLAY_INLINE === action) {
    const detachedTableShow = new DetachedTableShow(
      req.userConfig,
      getTableManagerForWindow(),
      tabId
    );
    detachedTableShow.refresh();
    cb({});
    return false;
  }

  if (MessageAction.EXCEL_TABLES_BATCH === action) {
    _tcExcelSelectedTables(req, cb, manager);
    return true;
  }

  if (MessageAction.DATA_TO_EXCEL === action) {
    _tcExcelDatasets(req, cb);
    return true;
  }

  if (MessageAction.GET_DATA_BATCH === action) {
    _tcGetSelectedTablesData(req, cb, manager);
    return false;
  }

  if (MessageAction.COPY_TABLES_BATCH === action) {
    _tcCopySelectedTables(req, manager);
    cb({});
    return false;
  }

  //// Wrapper dependent actions.
  const wrapper = manager.getTable(req.index);
  if (!wrapper) {
    cb({ err: `Element wrapper not present for action ${action}` });
    return false;
  }

  if (MessageAction.HIGHLIGHT === action) {
    wrapper.highlight();
    if (req.renderRowPreview) {
      cb({ preview: wrapper.getAsArrays() });
    } else {
      cb({});
    }
    return false;
  }

  if (MessageAction.UNHIGHLIGHT === action) {
    wrapper.unhighlight();
    cb({});
    return false;
  }

  if (MessageAction.COPY_TABLE_IMAGE === action) {
    wrapper
      .screenshotDataUrl()
      .then((dataUrl) => cb({ dataUrl }))
      .catch((err) => cb({ err: err.message }));
    return true;
  }

  if (MessageAction.SCREENSHOT === action) {
    return _tcPromiseThenReturn(wrapper.screenshot(), cb);
  }

  if ("excel" === action) {
    return _tcPromiseThenReturn(wrapper.excel(), cb);
  }

  if ("csv" === action) {
    return _tcPromiseThenReturn(wrapper.csv(), cb);
  }

  if (MessageAction.COPY === action) {
    return _tcPromiseThenReturn(wrapper.copy(req.outputFormat), cb);
  }

  _TCAP_CONFIG.devDebug &&
    console.log(
      "content.js:: Request fall-through",
      manager.getAllTableDefs(),
      req
    );
  cb({ err: `Fall-through for action: ${action}` });
  return false;
}

if (_tcIsPageAnAdNetwork()) {
  // No-op.
} else {
  try {
    initTableMan();
    chrome.runtime.onMessage.addListener(handleExtensionRequest);
  } catch (err) {
    console.log("content.js::globalTryCatch()", err);
  }
}
