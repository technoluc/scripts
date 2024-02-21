// Global classnames.
const CLASSNAME_TABLE_SELECTED = "_tc_table_selected";
const CLASSNAME_TABLE_HIGHLIGHTED = "_tc_table_highlighted";
const CLASSNAME_TABLE_JUST_HIGHLIGHTED = "_tc_just_highlighted";
const CLASSNAME_TC_OFFSCREEN = "_tc_offscreeneded";

class ElementWrapper {
  constructor(element, url, userConfig) {
    this.domElement_ = element;
    this.scrollTimeout_ = null;

    // NOTE(gmike): This gets accessed directly.
    this.url = url;
    this.pageTitle =
      typeof document !== "undefined" && document && document.title
        ? document.title
        : null;

    this.def = {};
    this.userConfig_ = userConfig;
  }

  isTableWrapper() {
    return false;
  }

  isSelectionWrapper() {
    return false;
  }

  isRecipeWrapper() {
    return false;
  }

  getRecipeDefinition() {
    return {
      name: this.pageTitle,
      description: `A recipe for the page: ${this.pageTitle}`,
      urlRegex: `https:\/\/.*${window.location.host}\..*`,
      urlExample: window.location.href,
      selector: _tcSpecificGetSelectorForEl(this.domElement_),
      disabled: false,
      autoClip: false,
    };
  }

  getReproOptions() {
    return {
      treatAsTable: true,
    };
  }

  getFilename() {
    return ExcelUtil.idToName(
      this.getTableId(),
      this.userConfig_.filenameTemplate
    );
  }

  getDomElement() {
    return this.domElement_;
  }

  getDomAttributes_(domElement) {
    let id = domElement.getAttribute("id");
    const name = domElement.getAttribute("name");
    const className = domElement.getAttribute("class");
    const pathTo = _tcGetPathTo(domElement);

    //  MANUAL TABLE ID FORMATION FROM NAME + CLASSNAME
    if (id === null || id === "") {
      id = "";
      [name, className].forEach((el) => {
        if (el !== null && el !== "") {
          if (id.length) {
            id += ", ";
          }
          id += el;
        }
      });
    }

    let adjustedId = id;
    if (adjustedId && adjustedId.length > 16) {
      adjustedId = adjustedId.substring(0, 15) + "...";
    }

    return { id, adjustedId, name, className, pathTo };
  }

  toJSON() {
    return this.def;
  }

  isMassiveTable_() {
    return this.def && this.def.numCells > 500 * 10;
  }

  supportsInlineMenu() {
    return false;
  }

  performRepro(repro) {
    if (repro.messageAction === MessageAction.SCREENSHOT) {
      return this.screenshot();
    }
    if (repro.messageAction === MessageAction.CSV) {
      return this.csv();
    }
    if (repro.messageAction === MessageAction.EXCEL) {
      return this.excel();
    }
    if (repro.messageAction === MessageAction.COPY) {
      return this.copy(repro.outputFormat || OutputFormat.CLIPBOARD);
    }

    // TODO(gmike): Handle all the actions.
    return Promise.reject(
      new Error(
        "Unsupported Table Capture reproduction: " + repro.messageAction
      )
    );
  }

  excel() {
    _tcLogTableWrapperMessageAction(
      this,
      MessageAction.EXCEL,
      OutputFormat.EXCEL,
      this.userConfig_
    );

    const opts = {
      numberAsNumber: this.userConfig_.numberAsNumber,
      numDecimalChar: this.userConfig_.numDecimalChar,
      numThousandChar: this.userConfig_.numThousandChar,
    };
    const sheetname = "Sheet 1 via Table Capture";
    const data = this.getAsArrays();
    const filename = this.getFilename();
    return ExcelUtil.exportArrayOfArraysToExcelP(
      data,
      sheetname,
      filename,
      opts
    );
  }

  csv() {
    _tcLogTableWrapperMessageAction(
      this,
      MessageAction.CSV,
      OutputFormat.CSV,
      this.userConfig_
    );

    const data = this.getAsArrays();
    const filename = this.getFilename();
    return ExcelUtil.exportArrayOfArraysToCSVP(
      data,
      "Sheet",
      filename,
      this.userConfig_.csvDelimiter
    );
  }

  scrollTo() {
    try {
      // For really big tables, don't scroll to them.
      if (this.isMassiveTable_()) {
        return;
      }

      if (!_tcIsBehindOtherElement(this.domElement_, false)) {
        return;
      }

      this.domElement_.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });

      if (this.scrollTimeout_) {
        window.clearTimeout(this.scrollTimeout_);
      }

      this.scrollTimeout_ = window.setTimeout(() => {
        this.scrollTimeout_ = null;

        if (_tcIsBehindOtherElement(this.domElement_, true)) {
          this.domElement_.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }
      }, 1000);
    } catch (e) {
      document.body.scrollTop = this.domElement_.offsetTop;
    }
  }

  select() {
    this.domElement_.classList.add(CLASSNAME_TABLE_SELECTED);
    this.scrollTo();
  }

  deselect() {
    this.domElement_.classList.remove(CLASSNAME_TABLE_SELECTED);
  }

  highlight() {
    if (this.isMassiveTable_()) {
      return;
    }

    this.domElement_.classList.add(CLASSNAME_TABLE_HIGHLIGHTED);
    this.scrollTo();
  }

  flash() {
    this.domElement_.classList.add(CLASSNAME_TABLE_HIGHLIGHTED);
    window.setTimeout(() => {
      removeClass(this.domElement_, CLASSNAME_TABLE_HIGHLIGHTED);
    }, 500);
  }

  screenshotDataUrl() {
    return ScreenshotUtil.html2canvas(this.domElement_);
  }

  screenshot() {
    return ScreenshotUtil.html2canvas(this.domElement_).then((dataUrl) => {
      if (this.userConfig_.copyImagesToClipboard) {
        Clipboard.copyImage(dataUrl);
      } else {
        const blob = new Blob([ScreenshotUtil.base64ToUint8Array(dataUrl)], {
          type: "image/png",
        });
        ScreenshotUtil.forceDownloadBlob("image.png", blob);
      }
      return Promise.resolve();
    });
  }

  copy(outputFormat) {
    const params = {
      action: MessageAction.COPY_TABLE_STRING,
      tableString: this.getAsString(outputFormat),
    };

    return new BrowserEnv().sendMessage(params).then(() => {
      this.highlightPostCopy();
      return Promise.resolve();
    });
  }

  highlightPostCopy() {
    const element = this.domElement_;
    element.classList.add(CLASSNAME_TABLE_JUST_HIGHLIGHTED);
    setTimeout(() => {
      element.classList.remove(CLASSNAME_TABLE_JUST_HIGHLIGHTED);
    }, 5 * 1000);
  }

  unhighlight() {
    if (this.scrollTimeout_) {
      window.clearTimeout(this.scrollTimeout_);
      this.scrollTimeout_ = null;
    }

    if (this.isMassiveTable_()) {
      return;
    }

    removeClass(this.domElement_, CLASSNAME_TABLE_HIGHLIGHTED);
  }

  destroy() {
    this.unhighlight();
  }
}
