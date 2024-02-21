function _tcGetMessageFromError(err, message, preferDetail = false) {
  if (err && err.message && (preferDetail || !message)) {
    return err.message;
  }
  return message || "Table Capture: Error";
}

function _tcGetSheetData() {
  const sheetsData = {};
  try {
    const url = window.location.href;
    if (url.includes("docs.google") && url.includes("/spreadsheets/")) {
      sheetsData.url = url;
      sheetsData.id = url.split("/d/")[1].split("/")[0];
      sheetsData.title = document.querySelector(".docs-title-input").value;
      sheetsData.pageTitle = document.title.split(" - ")[0];
    }
  } catch (err) {}
  return sheetsData;
}

function _tcExecEmbeddedCode(snippet) {
  const script = document.createElement("script");
  script.textContent = snippet;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function _tcOpenGoogleSheets(enablePastePrompt) {
  const params = {
    url: _TCAP_CONFIG.newSheetsUrl,
    outputFormat: OutputFormat.GOOG,
    enablePastePrompt,
  };
  return new BrowserEnv().sendMessage(params);
}

function checkIsSpecialPage() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  const isAirtablePage =
    url && (url.includes("www.airtable.com") || url.includes("airtable.com"));
  const isPowerBiPage = hostname && hostname === "app.powerbi.com";
  return {
    isAirtablePage,
    isPowerBiPage,
    isSpecialPage: isAirtablePage || isPowerBiPage,
  };
}

function checkIsPageXml() {
  return new BrowserEnv().isXmlDocument();
}

function checkIsPagePdf() {
  try {
    if (document.body.childNodes.length != 0) {
      const node = document.body.childNodes[0];
      const { type, tagName, src } = node;
      return type === "application/pdf" && tagName === "EMBED";
      /*
        // NOTE(gmike): This wasn't working as of v9.9.26. src was 'about:blank'
        return type === 'application/pdf'
            && tagName === 'EMBED'
            && src
            && src.includes(".pdf");
      */
    }
  } catch (err) {}
  return false;
}

function _tcGetWindowName(win) {
  return win["tcap-id"];
}

function _tcRandString(prefix = "") {
  return prefix + Math.random().toString(36).slice(2);
}

function getSetWindowId(win) {
  const id = _tcRandString().substring(0, 4);
  win["tcap-id"] = id;
  return id;
}

function _tcContentSwallowError(err, context) {
  try {
    _TCAP_CONFIG.devDebug && console.log(`${context} Error Caught: `, err);
  } catch (e) {
    // No-op.
  }
}
