class ClipManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.browserEnv_ = new BrowserEnv();
  }

  initialize(focusCollectionId = null) {
    this.fetchClips_()
      .then((collections) =>
        this.renderCollections_(collections, focusCollectionId)
      )
      .catch((err) => this.handleError_(err));

    document.querySelector(".btn-clear-all").addEventListener("click", () => {
      this.deleteCollectionData_();
    });
  }

  deleteCollectionData_() {
    return this.browserEnv_
      .getBackgroundPageP()
      .then((backgroundPage) => backgroundPage.clearClipCollections())
      .then(() => this.renderCollections_({}))
      .catch((err) => this.handleError_(err));
  }

  fetchClips_() {
    return this.browserEnv_
      .getBackgroundPageP()
      .then((backgroundPage) => backgroundPage.getClipCollections());
  }

  renderCollections_(collections, focusCollectionId) {
    const wrapper = document.querySelector(".collections");
    wrapper.innerHTML = "";

    if (Object.keys(collections).length === 0) {
      wrapper.appendChild(
        createAlertPane("You have no clipped collections.", "success", false)
      );
      return;
    }

    Object.values(collections).forEach((collection) => {
      const { dedupedData, dedupedRows } = this.getUniqueDataset_(collection);

      const el = document.createElement("div");
      el.className = "collection";
      el.innerHTML = `
            <div>
              <div class="collection-name">${collection.name}</div>
              <div class="metadata">
                <span>Unique rows: ${dedupedRows}</span>
              </div>
            </div>
            <div class="actions">
              <input type="button" value="View" class="preview-unique-btn btn btn-primary" />
            </div>
          `;
      wrapper.appendChild(el);
      el.querySelector(".preview-unique-btn").addEventListener("click", () => {
        this.browserEnv_
          .getBackgroundPageP()
          .then((backgroundPage) =>
            backgroundPage.saveTableLocally(
              this.createPublicTableFromCollection_(collection, dedupedData)
            )
          )
          .catch((err) => this.handleError_(err));
      });
    });
  }

  getUniqueDataset_(collection) {
    let cleanData = [];
    let dedupedData = [];
    let uniqueRows = 0;
    let dedupedRows = 0;

    const datasetsByHeaders = {};
    collection.data.forEach((entry) => {
      if (entry.dataArray.length === 0) {
        return;
      }
      const headerHash = entry.dataArray[0].join("__");
      if (datasetsByHeaders[headerHash]) {
        const rest = entry.dataArray.slice(1);
        datasetsByHeaders[headerHash].data = [
          ...datasetsByHeaders[headerHash].data,
          ...rest,
        ];
      } else {
        datasetsByHeaders[headerHash] = {
          headers: entry.dataArray[0],
          data: [...entry.dataArray],
        };
      }
    });

    // Util function
    const nEmptyStrings = (n) =>
      " "
        .repeat(n)
        .split("")
        .map((el) => el.trim());

    Object.values(datasetsByHeaders).forEach((dataset, index) => {
      // Add a separator between datasets.
      if (index !== 0) {
        const numEmptyCellsToAdd =
          dataset.data && dataset.data.length > 0 ? dataset.data[0].length : 1;
        cleanData.push(nEmptyStrings(numEmptyCellsToAdd));
        dedupedData.push(nEmptyStrings(numEmptyCellsToAdd));
      }

      const fingerprints = {};
      let added = 0;
      dataset.data.forEach((row) => {
        const print = btoa(unescape(encodeURIComponent(row.join("~"))));
        if (!fingerprints[print]) {
          fingerprints[print] = true;
          dedupedData.push(row);
          added++;
        }
      });

      cleanData = [...cleanData, ...dataset.data];
      dedupedRows += added;
      uniqueRows += dataset.data.length;
    });

    return { cleanData, dedupedData, dedupedRows, uniqueRows };
  }

  createPublicTableFromCollection_(collection, tableDataArray = null) {
    if (!tableDataArray) {
      tableDataArray = [];
      collection.data.forEach((entry) => {
        tableDataArray = [...tableDataArray, ...entry.dataArray];
      });
    }

    return {
      tableDataArray,
      title: collection.name,
      pageTitle: collection.name,
      paged: false,
      dynamic: false,
    };
  }

  handleError_(err) {
    const message =
      err && err.message ? `Error caught: ${err.message}` : "Error caught!";
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(createAlertPane(message, "danger", true));
  }
}
