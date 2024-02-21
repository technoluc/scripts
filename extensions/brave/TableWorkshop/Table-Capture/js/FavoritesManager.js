class FavoritesManager {
  constructor() {
    this.browserEnv_ = new BrowserEnv();

    getExtensionUserConfig(true)
      .then((userConfig) => {
        this.userConfig_ = userConfig;
      })
      .catch(this.handleError_.bind(this));
  }

  initialize() {
    getExtensionActivityLogData(this.browserEnv_)
      .then((logData) => this.renderActivity_(logData))
      .catch(this.handleError_.bind(this));

    document
      .querySelector(".btn-clear-activity")
      .addEventListener("click", this.clearHistory_.bind(this));
  }

  hasLogData_(logData) {
    if (!logData || Object.keys(logData).length == 0) {
      return false;
    }
    return Object.values(logData).some(
      (entry) => entry.elements && Object.keys(entry.elements).length > 0
    );
  }

  clearHistory_() {
    this.browserEnv_.getLocalStorageApi().removeP(_TCAP_CONFIG.logKey);
    window.location.reload();
  }

  renderNoActivityMode_() {
    document.querySelector(".activity-wrapper ul").innerHTML = "";
    document
      .querySelector(".activity-wrapper")
      .classList.add("no-data-recorded");
  }

  renderActivity_(logData) {
    if (!this.hasLogData_(logData)) {
      return this.renderNoActivityMode_();
    }

    const activityList = document.querySelector(".activity-wrapper ul");
    activityList.innerHTML = "";
    Object.values(logData).forEach((entry) => {
      const url = entry.url;
      const hasValidUrl = url && !url.includes("file://");

      if (entry.actionCount && entry.actionCount > 0 && hasValidUrl) {
        if (entry.elements && Object.values(entry.elements).length > 0) {
          activityList.appendChild(this.renderEntrySummary_(entry));
        }
      }
    });
  }

  renderPageElement_(logItem, pageEntry) {
    const { name, starred, domainWide } = pageEntry;
    const hasRepros = pageEntry.repros && pageEntry.repros.length;
    const lastActionSummary = hasRepros
      ? `<span class="last-action-summary">${summarizeLatestRepro(
          pageEntry.repros
        )}</span>`
      : "";

    const pageElement = document.createElement("div");
    pageElement.classList.add("page-element");
    pageElement.innerHTML = `
      <div class="header">
        <div class="left-side">
          <span
              class="icon-toggle-btn fave-toggle-btn glyphicon ${
                starred ? "glyphicon-star" : "glyphicon-star-empty"
              }"
              title="${
                starred ? "Remove from favorites" : "Add to favorites"
              }"></span>
          <span
              class="icon-toggle-btn domain-toggle-btn glyphicon glyphicon-globe ${
                domainWide ? "glyph-on" : ""
              }"
              title="${
                domainWide
                  ? "Only show on this page"
                  : "Make available for entire domain"
              }"></span>
          <span class="page-element-name">${name}</span>
          ${lastActionSummary}
        </div>
        <div class="actions">
          <button class="btn btn-default btn-image cloud-btn" title="Table Capture + Cloud">
            <img src="/images/icon.cloud.128.png" />
          </button>
          <button class="btn btn-primary fetch-btn">Get data</button>
          <button class="btn btn-danger delete-entry-btn">
            <span class="glyphicon glyphicon-trash" title="Delete"></span>
          </button>
        </div>
      </div>
    `;
    pageElement.querySelector(".fetch-btn").addEventListener("click", () => {
      this.fetchData_(logItem, pageEntry);
    });
    pageElement
      .querySelector(".delete-entry-btn")
      .addEventListener("click", () => {
        this.deleteEntry_(logItem, pageEntry);
      });
    pageElement
      .querySelector(".fave-toggle-btn")
      .addEventListener("click", () => {
        this.toggleFave_(logItem, pageEntry);
      });
    pageElement
      .querySelector(".domain-toggle-btn")
      .addEventListener("click", () => {
        this.toggleDomainWide_(logItem, pageEntry);
      });

    // Cloud support
    const cloudButton = pageElement.querySelector(".cloud-btn");
    if (_TCAP_CONFIG.supportsCloud) {
      cloudButton.addEventListener("click", () => {
        this.cloudOperate_(logItem, pageEntry);
      });
    } else {
      cloudButton.classList.add("hidden");
    }

    pageEntry.element = pageElement;
    return pageElement;
  }

  renderEntrySummary_(logItem) {
    const separator = () => {
      const span = document.createElement("span");
      span.innerHTML = "&nbsp;&middot;&nbsp;";
      return span;
    };

    // Data
    const title = logItem.title || logItem.url;

    const titleElement = document.createElement("div");
    titleElement.classList.add("title");
    titleElement.innerText = title;

    const meta = document.createElement("div");

    const viewCount = document.createElement("span");
    viewCount.innerText = `Actions: ${logItem.actionCount}`;

    const link = document.createElement("a");
    link.href = logItem.url;
    link.innerText = "Visit page";
    link.target = "_blank";

    meta.appendChild(link);
    meta.appendChild(separator());
    meta.appendChild(viewCount);

    const alertsElement = document.createElement("div");
    alertsElement.className = "error-wrapper local-error-wrapper";

    const pageElementsWrapper = document.createElement("div");
    pageElementsWrapper.classList.add("page-elements");

    Object.values(logItem.elements)
      .sort((a, b) => {
        return b.actionCount - a.actionCount;
      })
      .forEach((pageElementEntry) => {
        pageElementsWrapper.appendChild(
          this.renderPageElement_(logItem, pageElementEntry)
        );
      });

    const element = document.createElement("li");
    element.appendChild(titleElement);
    element.appendChild(meta);
    element.appendChild(pageElementsWrapper);
    element.appendChild(alertsElement);

    return element;
  }

  deleteEntry_(logItem, pageEntry) {
    getExtensionActivityLogData(this.browserEnv_)
      .then((logData) => {
        delete logData[logItem.url].elements[pageEntry.key];
        return this.browserEnv_
          .getLocalStorageApi()
          .setP({ [_TCAP_CONFIG.logKey]: logData })
          .then(() => this.renderActivity_(logData));
      })
      .catch((err) => {
        this.handleError_(
          err,
          this.getErrorWrapperFromPageElement_(pageEntry.element)
        );
      });
  }

  toggleDomainWide_(logItem, pageEntry) {
    getExtensionActivityLogData(this.browserEnv_)
      .then((logData) => {
        const entry = logData[logItem.url].elements[pageEntry.key];
        entry.domainWide = !entry.domainWide;
        if (!entry.domain) {
          entry.domain = getDomainFromUrl(logItem.url);
        }
        return this.browserEnv_
          .getLocalStorageApi()
          .setP({ [_TCAP_CONFIG.logKey]: logData })
          .then(() => this.renderActivity_(logData));
      })
      .catch((err) =>
        this.handleError_(
          err,
          this.getErrorWrapperFromPageElement_(pageEntry.element)
        )
      );
  }

  toggleFave_(logItem, pageEntry) {
    getExtensionActivityLogData(this.browserEnv_)
      .then((logData) => {
        const entry = logData[logItem.url].elements[pageEntry.key];
        entry.starred = !entry.starred;
        return this.browserEnv_
          .getLocalStorageApi()
          .setP({ [_TCAP_CONFIG.logKey]: logData })
          .then(() => this.renderActivity_(logData));
      })
      .catch((err) =>
        this.handleError_(
          err,
          this.getErrorWrapperFromPageElement_(pageEntry.element)
        )
      );
  }

  cloudOperate_(logItem, pageEntry) {
    const { repros } = pageEntry;
    if (!repros || repros.length === 0) {
      return this.handleError_(
        new Error("Unable to save item to Table Capture Cloud"),
        this.getErrorWrapperFromPageElement_(pageEntry.element)
      );
    }

    if (this.userConfig_.googleAuthToken && this.userConfig_.paidCloud) {
      return this.saveTableForCloud_(logItem, pageEntry).catch((err) =>
        this.handleError_(
          err,
          this.getErrorWrapperFromPageElement_(pageEntry.element)
        )
      );
    }

    return chrome.extension
      .getBackgroundPage()
      .saveTableForCloud(repros[repros.length - 1])
      .catch((err) =>
        this.handleError_(
          err,
          this.getErrorWrapperFromPageElement_(pageEntry.element)
        )
      );
  }

  saveTableForCloud_(logItem, pageEntry) {
    return Promise.reject(new Error("Coming soon!"));
  }

  fetchData_(logItem, pageEntry) {
    if (pageEntry.paged) {
      return this.handleError_(
        new Error("Multi-page tables cannot be extracted at this time."),
        this.getErrorWrapperFromPageElement_(pageEntry.element)
      );
    }

    const button = pageEntry.element.querySelector(".fetch-btn");
    button.disabled = true;
    fetch(logItem.url)
      .then((response) => {
        if (response.status >= 400 && response.status < 600) {
          throw new Error(`Unable to fetch data: ${logItem.url}`);
        }
        return response.text();
      })
      .then((data) =>
        this.extractTableFromRequestData(this.userConfig_, data, pageEntry)
      )
      .then((tableNode) => {
        const tableWrapper = new TableWrapper(
          tableNode,
          logItem.url,
          null,
          this.userConfig_
        );
        pageEntry.tableWrapper = tableWrapper;

        const params = {
          action: MessageAction.EDIT_TABLE,
          publicTable: {
            title: logItem.title,
            pageTitle: logItem.title,
            sourceUrl: logItem.url,
            pages: 0,
            dynamic: false,
            paged: false,
            tableDef: tableWrapper.toJSON(),
            tableDataArray: tableWrapper.getAsArrays(),
          },
        };
        return new BrowserEnv().sendMessage(params);
      })
      .catch((err) => {
        this.handleError_(
          err,
          this.getErrorWrapperFromPageElement_(pageEntry.element)
        );
      })
      .finally(() => {
        button.disabled = false;
      });
  }

  getErrorWrapperFromPageElement_(pageElement) {
    return pageElement.parentElement.parentElement.querySelector(
      ".error-wrapper"
    );
  }

  extractTableFromRequestData(config, htmlContent, { index, pathTo }) {
    const doc = new DOMParser().parseFromString(htmlContent, "text/html");

    if (pathTo) {
      return this.extractTableFromDocViaPath_(doc, pathTo);
    }

    if (index !== undefined) {
      return this.extractTableFromDocViaIndex_(doc, index);
    }

    throw new Error(
      `Unable to fetch data: Unable to locate element in response.`
    );
  }

  extractTableFromDocViaIndex_(doc, index) {
    const table = doc.querySelector("body").querySelectorAll("table")[index];
    if (!table) {
      throw new Error(
        `Unable to fetch data: Unable to locate table in response.`
      );
    }
    return Promise.resolve(table);
  }

  extractTableFromDocViaPath_(doc, pathTo) {
    const element = _tcGetElementByXpath(pathTo, doc);
    if (!element) {
      throw new Error(
        `Unable to fetch data: Unable to locate table in response.`
      );
    }
    return Promise.resolve(element);
  }

  handleError_(err, errorWrapper) {
    console.log("FavoritesManager - error caught during fetchData_", err);

    if (!errorWrapper) {
      errorWrapper = document.querySelector(".global-errors");
    }

    const errorElement = document.createElement("div");
    errorElement.className = "alert alert-danger";
    errorElement.innerText = err + "";
    errorElement.addEventListener("click", () => {
      errorElement.classList.add("hidden");
    });

    errorWrapper.appendChild(errorElement);
  }
}

function getDomainFromUrl(url) {
  try {
    return new URL(url).host;
  } catch (err) {}
  return null;
}
