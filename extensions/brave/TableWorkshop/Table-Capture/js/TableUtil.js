//// UTILS AND GARBAGE

function _tcIsInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function _tcGetPageyXPath(element) {
  if (!element || !element.className) {
    return null;
  }

  const isButtony = _tcTagNameCompare(element, ["button", "input", "a"]);
  if (!isButtony) {
    return null;
  }

  // NOTE(gmike): This is okay for SVGs because we filter above.
  const className = element.className.toLowerCase();
  const isPagey = className.includes("next");
  if (isPagey) {
    const pagingClassName = Array.from(element.classList).filter((c) => {
      const lc = c.toLowerCase();
      return lc.includes("next");
    })[0];
    const lcTagName = element.tagName.toLowerCase();
    return `//${lcTagName}[contains(@class,'${pagingClassName}')]`;
  }

  return null;
}

function _tcExhaustiveGetPathsToPager(element) {
  const xpath = _tcGetPathTo(element);
  const allPaths = [xpath];

  let i = 0;
  let el = element;
  while (el && i < 4) {
    const path = _tcGetPageyXPath(el);
    if (path) {
      allPaths.push(path);
    }
    el = el.parentElement;
    i++;
  }

  return allPaths;
}

function _tcGetSingleElementBySelector(
  selectorOrXpath,
  orMatchingInnerText = null
) {
  if (!selectorOrXpath || typeof selectorOrXpath !== "string") {
    return { element: null, count: null };
  }

  try {
    selectorOrXpath = selectorOrXpath.trim();

    if (selectorOrXpath.startsWith("/")) {
      return { element: _tcGetElementByXpath(selectorOrXpath), count: null };
    }

    const matchingElements = Array.from(
      document.querySelectorAll(selectorOrXpath)
    );
    if (matchingElements.length === 1) {
      return { element: matchingElements[0], count: 1 };
    }
    if (orMatchingInnerText) {
      const matchingInnerTextElements = matchingElements.filter(
        (e) => e.innerText === orMatchingInnerText
      );
      if (matchingInnerTextElements.length === 1) {
        return { element: matchingInnerTextElements[0], count: 1 };
      }
    }
    // Use the count from the querySelectorAll to indicate that there are multiple.
    return { element: null, count: matchingElements.length };
  } catch (err) {}

  return { element: null, count: null };
}

function _tcSpecificGetSelectorForEl(el) {
  if (!el) {
    return null;
  }

  let selector = "";
  const lcTagName = el.tagName.toLowerCase();
  const classes = Array.from(el.classList).filter(
    (className) => !className.startsWith("_tc_")
  );
  if (classes.length === 1) {
    selector = `${lcTagName}.${classes[0]}`;
  } else if (el.id) {
    selector = `#${el.id}`;
  } else {
    selector = `${lcTagName}.${classes.join(".")}`;
  }

  const { element: matchingElement } = _tcGetSingleElementBySelector(selector);
  if (matchingElement) {
    return selector;
  }

  return null;
}

function _tcGetPathTo(element) {
  if (!element) {
    return null;
  }

  if (element === document.body) {
    return "/html[1]/body[1]";
  }

  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  if (_tcTagNameCompare(element, "html")) {
    return "/html[1]";
  }

  if (!element.parentNode) {
    return "//*";
  }

  let ix = 0;
  let siblings = element.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      const lcTagName = element.tagName.toLowerCase();
      return _tcGetPathTo(element.parentNode) + `/${lcTagName}[${ix + 1}]`;
    }

    if (sibling.nodeType === 1 && _tcTagNameCompare(sibling, element)) {
      ix++;
    }
  }
}

function _tcGetCurrentPageNumber() {
  try {
    const search = (window.location.search || "").toLowerCase();
    if (search) {
      let matches = search.match(/page=([0-9]+)/);
      if (matches && matches.length >= 2) {
        return Number(matches[1]);
      }
    }
  } catch (err) {}
  return null;
}

function _tcGetNextPageElement(currentPageNum) {
  if (currentPageNum === null) {
    return null;
  }
  return _tcGetElementByXpath(
    `//a[contains(@href,'page=${currentPageNum + 1}')]`
  );
}

/** Wait for a node via a selector */
function _tcWaitForElement(selector, maxWait) {
  if (maxWait === null) {
    maxWait = 3 * 1000;
  }

  if (maxWait < 0) {
    return Promise.reject(`Element not found for path: ${path}`);
  }

  const el = document.querySelector(selector);
  if (el) {
    return Promise.resolve(el);
  }

  const timeoutDuration = 500;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      _tcWaitForElement(selector, maxWait - timeoutDuration)
        .then(resolve)
        .catch(reject);
    }, timeoutDuration);
  });
}

/** Wait for a path to exist, wait for a default of 3s. */
function _tcWaitForPathOrSoloSelector(path, selector, maxWait) {
  if (maxWait === null) {
    maxWait = 3 * 1000;
  }

  if (maxWait < 0) {
    return Promise.reject(`Element not found for path: ${path}`);
  }

  const el = _tcGetElementByXpath(path);
  if (el) {
    return Promise.resolve(el);
  }

  const { element: elViaSelector } = _tcGetSingleElementBySelector(selector);
  if (elViaSelector) {
    return Promise.resolve(elViaSelector);
  }

  const timeoutDuration = 500;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      _tcWaitForPathOrSoloSelector(path, selector, maxWait - timeoutDuration)
        .then(resolve)
        .catch(reject);
    }, timeoutDuration);
  });
}

function _tcGetElementByXpath(path, doc) {
  if (!path) {
    return null;
  }

  doc = doc || document;
  if (typeof path === "string") {
    return doc.evaluate(
      path,
      doc,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
  }

  while (path.length) {
    const exhaustivePath = path.shift();
    const el = doc.evaluate(
      exhaustivePath,
      doc,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    if (el) {
      return el;
    }
  }

  // If we got here, we couldn't find anything.
  return null;
}

function _tcSmartColCount(dataArray) {
  if (!dataArray || !dataArray.length) {
    return 0;
  }
  const rowCount = dataArray.length;
  const randIndex = Math.floor(Math.random() * rowCount);
  return Math.max(dataArray[0].length, dataArray[randIndex].length);
}

function _tcGetRepresentativeRow(dataArray) {
  if (!dataArray || !dataArray.length) {
    return null;
  }

  let firstUsefulRow = dataArray[0];
  let i = 0;
  while (
    firstUsefulRow &&
    firstUsefulRow.length <= 1 &&
    i + 1 < dataArray.length
  ) {
    i++;
    firstUsefulRow = dataArray[i];
  }
  // Put it back to the first row.
  if (firstUsefulRow && firstUsefulRow.length <= 1) {
    firstUsefulRow = dataArray[0];
  }
  return firstUsefulRow;
}

function canAccessIFrame(iframe) {
  var html = null;
  try {
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    html = doc.body.innerHTML;
  } catch (err) {
    // No-op.
  }

  return html !== null;
}

function removeAllChildren(el) {
  try {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  } catch (err) {}
  return el;
}

function removeClass(el, className) {
  el.classList.remove(className);
}

function newElement(tagname, options) {
  options = options || {};

  let el = document.createElement(tagname);
  if (options.title) {
    el.title = options.title;
  }
  // SVGs className isn't a string.
  if (options.className && tagname !== "SVG") {
    el.className = options.className;
  }
  if (options.id) {
    el.id = options.id;
  }
  if (options.click) {
    el.addEventListener("click", options.click);
  }
  if (options.text) {
    el.innerText = options.text;
  }
  if (options.html) {
    el.innerHTML = options.html;
  }
  if (options.src) {
    el.src = options.src;
  }
  return el;
}

function isNodeWorkshopChild(node) {
  while (node) {
    if (_tcTagNameCompare(node, "TC-WORKSHOP")) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function _tcGetSelectedNodeFromShadowRootSelection(shadowRoot) {
  return _tcGetSelectedNodeFromSelection(shadowRoot);
}

function _tcGetSelectedNodeFromSelection(frameWindow) {
  const windowToUse = frameWindow || window;
  try {
    const selection = windowToUse.getSelection();
    if (!selection || selection.toString() == "") {
      return null;
    }

    const startContainer = selection.getRangeAt(0).startContainer;
    if (
      !startContainer ||
      !startContainer.parentNode ||
      !startContainer.parentNode.parentNode
    ) {
      return null;
    }

    const node = startContainer.parentNode.parentNode;
    if (!node || !node.getAttribute) {
      return null;
    }
    return node;
  } catch (err) {
    console.log(`_tcGetSelectedNodeFromSelection() -> Error caught`, err);
    return null;
  }
}

////

function userConfigToExtractConfig(userConfig) {
  const extractConfig = {};
  _TCAP_EXTRACT_CONFIG_KEYS.forEach((key) => {
    extractConfig[key] = userConfig[key];
  });
  return extractConfig;
}

function extractConfigToEnglish(extractConfig) {
  const english = [];
  extractConfig.getLinkUrls && english.push("Extract link URLs");
  extractConfig.addNewLinesForParagraphs &&
    english.push("Add special characters for line breaks");
  extractConfig.csvDelimiter &&
    english.push(`CSV Delimiter (${extractConfig.csvDelimiter})`);
  extractConfig.numDecimalChar &&
    english.push(`Decimal Separator (${extractConfig.numDecimalChar})`);
  extractConfig.numThousandChar &&
    english.push(`Thousands Separator (${extractConfig.numThousandChar})`);
  extractConfig.deleteEmptyRows && english.push("Delete empty rows");

  if (extractConfig.ignoreImages) {
    english.push("Ignore images");
  } else if (
    extractConfig.extractImageSrc ||
    extractConfig.inlineImagesGSheets
  ) {
    extractConfig.extractImageSrc &&
      english.push("Extract image and icon attributes");
    extractConfig.inlineImagesGSheets &&
      english.push("Inline images for Google Sheets");
  } else {
    english.push("Ignore image and icon attributes");
  }

  extractConfig.ignoreHiddenPageElements &&
    english.push("Ignore hidden page elements");
  extractConfig.ignoreHiddenTables && english.push("Ignore hidden tables");
  extractConfig.numberAsNumber &&
    english.push("Attempt to convert all number values to plain numbers");
  extractConfig.moneyAsNumber &&
    english.push("Attempt to convert money values to plain numbers");

  return english;
}

let _tcBasePath = null;
let _tcCurrentPath = null;
function _tcGetBasePath() {
  if (!_tcBasePath || !_tcCurrentPath) {
    _tcCurrentPath =
      window.location.href.split("/").slice(0, -1).join("/") + "/";
    _tcBasePath = window.location.origin;
  }
  return { basePath: _tcBasePath, currentPath: _tcCurrentPath };
}

function _tcApplyBasePath(href) {
  if (!href || !href.trim()) {
    return null;
  }

  // NOTE(gmike, 6-14-2022): Added blob and data to this.
  if (
    href.startsWith("javascript:") ||
    href.startsWith("blob:") ||
    href.startsWith("data:")
  ) {
    return null;
  }

  // NOTE(gmike, 6-14-2022): Returning just the email address for mailto's.
  if (href.startsWith("mailto:")) {
    const email = href.split("&")[0].split("?")[0].split(":")[1].trim();
    return email;
  }

  const { basePath, currentPath } = _tcGetBasePath();
  if (href.indexOf("/") === 0) {
    return basePath + href;
  }

  // If it's an HTTP URL, just return the URL
  if (href.startsWith("http")) {
    return href;
  }

  // NOTE(gmike, 6-14-2022): If there's no protocol, it's a relative URL.
  if (!href.includes("://")) {
    return currentPath + href;
  }

  // At this point we're just returning because we don't know what else to do.
  return href;
}

const TableUtil = {
  writeArrayOfArraysToClipboardAsItem: function (arrayOfArrays) {
    if (!arrayOfArrays || arrayOfArrays.length < 2) {
      return Promise.reject(new Error("No data to write to clipboard."));
    }

    // Build the HTML of the table.
    const headers = arrayOfArrays[0]
      .map((header) => `<th>${header}</th>`)
      .join("");
    const rows = arrayOfArrays
      .slice(1)
      .map(
        (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
      )
      .join("");
    const table = `<table><thread><tr>${headers}</tr></thread><tbody>${rows}</tbody></table>`;
    // Write it to the clipboard as a table.
    const items = [
      new ClipboardItem({
        "text/html": new Blob([table], { type: "text/html" }),
      }),
    ];
    return navigator.clipboard.write(items);
  },

  postProcessFinalString: function (
    str,
    outputFormat,
    { rowSeparator, colSeparator },
    { inlineImagesGSheets }
  ) {
    if (!str || !str.trim()) {
      return str;
    }

    if (outputFormat == OutputFormat.MARKDOWN) {
      const asArray = TableUtil.stringToArrayOfArrays(
        str,
        rowSeparator,
        colSeparator
      );
      return markdownTable(asArray);
    }

    if (
      outputFormat == OutputFormat.GOOG ||
      outputFormat == OutputFormat.OFFICE365
    ) {
      // Properly escape double quotes for Google and Office 365.
      if (str.includes('"')) {
        const beginsWithCleaner = new RegExp(/$"/, "g");
        const rowBeginsWithCleaner = new RegExp(rowSeparator + '"', "g");
        const colBeginsWithCleaner = new RegExp(colSeparator + '"', "g");

        str = str.replace(beginsWithCleaner, '""""');
        str = str.replace(rowBeginsWithCleaner, `${rowSeparator}""""`);
        str = str.replace(colBeginsWithCleaner, `${colSeparator}""""`);
      }
    }

    if (outputFormat == OutputFormat.GOOG) {
      if (inlineImagesGSheets === true) {
        const imageCellRegex = new RegExp(
          `(^|${colSeparator})(http.*?)(\.png|\.jpg|\.jpeg|\.gif)`,
          "g"
        );
        str = str.replace(imageCellRegex, `$1=IMAGE("$2$3", 1)`);
      }
    }

    return str;
  },

  arrayOfArraysToString(array, rowSeparator, colSeparator) {
    return array.map((row) => row.join(colSeparator)).join(rowSeparator);
  },

  stringToArrayOfArrays(str, rowSeparator, colSeparator) {
    if (!str) {
      return [];
    }
    const rows = str.split(rowSeparator);
    return rows.map((s) => s.split(colSeparator));
  },

  getArbPreAlignmentForNode(node, userConfig) {
    let ucNodeName = _tcGetUCNodeName(node);
    let path = `root.${ucNodeName}`;

    // This is a nightmare.
    if (node && node.childNodes && node.childNodes.length === 1) {
      node = node.firstChild;
      ucNodeName = _tcGetUCNodeName(node);
      path += `.${ucNodeName}`;
    }

    const row = [];
    _tcArbNodeToArray(node, userConfig, false, 1, path, [], row);
    return row;
  },

  getArbPreAlignmentForRoot(node, userConfig) {
    let allRows = [];
    _tcArbNodeToArray(node, userConfig, true, 0, "root", allRows, null);
    return allRows;
  },

  arbNodeToAlignedArray(node, userConfig, treatAsTable) {
    let allRows = [];
    _tcArbNodeToArray(node, userConfig, true, 0, "root", allRows, null);
    return TableUtil.arbAlign(allRows, treatAsTable);
  },

  arbAlign(allRows, treatAsTable) {
    if (treatAsTable) {
      return _tcArbAlignV2(allRows);
    } else {
      return _tcArbAlignRows(allRows);
    }
  },

  tableNodeToString: function (
    table,
    rowSeparator,
    colSeparator,
    userConfig,
    isRootTable
  ) {
    if (!table) {
      return "";
    }

    const array = TableUtil.nodeToArrays(
      table,
      rowSeparator,
      colSeparator,
      userConfig,
      isRootTable
    );
    return TableUtil.arrayOfArraysToString(array, rowSeparator, colSeparator);
  },

  trNodeToRowArray: function (node, colSeparator, userConfig) {
    const opts = { trimLastRowColSep: true };
    const str = _tcNodeToStringRoot(
      node,
      "",
      colSeparator,
      userConfig,
      false,
      opts
    );
    return str.split(colSeparator);
  },

  nodeToArrays: function (
    node,
    rowSeparator,
    colSeparator,
    userConfig,
    isRootTable
  ) {
    const opts = { trimTrailingColSep: true };
    const str = _tcNodeToStringRoot(
      node,
      rowSeparator,
      colSeparator,
      userConfig,
      isRootTable,
      opts
    );
    const rows = str.split(rowSeparator);

    const finalArray = [];
    for (var i = 0; i < rows.length; i++) {
      const rowString = rows[i];
      const cols = rowString.split(colSeparator);
      // If the last row is empty, don't add it.
      if (i == rows.length - 1 && cols.length == 1 && !cols[0]) {
        break;
      }
      finalArray.push(cols);
    }

    if (_tcTagNameCompare(node, "TABLE")) {
      const rowSpanEls = node.querySelectorAll('*[rowspan]:not([rowspan=""])');
      if (rowSpanEls && rowSpanEls.length) {
        _tcPopulateRowspanVals(finalArray, node, rowSpanEls, userConfig);
      }
    }

    return finalArray;
  },
};

//// Maybe cleaner extraction

function extractNumber(value, locale = navigator.language) {
  const example = Intl.NumberFormat(locale).format("1.1");
  const cleanPattern = new RegExp(`[^-+0-9${example.charAt(1)}]`, "g");
  const cleaned = value.replace(cleanPattern, "");
  const normalized = cleaned.replace(example.charAt(1), ".");

  return parseFloat(normalized);
}

function getTDSeparation(node, colSeparator) {
  if (node && colSeparator) {
    try {
      const spanCount = parseInt(node.getAttribute("colspan") || 1, 10);
      if (spanCount < 1) {
        // 2023-06-09: SeekingAlpha has colspans with a 0 attribute.
        return colSeparator;
      }
      return colSeparator.repeat(spanCount);
    } catch (err) {}
  }

  return colSeparator;
}

function maybeCleanMoneyValue(stringVal) {
  if (!stringVal || stringVal.length < 2) {
    return stringVal;
  }

  const CCY_SYMBOLS = "؋֏ƒ$₼৳฿¥₡₱Ξ€₾£₵₪₹﷼៛₭₨Ł₮₦￥₽₤₺₴₫Ƀ₣";

  let hasMoneySym = false;
  for (var i = 0; i < CCY_SYMBOLS.length; i++) {
    const symbol = CCY_SYMBOLS[i];
    if (stringVal.includes(symbol)) {
      hasMoneySym = true;
    }
  }

  if (hasMoneySym) {
    const regex = new RegExp(`[${CCY_SYMBOLS}]+`, "g");
    const cleanVal = stringVal.replace(regex, "").trim();
    const matches = cleanVal.match(/[0-9.,+\-]+/);
    if (matches && matches.length && matches[0] === cleanVal) {
      try {
        return extractNumber(cleanVal) + "";
      } catch (err) {}
    }
  }

  return stringVal;
}

function isNodeValueEmptyRow(str, colSeparator) {
  if (!str || !str.trim()) {
    return true;
  }
  return str === colSeparator;
}

function _tcIsCellNumberWeird(str) {
  if (!str || !str.trim()) {
    return false;
  }

  const firstCharacter = str[0];

  // It is weird if it begins with a '+'
  if (firstCharacter !== "+") {
    return _tcIsCellNumberEuroZeroLeading(str);
  }

  return isNaN(str);
}

function _tcIsCellNumberEuroZeroLeading(str) {
  if (!str) {
    return false;
  }
  str = str.trim();
  return str.includes(",") && str.startsWith("0") && !str.includes(" ");
}

function _tcIsSpaceNeeded(str, rowSeparator, colSeparator) {
  if (!str) {
    return false;
  }
  const lastCharacter = str[str.length - 1];
  const penultimateCharacter = str.length > 1 ? str[str.length - 2] : null;

  if (
    lastCharacter === rowSeparator ||
    lastCharacter === colSeparator ||
    penultimateCharacter + lastCharacter === rowSeparator
  ) {
    return false;
  }
  return lastCharacter !== " ";
}

////

function _tcIsNodeWithinTable(node) {
  while (node && node != document.body) {
    if (_tcTagNameCompare(node, ["TD", "TR", "TBODY", "TABLE"])) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function _tcTableStringToCellString(str, rowSeparator, colSeparator) {
  if (!str) {
    return "";
  }

  // This will remove all the extra row separators at the end of a cell.
  const noNeed = new RegExp(`(${rowSeparator}(\s+)?)+$`, "g");
  const colToSpace = new RegExp(colSeparator, "g");
  const rowToNewLine = new RegExp(rowSeparator, "g");

  str = str.replace(noNeed, "");
  str = str.replace(colToSpace, " ");
  str = str.replace(rowToNewLine, " <> ");

  return str.trim();
}

function _tcSelectToString(el) {
  if (!el.options || el.options.length === 0 || el.selectedIndex < 0) {
    return "";
  }
  const index = el.selectedIndex || 0;
  return el.options[index].text.trim();
}

// NOTE(gmike): Does not return leading/trailing spaces.
function _tcInputToString(child) {
  const validTypes = [
    "text",
    "checkbox",
    "number",
    "email",
    "search",
    "tel",
    "url",
    "range",
    "color",
    // Date + Time
    "date",
    "datetime",
    "datetime-local",
    "time",
    "month",
    "week",
  ];

  const type = child.type && child.type.toLowerCase();
  if (!validTypes.includes(type)) {
    return "";
  }

  if (type === "checkbox") {
    return !!child.checked + "";
  }

  if (child.hasAttribute("value")) {
    return child.value;
  }

  return "";
}

// NOTE(gmike): Does not return leading/trailing spaces.
function _tcImageToString(
  extractImageSrc,
  ignoreImages,
  inlineImagesGSheets,
  child
) {
  if (ignoreImages) {
    return "";
  }

  const wantSrc = extractImageSrc || inlineImagesGSheets;
  if (wantSrc && child.src) {
    let imageSrc = child.src;
    if (imageSrc.includes(_TCAP_CONFIG.extBase)) {
      imageSrc = imageSrc.replace(_TCAP_CONFIG.extBase, "");
    }

    if (imageSrc.includes(_TCAP_CONFIG.chromeExtBase)) {
      imageSrc = imageSrc.replace(_TCAP_CONFIG.chromeExtBase, "");
    }
    if (inlineImagesGSheets && imageSrc) {
      // NOTE(gmike): Maybe just return the HTML and let the post-processing handle it?
      // NOTE(gmike): Also, we don't want to return a function here because it needs to know the output format.
      return imageSrc;
    }

    if (child.alt) {
      return `${child.alt} (${imageSrc})`;
    }
    return imageSrc;
  }

  if (child.alt) {
    return child.alt;
  }

  return "";
}

function _tcArbDiffRows(left, right) {
  const leftByPath = {};
  const rightByPath = {};
  const uniqueInLeft = [];
  const uniqueInRight = [];

  left.forEach((el, i) => {
    el.index = i;
    if (!leftByPath[el.path]) {
      leftByPath[el.path] = [];
    }
    leftByPath[el.path].push(el);
  });

  right.forEach((el, i) => {
    el.index = i;
    if (!rightByPath[el.path]) {
      rightByPath[el.path] = [];
    }
    rightByPath[el.path].push(el);
  });

  function determineUniques(aArray, bMap, aUniques) {
    aArray.forEach((el, i) => {
      if (!bMap.hasOwnProperty(el.path)) {
        aUniques.push(el);
      } else if (bMap[el.path].length == 0) {
        aUniques.push(el);
      } else {
        const newList = bMap[el.path].filter(
          (existing) => el.index != existing.index
        );
        if (newList.length == bMap[el.path].length - 1) {
          bMap[el.path] = newList;
        } else {
          newList.shift();
          bMap[el.path] = newList;
        }
      }
    });
  }

  determineUniques(left, rightByPath, uniqueInLeft);
  determineUniques(right, leftByPath, uniqueInRight);

  return { uniqueInLeft, uniqueInRight };
}

function _tcArbAlignV2(allRows) {
  const collapsedRows = [];
  allRows.forEach((row) => {
    const currentRow = [];

    let cellVal = [];
    row.forEach((item) => {
      if (item.type && item.type === "cell-break") {
        currentRow.push(cellVal.join(" "));
        cellVal = [];
      } else {
        cellVal.push(item.val);
      }
    });
    if (cellVal.length) {
      currentRow.push(cellVal.join(" "));
    }
    collapsedRows.push(currentRow);
  });

  return collapsedRows;
}

function _tcArbAlignRows(allRows) {
  for (var i = 0; i < allRows.length - 1; i++) {
    const left = allRows[i];
    const right = allRows[i + 1];
    const { uniqueInLeft, uniqueInRight } = _tcArbDiffRows(left, right);
    if (uniqueInLeft && uniqueInLeft.length) {
      uniqueInLeft.forEach((el) => {
        const index = el.index;
        const path = el.path;
        right.splice(index, 0, { path });
      });
      allRows[i + 1] = right;
    } else if (uniqueInRight && uniqueInRight.length) {
      uniqueInRight.forEach((el) => {
        const index = el.index;
        const path = el.path;
        left.splice(index, 0, { path });
      });
      allRows[i] = left;
    }
  }

  for (var i = allRows.length - 1; i > 0; i--) {
    const left = allRows[i];
    const right = allRows[i - 1];
    const { uniqueInLeft, uniqueInRight } = _tcArbDiffRows(left, right);
    if (uniqueInLeft && uniqueInLeft.length) {
      uniqueInLeft.forEach((el) => {
        const index = el.index;
        const path = el.path;
        right.splice(index, 0, { path });
      });
      allRows[i - 1] = right;
    } else if (uniqueInRight && uniqueInRight.length) {
      uniqueInRight.forEach((el) => {
        const index = el.index;
        const path = el.path;
        left.splice(index, 0, { path });
      });
      allRows[i] = left;
    }
  }

  return allRows.map((row) => row.map((el) => el.val));
}

function _tcComputeEffectiveColIndex(tr, td) {
  const cells = Array.from(tr.children);

  let index = cells.indexOf(td);
  if (index === -1) {
    return index;
  }

  const precedingColSpans = cells
    .slice(0, index)
    .map((cell) => {
      try {
        return parseInt(cell.getAttribute("colspan"), 10);
      } catch (err) {}
      return 1;
    })
    .filter((spanval) => spanval > 1)
    .map((spanvalOver1) => spanvalOver1 - 1);
  let bumpCount = 0;
  precedingColSpans.forEach((val) => (bumpCount += val));
  return index + bumpCount;
}

function _tcGetNonNestedTableRows(tr, deleteEmptyRows) {
  let table = tr;
  while (table.tagName.toUpperCase() !== "TABLE") {
    table = table.parentElement;
  }

  let rows = [];

  const head = table.querySelector("thead");
  if (head) {
    rows = rows.concat(Array.from(head.children));
  }

  const body = table.querySelector("tbody");
  if (body) {
    rows = rows.concat(Array.from(body.children));
  }

  if (deleteEmptyRows) {
    rows = rows.filter((r) => !!r.childElementCount);
  }

  return rows;
}

function _tcHasRowSpans(el) {
  if (!el) {
    return false;
  }

  const rowSpanEls = el.querySelectorAll('*[rowspan]:not([rowspan=""])');
  return rowSpanEls && rowSpanEls.length;
}

function _tcPopulateRowspanVals(array, table, rowspans, { deleteEmptyRows }) {
  if (
    !rowspans ||
    rowspans.length === 0 ||
    !table ||
    !array ||
    array.length === 0
  ) {
    return;
  }

  const absRows = {};

  Array.from(rowspans).forEach((rowspan) => {
    let colShift = 1;
    let spanCount = 0;
    try {
      spanCount = parseInt(rowspan.getAttribute("rowspan") || 0, 10);
      colShift = parseInt(rowspan.getAttribute("colspan") || 1, 10);
    } catch (err) {}

    if (spanCount <= 1) {
      return;
    }

    const tr = rowspan.parentElement;
    if (!_tcTagNameCompare(tr, "TR")) {
      return;
    }

    const rows = _tcGetNonNestedTableRows(tr, deleteEmptyRows);
    const rowIndex = Array.from(rows).indexOf(tr);
    if (rowIndex === -1 || rowIndex >= array.length) {
      return;
    }

    let colIndex = _tcComputeEffectiveColIndex(tr, rowspan);
    if (colIndex === -1 || colIndex >= array[rowIndex].length) {
      return;
    }

    const val = array[rowIndex][colIndex];
    for (var i = rowIndex + 1; i < rowIndex + spanCount; i++) {
      if (!absRows[i]) {
        absRows[i] = {};
      }
      while (absRows[i].hasOwnProperty(colIndex)) {
        colIndex++;
      }
      absRows[i][colIndex] = val;

      // If we have a rowspan and colspan, we need to col-shift for each rowspan.
      for (let j = 1; j < colShift; j++) {
        absRows[i][colIndex + j] = "";
      }
    }
  });

  // Do it at the end.
  Object.keys(absRows).forEach((rowIndex) => {
    const rowIndexN = Number(rowIndex);
    Object.keys(absRows[rowIndex]).forEach((colIndex) => {
      const colIndexN = Number(colIndex);

      // This happens if you have a <td rowspan="N">...</td> where N exceeds the num of table rows.
      if (!array[rowIndexN]) {
        return;
      }

      array[rowIndexN].splice(colIndexN, 0, absRows[rowIndex][colIndex]);
    });
  });
}

function _tcIsElementPager(node) {
  if (!node || _tcTagNameCompare(node, "SVG")) {
    return false;
  }
  let { className, innerText } = node;
  innerText = innerText || "";
  className = className || "";
  if (typeof className !== "string") {
    return false;
  }
  className = className.toLowerCase();

  const hasNextOrPrev =
    innerText.includes("Next page") || innerText.includes("Previous page");
  const isTinyElement = innerText.length < 30;

  return (
    className.includes("pagination") ||
    className.includes("pager") ||
    (hasNextOrPrev && isTinyElement)
  );
}

function _tcArbNodeToArray(
  node,
  userConfig,
  isRoot,
  depth,
  path,
  allRows,
  currentRow
) {
  currentRow = currentRow || [];

  if (!node) {
    return;
  }

  const { getLinkUrls, extractImageSrc, ignoreImages, inlineImagesGSheets } =
    userConfig;

  const ucNodeName = _tcGetUCNodeName(node);

  if ("TC-WORKSHOP" === ucNodeName) {
    return;
  }

  if ("SCRIPT" === ucNodeName || "NOSCRIPT" === ucNodeName) {
    return;
  }

  // Ignore elements that are not visible.
  if (_tcIsElementHidden(node, userConfig)) {
    return;
  }

  // For selects we ignore all the children.
  if ("SELECT" === ucNodeName) {
    currentRow.push({ val: _tcSelectToString(node), path });
    return;
  }

  if (
    !ignoreImages &&
    extractImageSrc &&
    "I" === ucNodeName &&
    node.childNodes.length === 0 &&
    !node.innerHTML
  ) {
    const content = window
      .getComputedStyle(node, ":before")
      .getPropertyValue("content");
    if (content && node.classList.length) {
      const val = Array.from(node.classList).join("_");
      currentRow.push({ val, path });
    }
    return;
  }

  if (
    !ignoreImages &&
    "SPAN" === ucNodeName &&
    node.getAttribute("role") === "img" &&
    node.getAttribute("aria-label")
  ) {
    const val = node.getAttribute("aria-label");
    currentRow.push({ val, path });
    return;
  }

  // NOTE(gmike): Check the parentElement exists because it could be the root node.
  const soleChild =
    node.parentElement && node.parentElement.childNodes.length === 1;

  if (node.childNodes.length) {
    let child = node.firstChild;

    while (child) {
      if (isRoot && _tcIsElementPager(child)) {
        // Ignore paging elements.
      } else if (_tcIsElementHidden(child, userConfig)) {
        // Ignore elements that are not visible.
      } else {
        const localPath = `${path}.${child.nodeName}`;

        // Don't care about depth if only 1 child.
        const newDepth =
          child.childNodes.length === 1 && depth !== 2 ? depth : depth + 1;
        _tcArbNodeToArray(
          child,
          userConfig,
          false,
          newDepth,
          localPath,
          allRows,
          currentRow
        );

        // Add the row separator. Only present for root node.
        if (isRoot && currentRow.length) {
          allRows.push(currentRow);
          currentRow = [];
        }
      }

      child = child.nextSibling;
    }
  } else if (
    "#TEXT" == ucNodeName &&
    ((node.nodeValue && node.nodeValue.trim()) || soleChild)
  ) {
    const val = _tcNodeVal(node).trim();
    currentRow.push({ val, path });

    if (depth === 2) {
      currentRow.push({
        type: "cell-break",
        comment: `Break @ depth (${depth}) for text node.`,
      });
    }
  } else if (node && node.shadowRoot) {
    // TODO(gmike): Figure out if something needs to happen here.
  }

  // Handle special
  if (getLinkUrls && "A" == ucNodeName) {
    const href = node.getAttribute("href");
    if (href) {
      const url = _tcApplyBasePath(href);
      if (url) {
        _tcInsertIntoCurrentRowBeforeCellBreak(currentRow, {
          val: `(${url})`,
          path,
        });
      }
    }
  } else if ("INPUT" === ucNodeName) {
    currentRow.push({ val: _tcInputToString(node), path });
  } else if ("IMG" === ucNodeName || ("SVG" === ucNodeName && ignoreImages)) {
    currentRow.push({
      val: _tcImageToString(
        extractImageSrc,
        ignoreImages,
        inlineImagesGSheets,
        node
      ),
      path,
    });
  }

  if (depth === 2 && node.nodeType && node.nodeType === 1) {
    currentRow.push({
      type: "cell-break",
      comment: `Break @ depth (${depth}) for element.`,
    });
  }
}

function _tcNodeVal(node, newLinesAsSpaces = false) {
  var re_n = new RegExp("\\n", "g");
  var re_t = new RegExp("\\t", "g");

  let tempStr = node.nodeValue;
  tempStr = tempStr.replace(re_t, "");

  if (newLinesAsSpaces) {
    tempStr = tempStr.replace(re_n, " ");
    tempStr = tempStr.trim();
  } else {
    tempStr = tempStr.replace(re_n, "");
  }

  return tempStr;
}

function _tcNodeToStringRoot(
  node,
  rowSeparator,
  colSeparator,
  userConfig,
  isRootTable,
  postOpts
) {
  let str = _tcNodeToString(
    node,
    rowSeparator,
    colSeparator,
    userConfig,
    isRootTable
  );

  if (postOpts.trimTrailingColSep && str) {
    const cleaner = new RegExp(colSeparator + rowSeparator, "g");
    str = str.replace(cleaner, rowSeparator);
  }

  if (postOpts.trimLastRowColSep && str && str.endsWith(colSeparator)) {
    const cleaner = new RegExp(colSeparator + "$", "g");
    str = str.replace(cleaner, "");
  }

  return str;
}

function _tcNodeToString(
  node,
  rowSeparator,
  colSeparator,
  userConfig,
  isRootTable
) {
  let str = "";

  //// Hard-coded config

  // NOTE(gmike, 2023-08-11): BJ asked for this. Makes sense.
  const newLinesAsSpaces = true;

  //// User Config
  const {
    getLinkUrls,
    extractImageSrc,
    ignoreImages,
    ignoreHiddenPageElements,
    inlineImagesGSheets,
    moneyAsNumber,
    deleteEmptyRows,
    addNewLinesForParagraphs,
  } = userConfig;

  const ucNodeName = _tcGetUCNodeName(node);

  if ("TC-WORKSHOP" === ucNodeName) {
    return "";
  }

  if ("SCRIPT" === ucNodeName || "NOSCRIPT" === ucNodeName) {
    return "";
  }

  if (addNewLinesForParagraphs && "BR" === ucNodeName) {
    return "|";
  }

  // Ignore elements that are not visible.
  if (_tcIsElementHidden(node, userConfig)) {
    return "";
  }

  // For selects we ignore all the children.
  if ("SELECT" === ucNodeName) {
    return _tcSelectToString(node);
  }

  // For pre and code elements, just return the inner text.
  if (
    addNewLinesForParagraphs &&
    ("PRE" === ucNodeName || "CODE" === ucNodeName)
  ) {
    let preVal = node.innerText.trim();
    preVal = preVal.replace(new RegExp("\\n", "g"), "☂");
    return preVal;
  }

  if ("TABLE" === ucNodeName && isRootTable === false) {
    // Get the value as though it was the root element. Treat colSeparator as a space
    const subTableString = _tcNodeToString(
      node,
      rowSeparator,
      colSeparator,
      userConfig,
      true
    );
    return _tcTableStringToCellString(
      subTableString,
      rowSeparator,
      colSeparator
    );
  }

  if (
    !ignoreImages &&
    extractImageSrc &&
    "I" === ucNodeName &&
    node.childNodes.length === 0 &&
    !node.innerHTML
  ) {
    const content = window
      .getComputedStyle(node, ":before")
      .getPropertyValue("content");
    if (content && node.classList.length) {
      return Array.from(node.classList).join("_");
    }
    return "";
  }

  if (
    !ignoreImages &&
    "SPAN" === ucNodeName &&
    node.getAttribute("role") === "img" &&
    node.getAttribute("aria-label")
  ) {
    return node.getAttribute("aria-label");
  }

  // We need to set aside <tfoot> values.
  let tfoot = null;

  if (node.childNodes.length) {
    let child = node.firstChild;
    while (child) {
      // Ignore children that are not visible.
      if (_tcIsElementHidden(child, userConfig)) {
        child = child.nextSibling;
        continue;
      }

      const ucTag = child.nodeName.toUpperCase();

      // NOTE(gmike): We trim and assign for TDs/THs, thus it is not const.
      let nodeStringValue = _tcNodeToString(
        child,
        rowSeparator,
        colSeparator,
        userConfig,
        false
      );

      if ("TR" == ucTag) {
        if (
          deleteEmptyRows &&
          isNodeValueEmptyRow(nodeStringValue, colSeparator)
        ) {
          // No-op. Skip this row.
        } else {
          // NOTE(gmike): Previously we trimmed, but trimming will remove leading colSeparator
          str += nodeStringValue + rowSeparator;
        }
      } else if ("TD" == ucTag || "TH" == ucTag) {
        nodeStringValue = nodeStringValue.trim();

        if (moneyAsNumber) {
          nodeStringValue = maybeCleanMoneyValue(nodeStringValue);
        }

        // Adding a single quote will mean that sheets won't mess it up.
        if (_tcIsCellNumberWeird(nodeStringValue)) {
          nodeStringValue = `'` + nodeStringValue;
        }

        str += nodeStringValue + getTDSeparation(child, colSeparator);
      } else if ("CAPTION" === ucTag && "TABLE" === ucNodeName) {
        if (deleteEmptyRows && (!nodeStringValue || !nodeStringValue.trim())) {
          // Skip an empty row.
        } else {
          str += nodeStringValue + rowSeparator;
        }
      } else if ("TFOOT" === ucTag) {
        tfoot = nodeStringValue;
      } else {
        // If we have something that doesn't end with a space, add a space
        if (_tcIsSpaceNeeded(str, rowSeparator, colSeparator)) {
          str += " ";
        }

        str += nodeStringValue;

        if (getLinkUrls && "A" == ucTag) {
          // The preceding value might be the text of the <a>Link</a> so we check again.
          if (_tcIsSpaceNeeded(str, rowSeparator, colSeparator)) {
            str += " ";
          }
          const href = child.getAttribute("href");
          if (href) {
            const url = _tcApplyBasePath(href);
            if (url) {
              str += `(${url})`;
            }
          }
        } else if ("INPUT" === ucTag) {
          str += _tcInputToString(child);
        } else if ("IMG" === ucTag || ("SVG" === ucTag && ignoreImages)) {
          str += _tcImageToString(
            extractImageSrc,
            ignoreImages,
            inlineImagesGSheets,
            child
          );
        }
      }

      child = child.nextSibling;
    }
  } else if ("#TEXT" == ucNodeName && node.nodeValue) {
    str += _tcNodeVal(node, newLinesAsSpaces).trim();
  }

  if (
    addNewLinesForParagraphs &&
    "P" === ucNodeName &&
    node.nextElementSibling
  ) {
    str += "|";
  }

  // Add tfoot vals at the end.
  if (tfoot) {
    str += tfoot;
    tfoot = null;
  }

  return str;
}

function _tcIsPageAnAdNetwork() {
  if (!window || !window.location || !window.location.hostname) {
    return false;
  }
  const { hostname } = window.location;
  if (_TC_AD_NETWORK_HOSTNAME.includes(hostname)) {
    return true;
  }
  return _TC_AD_NETWORK_PARTIALS.some((suffix) => hostname.endsWith(suffix));
}

function _tcIsPageExtensionPage() {
  if (window && window.location) {
    const url = window.location.href;
    return (
      url.startsWith("chrome") ||
      url.startsWith("edge") ||
      url.startsWith("moz-extension")
    );
  }
  return false;
}

function _tcIsBehindOtherElement(element, falseIfNotCenterable) {
  const boundingRect = element.getBoundingClientRect();

  if (falseIfNotCenterable && boundingRect.height > window.innerHeight) {
    return false;
  }

  const left = boundingRect.left + 1;
  const right = boundingRect.right - 1;
  const top = boundingRect.top + 1;
  const bottom = boundingRect.bottom - 1;

  if (document.elementFromPoint(left, top) !== element) {
    return true;
  }

  if (document.elementFromPoint(right, top) !== element) {
    return true;
  }

  if (document.elementFromPoint(left, bottom) !== element) {
    return true;
  }

  if (document.elementFromPoint(right, bottom) !== element) {
    return true;
  }

  return false;
}

function _tcIsElementHidden(
  el,
  { ignoreHiddenPageElements, removeStrikethroughs, paidProOrMore }
) {
  if (!el) {
    return true;
  }

  let style = null;
  if (ignoreHiddenPageElements) {
    // Return true if it's a screen-reader only data field.
    if (el.classList && el.classList.contains("sr-only")) {
      return true;
    }

    // Documents are detached when extracted via the options page.
    if (_tcIsPageExtensionPage()) {
      // TODO(gmike): Figure out how to honor this check.
      return false;
    }

    // NOTE(gmike): offsetParent == null check does not work on absolutely positioned elements.
    // https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
    const elementIsHidden = el.offsetParent === null;
    if (elementIsHidden) {
      style = window.getComputedStyle(el);
      if (style.display === "none") {
        return true;
      }
    }
  }
  if (paidProOrMore && removeStrikethroughs && el.nodeName !== "#text") {
    if (!style) {
      style = window.getComputedStyle(el);
    }
    if (style.textDecoration.includes("line-through")) {
      return true;
    }
  }

  return false;
}

function _tcInsertIntoCurrentRowBeforeCellBreak(row, entry) {
  if (!row || !entry) {
    throw new Error(
      "_tcInsertIntoCurrentRowBeforeCellBreak() -> Function params not valid."
    );
  }
  // Empty array, just push.
  if (row.length === 0) {
    return row.push(entry);
  }
  // Swap-a-roo.
  if (row[row.length - 1].type && row[row.length - 1].type === "cell-break") {
    const lastEntry = row[row.length - 1];
    row[row.length - 1] = entry;
    return row.push(lastEntry);
  }
  // Just push.
  return row.push(entry);
}

function _tcArrayOfObjectsToArrayOfArrays(array) {
  let headers = [];
  let headerMap = {};

  const maybeAddToHeaders = (parentKey, key, obj) => {
    const compoundKey = parentKey ? `${parentKey}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === "object") {
      Object.keys(obj[key]).forEach((subKey) => {
        maybeAddToHeaders(compoundKey, subKey, obj[key]);
      });
    } else if (!headerMap[compoundKey]) {
      headerMap[compoundKey] = 1;
      headers.push(compoundKey);
    }
  };

  const populateValue = (row, key, obj) => {
    if (key.includes(".")) {
      const parts = key.split(".");
      const parentKey = parts.shift();
      if (obj.hasOwnProperty(parentKey)) {
        return populateValue(row, parts.join("."), obj[parentKey]);
      }
    }
    if (obj.hasOwnProperty(key)) {
      row.push(obj[key]);
    } else {
      row.push(null);
    }
  };

  array.forEach((rowObj) => {
    Object.keys(rowObj).forEach((key) => {
      maybeAddToHeaders("", key, rowObj);
    });
  });

  const rows = [headers];
  array.forEach((rowObj) => {
    const row = [];
    headers.forEach((key) => populateValue(row, key, rowObj));
    rows.push(row);
  });

  return rows;
}

function _tcGetUCNodeName(node) {
  return node && node.nodeName && node.nodeName.toUpperCase();
}

function _tcTagNameCompare(a, b) {
  try {
    if (a === b) {
      return true;
    }
    if (a === undefined || b === undefined || a === null || b === null) {
      return false;
    }
    let tagName = null;
    if (typeof a === "object" && a.tagName) {
      tagName = a.tagName.toUpperCase();
    } else if (typeof a === "string") {
      tagName = a.toUpperCase();
    }

    if (typeof b === "string") {
      return tagName === b.toUpperCase();
    }
    if (typeof b === "object") {
      if (b.tagName) {
        return tagName === b.tagName.toUpperCase();
      }
      if (b.length && b.length > 0) {
        return b.some((tagNameB) => _tcTagNameCompare(tagName, tagNameB));
      }
    }
  } catch (e) {}
  return false;
}

function _tcGetAllScrollableElements() {
  const all = document.getElementsByTagName("*");
  const els = [];
  for (let i = 0, max = all.length; i < max; i++) {
    const el = all[i];
    if (el.scrollTop !== 0) {
      els.push(el);
    }
    el.dispatchEvent(
      new WheelEvent("wheel", {
        deltaX: 0,
        deltaY: 500,
        view: window,
        bubbles: true,
        cancelable: true,
      })
    );
  }
  return els;
}

function _tcPerformScroll(domEl, jump = 200) {
  const wheelEvent = new WheelEvent("wheel", {
    deltaX: 0,
    deltaY: jump,
    view: window,
    bubbles: true,
    cancelable: true,
  });

  domEl.dispatchEvent(wheelEvent);
}

function _tcGetScrollingElement(domEl, maxRetries = 2) {
  let i = 0;
  while (domEl && i < maxRetries) {
    if (domEl.scrollHeight > domEl.clientHeight) {
      return domEl;
    }
    domEl = domEl.parentElement;
    i++;
  }
  return null;
}

function _tcFindArrayInObject(needle, obj, path = "") {
  if (obj === null) {
    return { obj, path };
  }

  needle = needle.toLowerCase();

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const resp = _tcFindArrayInObject(needle, obj[i], `${path}[${i}].`);
      if (resp.obj) {
        return { obj, path };
      }
    }
    return { obj: null, path };
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const resp = _tcFindArrayInObject(needle, obj[key], path + key + ".");
      if (resp.obj) {
        return resp;
      }
    }
    return { obj: null, path };
  }
  const val = (obj + "").toLowerCase().trim();
  if (val.includes(needle)) {
    return { obj, path };
  }
  return { obj: null, path };
}

function _tcDoClick(targetNode) {
  function _tcTriggerMouseEvent(node, eventType) {
    const clickEvent = document.createEvent("MouseEvents");
    clickEvent.initEvent(eventType, true, true);
    node.dispatchEvent(clickEvent);
  }

  _tcTriggerMouseEvent(targetNode, "mouseover");
  _tcTriggerMouseEvent(targetNode, "mousedown");
  _tcTriggerMouseEvent(targetNode, "mouseup");
  _tcTriggerMouseEvent(targetNode, "click");
}
