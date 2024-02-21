class TableEditor {
  constructor(userConfig) {
    this.actionLogger_ = new TableActionLogger(userConfig);
    this.userConfig_ = userConfig;
    this.browserEnv_ = new BrowserEnv();

    this.selectedRows_ = [];
    this.selectedCols_ = [];

    this.disableSelectionActions_ = false;

    this.table_ = null;
    this.workInProgressTableDataArray_ = null;
    this.aiColumn_ = false;
    this.aiExpectationSuccess_ = false;
    this.gptBridge_ = new GPTBridge(this.userConfig_.gptApiKey);
  }

  fetchAndRender() {
    this.fetchTable_()
      .then((table) => this.renderTable_(table))
      .catch((err) => this.handleError_(err))
      .finally(() => {
        this.flashPro_();
      });
  }

  fetchTable_() {
    return this.browserEnv_
      .getBackgroundPageP()
      .then((backgroundPage) => backgroundPage.getLocalTableForEdit());
  }

  renderTable_(table) {
    if (!table) {
      return this.handleError_(new Error("Table data not present."));
    }

    this.table_ = table;

    const dropdown = `
      <div class="dropdown">
        <button
            class="btn btn-default dropdown-toggle"
            type="button"
            data-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="true">
          <span class="caret"></span>
        </button>
        <ul class="dropdown-menu">
          <li class="dropdown-header">Data operations</li>
          <li><a href="#" class="post-process-action">Post-Process Data (Filter/Transform)</a></li>
          <li>
            <a href="#" class="ai-column-action flex-item">
              Add Magic Column ${this.renderCloudTagForDropdown_()}
            </a>
          </li>
          <li role="separator" class="divider"></li>
          <li class="dropdown-header">Additional export actions</li>
          <li>
            <a href="#" class="generate-import-html flex-item">
              <span>Copy the <span class="mono">=IMPORTHTML()</span> equation to clipboard</span>
            </a>
          </li>
          <li><a href="#" class="export-airtable hidden">Export to Airtable</a></li>
          <li><a href="#" class="export-doc flex-item"><span>Export to Doc (Microsoft Word, Google Docs, etc.)</span></a></li>
          <li role="separator" class="divider"></li>
          <li class="dropdown-header">Shortcuts</li>
          <li><a href="#" class="create-blank-goog-sheet">Create a blank Google Sheet</a></li>
        </ul>
      </div>
    `;

    const wrapper = document.querySelector(".table-edit-wrapper");
    wrapper.innerHTML = `
      <div class="table-title">${table.title}</div>
      <div class="table-source">
        <span class="row-count"></span>
        <span class="source-url hidden">Source: <a href="${table.sourceUrl}" target="_blank">${table.sourceUrl}</a></span>
      </div>
      <div class="actions">
        <div class="select-actions">
          <input type="button" value="Delete header row" class="btn btn-danger btn-delete-first-row" />  
          <div class="btn-group" role="group" aria-label="Deletion">
            <input type="button" value="Delete row" class="btn btn-danger btn-delete-row" />
            <input type="button" value="Delete column" class="btn btn-danger btn-delete-col" />
          </div>
          <input type="button" value="Clear selection" class="btn btn-default btn-clear-selection" />
          ${dropdown}
        </div>
        <div class="export-actions">
        </div>
      </div>
      <div class="advanced-wrapper"></div>
      <div class="table-responsive"><table class="table"><tbody></tbody></table></div>
    `;

    if (table.sourceUrl) {
      wrapper
        .querySelector(".table-source span.source-url")
        .classList.remove("hidden");
    }

    this.renderDropdownActions_(wrapper.querySelector(".dropdown"));
    this.renderExportActions_(
      wrapper.querySelector(".export-actions"),
      !table.sourceUrl
    );

    wrapper
      .querySelector(".btn-delete-first-row")
      .addEventListener("click", this.handleHeaderRowDelete_.bind(this));
    wrapper
      .querySelector(".btn-delete-row")
      .addEventListener("click", this.handleRowDelete_.bind(this));
    wrapper
      .querySelector(".btn-delete-col")
      .addEventListener("click", this.handleColDelete_.bind(this));
    wrapper
      .querySelector(".btn-clear-selection")
      .addEventListener("click", this.handleSelectionClear_.bind(this));

    this.renderTableData_(table.tableDataArray);
    this.updateButtons_();

    if (!this.userConfig_.paidPro) {
      const upgradeCta = document.querySelector(".upgrade-cta");
      upgradeCta.classList.remove("hidden");
      upgradeCta.addEventListener("click", () => {
        window.open(chrome.extension.getURL("/upgrade.html?ref=table-edit"));
      });
    }
  }

  renderDropdownActions_(dropdown) {
    const hasTableIndex =
      this.table_.tableDef && this.table_.tableDef.index !== undefined;

    const dropdownActions = [
      [
        ".generate-import-html",
        this.handleGenerateImportHtml_.bind(this),
        hasTableIndex,
      ],

      [
        ".export-doc",
        this.handleDocExport_.bind(this),
        this.userConfig_.paidPro,
        true,
      ],
      [".export-airtable", this.handleAirtable_.bind(this), true],
      [
        ".create-blank-goog-sheet",
        this.handleCreateBlankGoogleSheet_.bind(this),
        true,
      ],
      [".post-process-action", this.handlePostProcess_.bind(this), true],
      [".ai-column-action", this.handleAddAiColumn_.bind(this), true],
    ];
    dropdownActions.forEach(([selector, cb, enabled, proOnly]) => {
      const el = dropdown.querySelector(selector);
      if (enabled) {
        el.addEventListener("click", cb);
      } else if (proOnly && !this.userConfig_.paidPro) {
        const proTag = document.createElement("span");
        proTag.className = "tag pro-only";
        proTag.innerText = "Pro";
        el.appendChild(proTag);
      } else {
        const disabledTag = document.createElement("span");
        disabledTag.className = "tag disabled";
        disabledTag.innerText = "Disabled";
        el.appendChild(disabledTag);
      }
    });
  }

  renderCloudTagForDropdown_() {
    return `
      <span class="tag cloud-only">
        <img src="/images/icon.cloud.128.png" />
        Table Capture Cloud
      </span>
    `;
  }

  renderExportActions_(actionWrapper, disableCloud = false) {
    const actions = [
      {
        icon: "images/icon.clipboard.add.png",
        cb: this.handleCopy_.bind(this),
        title: chrome.i18n.getMessage("copyClipboardActionTooltip"),
        enabled: true,
      },
      {
        icon: "images/icon.sheets.png",
        cb: this.handleGoogleSheets_.bind(this),
        enabled: true,
        title: chrome.i18n.getMessage("googleDocActionTooltip"),
      },
      {
        icon: "images/icon.excel.svg",
        cb: this.handleExcel_.bind(this),
        enabled: this.userConfig_.paidPro,
        title: chrome.i18n.getMessage("excelActionTooltip"),
      },
      {
        icon: "images/icon.csv.b.png",
        cb: this.handleCsv_.bind(this),
        enabled: this.userConfig_.paidPro,
        title: chrome.i18n.getMessage("csvActionTooltip"),
      },
      {
        icon: "images/icon.markdown.png",
        cb: this.handleMarkdown_.bind(this),
        enabled: this.userConfig_.paidPro,
        title: chrome.i18n.getMessage("markdownActionTooltip"),
      },
      { className: "sepa" },
      {
        icon: "/images/icon.cloud.128.png",
        cb: this.handleCloud_.bind(this),
        enabled: _TCAP_CONFIG.supportsCloud && !disableCloud,
        title: chrome.i18n.getMessage("cloudActionTooltip"),
      },
    ];

    actions.forEach((action) => {
      if (action.className) {
        const el = document.createElement("div");
        el.className = action.className;
        actionWrapper.appendChild(el);
        return;
      }

      const btnWrapper = document.createElement("span");
      if (action.title) {
        btnWrapper.setAttribute("aria-label", action.title);
        btnWrapper.classList.add("hint--top");
        // btnWrapper.classList.add("hint--no-arrow");
      }

      const btn = document.createElement("img");
      btn.src = chrome.extension.getURL("/") + action.icon;

      if (action.enabled) {
        btn.classList.add("enabled");
        btn.addEventListener("click", action.cb);
      } else {
        btn.classList.add("disabled");
        btn.addEventListener("click", this.flashPro_.bind(this));
      }

      btnWrapper.appendChild(btn);
      actionWrapper.appendChild(btnWrapper);
    });
  }

  renderTableData_(tableDataArray) {
    this.rowVals_ = [];

    document.querySelector(
      ".table-edit-wrapper .row-count"
    ).innerHTML = `Rows: ${tableDataArray.length}`;

    const tbody = document.querySelector(".table-edit-wrapper tbody");
    tbody.innerHTML = "";
    tableDataArray.forEach((rowData, i) => {
      this.rowVals_.push(rowData.join("-"));

      const tr = document.createElement("tr");
      rowData.forEach((cellData, j) => {
        const cellInner = document.createElement("div");
        cellInner.className = "_tc-cell-inner";
        cellInner.innerText = cellData || "";

        const td = document.createElement("td");
        td.appendChild(cellInner);
        tr.appendChild(td);

        if (j === 0 && this.aiColumn_) {
          td.classList.add("ai-col");
        }

        if (i === 0) {
          td.addEventListener("click", this.selectCol_.bind(this, j));
          td.title = `Column Identifier: \$${j + 1}`;
        }
      });
      if (i !== 0) {
        tr.addEventListener("click", this.selectRow_.bind(this, i));
      }
      tbody.appendChild(tr);
    });
  }

  //// ROW/COL SELECTION/MOD

  selectRow_(rowIndex, event) {
    const { shiftKey } = event;
    const rows = Array.from(document.querySelectorAll("tr"));

    if (this.selectedRows_.includes(rowIndex)) {
      this.selectedRows_.splice(this.selectedRows_.indexOf(rowIndex), 1);
    } else {
      if (shiftKey) {
        const lastIndex = this.selectedRows_[this.selectedRows_.length - 1];
        for (
          let i = Math.min(lastIndex, rowIndex);
          i <= Math.max(lastIndex, rowIndex);
          i++
        ) {
          if (!this.selectedRows_.includes(i)) {
            this.selectedRows_.push(i);
          }
        }
      } else {
        this.selectedRows_.push(rowIndex);
      }
    }

    rows.forEach((r, i) => {
      if (this.selectedRows_.includes(i)) {
        r.classList.add("selected");
      } else {
        r.classList.remove("selected");
      }
    });

    this.updateButtons_();
  }

  selectCol_(colIndex, event) {
    const { shiftKey } = event;

    if (this.selectedCols_.includes(colIndex)) {
      this.selectedCols_.splice(this.selectedCols_.indexOf(colIndex), 1);
    } else {
      if (shiftKey) {
        const lastIndex = this.selectedCols_[this.selectedCols_.length - 1];
        for (
          let i = Math.min(lastIndex, colIndex);
          i <= Math.max(lastIndex, colIndex);
          i++
        ) {
          if (!this.selectedCols_.includes(i)) {
            this.selectedCols_.push(i);
          }
        }
      } else {
        this.selectedCols_.push(colIndex);
      }
    }

    const selectedCells = Array.from(document.querySelectorAll("td.selected"));
    selectedCells.forEach((r) => r.classList.remove("selected"));
    const rows = Array.from(document.querySelectorAll("tr"));
    rows.forEach((r) => {
      Array.from(r.children).forEach((c, i) => {
        c.classList.toggle("selected", this.selectedCols_.includes(i));
      });
    });

    this.updateButtons_();
  }

  updateButtons_() {
    const disableHeaderRowDelete =
      this.disableSelectionActions_ || !this.table_.tableDataArray.length;
    const disableRowDelete =
      this.disableSelectionActions_ || !this.selectedRows_.length;
    const disableColumnDelete =
      this.disableSelectionActions_ || !this.selectedCols_.length;

    document.querySelector(".btn-delete-first-row").disabled =
      disableHeaderRowDelete;

    const deleteRowsButton = document.querySelector(".btn-delete-row");
    deleteRowsButton.disabled = disableRowDelete;
    deleteRowsButton.value = ` Delete rows (${this.selectedRows_.length})`;

    const deleteColsButton = document.querySelector(".btn-delete-col");
    deleteColsButton.disabled = disableColumnDelete;
    deleteColsButton.value = ` Delete columns (${this.selectedCols_.length})`;

    document.querySelector(".btn-clear-selection").disabled =
      disableColumnDelete && disableRowDelete;

    try {
      window.getSelection().empty();
    } catch (err) {}
  }

  handleHeaderRowDelete_() {
    if (this.table_.pages > 1 && this.table_.tableDataArray.length) {
      const rowToDelete = this.table_.tableDataArray[0].join("-");
      const headers = [];
      this.rowVals_.forEach((rv, i) => {
        if (rv === rowToDelete) {
          headers.push(i);
        }
      });
      this.deleteRowAtIndex_(headers);
    } else {
      this.deleteRowAtIndex_([0]);
    }
  }

  handleRowDelete_() {
    this.deleteRowAtIndex_(this.selectedRows_);
  }

  handleColDelete_() {
    const revSortedCols = [...this.selectedCols_].sort((a, b) => b - a);
    this.table_.tableDataArray.forEach((row) => {
      revSortedCols.forEach((colIndex) => {
        row.splice(colIndex, 1);
      });
    });
    this.handleSelectionClear_();
  }

  handleSelectionClear_() {
    this.selectedCols_ = [];
    this.selectedRows_ = [];
    this.renderTableData_(this.table_.tableDataArray);
    this.updateButtons_();
  }

  deleteRowAtIndex_(rowIndexes) {
    rowIndexes.forEach((rowIndex) => {
      this.table_.tableDataArray[rowIndex] = "TC-DEL-EAT-ED";
    });
    this.table_.tableDataArray = this.table_.tableDataArray.filter(
      (r) => r !== "TC-DEL-EAT-ED"
    );
    this.handleSelectionClear_();
  }

  //// AI

  handleAddAiColumn_() {
    if (!this.userConfig_.paidCloud) {
      const tcAction = { messageAction: MessageAction.AI_COLUMN_EXTRACTION };
      return this.handleCloudAction_(tcAction);
    }

    if (!this.userConfig_.gptApiKey) {
      const url = _TCAP_CONFIG.cloudMagicColumnsUrl;
      return this.displayPrompt_(
        `<div class="alert alert-warning">
          Please set your GPT API key to be able to use Magic Columns. You can do some
          from <a href="${url}" target="_blank">Magic Columns page</a> in your Table Capture
          Cloud account management dashboard.<br /><br />
          Once you set your API key, pleae visit the <a href="/account.html" target="_blank">account tab</a>
          above to verify Magic Columns is enabled.
        </div>`,
        true
      );
    }

    const wrapper = document.querySelector(".advanced-wrapper");
    wrapper.innerHTML = `
      <div class="advanced-wrapper-inner ai-wrapper">
        <h5>Magic Columns</h5>
        <p>
          Magic columns are created via an AI parser that can help clean your data,
          extract structured data from unstructured text, and more. You can use syntax like: $1
          to mean "Column 1". If you don't provide a column to reference, the AI will
          use the entire row.
        </p>
        <p>Good examples of prompts include:</p>
        <ul>
          <li>"Extract the zip code from $2"</li>
          <li>"Give me the dollar amount from $3"</li>
          <li>"Extract the Twitter username from $5 if present, otherwise return a single dash."</li>
        </ul>
        <div class="ai-prompt-wrapper editable-wrappr">
          <div class="form-group">
            <label for="ai-prompt">Prompt:</label>
            <input
                type="text"
                class="form-control ai-prompt"
                id="ai-prompt" />
          </div>
        </div>
        <div class="expectation-wrapper editable-wrappr">
          <div class="form-group">
            <label for="ai-expectation">Expected output for your first row:</label>
            <input
                type="text"
                class="form-control ai-expectation"
                id="ai-expectation" />
          </div>
        </div>
        <div class="_tc-switch-wrapper first-row-headers-wrapper">
          <label class="_tc-switch">
            <input type="checkbox" class="first-row-headers" checked />
            <span class="tc-slider"></span>
          </label>
          <span class="switch-label"></span>
        </div>
        <div class="actions">
          <input type="button" class="btn btn-danger btn-ai-revert-exit" value="Revert & Close" />
          <span class="divider"></span>
          <input type="button" class="btn btn-default btn-ai-revert" value="Revert" />
          <input type="button" class="btn btn-default btn-ai-preview" value="Preview (3)" />
          <span class="divider"></span>
          <input type="button" class="btn btn-success btn-ai-apply" disabled value="Apply" />
        </div>
        <div class="help-text">
          <div>
            Clicking "Preview" will create a Magic Column for the first 3 rows of your table. If
            the <span class="tc">expected output</span> matches the <span class="tc">actual output</span>,
            you can then click "Apply" to create the Magic Column for the entire table.
          </div>
          <div>If not, you can always tweak the prompt and/or the expected output.</div>
        </div>
      </div>
    `;

    const actions = [
      [".btn-ai-preview", this.handleAIPreview_.bind(this)],
      [".btn-ai-apply", this.handleAIApply_.bind(this)],
      [".btn-ai-revert-exit", this.handleAIExit_.bind(this)],
      [".btn-ai-revert", this.handleAIRevert_.bind(this)],
    ];
    actions.forEach((action) => {
      const btn = wrapper.querySelector(action[0]);
      btn.addEventListener("click", action[1]);
    });

    wrapper
      .querySelector(".first-row-headers")
      .addEventListener("change", (e) => {
        this.updateFirstRowHeadersSwitchLabel_();
      });
    wrapper
      .querySelector(".first-row-headers-wrapper span.switch-label")
      .addEventListener("click", () => {
        this.toggleFirstRowHeadersSwitch_();
      });
    this.updateFirstRowHeadersSwitchLabel_();
    this.disableSelectionActions_ = true;
    this.updateButtons_();
  }

  getFirstRowIsHeaderValue_() {
    return document.querySelector(".first-row-headers").checked;
  }

  toggleFirstRowHeadersSwitch_() {
    const val = this.getFirstRowIsHeaderValue_();
    document.querySelector(".first-row-headers").checked = !val;
    this.updateFirstRowHeadersSwitchLabel_();
  }

  updateFirstRowHeadersSwitchLabel_() {
    const firstRowHeaders = this.getFirstRowIsHeaderValue_();
    const el = document.querySelector(
      ".advanced-wrapper .first-row-headers-wrapper span.switch-label"
    );
    el.innerText = firstRowHeaders
      ? "First Row is Header Row"
      : "First Row is Data Row";
  }

  updateAiButtonState_(requestInProgress) {
    document.querySelector(".btn-ai-preview").disabled = requestInProgress;
    document.querySelector(".btn-ai-apply").disabled =
      requestInProgress || !this.aiExpectationSuccess_;
  }

  getAIPrompt_() {
    return {
      prompt: document.querySelector(".ai-prompt").value.trim(),
      expectation: document.querySelector(".ai-expectation").value.trim(),
    };
  }

  async applyAiToDataArray_(maxRows = null) {
    const { prompt, expectation } = this.getAIPrompt_();
    if (!prompt) {
      return this.handleError_(new Error("Please provide a prompt."));
    }
    if (!expectation) {
      return this.handleError_(new Error("Please provide an expected value."));
    }

    const firstRowIsHeader = this.getFirstRowIsHeaderValue_();
    const startingIndex = firstRowIsHeader ? 1 : 0;
    let isPreview = true;
    if (!maxRows) {
      isPreview = false;
      maxRows = this.table_.tableDataArray.length - startingIndex;
    }

    this.updateAiButtonState_(true);
    return this.gptBridge_
      .applyPromptToData(
        prompt,
        this.table_.tableDataArray,
        expectation,
        null,
        maxRows,
        startingIndex
      )
      .then((responses) => {
        if (!responses.length) {
          return Promise.reject(new Error("No Magic Column data."));
        }

        this.actionLogger_.logGptTokensUsed(responses.map((r) => r.tokensUsed));

        if (isPreview) {
          const { values } = responses[0];
          if (!values || !values.length) {
            return Promise.reject(
              new Error("No values in Magic Columns response.")
            );
          }

          if (values[0] !== expectation) {
            this.workInProgressTableDataArray_[
              startingIndex
            ][0] = `Expected: ${expectation}, Received: ${values[0]}`;
            this.aiExpectationSuccess_ = false;
            return;
          }
        }

        // If we got here, we have the expected response.
        responses.forEach((response, responseIndex) => {
          const { values, index } = response;
          this.workInProgressTableDataArray_[index][0] = values.length
            ? values[0]
            : "--";
        });
        this.aiExpectationSuccess_ = true;
      })
      .catch((err) => this.handleError_(err))
      .finally(() => {
        this.updateAiButtonState_(false);
      });
  }

  async handleAIPreview_() {
    if (!this.aiColumn_) {
      this.workInProgressTableDataArray_ = JSON.parse(
        JSON.stringify(this.table_.tableDataArray)
      );
      this.workInProgressTableDataArray_.forEach((row) => {
        row.unshift("...");
      });
    }

    this.aiExpectationSuccess_ = false;
    this.aiColumn_ = true;
    await this.applyAiToDataArray_(3);
    this.renderTableData_(this.workInProgressTableDataArray_);
  }

  async handleAIApply_() {
    await this.applyAiToDataArray_();
    this.table_.tableDataArray = this.workInProgressTableDataArray_;
    this.handleAIExit_();
  }

  handleAIExit_() {
    this.disableSelectionActions_ = false;
    this.updateButtons_();

    this.aiExpectationSuccess_ = false;
    this.aiColumn_ = false;
    this.workInProgressTableDataArray_ = null;
    this.handlePostProcessExit_();
  }

  handleAIRevert_() {
    this.aiColumn_ = false;
    this.workInProgressTableDataArray_ = null;
    this.handlePostProcessRevert_();
  }

  //// POST PROCESSING

  handlePostProcess_() {
    this.renderPostProcessor_();
  }

  renderPostProcessor_() {
    // Default / Saved Post Processor
    const functionText =
      window.localStorage["postProcessFn"] ||
      `
(data) => {
  return data;
}
`;

    const wrapper = document.querySelector(".advanced-wrapper");
    wrapper.innerHTML = `
      <div class="advanced-wrapper-inner post-processing-wrapper">
        <h5>Post-Processing</h5>
        <p>
          You can post-process the data below by writing a custom JavaScript function. The function
          takes an array of arrays as input and returns an array of arrays as output.
        </p>
        <pre contentEditable="true" class="post-process-fn" spellcheck="false">${functionText}</pre>
        <div class="actions">
          <input type="button" class="btn btn-danger btn-pp-revert-exit" value="Revert & Close" />
          <span class="divider"></span>
          <input type="button" class="btn btn-default btn-pp-revert" value="Revert" />
          <input type="button" class="btn btn-default btn-pp-preview" value="Preview" />
          <span class="divider"></span>
          <input type="button" class="btn btn-success btn-pp-apply" value="Apply" />
        </div>
      </div>
    `;

    const actions = [
      [".btn-pp-preview", this.handlePostProcessPreview_.bind(this)],
      [".btn-pp-apply", this.handlePostProcessApply_.bind(this)],
      [".btn-pp-revert-exit", this.handlePostProcessExit_.bind(this)],
      [".btn-pp-revert", this.handlePostProcessRevert_.bind(this)],
    ];
    actions.forEach((action) => {
      const btn = wrapper.querySelector(action[0]);
      btn.addEventListener("click", action[1]);
    });
  }

  saveProcessFn_(functionText) {
    if (!functionText.startsWith("(data) => {")) {
      return;
    }
    window.localStorage["postProcessFn"] = functionText;
  }

  getPostProcessFn_() {
    const txt = document.querySelector(".post-process-fn").innerText.trim();
    try {
      if (!txt) {
        return {
          err: new Error("Please provide a post-processing function."),
          fn: null,
        };
      }
      const fn = eval(txt);
      return { fn, txt };
    } catch (err) {
      return { err, fn: null };
    }
  }

  async handlePostProcessPreview_() {
    const { fn, err, txt } = this.getPostProcessFn_();
    if (fn === null || err) {
      return this.handleError_(
        err || new Error("Post-processing function is invalid.")
      );
    }

    try {
      const processedDataArray = await fn(this.table_.tableDataArray);
      this.saveProcessFn_(txt);
      this.renderTableData_(processedDataArray);
    } catch (err) {
      return this.handleError_(err);
    }
  }

  async handlePostProcessApply_() {
    const { fn, err, txt } = this.getPostProcessFn_();
    if (fn === null || err) {
      return this.handleError_(
        err || new Error("Post-processing function is invalid.")
      );
    }

    try {
      this.saveProcessFn_(txt);

      const processedDataArray = await fn(this.table_.tableDataArray);
      this.table_.tableDataArray = processedDataArray;
      // Exit works because we've set the data to the new data.
      this.handlePostProcessExit_();
    } catch (err) {
      return this.handleError_(err);
    }
  }

  handlePostProcessExit_() {
    const wrapper = document.querySelector(".advanced-wrapper");
    wrapper.innerHTML = "";
    this.renderTableData_(this.table_.tableDataArray);
  }

  handlePostProcessRevert_() {
    this.renderTableData_(this.table_.tableDataArray);
  }

  //// EXPORT

  handleCreateBlankGoogleSheet_() {
    const params = {
      url: _TCAP_CONFIG.newSheetsUrl,
      enablePastePrompt: false,
    };
    return this.browserEnv_.sendMessage(params);
  }

  handleGenerateImportHtml_() {
    const { sourceUrl, tableDef } = this.table_;
    const { index } = tableDef;
    const fn = `=IMPORTHTML("${sourceUrl}", "table", ${index + 1})`;

    const params = {
      action: MessageAction.COPY_TABLE_STRING,
      tableString: fn,
    };

    this.browserEnv_
      .sendMessage(params)
      .then(() =>
        this.displayMessage_("=IMPORTHTML function text copied to clipboard.")
      )
      .catch((err) => this.handleError_(err));
  }

  getDownloadFilename_() {
    // TODO(gmike): Possibly improve this. Use filename template (ExcelUtil.idToName)
    return `tablecapture-${Date.now()}`;
  }

  handleCloud_() {
    // TODO(gmike): Handle this.
    if (this.table_ && this.table_.dynamic) {
      return this.displayMessage_(
        "Dynamic tables are not currently supported by Table Capture Cloud.",
        "warning"
      );
    }

    const tcAction = {
      outputFormat: OutputFormat.CLIPBOARD,
      messageAction: MessageAction.COPY,
    };
    this.handleCloudAction_(tcAction);
  }

  handleCloudAction_(tcAction) {
    this.logTableAction_(tcAction)
      .then(() => {
        if (this.table_.pdf || !this.table_.tableDef) {
          return this.browserEnv_
            .getBackgroundPageP()
            .then((backgroundPage) => backgroundPage.saveTableForCloud(null));
        }

        const { sourceUrl: url, tableDef } = this.table_;
        return this.actionLogger_
          .getLogDataForUrlAndDef(url, tableDef)
          .then((pageElement) => {
            if (pageElement) {
              const { repros } = pageElement;
              if (repros && repros.length) {
                return chrome.extension
                  .getBackgroundPage()
                  .saveTableForCloud(repros[repros.length - 1]);
              }
            }
            throw new Error(
              "Unable to save table to Table Capture Cloud: Missing page element information."
            );
          });
      })
      .catch((err) => this.handleError_(err));
  }

  handleExcel_() {
    const tcAction = {
      outputFormat: OutputFormat.EXCEL,
      messageAction: MessageAction.EXCEL,
    };
    this.logTableAction_(tcAction);

    const sheetname = "Sheet 1 via Table Capture";
    const filename = this.getDownloadFilename_();
    const opts = {
      numberAsNumber: this.userConfig_.numberAsNumber,
      numDecimalChar: this.userConfig_.numDecimalChar,
      numThousandChar: this.userConfig_.numThousandChar,
    };
    return ExcelUtil.exportArrayOfArraysToExcelP(
      this.table_.tableDataArray,
      sheetname,
      filename,
      opts
    );
  }

  handleDocExport_() {
    const tcAction = {
      outputFormat: OutputFormat.CLIPBOARD_DOCUMENT,
      messageAction: MessageAction.COPY,
    };
    this.logTableAction_(tcAction);
    TableUtil.writeArrayOfArraysToClipboardAsItem(this.table_.tableDataArray)
      .then(() => this.displayMessage_("Table copied to clipboard."))
      .catch((err) => this.handleError_(err));
  }

  handleAirtable_() {
    const tcAction = {
      outputFormat: OutputFormat.AIRTABLE,
      messageAction: MessageAction.AIRTABLE_EXPORT,
    };
    this.logTableAction_(tcAction);

    const airtableWriter = new AirtableWriter(this.userConfig_);
    return airtableWriter.exportArrayOfArrays(this.table_.tableDataArray);
  }

  handleCsv_() {
    const tcAction = {
      outputFormat: OutputFormat.CSV,
      messageAction: MessageAction.CSV,
    };
    this.logTableAction_(tcAction);

    const filename = this.getDownloadFilename_();
    return ExcelUtil.exportArrayOfArraysToCSVP(
      this.table_.tableDataArray,
      "Sheet",
      filename,
      this.userConfig_.csvDelimiter
    );
  }

  handleMarkdown_() {
    this.handleCopyToFormat_(OutputFormat.MARKDOWN);
  }

  handleCopy_() {
    this.handleCopyToFormat_(OutputFormat.CLIPBOARD);
  }

  handleGoogleSheets_() {
    const tcAction = {
      outputFormat: OutputFormat.GOOG,
      messageAction: MessageAction.COPY,
    };
    this.logTableAction_(tcAction);

    const params = {
      action: MessageAction.COPY_TABLE_STRING,
      tableString: this.getAsString_(OutputFormat.GOOG),
    };

    this.browserEnv_
      .sendMessage(params)
      .then(() => {
        const params = {
          url: _TCAP_CONFIG.newSheetsUrl,
          outputFormat: OutputFormat.GOOG,
          enablePastePrompt: this.userConfig_.enablePastePrompt,
        };
        return this.browserEnv_.sendMessage(params);
      })
      .catch((err) => this.handleError_(err));
  }

  handleCopyToFormat_(outputFormat) {
    const tcAction = { outputFormat, messageAction: MessageAction.COPY };
    this.logTableAction_(tcAction);

    const params = {
      action: MessageAction.COPY_TABLE_STRING,
      tableString: this.getAsString_(outputFormat),
    };

    this.browserEnv_
      .sendMessage(params)
      .then(() => this.displayMessage_("Table copied"))
      .catch((err) => this.handleError_(err));
  }

  getAsString_(outputFormat) {
    const str = TableUtil.arrayOfArraysToString(
      this.table_.tableDataArray,
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

  ////

  flashPro_() {
    const upgradeCta = document.querySelector(".upgrade-cta");
    upgradeCta.classList.add("flash");
    window.setTimeout(() => upgradeCta.classList.remove("flash"), 1500);
  }

  displayMessage_(message, alertType = "success") {
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(createAlertPane(message, alertType, true));
  }

  displayPrompt_(html, closeOnClick = false) {
    const el = document.createElement("div");
    el.innerHTML = html;
    if (closeOnClick) {
      el.addEventListener("click", (e) => {
        if (e.target.tagName !== "A") {
          el.remove();
        }
      });
    }
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(el);
  }

  handleError_(err, userFacing = true) {
    const message =
      err && err.message
        ? userFacing
          ? err.message
          : `Error caught: ${err.message}`
        : "Error caught!";
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(createAlertPane(message, "danger", true));
  }

  logTableAction_(tcAction) {
    const { sourceUrl: url, pageTitle, tableDef } = this.table_;
    if (this.table_.paged || this.table_.dynamic) {
      return this.actionLogger_.logPublishableTableAction(
        this.table_,
        tcAction
      );
    }
    if (tableDef) {
      return this.actionLogger_.logWrapperDefAction(
        [tableDef],
        tcAction,
        url,
        pageTitle
      );
    }
    // TODO(gmike): Handle this.
    return Promise.resolve();
  }
}
