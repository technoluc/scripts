class TableShow {
  constructor(wrapper, actions, userConfig) {
    this.wrapper_ = wrapper;
    this.browserEnv_ = new BrowserEnv();
    this.api_ = new DataProvider();

    this.actions_ = actions;
    this.userConfig_ = userConfig;
    this.lockedDown_ =
      this.userConfig_.requiresPaid && !this.userConfig_.paidPro;

    this.cbs = {
      copy: this.copyTable.bind(this),
      goog: this.googTable.bind(this),
      csv: this.csvTable.bind(this),
      excel: this.excelTable.bind(this),
      screenshot: this.screenshot.bind(this),
      workshop: this.openWorkshopForTable_.bind(this),
    };

    this.selectedTables_ = null;
    this.lastSelectionIndex_ = null;
  }

  //// RENDERING

  display() {
    try {
      removeAllChildren(this.wrapper_);

      if (this.lockedDown_) {
        return this.displayLockedDownPage_();
      }

      const tableDefs = this.api_.getTableDefs();
      const googleSheetsAppPage = this.api_.isGoogleSheetsAppPage();
      const zillowPage = this.api_.isZillowYannPage();
      const airtablePage = this.api_.isAirtableAppPage();
      const pdfPage = this.api_.isPdfPage();
      const xmlPage = this.api_.isXmlPage();
      const powerBiPage = this.api_.isPowerBiPage();
      const inPageSelection =
        tableDefs.selectedElement || tableDefs.selectedTableWrapper;
      const specialCaseTable =
        airtablePage ||
        googleSheetsAppPage ||
        pdfPage ||
        powerBiPage ||
        xmlPage;

      if (inPageSelection && !specialCaseTable) {
        return this.openWorkshop_(true);
      }

      if (specialCaseTable) {
        if (airtablePage) {
          this.wrapper_.appendChild(this.displayAirTable());
        } else if (pdfPage) {
          this.wrapper_.appendChild(this.displayPdf());
        } else if (googleSheetsAppPage) {
          this.wrapper_.appendChild(this.displayGoogleSheets());
        } else if (powerBiPage) {
          this.wrapper_.appendChild(this.displayPowerBi());
        } else if (xmlPage) {
          this.wrapper_.appendChild(this.displayXmlWarning());
        }
      } else {
        if (zillowPage) {
          this.wrapper_.appendChild(this.displayZillowCTA());
        }

        this.wrapper_.appendChild(this.displayHeader(tableDefs.tables.length));

        if (tableDefs.tables.length === 0) {
          this.wrapper_.appendChild(
            this.displayAlertWell(chrome.i18n.getMessage("noTablesFound"))
          );
          this.wrapper_.appendChild(this.displayNoTablesHelp());
        } else {
          this.wrapper_.appendChild(this.displayTableList(tableDefs, false));
          if (this.userConfig_.renderRowPreview) {
            this.wrapper_.appendChild(this.getPreviewWrapper());
          }
        }

        if (!this.userConfig_.paidPro) {
          this.wrapper_.appendChild(new AdRenderer().getAd());
        }
      }

      // Bind to page reporting elements.
      const currentUrl = this.api_.getCurrentWindowLocation();
      Array.from(this.wrapper_.querySelectorAll(".btn-report-page")).forEach(
        (el) =>
          el.addEventListener(
            "click",
            this.handlePageReport_.bind(this, currentUrl)
          )
      );
    } catch (err) {
      writeBadError(err);
    }
  }

  displayLockedDownPage_() {
    const activateAction = newElement("a", {
      className: "b-action",
      id: "upgrade_action",
      click: this.openUpgradePage_.bind(this, "topbar"),
      html: chrome.i18n.getMessage("activateAction"),
    });

    const div = document.createElement("div");
    div.className = "explainer requires-activation";
    div.innerHTML = `
      <p>
        Please activate <span class="_tc-ext">Table Capture</span> to use the extension.
      </p>
    `;
    div.appendChild(activateAction);
    this.wrapper_.appendChild(div);
  }

  getPreviewWrapper() {
    const el = document.createElement("div");
    el.id = "row-preview-wrapper";
    el.innerHTML = `
      <h3>Preview</h3>
      <pre>\n\n\n\n</pre>
    `;
    return el;
  }

  displayPowerBi() {
    const url = _TCAP_CONFIG.powerBiExtension;
    const div = document.createElement("div");
    div.className = "explainer no-tables powerbi-no-tables";
    div.innerHTML = `
      <p class="explainer-heading">The current page is a PowerBI web-app.</p>
      <p>
        If you'd like to export the data from this page, you'll need to use a purpose-built
        extension: <br /><a href="${url}" target="_blank">PowerBI Extractor by Table Capture</a>
      </p>
    `;
    return div;
  }

  displayZillowCTA() {
    const url = _TCAP_CONFIG.zillowExtension;
    const div = document.createElement("div");
    div.className = "explainer no-tables zillow-better";
    div.innerHTML = `
      <p class="explainer-heading">The current Zillow page can be exported better.</p>
      <p>
        If you'd like to export the data from this page, George recommends a purpose-built
        extension from a fellow independent developer: <a href="${url}" target="_blank">Zillow Data Exporter</a>
      </p>
      <p>If Table Capture does a good enough job, that's great; you can use it below as usual.</p>
    `;
    return div;
  }

  displayXmlWarning() {
    const div = document.createElement("div");
    div.className = "explainer no-tables xml-no-tables";
    div.innerHTML = `
      <p class="explainer-heading">The current page is an XML document.</p>
      <p>
        Unfortunately, right now <span class="_tc-ext">Table Capture</span> is not able to
        extract tables from XML.
      </p>
    `;
    return div;
  }

  displayAirTable() {
    const url = _TCAP_CONFIG.airtableExtension;
    const div = document.createElement("div");
    div.className = "explainer no-tables airtable-no-tables";
    div.innerHTML = `
      <p class="explainer-heading">The current page is an Airtable web-app.</p>
      <p>
        If you'd like to export the data from this page, you'll need to use a purpose-built
        extension: <br /><a href="${url}" target="_blank">Airtable Extractor by Table Capture</a>
      </p>
    `;
    return div;
  }

  displayGoogleSheets() {
    let url = this.api_.getCurrentWindowLocation();
    url = url.replace(/\/edit.*/, "/htmlview");

    const div = document.createElement("div");
    div.className = "explainer no-tables sheets-app";
    div.innerHTML = `
      <p class="explainer-heading">The current page is a Google Sheets web-app.</p>
      <p>
        If you'd like to export the data from this page with <span class="_tc-ext">Table Capture</span>, switch to
        the HTML-View version of this page here: <a href="${url}" target="_blank">${url}</a>
      </p>
    `;
    return div;
  }

  displayPdf() {
    const div = document.createElement("div");
    div.className = "explainer no-tables pdf-no-tables";
    div.innerHTML = `
      <p class="explainer-heading">
        The current page is a PDF document.
      </p>
      <p>
        Try <span class="_tc-ext">Table Capture's</span> experimental PDF extractor on this page:
        <div style="margin-top: 8px;">
          <input
              type="button"
              class="btn btn-default btn-launch-pdf"
              value="Launch PDF Extractor" />
        </div>
      </p>
    `;

    div.querySelector(".btn-launch-pdf").addEventListener("click", () => {
      const currentUrl = this.api_.getCurrentWindowLocation();
      this.browserEnv_.createTab({
        url: `/pdf-extract.html?url=${currentUrl}`,
      });
    });

    return div;
  }

  displayNoTablesHelp() {
    const currentUrl = this.api_.getCurrentWindowLocation();

    const div = document.createElement("div");
    div.className = "explainer no-tables";
    div.innerHTML = `
      <p>
        This may happen if there are no <span class="mono">&lt;table&gt;</span> elements in the page.
      </p>
      <p>
        The best way to address this is to use
        the <span class="_tc-ext">Table Capture Workshop</span>. You can do
        so by:</p>
      <ol>
        <li>Highlighting some text of a cell of a table you're interested in</li>
        <li>Right-click the highlighted text</li>
        <li>Select "Table Capture - Launch Workshop" from the context menu</li>
      </ol>
      <hr />
      <a class="btn btn-default btn-report-page">
        I've tried the above &amp; am still having trouble; <strong>this is a Table Capture bug.</strong>
      </a>
      <div class="disclaimer">
        Clicking the above will report <span title="${currentUrl}">this page</span> so
        that we can improve <span class="_tc-ext">Table Capture</span>.
      </div>
    `;

    return div;
  }

  displayAlertWell(text, alertClassName = "alert-warning") {
    const alertWell = newElement("div", {
      className: `alert-well alert ${alertClassName}`,
      text,
    });
    return alertWell;
  }

  displayDismissableError_(message) {
    const well = this.displayAlertWell(message, "alert-danger");
    well.addEventListener("click", () => well.remove());
    document.querySelector("._tc_error_wrapper").appendChild(well);
  }

  displayDismissableUpdate_(message) {
    const well = this.displayAlertWell(message, "alert-info");
    well.addEventListener("click", () => well.remove());
    document.querySelector("._tc_error_wrapper").appendChild(well);
  }

  displayHeader(nTables) {
    const hasTablesPresent = nTables > 0;

    const wrapper = newElement("div", { className: "_tc_header" });
    wrapper.appendChild(this.displayHeaderActionWrap());
    wrapper.appendChild(this.displayHeaderActionLinkWrap());

    const globalErrorWrapper = newElement("div", {
      className: "_tc_error_wrapper",
    });
    wrapper.appendChild(globalErrorWrapper);

    if (hasTablesPresent && Math.random() < 0.333) {
      this.displayFeatureTips_(globalErrorWrapper);
    }

    wrapper.appendChild(this.displayHeaderTitle(nTables));
    if (hasTablesPresent) {
      wrapper.appendChild(this.displaySelectionHeaderActionWrap());
    }

    return wrapper;
  }

  displayFeatureTips_(wrapper) {
    if (this.api_.hasAttemptedSelection()) {
      return;
    }

    const fyiSelectionBanner = document.createElement("div");
    fyiSelectionBanner.className = "alert alert-info";
    fyiSelectionBanner.innerHTML = `
      <strong>New in <span class="_tc-ext">Table Capture</span>:</strong> Highlight
      anything on the page before launching the extension to capture anything on the
      page.
      <br /><br />Give it a try to dismiss this tip!
    `;
    fyiSelectionBanner.addEventListener("click", () =>
      fyiSelectionBanner.remove()
    );

    wrapper.appendChild(fyiSelectionBanner);
  }

  displayHeaderTitle(nTables) {
    const header = document.createElement("div");
    header.className = "_tc_title";
    header.innerHTML = `
      <span class="main">${chrome.i18n.getMessage("tablesFoundTitle", [
        nTables,
      ])}</span>
      <span class="context"></span>
    `;
    return header;
  }

  updateHeaderTitle() {
    const nTables = this.api_.getNumTables();
    const nSelected = this.getNumSelectedTables_();

    const message =
      nSelected > 0
        ? chrome.i18n.getMessage("tablesFoundAndSelectedTitle", [
            nTables,
            nSelected,
          ])
        : chrome.i18n.getMessage("tablesFoundTitle", [nTables]);
    document.querySelector("._tc_title .main").innerText = message;

    document
      .querySelector(".selection-bar")
      .classList.toggle("no-selection", nSelected === 0);
    Array.from(
      document.querySelectorAll(".selection-bar ._tc-right-actions input")
    ).forEach((button) => {
      button.disabled = nSelected <= 1;
    });
  }

  clearTooltipText() {
    if (this.tooltipTimeout_) {
      window.clearTimeout(this.tooltipTimeout_);
      this.tooltipTimeout_ = null;
    }

    if (this.clearTooltipTimeout_) {
      window.clearTimeout(this.clearTooltipTimeout_);
    }

    this.clearTooltipTimeout_ = window.setTimeout(() => {
      document.querySelector("._tc_title .context").innerHTML = "";
      this.clearTooltipTimeout_ = null;
    }, 100);
  }

  displayTooltipText_(text) {
    if (this.tooltipTimeout_) {
      window.clearTimeout(this.tooltipTimeout_);
    }

    if (this.clearTooltipTimeout_) {
      window.clearTimeout(this.clearTooltipTimeout_);
      this.clearTooltipTimeout_ = null;
    }

    this.tooltipTimeout_ = window.setTimeout(() => {
      document.querySelector("._tc_title .context").innerHTML = text;
      this.tooltipTimeout_ = null;
    }, 100);
  }

  displaySelectionHeaderActionWrap() {
    const batchExcelDescription = this.userConfig_.singleSheetExcelExport
      ? chrome.i18n.getMessage("selectedToExcelDescriptionSingleSheet")
      : chrome.i18n.getMessage("selectedToExcelDescription");

    const selectionActionWrap = document.createElement("div");
    selectionActionWrap.className = "selection-bar no-selection";
    selectionActionWrap.innerHTML = `
      <div class="_tc-left-actions">
        <input type="button"
            class="btn btn-default btn-sm action_select_all"
            title="${chrome.i18n.getMessage("selectAllDescription")}"
            value="${chrome.i18n.getMessage("selectAllAction")}" />
        <input type="button"
            class="btn btn-default btn-sm action_select_none"
            title="${chrome.i18n.getMessage("selectNoneDescription")}"
            value="${chrome.i18n.getMessage("selectNoneAction")}" />
      </div>
      <div class="_tc-right-actions">
        <input type="button"
              class="btn btn-default btn-sm action_copy"
              title="${chrome.i18n.getMessage("copySelectedDescription")}"
              value="${chrome.i18n.getMessage("copySelectedAction")}" />
        <input type="button"
              class="btn btn-default btn-sm action_goog"
              title="${chrome.i18n.getMessage("selectedToGoogleDescription")}"
              value="${chrome.i18n.getMessage("selectedToGoogleAction")}" />
        <input type="button"
              class="btn btn-default btn-sm action_excel"
              title="${batchExcelDescription}"
              value="${chrome.i18n.getMessage("selectedToExcelAction")}" />
      </div>
    `;

    selectionActionWrap
      .querySelector(".action_select_all")
      .addEventListener("click", this.selectAllTables.bind(this));
    selectionActionWrap
      .querySelector(".action_select_none")
      .addEventListener("click", this.unselectAllTables.bind(this));
    selectionActionWrap
      .querySelector(".action_copy")
      .addEventListener("click", this.handleCopySelectedTables.bind(this));
    selectionActionWrap
      .querySelector(".action_goog")
      .addEventListener("click", this.selectedToGoogle_.bind(this));
    selectionActionWrap
      .querySelector(".action_excel")
      .addEventListener("click", this.selectedToExcel_.bind(this));

    return selectionActionWrap;
  }

  displayHeaderActionLinkWrap() {
    const wrapper = document.createElement("div");
    wrapper.className = "action-link-wrap";

    const helpAction = document.createElement("a");
    helpAction.innerText = chrome.i18n.getMessage("helpAction");
    helpAction.className = "btn-report-page";

    const middot = () => {
      return newElement("span", { html: "&middot;" });
    };

    const optionsAction = newElement("a", {
      title: chrome.i18n.getMessage("optionsAction"),
      id: "options_action",
      click: (_e) => {
        this.browserEnv_.createTab({ url: "/options.html?ref=popup" });
      },
      html: chrome.i18n.getMessage("optionsAction"),
    });

    const supportAction = newElement("a", {
      title: chrome.i18n.getMessage("supportAction"),
      id: "support_action",
      click: (_e) => {
        this.browserEnv_.createTab({ url: "/support.html?ref=popup" });
      },
      html: chrome.i18n.getMessage("supportAction"),
    });

    const favoritesAction = newElement("a", {
      title: chrome.i18n.getMessage("favoritesAction"),
      id: "favorites_action",
      click: (_e) => {
        this.browserEnv_.createTab({ url: "/activity.html?ref=popup" });
      },
      html: chrome.i18n.getMessage("favoritesAction"),
    });

    wrapper.appendChild(optionsAction);
    wrapper.appendChild(middot());
    wrapper.appendChild(supportAction);
    wrapper.appendChild(middot());
    wrapper.appendChild(favoritesAction);
    wrapper.appendChild(middot());
    wrapper.appendChild(helpAction);

    return wrapper;
  }

  displayHeaderActionWrap() {
    const actionWrap = document.createElement("div");
    actionWrap.className = "action_wrap";

    const refreshAction = newElement("a", {
      title: chrome.i18n.getMessage("refreshDescription"),
      className: "b-action",
      id: "refresh_action",
      click: this.refresh.bind(this, true),
      html: chrome.i18n.getMessage("refreshAction"),
    });

    const workshopAction = newElement("a", {
      title: chrome.i18n.getMessage("workshopDescription"),
      className: "b-action",
      id: "workshop_action",
      click: this.openWorkshop_.bind(this, false),
      html: chrome.i18n.getMessage("workshopAction"),
    });

    if (!this.userConfig_.paidPro) {
      const upgradeAction = newElement("a", {
        className: "b-action",
        id: "upgrade_action",
        click: this.openUpgradePage_.bind(this, "topbar"),
        html: chrome.i18n.getMessage("upgradeAction"),
      });

      actionWrap.appendChild(upgradeAction);
    }

    actionWrap.appendChild(refreshAction);
    actionWrap.appendChild(workshopAction);

    return actionWrap;
  }

  displayTableList(tableDefs, detached) {
    const list = newElement("ol", {
      className: "_tc_table_list",
    });

    tableDefs.tables.forEach((tableWrapper, i) => {
      let tableWrapperLocal = tableWrapper;

      const li = newElement("li", {
        id: tableWrapper.table.id,
        className: "table_def_el",
        click: (e) => {
          this.toggleTableSelection_(tableWrapperLocal, e.shiftKey, i);
          return _tcStopEventProp(e);
        },
      });

      li.addEventListener("mouseenter", (e) => {
        this.highlightTable(tableWrapperLocal);
        return _tcStopEventProp(e);
      });

      li.addEventListener("mouseleave", (e) => {
        this.unhighlightTable(tableWrapperLocal);
        return _tcStopEventProp(e);
      });

      const tableName = newElement("span", {
        title: tableWrapper.table.id,
        className: "table_select_action",
        text: tableWrapper.table.adjusted,
      });

      tableName.appendChild(newElement("span", { className: "hidden status" }));
      li.appendChild(tableName);

      this.actions_.forEach((action) => {
        const tableWrapperLocal = tableWrapper;

        const click = (e) => {
          if (action.disabled) {
            this.handleDisabledAction_(action);
          } else {
            this.cbs[action.key](tableWrapperLocal);
          }
          return _tcStopEventProp(e);
        };

        const el = newElement("a", {
          className: `clicky action action_${action.key} icon icon-disabled-${action.disabled}`,
          click,
        });
        el.appendChild(
          newElement("img", {
            src: chrome.extension.getURL("/") + action.icon,
          })
        );

        if (action.tooltip) {
          el.addEventListener(
            "mouseenter",
            this.displayTooltipText_.bind(this, action.tooltip)
          );
          el.addEventListener("mouseleave", this.clearTooltipText.bind(this));
        } else {
          el.title = action.pretty;
        }

        li.appendChild(el);
      });

      list.appendChild(li);
    });

    if (detached) {
      // No-op.
    } else {
      list.appendChild(this.displayTableListMissingElement_());
    }

    return list;
  }

  displayTableListMissingElement_() {
    const li = document.createElement("li");
    li.className = "table-not-found";
    li.innerHTML = `
      <span class="cta">Don't see your table?</span>
      <input type="button" class="btn btn-default btn-sm" value="Select in page" />
    `;
    li.querySelector(".btn").addEventListener(
      "click",
      this.handleTableNotFound_.bind(this)
    );

    return li;
  }

  displayLoader() {
    this.wrapper_.appendChild(
      newElement("img", {
        src: chrome.extension.getURL("/") + "images/loader.gif",
        className: "loading-gif",
      })
    );
  }

  refresh(userInitiated) {
    const sourceDescriptor = userInitiated ? "User" : "Auto";
    this.selectedTables_ = {};

    removeAllChildren(this.wrapper_);
    this.displayLoader();

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const hasRuntimeError = new BrowserEnv().hasRuntimeError();
      if (hasRuntimeError) {
        this.display();
        this.displayDismissableError_(
          "There was an error communicating with the page. Try again?"
        );
        return;
      }

      const tabId = tabs[0].id;
      if (tabId) {
        const timeoutId = window.setTimeout(() => {
          this.display();
          if (this.api_.hasTables()) {
            // NOTE(gmike): Previously we would show the error always.
          } else {
            this.displayDismissableError_("Time out. Please try again.");
          }
        }, 2500);

        this.api_
          .triggerRefresh(tabId, true)
          .then(() => {
            if (timeoutId) {
              window.clearTimeout(timeoutId);
            }
            window.setTimeout(this.display.bind(this), 333);
          })
          .catch((err) => {
            this.display();
            this.displayDismissableError_(err.message);
          });
      } else {
        this.display();
        this.displayDismissableError_(
          "There was an error communicating with the page. Try again?"
        );
      }
    });
  }

  destroy() {
    const params = { action: MessageAction.DESTROY };
    return this.api_.sendMessageToActiveTab(params);
  }

  csvTable(tableWrapper) {
    this.actionOnTableWrapper_(tableWrapper, "csv");
  }

  excelTable(tableWrapper) {
    this.actionOnTableWrapper_(tableWrapper, "excel");
  }

  actionOnTableWrapper_(tableWrapper, action) {
    const frameId = tableWrapper.frameId;
    const params = {
      action,
      id: tableWrapper.table.id,
      index: tableWrapper.index,
      windowName: tableWrapper.table.windowName,
    };

    this.api_.sendMessageToActiveTabFrame(params, frameId).catch((err) => {
      const message = err.message;
      if (message && message.length > 28) {
        this.displayDismissableError_(message);
      } else {
        this.setTableLinkMessage(tableWrapper, false, true, message);
      }
    });
  }

  screenshotToClipboard(tableWrapper) {
    const frameId = tableWrapper.frameId;
    const params = {
      action: MessageAction.COPY_TABLE_IMAGE,
      id: tableWrapper.table.id,
      index: tableWrapper.index,
      windowName: tableWrapper.table.windowName,
    };

    this.setTableLinkMessageText(tableWrapper, "Loading...");
    this.api_
      .sendMessageToActiveTabFrame(params, frameId)
      .then((response) => {
        Clipboard.copyImage(response.dataUrl);
        this.setTableLinkMessageText(tableWrapper, "Copied");
      })
      .catch((err) => this.setTableLinkMessageText(tableWrapper, err.message));
  }

  screenshot(tableWrapper) {
    if (this.userConfig_.copyImagesToClipboard) {
      return this.screenshotToClipboard(tableWrapper);
    }

    const frameId = tableWrapper.frameId;
    const params = {
      action: MessageAction.SCREENSHOT,
      id: tableWrapper.table.id,
      index: tableWrapper.index,
      windowName: tableWrapper.table.windowName,
    };

    this.setTableLinkMessageText(tableWrapper, "Loading...");
    this.api_
      .sendMessageToActiveTabFrame(params, frameId)
      .then(() => this.clearTableLinkMessage(tableWrapper))
      .catch((err) => this.setTableLinkMessageText(tableWrapper, err.message));
  }

  copyTable(tableWrapper, outputFormat) {
    outputFormat = outputFormat || OutputFormat.CLIPBOARD;

    const frameId = tableWrapper.frameId;
    const params = {
      outputFormat,
      action: MessageAction.COPY,
      id: tableWrapper.table.id,
      index: tableWrapper.index,
      windowName: tableWrapper.table.windowName,
    };

    this.setTableLinkMessage(tableWrapper, true, false);
    return this.api_.sendMessageToActiveTabFrame(params, frameId).then(() => {
      this.setTableLinkMessage(tableWrapper, false, true);
      return Promise.resolve();
    });
  }

  googTable(tableWrapper) {
    return this.copyTable(tableWrapper, OutputFormat.GOOG).then(() =>
      this.googDocCreate_()
    );
  }

  googDocCreate_() {
    const params = {
      url: _TCAP_CONFIG.newSheetsUrl,
      enablePastePrompt: this.userConfig_.enablePastePrompt,
      outputFormat: OutputFormat.GOOG,
    };
    return this.browserEnv_.sendMessage(params);
  }

  openUpgradePage_(ref) {
    this.browserEnv_.createTab({ url: `/upgrade.html?ref=${ref}` });
  }

  clearTableLinkMessage(tableWrapper) {
    this.setTableLinkMessageText(tableWrapper, "");
  }

  setTableLinkMessageText(tableWrapper, text) {
    const statusEls = document.querySelectorAll("ol._tc_table_list li .status");
    const el = statusEls[tableWrapper.displayIndex];
    el.innerHTML = `&middot;&nbsp;${text}`;
    el.classList.remove("hidden");
  }

  setTableLinkMessage(tableWrapper, copying, copied, errorMessage) {
    let message = "";
    if (errorMessage) {
      message = errorMessage;
    } else if (copying) {
      message = chrome.i18n.getMessage("copying");
    } else if (copied) {
      message = chrome.i18n.getMessage("copied");
    }

    this.setTableLinkMessageText(tableWrapper, message);
  }

  highlightTable(tableWrapper) {
    const frameId = tableWrapper.frameId;
    const params = {
      action: MessageAction.HIGHLIGHT,
      id: tableWrapper.table.id,
      index: tableWrapper.index,
      windowName: tableWrapper.table.windowName,
      renderRowPreview: this.userConfig_.renderRowPreview,
    };

    this.api_.sendMessageToActiveTabFrame(params, frameId).then((response) => {
      if (this.userConfig_.renderRowPreview && response) {
        this.renderTablePreview(response.preview);
      }
    });
  }

  unhighlightTable(tableWrapper) {
    const frameId = tableWrapper.frameId;
    const params = {
      action: MessageAction.UNHIGHLIGHT,
      id: tableWrapper.table.id,
      index: tableWrapper.index,
      windowName: tableWrapper.table.windowName,
    };

    this.api_
      .sendMessageToActiveTabFrame(params, frameId)
      .then(() => this.clearTablePreview());
  }

  renderTablePreview(preview) {
    if (!preview) {
      return;
    }

    let summary = null;
    if (preview.length === 0) {
      summary = `No previewable data\n\n\n`;
    } else if (preview.length === 1) {
      summary = `First and only row: ${preview[0].join(",")}\n\n\n`;
    } else {
      summary = `Headers: ${preview[0].join(",")}\nFirst row: ${preview[1].join(
        ","
      )}\n...`;
    }

    document.querySelector("#row-preview-wrapper pre").innerText = summary;
  }

  clearTablePreview() {
    if (this.userConfig_.renderRowPreview) {
      document.querySelector("#row-preview-wrapper pre").innerText = "\n\n\n";
    }
  }

  setTableSelection(tableWrapper, select, batchSelect, selectionIndex) {
    const listEls = document.querySelectorAll("._tc_table_list li");
    const canToggle =
      listEls.length &&
      listEls.length > tableWrapper.displayIndex &&
      listEls[tableWrapper.displayIndex];

    // Batch selection.
    if (select === true && batchSelect && this.lastSelectionIndex_ !== null) {
      const min = Math.min(this.lastSelectionIndex_, selectionIndex);
      const max = Math.max(this.lastSelectionIndex_, selectionIndex);
      for (let i = min; i <= max; i++) {
        const { tables } = this.api_.getTableDefs();
        this.setTableSelection(tables[i], true, false, i);
      }
      this.lastSelectionIndex_ = selectionIndex;
    } else if (select === true) {
      this.selectedTables_[tableWrapper.displayIndex] = tableWrapper;
      if (canToggle) {
        listEls[tableWrapper.displayIndex].classList.add("selected");
        this.lastSelectionIndex_ = selectionIndex;
      }
    } else if (select === false) {
      this.selectedTables_[tableWrapper.displayIndex] = false;
      if (canToggle) {
        listEls[tableWrapper.displayIndex].classList.remove("selected");
      }
      this.lastSelectionIndex_ = null;
    }

    this.updateHeaderTitle();
  }

  toggleTableSelection_(tableWrapper, batchSelect, index) {
    var selected = false;
    if (this.selectedTables_.hasOwnProperty(tableWrapper.displayIndex)) {
      selected = !!this.selectedTables_[tableWrapper.displayIndex];
    }

    this.setTableSelection(tableWrapper, !selected, batchSelect, index);
  }

  unselectAllTables() {
    const { tables } = this.api_.getTableDefs();
    tables.forEach((tableWrapper) =>
      this.setTableSelection(tableWrapper, false)
    );
    this.updateHeaderTitle();
  }

  selectAllTables() {
    const { tables } = this.api_.getTableDefs();
    tables.forEach((tableWrapper) =>
      this.setTableSelection(tableWrapper, true)
    );
    this.updateHeaderTitle();
  }

  getNumSelectedTables_() {
    return this.getSelectedTables().length;
  }

  getSelectedTables() {
    return Object.values(this.selectedTables_).filter(
      (tableWrapperMaybe) => !!tableWrapperMaybe
    );
  }

  handleDisabledAction_(action) {
    let actionMessage = "";
    if (action.key === "excel") {
      actionMessage = "Downloading tables in Excel (.xlsx)";
    } else if (action.key === "csv") {
      actionMessage = "Downloading tables as a CSV file";
    } else if (action.key === "screenshot") {
      actionMessage = "Screenshotting tables";
    } else {
      actionMessage = "This feature";
    }

    const message = `${actionMessage} is only available with Table Capture Pro.`;
    this.displayDismissableError_(message);
  }

  handleCopySelectedTables() {
    this.shardRollUpExtract_()
      .then((datasets) =>
        this.shardedResponsesToClipboard_(datasets, OutputFormat.CLIPBOARD)
      )
      .then(() => this.displayDismissableUpdate_("Selected tables copied"))
      .catch((err) => this.displayDismissableError_(err.message));
  }

  selectedToExcel_() {
    if (this.userConfig_.paidPro) {
      this.shardRollUpExtract_()
        .then((datasets) => this.shardedResponsesToExcel_(datasets))
        .catch((err) => this.displayDismissableError_(err.message));
    } else {
      this.handleDisabledAction_({ key: "excel" });
    }
  }

  shardedResponsesToClipboard_(datasets, outputFormat) {
    if (datasets.length === 0) {
      return Promise.reject(new Error("No datasets present"));
    }

    const arrayOfArrays = [];
    datasets.forEach((dataset) => {
      dataset.forEach((row) => {
        arrayOfArrays.push(row);
      });
      // Blank row to separate datasets.
      arrayOfArrays.push([]);
    });

    const str = TableUtil.arrayOfArraysToString(
      arrayOfArrays,
      _TCAP_COPY_CONST.rowSeparator,
      _TCAP_COPY_CONST.colSeparator
    );
    const stringData = TableUtil.postProcessFinalString(
      str,
      outputFormat,
      _TCAP_COPY_CONST,
      {}
    );

    Clipboard.copy(stringData);
    this.unselectAllTables();
    return Promise.resolve();
  }

  shardedResponsesToExcel_(datasets) {
    if (datasets.length === 0) {
      return Promise.reject(new Error("No datasets present"));
    }

    const params = {
      action: MessageAction.DATA_TO_EXCEL,
      datasets,
      swallowEarlyQuit: true,
      windowName: this.getAnyWindowName_(),
      filenameTemplate: this.userConfig_.filenameTemplate,
      singleSheetExcelExport: this.userConfig_.singleSheetExcelExport,
      userConfig: this.userConfig_,
    };
    return this.api_.sendMessageToActiveTab(params);
  }

  selectedToGoogle_() {
    this.shardRollUpExtract_()
      .then((datasets) =>
        this.shardedResponsesToClipboard_(datasets, OutputFormat.GOOG)
      )
      .then(() => this.googDocCreate_())
      .catch((err) => this.displayDismissableError_(err.message));
  }

  shardRollUpExtract_() {
    const tableWrapperCount = this.getNumSelectedTables_();
    const wrappersByWindow = this.getSelectedWrappersByWindow_();
    return Promise.all(
      Object.keys(wrappersByWindow).map((windowName) => {
        const tableWrappers = wrappersByWindow[windowName];
        return this.getSelectedWindowTablesData_(windowName, tableWrappers);
      })
    ).then((responses) => {
      let allDatasets = [];
      responses.forEach((response) => {
        if (response.datasets) {
          allDatasets = [...allDatasets, ...response.datasets];
        }
      });

      if (allDatasets.length < tableWrapperCount) {
        throw new Error(
          `Expected ${tableWrapperCount} datasets, Received ${allDatasets.length}`
        );
      }

      return allDatasets;
    });
  }

  getSelectedWindowTablesData_(windowName, windowTableWrappers) {
    const params = {
      action: MessageAction.GET_DATA_BATCH,
      swallowEarlyQuit: true,
      windowName,
      indexes: windowTableWrappers.map((wrapper) => wrapper.index),
    };

    return this.api_.sendMessageToActiveTab(params);
  }

  getAnyWindowName_() {
    const wrappersByWindow = this.getSelectedWrappersByWindow_();
    const windowKeys = Object.keys(wrappersByWindow);
    if (windowKeys && windowKeys.length) {
      return windowKeys[0];
    }
    throw new Error("Unable to get any window by name.");
  }

  getSelectedWrappersByWindow_() {
    const wrappersByWindow = {};
    this.getSelectedTables().forEach((tableWrapper) => {
      const windowName = tableWrapper.table.windowName;
      if (!wrappersByWindow[windowName]) {
        wrappersByWindow[windowName] = [];
      }
      wrappersByWindow[windowName].push(tableWrapper);
    });
    return wrappersByWindow;
  }

  handlePageReport_(currentPage) {
    const data = {
      url: currentPage,
      pro: this.userConfig_.paidPro,
      licenseCode:
        this.userConfig_.licenseCode || this.userConfig_.cloudLicenseCode,
    };

    let url = _TCAP_CONFIG.reportPageUrl;
    url = url.replace("$DATA", btoa(JSON.stringify(data)));

    this.browserEnv_.createTab({ url });
  }

  handleTableNotFound_() {
    this.openWorkshop_(false);
  }

  openWorkshop_(hasSelection) {
    if (hasSelection) {
      this.api_.incrementSelectionAttemptCount();
    }

    const params = {
      action: MessageAction.SELECTION_WORKSHOP,
      userConfig: this.userConfig_,
      hasSelection,
    };
    return this.api_.sendMessageToActiveTab(params).then(() => window.close());
  }

  openWorkshopForTable_(tableWrapper) {
    // Let's do this for any workshop action on a table.
    this.api_.incrementSelectionAttemptCount();

    const forRecipe = !!tableWrapper.recipe;
    const params = {
      action: forRecipe
        ? MessageAction.SELECTION_WORKSHOP_RECIPE
        : MessageAction.SELECTION_WORKSHOP,
      userConfig: this.userConfig_,
      hasSelection: false,
      forTable: true,
      recipe: tableWrapper.recipe,
      tableIdentification: {
        id: tableWrapper.table.id,
        index: tableWrapper.index,
        windowName: tableWrapper.table.windowName,
      },
    };
    const frameId = tableWrapper.frameId;
    return this.api_
      .sendMessageToActiveTabFrame(params, frameId)
      .then(() => window.close())
      .catch((err) => this.setTableLinkMessageText(tableWrapper, err.message));
  }
}

//// UTILS ONLY USED IN THIS FILE

function _tcStopEventProp(e) {
  try {
    e.stopPropagation();
    e.preventDefault();
  } catch (err) {
    // No op.
  }

  return false;
}
