async function extractTables(
  pages,
  nCols,
  startRange,
  endRange,
  stackOfRows,
  minWidthFilter
) {
  let content = [];
  for (let i = startRange.page; i <= endRange.page; i++) {
    const page = pages[i];
    const textContent = await page.getTextContent();
    const textItems = textContent.items;
    content = [...content, ...textItems];
  }

  const allText = content.map((el) => el.str.trim());
  const start = allText.indexOf(startRange.text);
  if (start !== -1) {
    const upToStart = content.slice(start);
    const upToStartText = upToStart.map((el) => el.str.trim());
    const end = upToStartText.indexOf(endRange.text);
    if (end !== -1) {
      let textRange = upToStart
        .slice(0, end + 1)
        .filter((el) => el.height !== 0);

      if (minWidthFilter !== null) {
        textRange = textRange.filter((el) => el.width > minWidthFilter);
      }

      const widthRange = { min: -1, max: -1 };
      const updateWidthRange = ({ width }) => {
        if (widthRange.min === -1 || width < widthRange.min) {
          widthRange.min = width;
        }
        if (widthRange.max === -1 || width > widthRange.max) {
          widthRange.max = width;
        }
      };

      const rows = [];
      if (stackOfRows) {
        let row = [];
        for (let i = 0; i < textRange.length; i++) {
          if (i !== 0 && i % nCols === 0) {
            rows.push(row);
            row = [];
          }

          updateWidthRange(textRange[i]);
          row.push(textRange[i].str);
          if (i === textRange.length - 1) {
            rows.push(row);
          }
        }
      } else {
        const numRows = Math.ceil(textRange.length / nCols);
        for (let i = 0; i < textRange.length; i++) {
          let rowIndex = i % numRows;
          if (rows.length <= rowIndex) {
            rows.push([]);
          }
          updateWidthRange(textRange[i]);
          rows[rowIndex].push(textRange[i].str);
        }
      }
      return { rows, widthRange };
    }
  }
  throw new Error("Unable to find first and last cell values in page.");
}

class PdfExtract {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.extractor_ = null;

    this.url_ = null;
    this.page_ = null;
    this.pdfName_ = null;
    this.isStackOfRows_ = true;

    this.widthRange_ = null;
    this.minWidth_ = null;

    this.dropzone_ = document.body;
  }

  initialize() {
    const url = window.location.search.includes("?url=")
      ? window.location.search.split("?url=")[1]
      : null;

    this.bindForm_();
    this.bindToFileInput_();
    if (url) {
      this.bindToUrl_(url);
    }

    if (!this.userConfig_.paidPro) {
      this.displayUpgradeMessage_();
    }
  }

  bindForm_() {
    document
      .querySelector(".btn-extract")
      .addEventListener("click", this.renderDataPreview_.bind(this));
    document
      .querySelector(".btn-page-prev")
      .addEventListener("click", this.handlePagePrevious_.bind(this));
    document
      .querySelector(".btn-page-next")
      .addEventListener("click", this.handlePageNext_.bind(this));
    document
      .querySelector(".btn-set-is-row")
      .addEventListener("click", this.handleSetIsRow_.bind(this));
    document
      .querySelector(".btn-set-is-col")
      .addEventListener("click", this.handleSetIsCol_.bind(this));

    this.bindTextSearchInput_(document.querySelector("input#first-el"));
    this.bindTextSearchInput_(document.querySelector("input#last-el"));

    const finalExtractButton = document.querySelector(".btn-extract-final");
    finalExtractButton.disabled = !this.userConfig_.paidPro;
    finalExtractButton.addEventListener("click", this.beginExtract_.bind(this));

    document
      .querySelector("input.btn-bad-data")
      .addEventListener("click", this.handleFeedbackPress_.bind(this, true));
    document
      .querySelector("input.btn-good-data")
      .addEventListener("click", this.handleFeedbackPress_.bind(this, false));
    document
      .querySelector("input.btn-report-pdf")
      .addEventListener("click", this.handleReport_.bind(this));
    document
      .querySelector("input.btn-try-width-filter")
      .addEventListener("click", this.handleWidthTry_.bind(this));

    document.querySelector(".dropzone-mask").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,pdf,application/pdf";
      input.onchange = (_this) => {
        const files = Array.from(input.files);
        this.handleFileAddition_(files);
      };
      input.click();
    });
  }

  bindToFileInput_() {
    document.querySelector(".dropzone-mask").classList.remove("hidden");
    this.page_ = 1;

    this.dropzone_.addEventListener(
      "dragover",
      this.handleDragOver_.bind(this),
      false
    );
    this.dropzone_.addEventListener(
      "dragleave",
      this.handleDragLeave_.bind(this),
      false
    );
    this.dropzone_.addEventListener(
      "drop",
      this.handleManualFileDrop_.bind(this),
      false
    );
  }

  bindToUrl_(url) {
    document.querySelector(".pdf-url-form-group").classList.remove("hidden");
    document.querySelector("input.pdf-url").value = url;

    this.url_ = url;
    this.page_ = 1;
    this.pdfName_ = url.split("/").pop();

    const canvas = document.querySelector("canvas.pdf-preview");
    this.extractor_ = new PdfUrlLoader(this.userConfig_, url, canvas);
    this.extractor_.addErrorHandler(this.handleError_.bind(this));
    this.bindExtractor_();
  }

  bindExtractor_() {
    this.extractor_
      .renderPdf(this.page_)
      .then(() => {
        document.querySelector(".form-wrapper").classList.remove("hidden");
        return this.checkForTextContent_();
      })
      .catch((err) => this.handleError_(err));
  }

  bindTextSearchInput_(input) {
    input.addEventListener("keyup", (e) => {
      const val = e.target.value.trim();
      if (val && val.length > 2) {
        this.extractor_
          .searchText(this.page_, val)
          .then((results) => this.renderTextSearchResults_(e.target, results))
          .catch((err) => this.handleError_(err));
      } else if (!val) {
        this.clearTextSearchResults_(e.target);
      }
    });
  }

  resetOnNewPdf_() {
    document.querySelector("input#first-el").value = "";
    document.querySelector("input#last-el").value = "";
    document.getElementById("expect-cols").value = "";
    document.querySelector(".feedback-wrapper").classList.add("hidden");
    document.querySelector(".feedback-wrapper .next-steps").innerHTML = "";
    document.querySelector(".preview-wrapper").classList.add("hidden");
    document.querySelector(".data-preview").innerHTML = "";

    this.widthRange_ = null;
    this.minWidth_ = null;

    this.isStackOfRows_ = true;
    this.updateDirectionButtonGroup_();
  }

  clearTextSearchResults_(input) {
    const resultWrapper = input.parentElement.querySelector(
      ".text-search-results"
    );
    resultWrapper.innerHTML = "";
  }

  renderTextSearchResults_(input, results) {
    const resultWrapper = input.parentElement.querySelector(
      ".text-search-results"
    );
    resultWrapper.innerHTML = "";
    resultWrapper.classList.remove("hidden");
    results.slice(0, 5).forEach((result) => {
      const resultEl = document.createElement("a");
      resultEl.className = "btn btn-xs btn-warning";
      resultEl.innerHTML = result.str;
      resultEl.addEventListener("click", () => {
        input.value = result.str;
        resultWrapper.classList.add("hidden");
      });
      resultWrapper.appendChild(resultEl);
    });
  }

  handleSetIsRow_() {
    this.isStackOfRows_ = true;
    this.renderDataPreview_();
  }

  handleSetIsCol_() {
    this.isStackOfRows_ = false;
    this.renderDataPreview_();
  }

  updateDirectionButtonGroup_() {
    Array.from(document.querySelectorAll(".direction-actions .btn")).forEach(
      (btn) => {
        btn.classList.remove("btn-success");
        btn.classList.remove("btn-default");
      }
    );
    if (this.isStackOfRows_) {
      document.querySelector(".btn-set-is-row").classList.add("btn-success");
      document.querySelector(".btn-set-is-col").classList.add("btn-default");
    } else {
      document.querySelector(".btn-set-is-row").classList.add("btn-default");
      document.querySelector(".btn-set-is-col").classList.add("btn-success");
    }
  }

  updateNavButtonClickability_(enabled) {
    document.querySelector("input.btn-page-next").disabled = !enabled;
    document.querySelector("input.btn-page-prev").disabled = !enabled;
  }

  handlePageNext_() {
    if (this.page_ === this.extractor_.getPageCount()) {
      return;
    }
    this.page_++;
    this.updateNavButtonClickability_(false);
    this.extractor_
      .renderPdf(this.page_)
      .then(() => this.checkForTextContent_())
      .catch((err) => this.handleError_(err))
      .finally(() => this.updateNavButtonClickability_(true));
  }

  handlePagePrevious_() {
    if (this.page_ === 1) {
      return;
    }
    this.page_--;
    this.updateNavButtonClickability_(false);
    this.extractor_
      .renderPdf(this.page_)
      .then(() => this.checkForTextContent_())
      .catch((err) => this.handleError_(err))
      .finally(() => this.updateNavButtonClickability_(true));
  }

  async checkForTextContent_() {
    const hasText = await this.extractor_.isTextContentAvailable(this.page_);
    if (!hasText) {
      throw new Error(
        "No text content found in PDF - this could mean the PDF is a scanned image."
      );
    }
    return Promise.resolve();
  }

  displayUpgradeMessage_() {
    const message =
      _TCAP_CONFIG.paidOnly && this.userConfig_.requiresPaid
        ? `<a class="alert-link" href="/activate.html?ref=pdfex">Activate Table Capture</a> to enable PDF data extraction.`
        : `<a class="alert-link" href="/upgrade.html?ref=pdfex">Upgrade to Pro</a> to enable PDF data extraction.`;
    const wrapper = document.querySelector(".upgrade-wrapper");
    wrapper.appendChild(createAlertPaneWithHTML(message, "warning"));
  }

  renderDataPreview_() {
    document.querySelector(".feedback-wrapper").classList.add("hidden");
    document
      .querySelector(".feedback-wrapper")
      .classList.remove("show-report-button");
    this.updateDirectionButtonGroup_();

    const { nCols, startRange, endRange } = this.getExtractionParams_();

    if (!startRange.text || !endRange.text) {
      return this.handleError_(
        new Error("Missing first and last cell values.")
      );
    }

    extractTables(
      this.extractor_.getPages(),
      nCols,
      startRange,
      endRange,
      true,
      this.minWidth_
    )
      .then(({ rows }) => this.renderExtractionDataPreview_(rows))
      .catch((err) => this.handleError_(err));
  }

  renderExtractionDataPreview_(rows) {
    if (rows.length === 0) {
      return this.handleError_(new Error("Table data not found."));
    }

    document.querySelector(".preview-wrapper").classList.remove("hidden");

    const previewWrapper = document.querySelector(".data-preview");
    previewWrapper.innerHTML = "";

    const firstRow = rows[0];
    firstRow.forEach((el) => {
      const div = document.createElement("div");
      div.classList.add("data-preview-cell");
      div.innerHTML = el;
      previewWrapper.appendChild(div);
    });
  }

  beginExtract_() {
    const { nCols, startRange, endRange } = this.getExtractionParams_();

    if (!startRange.text || !endRange.text) {
      return this.handleError_(
        new Error("Missing first and last cell values.")
      );
    }

    if (!this.userConfig_.paidPro) {
      return;
    }

    extractTables(
      this.extractor_.getPages(),
      nCols,
      startRange,
      endRange,
      this.isStackOfRows_,
      this.minWidth_
    )
      .then(({ rows, widthRange }) => {
        this.renderShitDataForm_(widthRange);
        chrome.extension
          .getBackgroundPage()
          .saveTableLocally(
            this.createPublicTableFromData_(rows, this.pdfName_)
          );
      })
      .catch((err) => this.handleError_(err));
  }

  getExtractionParams_() {
    const page = this.page_ - 1;
    const nCols = Number(document.getElementById("expect-cols").value);
    const startRange = {
      page,
      textInstance: 0,
      text: document.querySelector("input#first-el").value,
    };
    const endRange = {
      page,
      textInstance: 0,
      text: document.querySelector("input#last-el").value,
    };
    return { nCols, startRange, endRange };
  }

  createPublicTableFromData_(rows, pdfName) {
    return {
      tableDataArray: rows,
      title: pdfName,
      pageTitle: pdfName,
      pdf: true,
      paged: false,
      dynamic: false,
    };
  }

  handleError_(err, defaultMessage = "") {
    // Handle PDFs with passwords.
    if (err && err.name && err.name === "PasswordException") {
      const pass = window.prompt(
        `${err.message}: Please provide a password for this PDF.`
      );
      if (pass) {
        this.extractor_.setPassword(pass);
        return this.bindExtractor_();
      }
    }

    const message =
      err && err.message
        ? `Error caught: ${err.message}`
        : defaultMessage ?? "Error caught!";
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(createAlertPane(message, "danger", true));
  }

  //// FEEDBACK AND SHIT DATA

  handleReport_() {
    const data = {
      url: this.url_,
      pro: this.userConfig_.paidPro,
      licenseCode:
        this.userConfig_.licenseCode || this.userConfig_.cloudLicenseCode,
    };

    let url = _TCAP_CONFIG.reportPageUrl;
    url = url.replace("$DATA", btoa(JSON.stringify(data)));

    new BrowserEnv().createTab({ url });
  }

  renderShitDataForm_(widthRange) {
    this.widthRange_ = widthRange;
    this.minWidth_ = null;

    document.querySelector(".feedback-wrapper").classList.remove("hidden");
    document.querySelector(".feedback-wrapper .next-steps").innerHTML = "";
  }

  handleFeedbackPress_(badData, _event) {
    const wrapper = document.querySelector(".feedback-wrapper .next-steps");
    wrapper.innerHTML = "";
    if (badData) {
      const message =
        "I'm sorry to hear that! Please report the PDF and George will attempt to improve the extractor.";
      wrapper.appendChild(createAlertPane(message, "danger", false));
      document
        .querySelector(".feedback-wrapper")
        .classList.add("show-report-button");
    } else {
      const message = "That's great to hear!";
      wrapper.appendChild(createAlertPane(message, "success", false));
      document
        .querySelector(".feedback-wrapper")
        .classList.remove("show-report-button");
    }
  }

  handleWidthTry_() {
    try {
      const niceNum = (val) => Math.round(val);
      const message = `Please input a column width between ${niceNum(
        this.widthRange_.min
      )} and ${niceNum(this.widthRange_.max)}.`;
      const val = window.prompt(message);
      this.minWidth_ = Number(val);
      this.beginExtract_();
    } catch (err) {}
  }

  //// DRAGON DROP

  handleDragOver_(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";

    this.dropzone_.classList.add("file-drag-over");
  }

  handleDragLeave_() {
    this.dropzone_.classList.remove("file-drag-over");
  }

  handleManualFileDrop_(evt) {
    this.handleDragLeave_();
    evt.stopPropagation();
    evt.preventDefault();
    this.handleFileAddition_(evt.dataTransfer.files);
  }

  handleFileAddition_(fileList) {
    const pdfs = Array.from(fileList).filter((file) =>
      file.name.endsWith(".pdf")
    );
    if (pdfs.length === 1) {
      document.querySelector(".pdf-url-form-group").classList.add("hidden");

      const file = pdfs[0];

      this.url_ = null;
      this.pdfName_ = file.name;
      this.page_ = 1;

      const canvas = document.querySelector("canvas.pdf-preview");
      this.resetOnNewPdf_();
      this.extractor_ = new PdfFileLoader(this.userConfig_, file, canvas);
      this.extractor_.addErrorHandler(this.handleError_.bind(this));
      this.bindExtractor_();
    }
  }
}
