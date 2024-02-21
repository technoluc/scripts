class SheetManager {
  constructor() {
    this.sheetsSyncBridge_ = new SheetsSyncBridge();
  }

  initialize() {
    this.wrapper_ = document.querySelector(".sheet-list");
    this.fetchAndRender_(false);

    const resetButton = document.querySelector(".btn-reset-all");
    resetButton.addEventListener("click", () => {
      resetButton.disabled = true;
      this.sheetsSyncBridge_
        .resetAll()
        .then(() => this.fetchAndRender_(false))
        .catch((error) => this.handleError_(error))
        .finally(() => {
          resetButton.disabled = false;
        });
    });
  }

  updateSheetEntry_(newSheet) {
    this.sheetsSyncBridge_
      .setSheetEntry(newSheet)
      .then(() => this.fetchAndRender_(true))
      .catch((error) => this.handleError_(error));
  }

  fetchAndRender_(postUpdate) {
    return this.sheetsSyncBridge_
      .getSheets()
      .then((sheetMap) => this.renderSheets_(sheetMap, postUpdate))
      .catch((error) => this.handleError_(error));
  }

  updateVisibilities_(hasNoSheets) {
    document
      .querySelector(".alert-sheets-drive-writes")
      .classList.toggle("hidden", hasNoSheets);

    const resetButton = document.querySelector(".btn-reset-all");
    resetButton.disabled = hasNoSheets;
  }

  renderSheets_(sheetMap, postUpdate) {
    this.wrapper_.innerHTML = "";

    const sheets = Object.values(sheetMap).filter((sheet) => !sheet.deleted);
    const hasNoSheets = !sheets || sheets.length === 0;
    this.updateVisibilities_(hasNoSheets);

    if (hasNoSheets) {
      const alert = this.createAlert_(
        "You have no active Google Sheets.",
        "success",
        false
      );
      this.wrapper_.appendChild(alert);
      return;
    }

    if (postUpdate) {
      const alert = this.createAlert_("Updates applied.", "success");
      this.wrapper_.appendChild(alert);
    }

    sheets.forEach((sheet) => {
      const sheetTitle =
        sheet.userTitle || sheet.title || sheet.pageTitle || "";
      const sheetEl = document.createElement("div");
      sheetEl.className = "sheet-list-item";
      sheetEl.innerHTML = `
        <div>
          <input type="text" class="form-control" value="${sheetTitle}" ${
        sheet.hidden ? "READONLY" : ""
      } />
          <div class="metadata">
            <a href="${sheet.url}">Google Sheet #${sheet.id}</a>
          </div>
        </div>
        <div class="actions">
          <input type="button" class="btn btn-primary save-btn" value="Update" />
          <input type="button" class="btn btn-default hide-btn" value="Hide" />
          <input type="button" class="btn btn-default show-btn" value="Show" />
          <input type="button" class="btn btn-default remove-btn" value="Remove" />
        </div>
      `;
      sheetEl.classList.toggle("ignored", !!sheet.hidden);
      sheetEl.querySelector(".show-btn").addEventListener("click", () => {
        this.updateSheetEntry_({ ...sheet, hidden: false });
      });
      sheetEl.querySelector(".hide-btn").addEventListener("click", () => {
        this.updateSheetEntry_({ ...sheet, hidden: true });
      });
      sheetEl.querySelector(".save-btn").addEventListener("click", () => {
        this.updateSheetEntry_({
          ...sheet,
          userTitle: sheetEl.querySelector("input.form-control").value,
        });
      });
      sheetEl.querySelector(".remove-btn").addEventListener("click", () => {
        this.updateSheetEntry_({ ...sheet, deleted: true });
      });

      this.wrapper_.appendChild(sheetEl);
    });
  }

  createAlert_(message, className = "warning", dismissable = true) {
    const alert = document.createElement("div");
    alert.className = `alert alert-${className}`;
    alert.innerHTML = message;
    if (dismissable) {
      alert.addEventListener("click", () => {
        alert.classList.add("hidden");
      });
    }

    return alert;
  }

  displayAlert_(message, className = "warning") {
    const alert = this.createAlert_(message, className);
    const errorWrapper = document.querySelector(".global-errors");
    errorWrapper.appendChild(alert);
  }

  handleError_(err, defaultMessage = "") {
    const message = err.message ?? defaultMessage ?? "Error displaying sheets";
    this.displayAlert_(message, "danger");
  }
}
