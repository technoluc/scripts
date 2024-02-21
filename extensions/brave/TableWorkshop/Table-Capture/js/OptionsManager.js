/** A manager of options. */
class OptionsManager {
  constructor() {
    this.defaults_ = JSON.parse(JSON.stringify(_TCAP_CONFIG_DEFAULTS));
    this.nonFormOptions_ = { ...this.defaults_ };
    this.browserEnv_ = new BrowserEnv();

    this.configurableTimeouts_ = {
      autoScrollInterval: "Auto-scrolling: Scroll interval",
      autoPageWait: "Auto-paging: Next page delay",
    };
  }

  initialize() {
    this.bindToOptions_();
    this.bindTimeoutTable_();

    document
      .querySelector("form.extension-options")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleSave_();
        return false;
      });

    Array.from(document.querySelectorAll(".more-action-wipe")).forEach((el) =>
      el.addEventListener("click", () => {
        this.revertToDefaults_();
      })
    );

    Array.from(document.querySelectorAll(".btn-save")).forEach((btn) =>
      btn.addEventListener("click", this.handleSave_.bind(this))
    );
  }

  handleSave_() {
    this.persist_(this.getValues_()).then(() => {
      this.showSaveMessage_("Saved");
      window.location.href = "#";
    });
  }

  revertToDefaults_() {
    this.persist_(this.defaults_).then(() => {
      window.location.reload();
    });
  }

  getValues_() {
    const timeoutValues = {};
    Object.keys(this.configurableTimeouts_).forEach((key) => {
      const value = document.querySelector(`input[name="${key}"]`).value.trim();
      timeoutValues[key] =
        value === ""
          ? _TCAP_DURATION_DEFAULT_VALUES[key]
          : Math.max(parseInt(value, 10), 250);
      // This is a convenience.
      document.querySelector(`input[name="${key}"]`).value = timeoutValues[key];
    });

    const values = {
      ...this.nonFormOptions_,
      ...timeoutValues,
      addNewLinesForParagraphs: !!document.querySelector(
        "input.new-lines-for-paras-checkbox"
      ).checked,
      alwaysAllowColumnify: !!document.querySelector(
        "input.always-allow-columnify-checkbox"
      ).checked,
      copyImagesToClipboard: !!document.querySelector(
        "input.copy-images-to-clip-checkbox"
      ).checked,
      csvDelimiter: document.querySelector("input#csv-delimiter").value || ",",
      deleteEmptyRows: !!document.querySelector(
        "input.delete-empty-rows-checkbox"
      ).checked,
      enableGDriveWrite: !!document.querySelector(
        "input.enable-gdrive-write-checkbox"
      ).checked,
      enablePastePrompt: !!document.querySelector(
        "input.enable-paste-prompt-checkbox"
      ).checked,
      enableUrlAutoPage: !!document.querySelector(
        "input.enable-url-based-auto-paging-checkbox"
      ).checked,
      extractImageSrc: !!document.querySelector("input.img-src-checkbox")
        .checked,
      filenameTemplate:
        document.querySelector("input#filename-template").value || "",
      getLinkUrls: !!document.querySelector("input.get-links-checkbox").checked,
      ignoreHiddenPageElements: !!document.querySelector(
        "input.ignore-hidden-checkbox"
      ).checked,
      ignoreHiddenTables: !!document.querySelector(
        "input.ignore-hidden-tables-checkbox"
      ).checked,
      ignoreImages: !!document.querySelector("input.ignore-images-checkbox")
        .checked,
      inlineImagesGSheets: !!document.querySelector(
        "input.inline-images-gsheets-checkbox"
      ).checked,
      moneyAsNumber: !!document.querySelector("input.money-number-checkbox")
        .checked,
      numberAsNumber: !!document.querySelector(
        "input.number-as-number-checkbox"
      ).checked,
      numDecimalChar:
        document.querySelector("input#num-decimal-char").value || ".",
      numThousandChar:
        document.querySelector("input#num-thousand-char").value || ",",
      renderRowPreview: !!document.querySelector("input.row-preview-checkbox")
        .checked,
      showDeveloperOptions: !!document.querySelector(
        "input.enable-developer-options-checkbox"
      ).checked,
      removeStrikethroughs: !!document.querySelector(
        "input.remove-strikethroughs-checkbox"
      ).checked,
      singleSheetExcelExport: !!document.querySelector(
        "input.single-sheet-excel-checkbox"
      ).checked,
      useUnifiedPaging: !!document.querySelector(
        "input.use-unified-paging-checkbox"
      ).checked,
    };

    // Validate & default chars
    if (values.numDecimalChar && values.numDecimalChar.length > 1) {
      values.numDecimalChar = values.numDecimalChar[0];
    }

    if (values.numThousandChar && values.numThousandChar.length > 1) {
      values.numThousandChar = values.numThousandChar[0];
    }

    // If they're the same, default them.
    if (
      values.numDecimalChar === values.numThousandChar &&
      values.numThousandChar
    ) {
      values.numDecimalChar = ".";
      values.numThousandChar = ",";
    }

    return values;
  }

  persist_(options) {
    return this.browserEnv_.getSyncStorageApi().setP(options);
  }

  bindTimeoutTable_() {
    const tbody = document.querySelector(".timeouts-table tbody");
    Object.keys(this.configurableTimeouts_).forEach((key) => {
      const label = this.configurableTimeouts_[key];
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${label}</td>
        <td>
          <input
              class="form-control"
              type="number"
              name="${key}-default"
              value="${_TCAP_DURATION_DEFAULT_VALUES[key]}"
              disabled />
        </td>
        <td>
          <input
              class="form-control"
              type="number"
              name="${key}"
              value="${_TCAP_DURATION_DEFAULT_VALUES[key]}" />
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  bindToOptions_() {
    const defaultOptions = this.defaults_;
    this.browserEnv_
      .getSyncStorageApi()
      .getP(defaultOptions)
      .then((optionsValues) => {
        if (!optionsValues) {
          return;
        }

        Object.keys(optionsValues).forEach((optionKey) => {
          this.bindToValue_(optionKey, optionsValues[optionKey]);
        });

        this.updateImageSelection_(optionsValues.ignoreImages, true);
        this.bindToImageEvents_();
      });

    document
      .querySelector(".alert-save-worked")
      .addEventListener("click", () => this.hideSaveMessage_());
  }

  bindToImageEvents_() {
    ["input.img-src-checkbox", "input.inline-images-gsheets-checkbox"].forEach(
      (selector) => {
        document.querySelector(selector).addEventListener("change", (e) => {
          const ignoreImages = document.querySelector(
            "input.ignore-images-checkbox"
          ).checked;
          this.updateImageSelection_(ignoreImages, false);
        });
      }
    );

    ["input.ignore-images-checkbox"].forEach((selector) => {
      document.querySelector(selector).addEventListener("change", (e) => {
        const ignoreImages = document.querySelector(
          "input.ignore-images-checkbox"
        ).checked;
        this.updateImageSelection_(ignoreImages, true);
      });
    });
  }

  updateImageSelection_(ignoreImages, favorIgnore) {
    const newIgnoreImages = favorIgnore && ignoreImages;
    if (favorIgnore && ignoreImages) {
      [
        "input.img-src-checkbox",
        "input.inline-images-gsheets-checkbox",
      ].forEach((selector) => {
        document.querySelector(selector).checked = false;
      });
    } else if (!favorIgnore && ignoreImages) {
      document.querySelector("input.ignore-images-checkbox").checked = false;
    }

    const allOff = [
      "input.img-src-checkbox",
      "input.inline-images-gsheets-checkbox",
      "input.ignore-images-checkbox",
    ].every((selector) => {
      return !document.querySelector(selector).checked;
    });

    if (allOff) {
      document
        .querySelector(".two-halves-wrapper .ignore-images")
        .classList.add("disabled");
      document
        .querySelector(".two-halves-wrapper .extract-images")
        .classList.add("disabled");
    } else {
      document
        .querySelector(".two-halves-wrapper .ignore-images")
        .classList.toggle("disabled", !newIgnoreImages);
      document
        .querySelector(".two-halves-wrapper .extract-images")
        .classList.toggle("disabled", newIgnoreImages);
    }
  }

  setValue(key, value) {
    const valueObject = {};
    valueObject[key] = value;

    this.bindToValue_(key, value);
    return this.browserEnv_.getSyncStorageApi().setP(valueObject);
  }

  bindToValue_(key, value) {
    switch (key) {
      case "autoPageWait":
      case "autoScrollInterval":
        document.querySelector(`input[name='${key}']`).value = value;
        break;
      case "addNewLinesForParagraphs":
        document.querySelector("input.new-lines-for-paras-checkbox").checked =
          value;
        break;
      case "alwaysAllowColumnify":
        document.querySelector(
          "input.always-allow-columnify-checkbox"
        ).checked = value;
        break;
      case "copyImagesToClipboard":
        document.querySelector("input.copy-images-to-clip-checkbox").checked =
          value;
        break;
      case "csvDelimiter":
        document.querySelector("input#csv-delimiter").value = value;
        break;
      case "deleteEmptyRows":
        document.querySelector("input.delete-empty-rows-checkbox").checked =
          value;
        break;
      case "enableGDriveWrite":
        document.querySelector("input.enable-gdrive-write-checkbox").checked =
          value;
        break;
      case "enablePastePrompt":
        document.querySelector("input.enable-paste-prompt-checkbox").checked =
          value;
        break;
      case "enableUrlAutoPage":
        document.querySelector(
          "input.enable-url-based-auto-paging-checkbox"
        ).checked = value;
        break;
      case "extractImageSrc":
        document.querySelector("input.img-src-checkbox").checked = value;
        break;
      case "filenameTemplate":
        document.querySelector("input#filename-template").value = value;
        break;
      case "getLinkUrls":
        document.querySelector("input.get-links-checkbox").checked = value;
        break;
      case "ignoreHiddenPageElements":
        document.querySelector("input.ignore-hidden-checkbox").checked = value;
        break;
      case "ignoreHiddenTables":
        document.querySelector("input.ignore-hidden-tables-checkbox").checked =
          value;
        break;
      case "ignoreImages":
        document.querySelector("input.ignore-images-checkbox").checked = value;
        break;
      case "inlineImagesGSheets":
        document.querySelector("input.inline-images-gsheets-checkbox").checked =
          value;
        break;
      case "moneyAsNumber":
        document.querySelector("input.money-number-checkbox").checked = value;
        break;
      case "numberAsNumber":
        document.querySelector("input.number-as-number-checkbox").checked =
          value;
        break;
      case "numDecimalChar":
        document.querySelector("input#num-decimal-char").value = value;
        break;
      case "numThousandChar":
        document.querySelector("input#num-thousand-char").value = value;
        break;
      case "renderRowPreview":
        document.querySelector("input.row-preview-checkbox").checked = value;
        break;
      case "showDeveloperOptions":
        document.querySelector(
          "input.enable-developer-options-checkbox"
        ).checked = value;
        break;
      case "removeStrikethroughs":
        document.querySelector("input.remove-strikethroughs-checkbox").checked =
          value;
        break;
      case "singleSheetExcelExport":
        document.querySelector("input.single-sheet-excel-checkbox").checked =
          value;
        break;
      case "useUnifiedPaging":
        document.querySelector("input.use-unified-paging-checkbox").checked =
          value;
        break;
      default:
        this.nonFormOptions_[key] = value;
        break;
    }
  }

  hideSaveMessage_() {
    document.querySelector(".alert-save-worked").style.display = "none";
  }

  showSaveMessage_() {
    document.querySelector(".alert-save-worked").style.display = "block";
  }
}
