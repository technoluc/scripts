const TEST_ARRAY_OGNL = "fund.entity";
const TEST_URL =
  "https://investor.vanguard.com/investment-products/etfs/profile/api/VTI/portfolio-holding/stock";

////

class JSONExtract {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.json_ = null;
    this.activeDataArray_ = null;
    this.columnPaths_ = [];
  }

  initialize() {
    this.initializeEvents_();
  }

  initializeEvents_() {
    const urlInput = document.querySelector("input.json-url");
    const arrayBaseInput = document.querySelector("input.array-base");

    document.querySelector("a.example.url").addEventListener("click", (e) => {
      urlInput.value = TEST_URL;
      this.setAndFetchJSON_(TEST_URL);
    });

    document
      .querySelector("a.example.array-ognl")
      .addEventListener("click", (e) => {
        arrayBaseInput.value = TEST_ARRAY_OGNL;
        this.setArrayOgnl_(TEST_ARRAY_OGNL);
      });

    const bindBoth = (input, cb) => {
      input.addEventListener("change", cb);
      input.addEventListener("keyup", (e) => {
        if (e.keyCode === 13) {
          cb(e);
        }
      });
    };

    bindBoth(urlInput, this.handleJSONURLChange_.bind(this));
    bindBoth(arrayBaseInput, this.handleArraySet_.bind(this));

    const entryPreviewTextarea = document.querySelector(
      ".entry-preview-wrapper textarea"
    );
    // Bind to selection events.
    entryPreviewTextarea.addEventListener("mouseup", (e) => {
      const selection = window.getSelection();
      const selectedText = selection.toString();
      if (selectedText.length > 0) {
        this.handleAddColumnFromTextSelection_(selectedText);
      }
    });

    document
      .querySelector("input.btn-export")
      .addEventListener("click", (e) => {
        this.exportTable_();
      });
  }

  handleArraySet_(e) {
    this.setArrayOgnl_(e.target.value);
  }

  setArrayOgnl_(ognl) {
    this.arrayBasePath_ = ognl;

    this.clearSheetPreview_();
    this.renderSheetPreview_();
  }

  handleJSONURLChange_(e) {
    const url = e.target.value;
    if (!url) {
      return;
    }
    this.setAndFetchJSON_(url);
  }

  setAndFetchJSON_(url) {
    this.clearJSONPreview_();
    this.clearSheetPreview_();

    this.fetchJSON_(url)
      .then((json) => this.renderJsonPreview_(json))
      .catch((err) => {
        if (err.message && err.message.includes("not valid JSON")) {
          this.handleError_(new Error("URL did not return valid JSON."));
        } else {
          this.handleError_(err);
        }
      });
  }

  fetchJSON_(url) {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(resolve)
        .catch(reject);
    });
  }

  renderJsonPreview_(json) {
    this.json_ = json;

    document.querySelector(".json-preview-wrapper textarea").innerHTML =
      JSON.stringify(this.json_, null, 2);
  }

  renderSheetPreview_() {
    if (!this.json_) {
      return this.handleError_(new Error("No JSON has been set."));
    }
    if (!this.arrayBasePath_) {
      return this.handleError_(new Error("Please set a base array OGNL path."));
    }

    let data = null;
    try {
      data = traverseJson(this.json_, this.arrayBasePath_);
      if (!Array.isArray(data)) {
        throw new Error("Array OGNL did not return an array.");
      }
    } catch (err) {
      return this.handleError_(err);
    }

    this.activeDataArray_ = data;
    const numEntries = data.length;
    console.log(`Found ${numEntries} entries.`);

    if (numEntries === 0) {
      return this.handleError_(new Error("No entries found."));
    }

    const entryPreview = data[0];
    document.querySelector(".entry-preview-wrapper textarea").innerHTML =
      JSON.stringify(entryPreview, null, 2);

    document.querySelector(".sheet-preview").classList.remove("hidden");
    document.querySelector(".sheet-preview .metadata").innerHTML = `
      <div class="num-entries">${numEntries} entries</div>
      <div class="num-columns">${Object.keys(entryPreview).length} columns</div>
    `;
  }

  clearJSONPreview_() {
    document.querySelector(".json-preview-wrapper textarea").innerHTML = "";
    this.json_ = null;
  }

  clearSheetPreview_() {
    const sheetPreview = document.querySelector(".sheet-preview");
    sheetPreview.classList.add("hidden");
    sheetPreview.classList.add("no-cols");

    this.activeDataArray_ = null;
    this.columnPaths_ = [];

    this.getAndClearTable_();
    this.bindToTableState_();
  }

  handleAddColumnFromTextSelection_(selectedText) {
    const keys = Object.keys(this.activeDataArray_[0]);
    if (!keys.includes(selectedText)) {
      return;
    }

    if (this.columnPaths_.includes(selectedText)) {
      return;
    }

    this.columnPaths_.push(selectedText);
    this.renderTable_();
  }

  exportTable_() {
    const rows = this.getTableRows_();
    const name = "JSON Table";
    const publicTableDef = {
      tableDataArray: rows,
      title: name,
      pageTitle: name,
      pdf: true,
      paged: false,
      dynamic: false,
    };
    chrome.extension.getBackgroundPage().saveTableLocally(publicTableDef);
  }

  getTableRows_() {
    const headers = this.columnPaths_;
    const rows = [headers];

    this.activeDataArray_.forEach((entry) => {
      const row = [];
      this.columnPaths_.forEach((path) => {
        row.push(traverseJson(entry, path));
      });
      rows.push(row);
    });
    return rows;
  }

  getAndClearTable_() {
    const table = document.querySelector(".sheet-preview table");
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";
    return { thead, tbody };
  }

  bindToTableState_() {
    document.querySelector("input.btn-export").disabled =
      this.columnPaths_.length === 0;
    document
      .querySelector(".sheet-preview")
      .classList.toggle("no-cols", this.columnPaths_.length === 0);
  }

  renderTable_() {
    this.bindToTableState_();

    const { thead, tbody } = this.getAndClearTable_();

    const headerRow = document.createElement("tr");
    thead.appendChild(headerRow);
    this.columnPaths_.forEach((path) => {
      const th = document.createElement("th");
      th.innerHTML = path;
      headerRow.appendChild(th);
    });

    this.activeDataArray_.forEach((entry) => {
      const tr = document.createElement("tr");
      tbody.appendChild(tr);

      this.columnPaths_.forEach((path) => {
        const td = document.createElement("td");
        td.innerHTML = traverseJson(entry, path);
        tr.appendChild(td);
      });
    });
  }

  handleError_(err) {
    alert(err.message);
  }
}

function traverseJson(json, ognl) {
  const parts = ognl.split(".");
  let data = json;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === "") {
      continue;
    }
    if (data[part] === undefined) {
      throw new Error(`Could not find part ${part} in ${ognl}`);
    }
    data = data[part];
  }
  return data;
}

function initializeApp(userConfig) {
  new OptionsChrome();

  const extractor = new JSONExtract(userConfig);
  extractor.initialize();
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then((userConfig) => initializeApp(userConfig))
    .catch((err) => {
      console.log(err);
    });
});
