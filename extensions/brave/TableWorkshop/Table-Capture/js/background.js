const tables = {};
const tabToFrames = {};
const tabToUrls = {};
const tabToPdfState = {};
const tabToXmlState = {};
const tabToPagingState = {};
let pagingContinuationState = {};
let activityContextMenuMap = {};
const contextMenuMap = {};
const recipeContextMenuMap = {};
const browserEnv = new BrowserEnv();

let activeTableDefs = null;
let selectedId = null;
let backgroundDataManager = new BackgroundDataManager();
let activeCloudRepro = null;

// SHEET SYNC
const sheetsSync = new SheetsSync();
const authWrapper = new AuthWrapper();

//// USER CONFIG

const LICENSE_CHECK_NUM = 7;
let USER_CONFIG = null;
let USER_CONFIG_CACHE_HIT_COUNT = 0;

browserEnv.addStorageChangeListener(updateLocalUserConfig);
updateLocalUserConfig();

function updateLocalUserConfig() {
  return getExtensionUserConfig()
    .then((userConfig) => {
      USER_CONFIG = userConfig;
      USER_CONFIG_CACHE_HIT_COUNT = 0;
      return USER_CONFIG;
    })
    .catch((err) =>
      swallowError(err, "updateLocalUserConfig-getExtensionUserConfig")
    );
}

function syncGetCachedExtensionUserConfig() {
  return USER_CONFIG;
}

function getCachedExtensionUserConfig(context = "") {
  if (USER_CONFIG) {
    USER_CONFIG_CACHE_HIT_COUNT++;
    if (
      USER_CONFIG.paidPro &&
      USER_CONFIG_CACHE_HIT_COUNT > LICENSE_CHECK_NUM
    ) {
      USER_CONFIG_CACHE_HIT_COUNT = 0;
      backgroundCheckSetLicense(USER_CONFIG, context);
    }
    return Promise.resolve(USER_CONFIG);
  }
  return updateLocalUserConfig();
}

function saveUserConfigInstallDate(installDate) {
  return getExtensionUserConfig()
    .then((userConfig) => {
      if (!userConfig.installDate) {
        return browserEnv.getSyncStorageApi().setP({ installDate });
      }
    })
    .catch((err) => swallowError(err, "saveUserConfigInstallDate"));
}

function getInstallDate() {
  return browserEnv
    .getCookie(_TCAP_CONFIG.cookie.install)
    .then((installDate) => {
      installDate = installDate || _tcGetNowDateKey();
      saveUserConfigInstallDate(installDate);
      return installDate;
    });
}

function checkLicenseFile() {
  try {
    chrome.runtime.getPackageDirectoryEntry((directoryEntry) => {
      if (!directoryEntry) {
        return;
      }

      directoryEntry.getFile("license.txt", {}, (fileEntry) => {
        if (!fileEntry) {
          return;
        }
        fileEntry.file((file) => {
          try {
            const reader = new FileReader();
            reader.onloadend = function () {
              const licenseCode = reader.result.trim();
              if (licenseCode.length < 12) {
                return;
              }
              checkLicenseAgainstLicensingServer(
                licenseCode,
                "pro",
                "checkLicenseFile"
              );
            };
            reader.readAsText(file);
          } catch (err) {}
        });
      });
    });
  } catch (err) {}
}

function backgroundCheckSetLicense(
  { licenseCode, cloudLicenseCode, googleAuthToken },
  context = ""
) {
  if (licenseCode) {
    checkLicenseAgainstLicensingServer(licenseCode, "pro", context);
  }

  if (cloudLicenseCode) {
    /*
      // NOTE(gmike): This probably has to happen eventually.
      if (googleAuthToken) {
        const api = new GMikeAPI();
        return api
          .getCloudLicensesWithToken(googleAuthToken)
          .then((cloudLicenseResponse) => {
            const { activeCloudLicenses, tableCaptureLicenses } =
              api.processCloudLicenseResponse(cloudLicenseResponse);
            return browserEnv.getSyncStorageApi().setP({
              paidPro: activeProLicenses.length > 0,
              paidCloud: activeCloudLicenses.length > 0,
            });
          })
          .catch((err) => swallowError(err, "backgroundCheckSetLicense"));
      }
    */

    // This is auth-less for now. The above will work better when we have a refresh token.
    checkLicenseAgainstLicensingServer(licenseCode, "cloud", context);
  }
}

function checkLicenseAgainstLicensingServer(code, type, context) {
  const url = `${_TCAP_CONFIG.licenseUrl}/${code}?activate=0&licensecheck=1&checkcontext=${context}`;
  fetch(url)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      return response.json().then((errResponse) => {
        throw errResponse;
      });
    })
    .then((response) => {
      const now = new Date().getTime();

      const licenses = response && response.licenses ? response.licenses : [];
      const activeLicenses = licenses
        .filter((l) => !l.cancelled)
        .filter((l) => Number(l.expiration) > now);

      const newVals = {};
      if (type === "pro") {
        const activeProLicenses = activeLicenses.filter((l) => {
          return _TCAP_CONFIG.adjacentProducts.includes(l.product);
        });
        newVals.paidPro = activeProLicenses.length > 0;
        newVals.licenseCode = code;
      } else if (type === "cloud") {
        const activeCloudLicenses = activeLicenses.filter((l) => {
          return _TCAP_CONFIG.cloudLicenseProducts.includes(l.product);
        });
        newVals.paidCloud = activeCloudLicenses.length > 0;
        if (newVals.paidCloud) {
          // NOTE(gmike): This might be lazy. TBD.
          newVals.paidPro = true;
        }
      }
      return browserEnv.getSyncStorageApi().setP(newVals);
    })
    .catch((err) => swallowError(err, "backgroundCheckSetLicense"));
}

////

function swallowError(err, context = "", noPrint = false) {
  if (noPrint) {
    // Legit swallow.
    return;
  }

  try {
    // Try to get better error messages.
    if (
      err &&
      typeof err === "object" &&
      Object.prototype.toString.call(err) === "[object Object]"
    ) {
      if (err.message) {
        console.error(`background.js::swallowError(${context})`, err.message);
      } else {
        console.error(JSON.stringify(err));
      }
    } else {
      console.error(`background.js::swallowError(${context})`, err, typeof err);
    }
  } catch (_err) {
    console.error(
      `background.js::swallowError(${context})`,
      "caught error",
      _err
    );
  }
}

function createTabFrameEntryIfDNE(tabId, frameId, obj) {
  if (!obj[tabId]) {
    obj[tabId] = {};
  }
  if (!obj[tabId][frameId]) {
    obj[tabId][frameId] = {};
  }
}

function getActiveTableDefs() {
  return activeTableDefs;
}

function queryTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (browserEnv.hasRuntimeError()) {
        reject(browserEnv.getRuntimeError());
      } else {
        resolve(tab);
      }
    });
  });
}

function queryActiveTab(context = "") {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (browserEnv.hasRuntimeError()) {
        reject(browserEnv.getRuntimeError());
      } else if (!tabs || tabs.length != 1) {
        reject(new Error(`Tab not found: ${context}`));
      } else {
        resolve(tabs[0]);
      }
    });
  });
}

function overrideActiveTab() {
  return queryActiveTab("overrideActiveTab").then((tab) => {
    selectedId = tab.id;
    return Promise.resolve(selectedId);
  });
}

function getSelectedTabId() {
  if (selectedId) {
    return Promise.resolve(selectedId);
  }
  return overrideActiveTab();
}

function performTabScreenshot(tabId) {
  return new Promise((resolve, reject) => {
    try {
      const opts = { format: "png" };
      chrome.tabs.captureVisibleTab(null, opts, resolve);
    } catch (err) {
      reject(err);
    }
  });
}

function killFrame(tabId, frameId) {
  try {
    if (tables[tabId]) {
      delete tables[tabId][frameId];
    } else {
      console.log(
        `background.killFrame (tabId = ${tabId}, frameId = ${frameId}): Weird: tables[tabId] does not exist.`
      );
    }
  } catch (err) {
    console.log(
      `background.killFrame (tabId = ${tabId}, frameId = ${frameId}): Err`,
      err
    );
  }
}

function hasTables(tableDefinitionsArray) {
  return getNumTables(tableDefinitionsArray) > 0;
}

function getNumTables(tableDefinitions) {
  if (!tableDefinitions) {
    return 0;
  }

  const keys = Object.keys(tableDefinitions);
  if (!keys || !keys.length) {
    return 0;
  }

  let numTables = 0;
  keys.forEach((key) => {
    const def = tableDefinitions[key];
    if (def && def.tables) {
      numTables += def.tables.length;
    }
  });
  return numTables;
}

function updatePdfState(tabId, isPdf) {
  tabToPdfState[tabId] = isPdf;

  if (isPdf && tabId === selectedId) {
    updateContextMenusForPdf();
  }
}

function updateXmlState(tabId, isXml) {
  tabToXmlState[tabId] = isXml;

  if (isXml && tabId === selectedId) {
    updateContextMenusForXml();
  }
}

function isActiveTabXmlPage() {
  return selectedId && !!tabToXmlState[selectedId];
}

function isActiveTabPdfPage() {
  return selectedId && !!tabToPdfState[selectedId];
}

function updatePageUrl(tabId, frameId, pageUrl) {
  // If it's not frame 0, it's not the TOP.
  if (frameId === 0) {
    tabToUrls[tabId] = pageUrl;
  }
}

function getPageUrlForTab(tabId) {
  return tabToUrls[tabId];
}

function getPageUrlForActiveTab() {
  if (selectedId) {
    return tabToUrls[selectedId];
  }
  return null;
}

function updateSelected(tabId, isZeroFrame, reason, isHello = false) {
  console.log(`background.updateSelected (reason = ${reason})`);

  selectedId = tabId;
  activeTableDefs = tables[tabId];

  if (isActiveTabPdfPage()) {
    updateContextMenusForPdf();
  } else if (isActiveTabXmlPage()) {
    updateContextMenusForXml();
  } else {
    checkMatchingRecipesAndStarred(tabId, isZeroFrame, isHello);
    updateContextMenus();
  }

  const tableDefs = tables[tabId];
  if (hasTables(tableDefs)) {
    chrome.pageAction.setTitle({
      tabId,
      title: chrome.i18n.getMessage("pageActionTitle", [
        getNumTables(tableDefs),
      ]),
    });
  }
}

function updateTableResponseFrameId(tableResponse, frameId) {
  if (!tableResponse) {
    return;
  }

  if (tableResponse.tables && tableResponse.tables.length > 0) {
    tableResponse.tables.forEach((def) => (def.frameId = frameId));
  }

  if (tableResponse.selectedElement) {
    tableResponse.selectedElement.frameId = frameId;
  }
}

function updateWithTables(tabId, frameId, tableResponse, isHello = false) {
  if (tabId < 0) {
    return;
  }

  if (!tables[tabId]) {
    tables[tabId] = {};
  }

  if (tableResponse) {
    updateTableResponseFrameId(tableResponse, frameId);
    tables[tabId][frameId] = tableResponse;
  }

  const pageUrl = tableResponse && tableResponse.pageUrl;
  const path = hasTables(tables[tabId])
    ? "images/icon.addressbar.19.gif"
    : "images/icon.addressbar.19.grey.gif";

  chrome.pageAction.show(tabId);
  chrome.pageAction.setIcon({
    tabId,
    path,
  });

  if (selectedId == tabId) {
    updateSelected(tabId, frameId === 0, "updateWithTables", isHello);
    updatePageUrl(tabId, frameId, pageUrl);

    const isPdf = tableResponse && tableResponse.isPdf;
    const isXml = tableResponse && tableResponse.isXml;
    updatePdfState(tabId, isPdf);
    updateXmlState(tabId, isXml);
  }
}

function sendSelectionWorkshopRequest(tabId, userConfig, hasSelection) {
  const params = {
    action: MessageAction.SELECTION_WORKSHOP,
    userConfig,
    hasSelection,
    tabId,
  };
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, params, {}, () => {
      if (browserEnv.hasRuntimeError()) {
        browserEnv.checkLogLastError(
          ">> background.sendSelectionWorkshopRequest: Error caught |>"
        );
        return reject(browserEnv.getRuntimeError());
      }
      return resolve();
    });
  });
}

function sendWatchElementRequest(tabId, userConfig) {
  const params = {
    action: MessageAction.WATCH_ELEMENT,
    tabId,
    userConfig,
  };
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, params, {}, () => {
      if (browserEnv.hasRuntimeError()) {
        browserEnv.checkLogLastError(
          ">> background.sendWatchElementRequest: Error caught |>"
        );
        return reject(browserEnv.getRuntimeError());
      }
      resolve();
    });
  });
}

function sendDisplayInlineRequest(tabId, userConfig) {
  const params = {
    action: MessageAction.DISPLAY_INLINE,
    tabId,
    userConfig,
  };
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, params, {}, () => {
      if (browserEnv.hasRuntimeError()) {
        browserEnv.checkLogLastError(
          ">> background.sendDisplayInlineRequest: Error caught |>"
        );
        return reject(browserEnv.getRuntimeError());
      }
      resolve();
    });
  });
}

function sendRefreshMessageToFrame(tabId, frameId, popupInitiated) {
  return new Promise((resolve) => {
    const params = {
      action: MessageAction.REFRESH,
      popupInitiated,
    };

    chrome.tabs.sendMessage(tabId, params, { frameId }, (defs) => {
      if (browserEnv.hasRuntimeError()) {
        browserEnv.checkLogLastError(
          ">> background.sendRefreshMessageToFrame: Error caught |>"
        );
        killFrame(tabId, frameId);
      } else {
        updateWithTables(tabId, frameId, defs);
      }
      resolve();
    });
  });
}

// NOTE(gmike): Doesn't reject.
function sendMessageToFrame(tabId, frameId, params) {
  frameId = Number(frameId);

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, params, { frameId }, (response) => {
      if (browserEnv.hasRuntimeError()) {
        browserEnv.checkLogLastError(
          ">> background.sendMessageToFrame: Error caught |>"
        );
        killFrame(tabId, frameId);
      } else {
        resolve({ tabId, frameId, response });
      }
    });
  });
}

function triggerRefresh(tabId, popupInitiated) {
  console.log(`background.triggerRefresh (tabId = ${tabId})`);

  const frames = tabToFrames[tabId] || [];
  return Promise.all(
    frames.map((frameId) =>
      sendRefreshMessageToFrame(tabId, frameId, popupInitiated)
    )
  );
}

function checkCookie(tabId, url) {
  const action = MessageAction.PROMPT_PASTE;

  browserEnv
    .getCookie(_TCAP_CONFIG.cookie.tabId)
    .then((newlyCreated) => {
      if (newlyCreated && newlyCreated == tabId) {
        chrome.tabs.sendMessage(tabId, { action }, {}, (response) => {
          if (browserEnv.hasRuntimeError()) {
            browserEnv.checkLogLastError(
              ">> background.checkCookie: Error caught |>"
            );
          } else if (response && response.alerted) {
            browserEnv.removeCookie(_TCAP_CONFIG.cookie.tabId);
          } else {
            // No-op.
          }
        });

        // Clear the cookie regardless in 10 seconds.
        window.setTimeout(() => {
          browserEnv.removeCookie(_TCAP_CONFIG.cookie.tabId);
        }, 10 * 1000);
      }
    })
    .catch((err) => swallowError(err, "checkCookie-_TCAP_CONFIG.cookie.tabId"));

  browserEnv
    .getCookie(_TCAP_CONFIG.cookie.o365)
    .then((o365) => {
      if (o365 && url && url.includes(".sharepoint.com/")) {
        chrome.tabs.sendMessage(tabId, { action }, {}, (response) => {
          if (browserEnv.hasRuntimeError()) {
            browserEnv.checkLogLastError(
              ">> background.checkCookie: Error caught |>"
            );
          } else if (response && response.alerted) {
            browserEnv.removeCookie(_TCAP_CONFIG.cookie.o365);
          } else {
            // No-op.
          }
        });

        // Clear the cookie regardless in 10 seconds.
        window.setTimeout(() => {
          browserEnv.removeCookie(_TCAP_CONFIG.cookie.o365);
        }, 10 * 1000);
      }
    })
    .catch((err) => swallowError(err, "checkCookie-_TCAP_CONFIG.cookie.o365"));
}

function handleRequestToOpenUrl(request, sendResponse) {
  const { url, outputFormat, enablePastePrompt } = request;
  browserEnv.createTab({ selected: true, url }).then((tab) => {
    if (enablePastePrompt) {
      if (outputFormat === OutputFormat.GOOG) {
        browserEnv.setCookie(_TCAP_CONFIG.cookie.tabId, tab.id);
      } else if (outputFormat === OutputFormat.OFFICE365) {
        browserEnv.setCookie(_TCAP_CONFIG.cookie.o365, tab.id);
      } else {
        // No-op.
      }
    }
  });
  sendResponse({});
}

function handleRequestWithAction(request, sender, sendResponse) {
  const { tab, frameId } = sender;
  const action = request.action;

  if (action === MessageAction.CLIP_DATA_SAVE) {
    return backgroundDataManager
      .saveClipData(request)
      .then(() => sendResponse({}))
      .catch((err) => sendResponse({ err }));
  }

  if (action === MessageAction.SHEET_LIST) {
    return sendResponse({ sheets: sheetsSync.getSheetList() });
  }

  if (action === MessageAction.SHEET_SHEET_LIST) {
    const { sheetId } = request;
    return authWrapper
      .getGoogleToken()
      .then(({ token }) => sheetsSync.getSheetsInSpreadsheet(token, sheetId))
      .then((sheets) => sendResponse({ sheets }))
      .catch((err) => sendResponse({ err: err.message }));
  }

  if (action === MessageAction.SHEET_LIST_UPDATE) {
    sheetsSync.updateSheetListEntry(request.sheet);
    return sendResponse({});
  }

  if (action === MessageAction.SHEET_LIST_RESET) {
    sheetsSync.resetSheetList();
    return sendResponse({});
  }

  if (action === MessageAction.SHEET_SYNC_CREATE) {
    const { instanceId, sheetOptions } = request;
    if (sheetsSync.hasSheetForInstance(instanceId)) {
      return sendResponse({
        created: false,
        sheet: sheetsSync.getSheetForInstance(instanceId),
      });
    }

    return authWrapper
      .getGoogleToken()
      .then(({ token }) => sheetsSync.createSheet(token, sheetOptions))
      .then(({ id, url }) => {
        sheetsSync.logSheetForInstance(instanceId, { id, url, instanceId });
        return browserEnv.createTab({ selected: true, url });
      })
      .then(() =>
        sendResponse({
          sheet: sheetsSync.getSheetForInstance(instanceId),
          created: true,
        })
      )
      .catch((err) => sendResponse({ err: err.message }));
  }

  if (action === MessageAction.SHEET_SYNC_WRITE) {
    const { sheetId, sheetOptions } = request;
    if (!sheetsSync.hasSheet(sheetId)) {
      return sendResponse({ err: "Missing Google Sheet" });
    }

    const sheet = sheetsSync.getSheet(sheetId);
    return authWrapper
      .getGoogleToken()
      .then(({ token }) =>
        sheetsSync.writeToSheet(
          token,
          sheet.id,
          request.dataArray,
          sheetOptions
        )
      )
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ err: err.message }));
  }

  switch (action) {
    case MessageAction.EDIT_TABLE:
      return saveTableLocally(request.publicTable)
        .then(() => sendResponse({}))
        .catch((err) => sendResponse({ err }));

    case MessageAction.SCREENSHOT_VISIBLE_TAB:
      return performTabScreenshot(tab.id)
        .then((dataUrl) => sendResponse({ dataUrl }))
        .catch((err) => sendResponse({ err }));

    case MessageAction.PAGING_DATA_UPDATE:
      handlePagingDataUpdate(tab.id, frameId, request);
      break;

    case MessageAction.PAGING_LISTEN_PRESTART:
      handlePagingListenPreStart(tab.id, frameId, request);
      break;

    case MessageAction.PAGING_LISTEN_START:
      handlePagingListenStart(tab.id, frameId, request);
      break;

    case MessageAction.PAGING_LISTEN_STOP:
      handlePagingListenStop(tab.id, frameId);
      break;

    case MessageAction.AUTO_PAGING_UPDATE:
      handleAutoPagingUpdate(tab.id, frameId, request.autoPageTable);
      break;

    // Used by PagingListener
    case MessageAction.COPY_STRING:
      Clipboard.copy(request.stringData);
      break;

    case MessageAction.COPY_TABLE_STRING:
      _tcLogRequestAction(request, syncGetCachedExtensionUserConfig);
      Clipboard.copy(request.tableString);
      break;

    default:
      const errorMessage = `chrome.extension.onRequest::Fall-through (${action})`;
      console.log(errorMessage, request);
      return sendResponse({ err: new Error(errorMessage) });
  }

  return sendResponse({});
}

//// PAGING

function handlePagingListenPreStart(tabId, frameId, request) {
  createTabFrameEntryIfDNE(tabId, frameId, tabToPagingState);
  tabToPagingState[tabId][frameId] = {
    ...request,
    frameId,
    paging: true,
  };
}

function handlePagingListenStart(tabId, frameId, request) {
  createTabFrameEntryIfDNE(tabId, frameId, tabToPagingState);
  tabToPagingState[tabId][frameId] = {
    ...request,
    frameId,
    paging: true,
  };
}

function handlePagingDataUpdate(tabId, frameId, { dataAttributes, pageCount }) {
  if (!tabToPagingState[tabId] || !tabToPagingState[tabId][frameId]) {
    return;
  }
  tabToPagingState[tabId][frameId].dataAttributes = dataAttributes;
  tabToPagingState[tabId][frameId].pageCount = pageCount;
}

function handlePagingListenStop(tabId, frameId) {
  try {
    pagingContinuationState = {};
    tabToPagingState[tabId] = null;
    delete tabToPagingState[tabId];
  } catch (err) {
    // No-op.
  }
}

function handleAutoPagingUpdate(tabId, frameId, autoPageTable) {
  try {
    tabToPagingState[tabId][frameId].autoPageTable = autoPageTable;
  } catch (err) {
    // No-op.
  }
}

function checkHistoryStatePaging(tabId, frameId, url) {
  if (!tabToPagingState[tabId] || !tabToPagingState[tabId][frameId]) {
    return;
  }

  if (pagingContinuationState[url]) {
    return;
  }

  pagingContinuationState[url] = true;
  const params = {
    action: MessageAction.PAGING_CONTINUATION_PAGE_REFRESH,
  };
  sendMessageToFrame(tabId, frameId, params);
}

function checkPaging(tabId) {
  if (tabToPagingState.hasOwnProperty(tabId)) {
    const continuationKey = `continue-paging-Tab:${tabId}`;
    getCachedExtensionUserConfig("check-paging")
      .then((userConfig) => {
        Object.keys(tabToPagingState[tabId]).forEach((frameId) => {
          console.log(
            `chrome.extension.checkPaging (${continuationKey}), Frame: ${frameId}`
          );
          const params = {
            ...tabToPagingState[tabId][frameId],
            userConfig,
            continuationKey,
            action: MessageAction.PAGING_CONTINUATION,
          };
          sendMessageToFrame(tabId, frameId, params);
        });
      })
      .catch((err) =>
        swallowError(err, "checkPaging-getCachedExtensionUserConfig")
      );
  }
}

//// TABLE EDITING & DATA

function saveTableLocally(publicTable) {
  backgroundDataManager.setActiveEditableTable(publicTable);
  browserEnv.createTab({ url: "/table-edit.html" });
  return Promise.resolve();
}

function getLocalTableForEdit() {
  return Promise.resolve(backgroundDataManager.getActiveEditableTable());
}

function clearClipCollections() {
  return backgroundDataManager.clearClipCollections();
}

function getClipCollectonMetadata(collectionId) {
  return backgroundDataManager.getClipCollectonMetadata(collectionId);
}

function getClipCollections() {
  return backgroundDataManager.getClipCollections();
}

//// TABLE CAPTURE CLOUD

function saveTableForCloud(repro) {
  activeCloudRepro = repro;
  browserEnv.createTab({ url: "/cloud.html" });
  return Promise.resolve();
}

function getLocalTableForCloud() {
  return Promise.resolve(activeCloudRepro);
}

function updateStarredActionContextMenus(userConfig, tab) {
  getExtensionActivityLogData(browserEnv)
    .then((logData) => {
      removeAllStarredActionContextMenus();

      if (!logData) {
        return;
      }

      Object.values(logData)
        .filter((entry) => !!entry && entry.elements)
        .forEach((entry) => {
          const exactUrlMatch = entry.url === tab.url;

          Object.values(entry.elements)
            .filter(
              (pageElementEntry) =>
                pageElementEntry.starred &&
                pageElementEntry.repros &&
                pageElementEntry.repros.length
            )
            .forEach((pageElementEntry) => {
              const domainMatch = isDomainMatch(
                pageElementEntry.domain,
                tab.url
              );
              const urlMatch =
                exactUrlMatch || (pageElementEntry.domainWide && domainMatch);

              if (urlMatch) {
                const latestRepro =
                  pageElementEntry.repros[pageElementEntry.repros.length - 1];
                const menuId = chrome.contextMenus.create({
                  title: chrome.i18n.getMessage("contextMenuActivity", [
                    summarizeRepro(latestRepro),
                    pageElementEntry.name,
                  ]),
                  contexts: ["page"],
                  onclick: (_, tab) =>
                    sendReproRequest(tab.id, userConfig, latestRepro),
                });
                activityContextMenuMap[latestRepro.timestamp] = menuId;
              }
            });
        });
    })
    .catch((err) => swallowError(err, "updateStarredActionContextMenus"));
}

function removeAllStarredActionContextMenus() {
  Object.values(activityContextMenuMap).forEach((menuId) => {
    chrome.contextMenus.remove(menuId, () => {
      browserEnv.checkLogLastError(
        ">> background.removeAllStarredActionContextMenus: Error caught |>"
      );
    });
  });
  activityContextMenuMap = {};
}

function sendReproRequest(tabId, userConfig, repro) {
  const params = {
    userConfig,
    repro,
    tabId,
    action: MessageAction.REPRO_PERFORM,
  };
  chrome.tabs.sendMessage(tabId, params, {}, (resp) => {
    browserEnv.checkLogLastError(
      ">> background.sendReproRequest: Error caught |>"
    );
  });
}

//// RECIPES

function saveUpdatedRecipe(recipe) {
  return browserEnv
    .getWorlds(["_recipe_world"], { recipes: [] })
    .then(({ recipes }) => {
      const index = recipes.findIndex((r) => r.id === recipe.id);
      recipes[index] = recipe;
      return browserEnv.setWorld("_recipe_world", { recipes });
    })
    .catch((err) => swallowError(err, "saveUpdatedRecipe"));
}

function sendWorkshopRecipeClipRequest(tabId, userConfig, recipe) {
  const params = {
    userConfig,
    recipe,
    tabId,
    action: MessageAction.SELECTION_WORKSHOP_RECIPE_CLIP,
  };
  chrome.tabs.sendMessage(tabId, params, {}, () => {
    browserEnv.checkLogLastError(
      ">> background.sendWorkshopRecipeClipRequest: Error caught |>"
    );
  });
}

function sendWorkshopRecipeRequest(tabId, userConfig, recipe, onLoad) {
  const params = {
    userConfig,
    recipe,
    tabId,
    onLoad,
    action: MessageAction.SELECTION_WORKSHOP_RECIPE,
  };
  chrome.tabs.sendMessage(tabId, params, {}, () => {
    browserEnv.checkLogLastError(
      ">> background.sendWorkshopRecipeRequest: Error caught |>"
    );
  });
}

function displayClippingContextMenuAction(recipe, userConfig) {
  const menuId = chrome.contextMenus.create({
    title: chrome.i18n.getMessage("contextMenuRecipeClipStart", [
      recipe.name || "N/A",
    ]),
    contexts: ["page"],
    onclick: (_info, tab) => {
      recipe.autoClip = true;
      saveUpdatedRecipe(recipe);
      updateRecipeContextMenus(userConfig, tab, true, false);
      sendWorkshopRecipeClipRequest(tab.id, userConfig, recipe);
    },
  });
  const id = `${recipe.id}-start-clip`;
  recipeContextMenuMap[id] = menuId;
}

function displayStopClippingContextMenuAction(recipe, userConfig, tab) {
  const menuId = chrome.contextMenus.create({
    title: chrome.i18n.getMessage("contextMenuRecipeClipStop", [
      recipe.name || "N/A",
    ]),
    contexts: ["page"],
    onclick: (_info, tab) => {
      recipe.autoClip = false;
      saveUpdatedRecipe(recipe);
      updateRecipeContextMenus(userConfig, tab, true, false);
      browserEnv.createTab({ url: "/recipes.html" });
    },
  });
  const id = `${recipe.id}-stop-clip`;
  recipeContextMenuMap[id] = menuId;
}

function clearRecipeContextMenus(recipe) {
  const ids = [recipe.id, `${recipe.id}-stop-clip`, `${recipe.id}-start-clip`];
  ids.forEach((contextMenuId) => {
    if (recipeContextMenuMap[contextMenuId]) {
      chrome.contextMenus.remove(recipeContextMenuMap[contextMenuId], () => {
        browserEnv.checkLogLastError(
          ">> background.clearRecipeContextMenus: Error caught |>"
        );
      });
    }
  });
}

function updateRecipeContextMenus(userConfig, tab, isZeroFrame, isHello) {
  userConfig.recipes
    .filter((r) => r.status == "active" && !r.disabled)
    .forEach((recipe) => {
      clearRecipeContextMenus(recipe);

      if (recipe.urlRegex && tab.url.match(new RegExp(recipe.urlRegex))) {
        const menuId = chrome.contextMenus.create({
          title: chrome.i18n.getMessage("contextMenuRecipe", [
            recipe.name || "N/A",
          ]),
          contexts: ["page"],
          onclick: (_info, tab) => {
            sendWorkshopRecipeRequest(tab.id, userConfig, recipe, false);
          },
        });
        recipeContextMenuMap[recipe.id] = menuId;

        if (isHello && isZeroFrame && recipe.onLoadFn) {
          sendWorkshopRecipeRequest(tab.id, userConfig, recipe, true);
        }

        if (recipe.autoClip) {
          displayStopClippingContextMenuAction(recipe, userConfig, tab);
          // We clear for everything, but only add on zero.
          isZeroFrame &&
            isHello &&
            sendWorkshopRecipeClipRequest(tab.id, userConfig, recipe);
        } else {
          displayClippingContextMenuAction(recipe, userConfig);
        }
      }
    });
}

function checkMatchingRecipesAndStarred(tabId, isZeroFrame, isHello) {
  if (USER_CONFIG) {
    queryTab(tabId)
      .then((tab) => {
        if (USER_CONFIG.recipes && USER_CONFIG.paidPro) {
          updateRecipeContextMenus(USER_CONFIG, tab, isZeroFrame, isHello);
        }
        updateStarredActionContextMenus(USER_CONFIG, tab);
      })
      .catch((err) =>
        swallowError(err, "checkMatchingRecipesAndStarred-queryTab")
      );
  }
}

function isSelectedTabReadyForMessages() {
  return (
    selectedId && tabToFrames[selectedId] && tabToFrames[selectedId].length
  );
}

function removeInstallMenuPrompt() {
  if (contextMenuMap.INSTALL) {
    chrome.contextMenus.remove(contextMenuMap.INSTALL, () => {
      browserEnv.checkLogLastError(
        ">> background.updateContextMenus: Error caught |>"
      );
    });
    contextMenuMap.INSTALL = null;
  }
}

function displayInstallMenuPrompt() {
  contextMenuMap.INSTALL = chrome.contextMenus.create({
    title: chrome.i18n.getMessage("contextMenuRefreshNeeded"),
    contexts: ["page", "selection"],
    onclick: (info, tab) => {
      browserEnv.checkLogLastError(
        ">> background.displayInstallMenuPrompt: Error caught |>"
      );
      // TODO(gmike): Figure out if I can do anything here.
    },
  });
}

function removeFunctionalContextMenuItems() {
  if (contextMenuMap.FUNCTION) {
    contextMenuMap.FUNCTION.forEach((menuId) => {
      chrome.contextMenus.remove(menuId, () => {
        browserEnv.checkLogLastError(
          ">> background.updateContextMenus: Error caught |>"
        );
      });
    });
  }
}

function displayFunctionalContextMenuItems() {
  removeFunctionalContextMenuItems();

  contextMenuMap.FUNCTION = [];
  contextMenuMap.FUNCTION.push(
    chrome.contextMenus.create({
      title: chrome.i18n.getMessage("contextMenuLaunchWorkshop"),
      contexts: ["page"],
      onclick: (_, tab) => {
        getCachedExtensionUserConfig("cmenu-launchworkshop-click")
          .then((userConfig) =>
            sendSelectionWorkshopRequest(tab.id, userConfig, false)
          )
          .catch((err) =>
            swallowError(
              err,
              "contextMenuLaunchWorkshop-getCachedExtensionUserConfig"
            )
          );
      },
    })
  );

  contextMenuMap.FUNCTION.push(
    chrome.contextMenus.create({
      title: chrome.i18n.getMessage("contextMenuLaunchWorkshopForSelection"),
      contexts: ["selection"],
      onclick: (_, tab) => {
        getCachedExtensionUserConfig("cmenu-launchworkshop-selection-click")
          .then((userConfig) =>
            sendSelectionWorkshopRequest(tab.id, userConfig, true)
          )
          .catch((err) =>
            swallowError(
              err,
              "contextMenuLaunchWorkshopForSelection-getCachedExtensionUserConfig"
            )
          );
      },
    })
  );

  contextMenuMap.FUNCTION.push(
    chrome.contextMenus.create({
      title: chrome.i18n.getMessage("contextMenuLaunchWorkshopForElement"),
      contexts: ["link"],
      onclick: (_, tab) => {
        getCachedExtensionUserConfig("cmenu-launchworkshop-element-click")
          .then((userConfig) =>
            sendSelectionWorkshopRequest(tab.id, userConfig, false)
          )
          .catch((err) =>
            swallowError(
              err,
              "contextMenuLaunchWorkshopForElement-getCachedExtensionUserConfig"
            )
          );
      },
    })
  );

  contextMenuMap.FUNCTION.push(
    chrome.contextMenus.create({
      title: chrome.i18n.getMessage("contextMenuDisplayInline"),
      contexts: ["page"],
      onclick: (_, tab) => {
        getCachedExtensionUserConfig("display-inline-click")
          .then((userConfig) => sendDisplayInlineRequest(tab.id, userConfig))
          .catch((err) =>
            swallowError(
              err,
              "contextMenuDisplayInline-getCachedExtensionUserConfig"
            )
          );
      },
    })
  );

  if (_TCAP_CONFIG.supportsWatchers) {
    contextMenuMap.FUNCTION.push(
      chrome.contextMenus.create({
        title: chrome.i18n.getMessage("contextMenuWatchElement"),
        contexts: ["selection"],
        onclick: (_, tab) => {
          getCachedExtensionUserConfig("cmenu-watchelement-click")
            .then((userConfig) => sendWatchElementRequest(tab.id, userConfig))
            .catch((err) =>
              swallowError(
                err,
                "contextMenuWatchElement-getCachedExtensionUserConfig"
              )
            );
        },
      })
    );
  }
}

function updateContextMenus() {
  if (isActiveTabPdfPage()) {
    updateContextMenusForPdf();
    return;
  }

  if (isActiveTabXmlPage()) {
    updateContextMenusForXml();
    return;
  }

  removeInstallMenuPrompt();
  if (isSelectedTabReadyForMessages()) {
    displayFunctionalContextMenuItems();
  } else {
    displayInstallMenuPrompt();
  }
}

function updateContextMenusForPdf() {
  removeInstallMenuPrompt();
  removeFunctionalContextMenuItems();
  removeAllStarredActionContextMenus();
}

function updateContextMenusForXml() {
  removeInstallMenuPrompt();
  removeFunctionalContextMenuItems();
  removeAllStarredActionContextMenus();
}

//// BROWSER

chrome.commands.onCommand.addListener((command, tab) => {
  getCachedExtensionUserConfig(`keyboardshortcut-${command}`)
    .then((userConfig) => {
      if (command === "display-inline-table-capture") {
        return sendDisplayInlineRequest(tab.id, userConfig);
      }
      if (command === "launch-table-capture-workshop") {
        return sendSelectionWorkshopRequest(tab.id, userConfig, false);
      }
    })
    .catch((err) =>
      swallowError(
        err,
        "chrome.commands.onCommand//getCachedExtensionUserConfig"
      )
    );
});

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
  const action = request && request.action;
  const tabId = sender && sender.tab && sender.tab.id;
  const frameId = sender && sender.frameId;

  console.log(
    `chrome.extension.onMessage (action = ${action}, tabId = ${tabId}, frameId = ${frameId})`
  );

  if (tabId === undefined) {
    const errorMessage = `chrome.extension.onMessage::Error: tabId === undefined`;
    console.log(errorMessage, request);
    // NOTE(gmike, 2021-10-01): No longer throwing
    // throw new Error(errorMessage);
    sendResponse({});
    return;
  }

  if (!tabToFrames[tabId]) {
    tabToFrames[tabId] = [];
  }

  switch (action) {
    case MessageAction.LOG_EVENT:
      // NOTE(gmike, 2023-09-19): Removing GA. Google is trash.
      // new ActivityLogger().logEvent(request.event, request.context);
      break;

    case MessageAction.HELLO:
      sheetsSync.logSheet(request.sheetData);
      tabToFrames[tabId].push(sender.frameId);
      updateWithTables(tabId, frameId, request, true);
      checkPaging(tabId);
      break;

    default:
      const errorMessage = `chrome.extension.onMessage::Fall-through`;
      console.log(errorMessage, request);
      return sendResponse({ err: errorMessage });
  }

  sendResponse({});
});

chrome.extension.onRequest.addListener((request, sender, sendResponse) => {
  if (request && request.url) {
    return handleRequestToOpenUrl(request, sendResponse);
  }

  if (request && request.action) {
    return handleRequestWithAction(request, sender, sendResponse);
  }

  sendResponse({});
});

getInstallDate()
  .then((installDate) => {
    const uninstallUrl = `https://www.georgemike.com/tablecapture/uninstall/?dun=${installDate}&ver=${_TCAP_CONFIG.versionText}`;
    chrome.runtime.setUninstallURL(uninstallUrl);
  })
  .catch((err) => swallowError(err, "getInstallDate"));

chrome.runtime.onInstalled.addListener((details) => {
  if (details && details.reason === "install") {
    const postInstallUrl =
      Math.random() < 0.05
        ? "/onboard/onboard.html"
        : "/options.html?install=1";
    browserEnv.createTab({ url: postInstallUrl });

    // Set the install date.
    browserEnv.setCookie(
      _TCAP_CONFIG.cookie.install,
      _tcGetNowDateKey(),
      false
    );

    checkLicenseFile();
  }
});

chrome.windows.onFocusChanged.addListener(() => {
  const actionContext = "chrome.windows.onFocusChanged";
  queryActiveTab(actionContext)
    .then((tab) => updateSelected(tab.id, true, "onFocusChanged"))
    .catch((err) => swallowError(err, actionContext, true));
});
chrome.tabs.onSelectionChanged.addListener((tabId) =>
  updateSelected(tabId, true, "onSelectionChanged")
);

chrome.webNavigation.onCompleted.addListener(({ frameId, tabId, url }) => {
  console.log(
    `chrome.webNavigation.onCompleted (tabId = ${tabId}, frameId = ${frameId})`
  );

  // NOTE(gmike): This happens for tabs that have existed before extension install.
  if (selectedId == null) {
    updateSelected(tabId, frameId === 0, "webNavigation.onCompleted && null");
  }

  checkCookie(tabId, url);
  // NOTE(gmike): Used to perform this here as of v9.9.30
  // It was relocated to on MessageAction.HELLO because that's when the TableManager is ready.
  // checkPaging(tabId);
  sendRefreshMessageToFrame(tabId, frameId, false);
});

chrome.webNavigation.onHistoryStateUpdated.addListener(
  ({ frameId, tabId, url }) => {
    console.log(
      `chrome.webNavigation.onHistoryStateUpdated (tabId = ${tabId}, frameId = ${frameId}, url = ${url})`
    );

    // NOTE(gmike): Added in 9.9.33.
    checkHistoryStatePaging(tabId, frameId, url);
  }
);

updateContextMenus();
