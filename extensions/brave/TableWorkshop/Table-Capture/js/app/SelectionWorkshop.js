class SelectionWorkshop {
  constructor(tabId, userConfig, selectionNode) {
    this.tabId_ = tabId;
    this.userConfig_ = userConfig;
    this.formatUserConfig_();

    this.selectionNode_ = selectionNode;
    this.pageUrl_ = window.location.href;

    this.frame_ = new WorkshopFrame(userConfig);
    this.frame_.bindToEvent(
      WorkshopEvent.BETA,
      this.launchBetaModal_.bind(this)
    );
    this.frame_.bindToEvent(
      WorkshopEvent.REMOVE,
      this.handleRemove_.bind(this)
    );
    this.frame_.bindToEvent(
      WorkshopEvent.CLEAR,
      this.handleSelectionModeClear_.bind(this)
    );
    this.frame_.bindToEvent(
      WorkshopEvent.TOOLTIP_SHOW,
      this.displayTooltipText_.bind(this)
    );
    this.frame_.bindToEvent(
      WorkshopEvent.TOOLTIP_CLEAR,
      this.clearTooltipText_.bind(this)
    );
    this.frame_.bindToEvent(
      WorkshopEvent.FRAME_EXPAND,
      this.handleFrameExpandRequest_.bind(this)
    );

    this.isFrameFull_ = false;

    this.contentWrapper_ = this.frame_.render();

    this.autoScroller_ = new AutoScroller();
    this.workshopDataManager_ = new SelectionWorkshopDataManager(userConfig);
    this.sheetsSyncBridge_ = new SheetsSyncBridge(tabId);
    this.robot_ = new Robot(userConfig, this.frame_, this.workshopDataManager_);

    //// Everything below here should be isolated.
    this.snoop_ = null;

    this.dynamicPagingListener_ = null;

    this.navPagingListener_ = new NavigationPagingListener(
      this.userConfig_,
      this.workshopDataManager_
    );
    this.navPagingListener_.setPagerMissingHandler(
      this.handlePagerMissing_.bind(this)
    );

    this.pagingRetryCount_ = 0;
    this.pagingRetryTimeout_ = null;

    this.tableWrapper_ = null;
    this.selectionWrapper_ = null;
    this.jsonWrapper_ = null;
    this.recipeWrapper_ = null;

    this.tooltipTimeout_ = null;
    this.clearTooltipTimeout_ = null;
    this.handleSelectionFn_ = this.handleSelectionChange_.bind(this);

    this.errorMessage_ = null;
    this.windowFrame_ = null;
  }

  formatUserConfig_() {
    const pageUrl = window.location.href;
    if (new BrowserEnv().isPageOnboardingPage(pageUrl)) {
      this.userConfig_.paidPro = true;
      this.userConfig_.paidProOrMore = true;
    }
  }

  getElementWrapper_() {
    if (this.recipeWrapper_) {
      return this.recipeWrapper_;
    }
    if (this.jsonWrapper_) {
      return this.jsonWrapper_;
    }
    return this.tableWrapper_ || this.selectionWrapper_;
  }

  getElementWrapperDomElement_() {
    const elWrapper = this.getElementWrapper_();
    if (elWrapper) {
      return elWrapper.getDomElement();
    }
    return null;
  }

  bindToWindowFrame(windowFrame) {
    this.windowFrame_ = windowFrame.contentWindow;
    this.selectionNode_ = _tcGetSelectedNodeFromSelection(this.windowFrame_);
  }

  isPagingToggleOn_() {
    const checkbox = this.contentWrapper_.querySelector(
      ".paged-recording-checkbox"
    );
    return checkbox && checkbox.checked;
  }

  isRecordingToggleOn_() {
    const checkbox = this.contentWrapper_.querySelector(".recording-checkbox");
    return checkbox && checkbox.checked;
  }

  isRecording_() {
    return this.snoop_ && this.snoop_.isRecording();
  }

  isOrHasEverRecorded_() {
    return (
      this.snoop_ && (this.snoop_.hasNewValues() || this.snoop_.isRecording())
    );
  }

  hasElWrapper_() {
    return !!this.tableWrapper_ || !!this.selectionWrapper_;
  }

  isWrapperRecordable_() {
    return (
      !!this.tableWrapper_ ||
      !!this.selectionWrapper_ ||
      (this.recipeWrapper_ && this.recipeWrapper_.isRecordable())
    );
  }

  destroy(userInitiated) {
    this.unhighlightElementWrapper_();
    this.frame_.setLoading(false);

    this.recipeWrapper_ = null;
    this.jsonWrapper_ = null;
    this.tableWrapper_ = null;
    this.selectionWrapper_ = null;
    this.selectionNode_ = null;
    this.setTreatAsTable_(true);

    this.autoScroller_.stopScrolling();

    if (this.workshopDataManager_) {
      this.workshopDataManager_.destroy();
    }

    if (this.snoop_) {
      this.snoop_.destroy();
      this.snoop_ = null;
    }

    if (userInitiated) {
      this.navPagingListener_.destroy();

      this.contentWrapper_.classList.remove("has-paging-data");
      this.contentWrapper_.classList.remove("paging-on");
      this.contentWrapper_.classList.remove("recording-on");
      this.contentWrapper_.classList.remove("tc-salvaging");
    }

    try {
      document.removeEventListener("selectionchange", this.handleSelectionFn_);
    } catch (err) {}

    this.errorMessage_ = null;
    this.pagingRetryCount_ = 0;

    if (this.pagingRetryTimeout_ !== null) {
      window.clearTimeout(this.pagingRetryTimeout_);
      this.pagingRetryTimeout_ = null;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  isPaging(key) {
    return this.navPagingListener_ && this.navPagingListener_.isPaging(key);
  }

  isOnSamePage(pageCount) {
    return (
      this.navPagingListener_ &&
      this.navPagingListener_.getPageCount() === pageCount
    );
  }

  setPagingData(
    priorDataArray,
    pageCount,
    continuationKey,
    treatAsTable,
    pathToElement,
    pathToPager,
    pagerSelector,
    autoPageTable,
    firstPageSize
  ) {
    this.setTreatAsTable_(treatAsTable);

    // Right now this all has to happen before setDataArray to handle the on-data-set event properly.
    this.navPagingListener_.setPaging(true);
    this.navPagingListener_.setFirstPageSize(firstPageSize);
    this.navPagingListener_.setPageCount(pageCount + 1);
    this.navPagingListener_.setAutoPage(autoPageTable, false);
    this.navPagingListener_.setActivePagingDefinition({
      continuationKey,
      pathToElement,
      pathToPager,
      pagerSelector,
    });

    this.workshopDataManager_.setDataArray(priorDataArray, true);
  }

  updateVisibilities_() {
    const hasEverRecorded = this.isOrHasEverRecorded_();
    const paging = this.isPagingToggleOn_();
    const usingArb = !!this.selectionWrapper_;

    const showArbNav = usingArb && !hasEverRecorded && !paging;
    this.updateArbNavElements_(!showArbNav, usingArb);

    this.contentWrapper_
      .querySelector(".table-recording")
      .classList.toggle("ghosted", paging);
    this.contentWrapper_
      .querySelector(".table-paging")
      .classList.toggle("ghosted", hasEverRecorded);

    this.updateSwitchLabels_(paging, this.isRecording_());
    this.updateColumnifyButton_(false);
  }

  updateSwitchLabels_(paging, recording) {
    this.contentWrapper_.querySelector(
      "._tc-paged-recording-switch-wrapper .tc-slider-label"
    ).innerText = paging ? "On" : "Enable Paged Table Capture";
    this.contentWrapper_.querySelector(
      "._tc-recording-switch-wrapper .tc-slider-label"
    ).innerText = recording ? "On" : "Enable Dynamic Table Capture";
  }

  renderRecipeMode(recipe) {
    if (!this.selectionNode_) {
      return this.handleSelectionRenderError_(
        new Error("Recipe page element not found."),
        "Recipe page element not found."
      );
    }

    const windowName = _tcGetWindowName(window);
    const pageUrl = window.location.href;
    const pageTitle = document.title;
    this.recipeWrapper_ = new RecipeTableWrapper(
      recipe,
      this.selectionNode_,
      pageUrl,
      pageTitle,
      windowName,
      this.userConfig_
    );

    this.frame_.setLoading(true);
    this.renderDataPreview_(this.recipeWrapper_.getAsArrays())
      .then(() => {
        this.renderSettings_();
        this.updateArbNavElements_(true, false);
        this.updateTableRecordingVisibility_(
          !this.recipeWrapper_.isRecordable()
        );
        this.updateTablePagingVisibility_(true);
        this.updateRecipeControlsVisibility_();
      })
      .catch((err) =>
        this.handleSelectionRenderError_(err, "Unable to render recipe data.")
      )
      .finally(() => this.frame_.setLoading(false));
  }

  updateRecipeControlsVisibility_() {
    document
      .querySelector("._tc-recipe-controls")
      .classList.remove("tc-hidden");
  }

  clipRecipeData_() {
    const dataClipper = new DataClipper(this.userConfig_);
    dataClipper.clipAndSaveRecipe(this.recipeWrapper_.getRecipe(), true);
    this.frame_.renderSuccess("Recipe data clipped.");
  }

  viewRecipeClipData_() {
    const recipe = this.recipeWrapper_.getRecipe();
    window.open(chrome.extension.getURL(`/clips.html?id=recipe-${recipe.id}`));
  }

  highlightElementWrapper_() {
    const elWrapper = this.getElementWrapper_();
    if (elWrapper) {
      elWrapper.highlight();
    }
  }

  unhighlightElementWrapper_() {
    const elWrapper = this.getElementWrapper_();
    if (elWrapper) {
      elWrapper.unhighlight();
    }
  }

  autoRetryPagingDueToError_() {
    if (this.pagingRetryTimeout_) {
      return;
    }

    // Exponential back-off.
    const timeoutDuration =
      Math.pow(2, this.pagingRetryCount_) * _TCAP_CONFIG.pagingRetryDelay;

    this.pagingRetryCount_++;
    this.pagingRetryTimeout_ = window.setTimeout(() => {
      this.pagingRetryTimeout_ = null;
      this.renderPagingMode(false);
    }, timeoutDuration);
  }

  handlePagingModeSuccess_(salvage) {
    this.pagingRetryCount_ = 0;
    if (this.pagingRetryTimeout_) {
      window.clearTimeout(this.pagingRetryTimeout_);
      this.pagingRetryTimeout_ = null;
    }

    if (salvage) {
      this.contentWrapper_.classList.add("tc-salvaging");
    }
  }

  renderPagingMode(salvage) {
    // Sometimes we'll retry and use the XPath again or a user-provided selector.
    if (!this.selectionNode_) {
      this.selectionNode_ = this.navPagingListener_.retryElementSelection();
    }

    this.frame_.setLoading(true);
    this.fetchPagingData_(salvage)
      .then((data) => this.renderDataPreview_(data))
      .then(() => this.renderPagingUI_())
      .then(() => {
        if (this.navPagingListener_) {
          return this.navPagingListener_.advanceAfterTimeout();
        }
        return Promise.resolve();
      })
      .then(() => this.handlePagingModeSuccess_(salvage))
      .catch((err) =>
        this.handlePagingRenderError_(
          err,
          "Table Capture experienced an error getting your data."
        )
      )
      .finally(() => this.frame_.setLoading(false));
  }

  renderSelectionMode() {
    window.getSelection().removeAllRanges();
    document.addEventListener("selectionchange", this.handleSelectionFn_);

    if (this.userConfig_.requiresPaid && !this.userConfig_.paidPro) {
      return this.renderActivateMessage_();
    }

    if (this.errorMessage_) {
      return this.renderCleanSlateErrorMessage_();
    }

    if (this.selectionNode_ && _tcIsNodeWithinTable(this.selectionNode_)) {
      this.frame_.setLoading(true);
      return this.fetchTableData_()
        .then((data) => this.renderDataPreview_(data))
        .then(() => this.renderElementForm_(true))
        .then(() => this.frame_.setLoading(false))
        .catch((err) =>
          this.handleSelectionRenderError_(
            err,
            "Table Capture experienced an error getting your data."
          )
        );
    }

    if (this.selectionNode_) {
      // Flutter is impossible.
      if (_tcTagNameCompare(this.selectionNode_, "FLT-GLASS-PANE")) {
        return this.handleSelectionRenderError_(
          null,
          "The selected element is within a Flutter canvas. Unfortunately, Table Capture cannot capture Flutter content."
        );
      }

      this.frame_.setLoading(true);
      return this.fetchArbData_()
        .then((data) => this.renderDataPreview_(data))
        .then(() => this.renderElementForm_(false))
        .then(() => this.frame_.setLoading(false))
        .catch((err) =>
          this.handleSelectionRenderError_(
            err,
            "Table Capture experienced an error getting your data."
          )
        );
    }

    this.frame_.setLoading(false);
    this.renderNoSelectionMessage_();
  }

  handleDynPagerMissing_(err, errorCode, errorType) {
    if (this.userConfig_.showDeveloperOptions) {
      this.contentWrapper_
        .querySelector(".btn-update-dyn-pager-selector")
        .classList.remove("tc-hidden");
    }

    // ErrorCode: [DISCONNECTED, LIKELY_PAGER_ERROR]
    this.handleActionError_(err, null, errorType);
  }

  // NOTE(gmike): Dislike.
  handleUpdateDynPagerDomSelector_() {
    const val = window.prompt(
      "Provide a custom selector/xpath for the 'next page' button."
    );
    if (val && this.dynamicPagingListener_) {
      this.dynamicPagingListener_
        .useUserQuerySelectorForPagingElement(val)
        .catch((err) =>
          this.handleActionError_(
            err,
            "Unable to update selector/xpath for 'next page' button.",
            "ERROR",
            true
          )
        );
    }
  }

  handleScrollToBottomRequest_() {
    try {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    } catch (err) {}
  }

  handlePagerMissing_() {
    if (this.userConfig_.showDeveloperOptions) {
      this.contentWrapper_
        .querySelector(".btn-update-pager-selector")
        .classList.remove("tc-hidden");
    }
  }

  // NOTE(gmike): Dislike because it's a window.prompt.
  // NOTE(gmike): This could be in an "Advanced Extract" modal.
  handleUpdatePagerDomSelector_() {
    const val = window.prompt(
      "Provide a custom selector/xpath for the 'next page' button."
    );
    if (val && this.navPagingListener_) {
      const pathToElement = this.getElementWrapper_().toJSON().pathTo;
      this.navPagingListener_.setTabAndPathToElement(
        this.tabId_,
        pathToElement
      );
      this.navPagingListener_
        .useUserQuerySelectorForPagingElement(val)
        .catch((err) =>
          this.handleActionError_(
            err,
            "Unable to update selector/xpath for 'next page' button.",
            "ERROR",
            true
          )
        );
    }
  }

  renderPagingErrorMessage_(message) {
    const retrySummary = this.pagingRetryTimeout_
      ? `Automatically retrying... (${this.pagingRetryCount_})`
      : "Not automatically retrying";

    this.contentWrapper_.classList.add("_tc-empty");
    this.contentWrapper_.innerHTML = `
      <div class="tc-error">
        <span>${message}</span>
      </div>
      <div class="help-message">
        <div>Sometimes this is just a timing thing.</div>
        <div class="tc-retry-info tc-hidden" title="Automatic Retries: ${this.pagingRetryCount_}">${retrySummary}</div>
        <div class="paging-error-actions">
          <button class="btn-workshop-default btn-paging-retry">Retry</button>
          <button class="btn-workshop-default tc-hidden btn-salvage-data" />
          <button class="btn-workshop-default btn-paging-reset">Reset</button>
          <button class="btn-workshop-default tc-hidden btn-paging-selector-apply">🛠</button>
        </div>
      </div>
    `;
    this.contentWrapper_
      .querySelector(".btn-paging-retry")
      .addEventListener("click", this.renderPagingMode.bind(this, false));
    this.contentWrapper_
      .querySelector(".btn-paging-reset")
      .addEventListener("click", () => {
        this.destroy(true);
        this.renderSelectionMode();
      });

    this.bindHoverToTooltipText_(
      ".btn-paging-retry",
      chrome.i18n.getMessage("pagingRetryActionTooltip"),
      "top-right"
    );
    this.bindHoverToTooltipText_(
      ".btn-salvage-data",
      chrome.i18n.getMessage("pagingRetrySalvageActionTooltip"),
      "top-right"
    );
    this.bindHoverToTooltipText_(
      ".btn-paging-reset",
      chrome.i18n.getMessage("pagingResetActionTooltip"),
      "top"
    );
    this.bindHoverToTooltipText_(
      ".btn-paging-selector-apply",
      chrome.i18n.getMessage("pagingPagedElementDomSelectorActionTooltip"),
      "top"
    );

    const salvageDataButton =
      this.contentWrapper_.querySelector(".btn-salvage-data");
    salvageDataButton.addEventListener(
      "click",
      this.renderPagingMode.bind(this, true)
    );

    this.navPagingListener_.bindToElementSelectorProvideButton(
      this.contentWrapper_.querySelector(".btn-paging-selector-apply"),
      this.renderPagingMode.bind(this, false)
    );

    const stillRetrying =
      this.pagingRetryTimeout_ ||
      this.pagingRetryCount_ < _TCAP_CONFIG.numPagingRetries;
    if (!stillRetrying && this.workshopDataManager_.hasSubstantialData()) {
      salvageDataButton.classList.remove("tc-hidden");
      salvageDataButton.innerText = chrome.i18n.getMessage(
        "pagingRetrySalvageAction",
        [this.workshopDataManager_.getRowCount()]
      );
    }

    if (this.pagingRetryTimeout_ || this.pagingRetryCount_ !== 0) {
      this.contentWrapper_
        .querySelector(".tc-retry-info")
        .classList.remove("tc-hidden");
    }

    if (
      this.navPagingListener_ &&
      this.navPagingListener_.isAutoPaging() &&
      document.visibilityState === "hidden"
    ) {
      window.setTimeout(
        this.renderPagingMode.bind(this, false),
        // NOTE(gmike): It's not clear whether this should be user configurable.
        _TCAP_CONFIG.autoPageWait
      );
    }

    this.errorMessage_ = null;
    return Promise.resolve();
  }

  renderActivateMessage_() {
    this.contentWrapper_.classList.add("_tc-locked");
    this.contentWrapper_.innerHTML = `
      <div class="tc-message">
        <span>Please activate Table Capture to use the extension.</span>
      </div>
      <div class="help-message">
        Once you activate, this workshop will be instrumental in helping you capture div-based, paged and dynamic tables.
      </div>
    `;

    document.querySelector(
      ".pro-cta"
    ).innerHTML = `<span>Activate <span class="_tc-strong">Table Capture</span></span>`;

    Array.from(document.querySelectorAll(".not-tc-pro")).forEach((el) =>
      el.classList.remove("tc-hidden")
    );

    return Promise.resolve();
  }

  renderCleanSlateErrorMessage_() {
    this.contentWrapper_.classList.add("_tc-empty");
    this.contentWrapper_.innerHTML = `
      <div class="tc-error">
        <span>${this.errorMessage_}</span>
      </div>
      <div class="help-message">
        Highlight any cell text that's a part of your table to try again.
      </div>
    `;
    this.errorMessage_ = null;
    return Promise.resolve();
  }

  renderNoSelectionMessage_() {
    this.contentWrapper_.classList.add("_tc-empty");
    this.contentWrapper_.innerHTML = `
      <div class="tc-message">
        <span>Highlight any cell text that's a part of your table to get started.</span>
      </div>
      <div class="help-message">
        If you're having trouble selecting text, try right-clicking any element that's a part of your table to
        Workshop it.
      </div>
      <div class="help-message">
        If this page has disabled right-clicking, <a class="_tc-clickable clobber-right-click">click here</a> and try again.
      </div>
    `;

    this.contentWrapper_
      .querySelector(".clobber-right-click")
      .addEventListener("click", () => {
        _tcExecEmbeddedCode(`document.oncontextmenu = null;`);
        this.frame_.remove();
        this.destroy(true);
      });
  }

  mergePagedData_(priorDataArray, newDataArray) {
    // If we have data, we may potentially want to drop the headers from the new data.
    try {
      const hasPriorData = priorDataArray && priorDataArray.length;
      const hasNewData = newDataArray && newDataArray.length;
      if (hasPriorData && hasNewData) {
        const firstRow = priorDataArray[0];
        const newFirstRow = newDataArray[0];

        if (JSON.stringify(firstRow) == JSON.stringify(newFirstRow)) {
          // Remove the first row
          newDataArray.shift();
        }
      }
    } catch (err) {
      // No-op.
    }

    return [...priorDataArray, ...newDataArray];
  }

  fetchTableData_() {
    if (!this.selectionNode_) {
      return Promise.reject(new Error("Unable to locate selected element."));
    }

    let tableElement = this.selectionNode_;
    while (tableElement && tableElement.tagName.toUpperCase() !== "TABLE") {
      tableElement = tableElement.parentNode;
    }

    if (!tableElement) {
      return Promise.reject(new Error("Unable to locate selected element."));
    }

    this.tableWrapper_ = new TableWrapper(
      tableElement,
      this.pageUrl_,
      _tcGetWindowName(window),
      this.userConfig_
    );
    this.tableWrapper_.inferTableIndex();
    const dataArray = this.tableWrapper_.getAsArrays() || [];
    const rows = dataArray.length;

    if (
      this.navPagingListener_ &&
      this.navPagingListener_.isPagingWaitAndScrollNeeded(rows)
    ) {
      // TODO(gmike): Surface notice that a refetch is taking place because it appears there's a substantial difference in rows
      // between this page and the previous one.
      return this.refetchTableData_(0, dataArray, rows);
    }

    return Promise.resolve(dataArray);
  }

  // NOTE(gmike, 1-29-2023): This was added for Bruce / DIBBS. It's an attempt at
  // being more patient when paging and waiting for the table to load.
  refetchTableData_(attemptCount, lastDataArray, rowCount) {
    if (attemptCount > 2) {
      return Promise.resolve(lastDataArray);
    }

    return new Promise((resolve, reject) => {
      this.handleScrollToBottomRequest_();

      setTimeout(() => {
        const data = this.tableWrapper_.getAsArrays() || [];
        const newRowCount = data.length;
        if (newRowCount > rowCount) {
          lastDataArray = data;
        }

        if (
          this.navPagingListener_ &&
          this.navPagingListener_.isPagingWaitAndScrollNeeded(newRowCount)
        ) {
          return this.refetchTableData_(
            attemptCount + 1,
            lastDataArray,
            newRowCount
          )
            .then(resolve)
            .catch(reject);
        }
        resolve(lastDataArray);
      }, 5 * 1000);
    });
  }

  fetchArbData_() {
    if (this.selectionWrapper_) {
      // No-op. We already have one.
    } else if (this.selectionNode_) {
      const { treatAsTable } = this.workshopDataManager_.getExtractionOptions();
      this.selectionWrapper_ = new SelectionWrapper(
        this.selectionNode_,
        this.pageUrl_,
        this.userConfig_
      );
      this.selectionWrapper_.setTreatAsTable(treatAsTable);
    } else {
      // We have neither a wrapper, nor an element. This is a problem.
      return Promise.reject(
        new Error("Unable to get data: Table Capture is confused.")
      );
    }

    return Promise.resolve(this.selectionWrapper_.getAsArrays() || []);
  }

  fetchPagingData_(salvage) {
    if (!this.selectionNode_ && !salvage) {
      if (this.pagingRetryCount_ < _TCAP_CONFIG.numPagingRetries) {
        this.autoRetryPagingDueToError_();
      }
      return Promise.reject(
        new Error("Unable to locate selected paged element.")
      );
    }

    const priorDataArray = this.workshopDataManager_.getDataArray();
    if (salvage) {
      return Promise.resolve(priorDataArray);
    }

    if (_tcIsNodeWithinTable(this.selectionNode_)) {
      return this.fetchTableData_().then((data) =>
        this.mergePagedData_(priorDataArray, data)
      );
    }
    return this.fetchArbData_().then((data) =>
      this.mergePagedData_(priorDataArray, data)
    );
  }

  renderContentFrame_() {
    const baseExtUrl = chrome.extension.getURL("/");
    const cloudImage = baseExtUrl + "images/icon.cloud.128.png";

    let frameActions = _TC_SELWORK_FRAME_ACTIONS;
    // Screenshotting doesn't make sense for recipes.
    if (this.recipeWrapper_) {
      frameActions = frameActions.filter(
        (a) => !a.className.includes("screenshot")
      );
    }

    this.contentWrapper_.innerHTML = `
      <div class="tc-col _tc-left">
        <div class="salvage-message">
          <div class="_tc-heading">Salvaged Data</div>
          <p class="readable">
            The data you're seeing has been salvaged after encountering an error. We recommend
            you export this data however you can and then refresh the page to pick up where you left off (if possible).
          </p>
          <p class="readable">
            If refreshing the page is inconvenient, it'd be best if you at least closed this Workshop 
            and relaunched it to continue capturing your data.
          </p>
        </div>
        <div class="arb-nav tc-hidden">
          <div class="_tc-heading">Before you capture:</div>
          <p class="readable">
            Use the buttons below to find the page element that wraps all the repeating elements of your table or list-like content.
          </p>
          <div class="nav-actions">
            <TCButton class="btn-select-parent">Select parent element</TCButton>
            <TCButton class="btn-select-child">Select child element</TCButton>
            <TCButton class="btn-set-selector tc-hidden">🛠</TCButton>
          </div>
        </div>
        <div class="_tc-settings">
          <div class="_tc-heading">
            Options
            <span class="inline-action edit-settings">✲</span>
          </div>
          <div class="settings-summary"></div>
          <p class="disclaimer settings-refresh tc-hidden">Refresh the page and relaunch the workshop to reflect any options changes.</p>
        </div>
        <div class="_tc-robot-wrapper tc-hidden"></div>
        <div class="paged-tables-upgrade-required tc-hidden">
          <div class="_tc-heading">Paged &amp; Dynamic Tables</div>
          <label class="_tc-switch _tc-switch-disabled">
            <input type="checkbox" disabled="true" />
            <span class="tc-slider"></span>
          </label>
          <p class="readable">
            <a class="pro-cta loud-cta">Try Table Capture Pro</a> to be able to capture multi-page tables <a href="https://photos.app.goo.gl/EjjKPnNRStfZZj8TA" target="_blank">(demo)</a> and tables
            whose content changes dynamically <a href="https://photos.app.goo.gl/hYLsamqXR8ZQjBvj8" target="_blank">(demo)</a>. 
            <span class="cloud-cta-wrapper support-cloud-only">Also, <a class="cloud-cta loud-cta"> try Table Capture Cloud (Beta)</a> for a bunch of next-level features.</span>
          </p>
        </div>
        <div class="table-paging tc-hidden">
          <div class="_tc-heading">
            Paged tables
            <span class="inline-action refetch-data">⟳</span>
          </div>
          <p class="readable">
            If your table only shows a portion of its content on this page and needs to reload a new page to show more,
            enable paged capture. <a href="https://photos.app.goo.gl/EjjKPnNRStfZZj8TA" target="_blank">(See a demo)</a>
          </p>
          <div class="_tc-switch-wrapper _tc-paged-recording-switch-wrapper">
            <label class="_tc-switch">
              <input type="checkbox" class="paged-recording-checkbox" />
              <span class="tc-slider"></span>
            </label>
            <span class="tc-slider-label"></span>
          </div>
          <p class="readable paging-info">
            <strong>Next: Click whatever link or button will go to the next page.</strong> The extension will remember which table
            you're interested in. As long as it can find your table, it'll keep capturing its data as you go through pages.
          </p>
          <div class="sub-actions">
            <TCButton class="btn-workshop-default uni-btn btn-scroll-to-bottom">↓ Scroll</TCButton>
            <TCToggButton class="_tc-toggle-btn btn-auto-page disable-not-pro">Toggle auto-paging</TCToggButton>
            <TCButton class="btn-workshop-default tc-hidden btn-update-pager-selector">🛠</TCButton>
          </div>
          <p class="readable paging-data-disclaimer">
            You have been capturing paged content. Turning paging off now will clear your previously captured data.
          </p>
        </div>
        <div class="table-recording tc-hidden">
          <div class="_tc-heading">
            Dynamic tables
            <span class="inline-action set-dynamic-capture-config">✲</span>
          </div>
          <p class="readable">
            Some tables grow and shrink as you scroll or allow you to load new data without the entire site reloading. Turn on dynamic table capture to detect and capture
            all the rows that are ever displayed. <a href="https://photos.app.goo.gl/hYLsamqXR8ZQjBvj8" target="_blank">(See a demo)</a>
          </p>
          <p class="readable arb-nav-only tc-hidden">
            Turn on dynamic table capture only after you've selected the correct page element that
            wraps all the repeating elements of your table or list-like content.
          </p>
          <div class="_tc-switch-wrapper _tc-recording-switch-wrapper">
            <label class="_tc-switch recording-switch">
              <input type="checkbox" class="recording-checkbox" />
              <span class="tc-slider"></span>
            </label>
            <span class="tc-slider-label"></span>
          </div>
          <div class="sub-actions">
            <TCToggButton class="_tc-toggle-btn btn-auto-scroll disable-not-pro">Toggle auto-scrolling</TCToggButton>
            <TCToggButton class="_tc-toggle-btn btn-auto-dynpage disable-not-pro">Toggle auto-paging</TCToggButton>
            <TCButton class="btn-workshop-default tc-hidden btn-update-dyn-pager-selector">🛠</TCButton>
            <TCToggButton class="_tc-toggle-btn btn-sync-to-sheets disable-not-pro support-cloud-only">
              <img src="${cloudImage}" />
              <span class="_tc-button-text">Google Sheets Sync</span>
            </TCToggButton>
          </div>
          <p class="readable dyn-paging-info">
            <strong>Next: Click whatever link or button will go to the next page.</strong> The extension will then try to click that button
            continuously until you turn off auto-paging.
          </p>
        </div>
        <div class="_tc-recipe-controls tc-hidden">
          <div class="_tc-heading">Recipe Controls</div>
          <p class="readable">
            When you clip a recipe, Table Capture adds the data to one aggregate collection of data per recipe
            that you can later export as you so choose.
          </p>
          <div class="sub-actions">
            <TCButton class="btn-clip-recipe">Clip Recipe</TCButton>
            <TCButton class="btn-recipe-clip-data">View Clip Data</TCButton>
          </div>
        </div>
      </div>
      <div class="tc-col _tc-right">
        <div class="_tc-heading">
          Preview Data · <span class="_tc-size"></span>
          <span class="_tc-data-action _tc-clip tc-hidden">Clip</span>
          <span class="_tc-data-action _tc-columnify tc-hidden"></span>
        </div>
        <table class="tc-ignore"><tbody></tbody></table>
        <div class="_tc-actions"></div>
      </div>
    `;

    const actionWrapper = this.contentWrapper_.querySelector(
      "._tc-right ._tc-actions"
    );
    frameActions.forEach(({ className, src, frame, tooltip }) => {
      const btn = document.createElement("button");
      btn.className = `hint--top-left ${className} ${!frame && "btn-no-frame"}`;
      btn.innerHTML = `<img src="${baseExtUrl + src}" />`;
      actionWrapper.appendChild(btn);
      tooltip && btn.setAttribute("aria-label", tooltip);
    });

    // The first element in button groups.
    this.bindHoverToTooltipText_(
      ".btn-auto-scroll",
      chrome.i18n.getMessage("autoScrollActionTooltip"),
      "top-right"
    );
    this.bindHoverToTooltipText_(
      ".btn-scroll-to-bottom",
      chrome.i18n.getMessage("scrollToBottomActionTooltip"),
      "top-right"
    );

    this.bindHoverToTooltipText_(
      ".btn-auto-dynpage",
      chrome.i18n.getMessage("autoPageActionTooltip"),
      "top"
    );
    this.bindHoverToTooltipText_(
      ".btn-auto-page",
      chrome.i18n.getMessage("autoPageActionTooltip"),
      "top"
    );
    this.bindHoverToTooltipText_(
      ".btn-sync-to-sheets",
      chrome.i18n.getMessage("sheetSyncActionTooltip"),
      "top"
    );
    this.bindHoverToTooltipText_(
      ".btn-update-pager-selector",
      chrome.i18n.getMessage("updatePagerDomSelectorActionTooltip"),
      "top"
    );
    this.bindHoverToTooltipText_(
      ".btn-update-dyn-pager-selector",
      chrome.i18n.getMessage("updatePagerDomSelectorActionTooltip"),
      "top"
    );
    this.bindHoverToTooltipText_(
      "._tc-columnify",
      chrome.i18n.getMessage("columnifyActionTooltip"),
      "bottom"
    );
    this.bindHoverToTooltipText_(
      "._tc-clip",
      chrome.i18n.getMessage("clipActionTooltip"),
      "top"
    );

    this.bindHoverToTooltipText_(
      ".inline-action.edit-settings",
      chrome.i18n.getMessage("editSettingsTooltip"),
      "right"
    );
    this.bindHoverToTooltipText_(
      ".inline-action.refetch-data",
      chrome.i18n.getMessage("refetchDataTooltip"),
      "right"
    );
    this.bindHoverToTooltipText_(
      ".inline-action.set-dynamic-capture-config",
      chrome.i18n.getMessage("dynamicCaptureConfigTooltip"),
      "right"
    );

    // Switches
    this.bindHoverToTooltipText_(
      ".paged-tables-upgrade-required ._tc-switch-disabled",
      chrome.i18n.getMessage("upgradeForFeature")
    );

    this.contentWrapper_
      .querySelector("._tc-recording-switch-wrapper .tc-slider-label")
      .addEventListener(
        "click",
        this.handleRecordingToggleLabelClick_.bind(this)
      );
    this.contentWrapper_
      .querySelector(".recording-checkbox")
      .addEventListener("change", this.handleRecordingToggle_.bind(this));
    this.contentWrapper_
      .querySelector("._tc-paged-recording-switch-wrapper .tc-slider-label")
      .addEventListener("click", this.handlePagingToggleLabelClick_.bind(this));
    this.contentWrapper_
      .querySelector(".paged-recording-checkbox")
      .addEventListener("change", this.handlePagingToggle_.bind(this));

    // Recipe actions
    this.contentWrapper_
      .querySelector(".btn-clip-recipe")
      .addEventListener("click", this.clipRecipeData_.bind(this));
    this.contentWrapper_
      .querySelector(".btn-recipe-clip-data")
      .addEventListener("click", this.viewRecipeClipData_.bind(this));

    const actionDefs = {
      "btn-edit": {
        fn: this.handleEditAction_.bind(this),
        disabled: false,
      },
      "btn-copy": {
        fn: this.handleCopyAction_.bind(this),
        disabled: false,
      },
      "btn-sheets": {
        fn: this.handleSheetsAction_.bind(this),
        disabled: false,
      },
      "btn-csv": {
        fn: this.handleCsvAction_.bind(this),
        disabled: !this.userConfig_.paidPro,
      },
      "btn-excel": {
        fn: this.handleExcelAction_.bind(this),
        disabled: !this.userConfig_.paidPro,
      },
      "btn-screenshot": {
        fn: this.handleScreenshotAction_.bind(this),
        disabled: !this.userConfig_.paidPro,
      },
      "btn-o365": {
        fn: this.handleOffice365Action_.bind(this),
        disabled: !this.userConfig_.paidPro,
      },
      "btn-markdown": {
        fn: this.handleMarkdownAction_.bind(this),
        disabled: !this.userConfig_.paidPro,
      },
      "btn-update-pager-selector": {
        fn: this.handleUpdatePagerDomSelector_.bind(this),
        disabled: !this.userConfig_.showDeveloperOptions,
      },
      "btn-scroll-to-bottom": {
        fn: this.handleScrollToBottomRequest_.bind(this),
      },
      "btn-update-dyn-pager-selector": {
        fn: this.handleUpdateDynPagerDomSelector_.bind(this),
        disabled: !this.userConfig_.showDeveloperOptions,
      },
    };

    Object.keys(actionDefs).forEach((key) => {
      const def = actionDefs[key];
      const actionButton = this.contentWrapper_.querySelector(`.${key}`);
      // These actions might be filtered out.
      if (!actionButton) {
        return;
      }
      actionButton.addEventListener("click", () => def.fn({ ...def, key }));
      if (def.disabled) {
        actionButton.classList.add("_tc-disabled");
      }
    });

    if (this.userConfig_.showDeveloperOptions) {
      const setSelectorButton =
        this.contentWrapper_.querySelector(".btn-set-selector");
      setSelectorButton.classList.remove("tc-hidden");
      setSelectorButton.addEventListener(
        "click",
        this.handleTableSelectorSetRequest_.bind(this)
      );
    }

    this.contentWrapper_
      .querySelector(".btn-select-child")
      .addEventListener("click", this.handleChildSelect_.bind(this));
    this.contentWrapper_
      .querySelector(".btn-select-parent")
      .addEventListener("click", this.handleParentSelect_.bind(this));
    this.contentWrapper_
      .querySelector("._tc-columnify")
      .addEventListener("click", this.toggleColumnification_.bind(this));
    this.contentWrapper_
      .querySelector("._tc-clip")
      .addEventListener("click", this.handleClipData_.bind(this));
    this.contentWrapper_
      .querySelector(".btn-auto-scroll")
      .addEventListener("click", this.toggleTableScroll_.bind(this));
    this.contentWrapper_
      .querySelector(".btn-auto-dynpage")
      .addEventListener("click", this.toggleTableDynPage_.bind(this));
    this.contentWrapper_
      .querySelector(".btn-auto-page")
      .addEventListener("click", this.toggleTableAutoPage_.bind(this));

    // Sheets sync
    this.contentWrapper_
      .querySelector(".btn-sync-to-sheets")
      .addEventListener("click", this.toggleSheetsSync_.bind(this));

    this.contentWrapper_
      .querySelector(".inline-action.edit-settings")
      .addEventListener("click", this.handleSettingsEdit_.bind(this));
    this.contentWrapper_
      .querySelector(".inline-action.refetch-data")
      .addEventListener("click", this.handleDataRefetch_.bind(this));
    this.contentWrapper_
      .querySelector(".inline-action.set-dynamic-capture-config")
      .addEventListener("click", this.handleSetDynamicTableConfig_.bind(this));

    if (this.userConfig_.paidPro || this.userConfig_.paidCloud) {
      Array.from(this.contentWrapper_.querySelectorAll(".pro-only")).forEach(
        (el) => el.classList.remove("tc-hidden")
      );
    } else {
      Array.from(
        this.contentWrapper_.querySelectorAll(".disable-not-pro")
      ).forEach((el) => el.classList.add("_tc-disabled"));
      Array.from(document.querySelectorAll(".not-tc-pro")).forEach((el) =>
        el.classList.remove("tc-hidden")
      );
    }

    // Cloud gating
    if (!_TCAP_CONFIG.supportsCloud) {
      Array.from(
        this.contentWrapper_.querySelectorAll(".support-cloud-only")
      ).forEach((el) => el.classList.add("tc-hidden"));
    }

    this.updatePagingAndRecordingSectionVisibility_();
    this.updateColumnBreakingDisplay_();
    this.updateSwitchLabels_(false, false);

    return Promise.resolve();
  }

  updateColumnBreakingDisplay_() {
    const { treatAsTable } = this.workshopDataManager_.getExtractionOptions();
    this.contentWrapper_.querySelector("._tc-columnify").innerText =
      treatAsTable ? "Break columns" : "Revert";
  }

  updatePagingAndRecordingSectionVisibility_() {
    const allowPaging = this.userConfig_.paidProOrMore;
    this.contentWrapper_
      .querySelector(".table-recording.tc-hidden")
      .classList.toggle(
        "tc-hidden",
        !allowPaging || this.userConfig_.useUnifiedPaging
      );
    this.contentWrapper_
      .querySelector(".table-paging.tc-hidden")
      .classList.toggle(
        "tc-hidden",
        !allowPaging || this.userConfig_.useUnifiedPaging
      );
    this.contentWrapper_
      .querySelector(".paged-tables-upgrade-required.tc-hidden")
      .classList.toggle("tc-hidden", allowPaging);
    this.contentWrapper_
      .querySelector(".paged-tables-upgrade-required .pro-cta")
      .addEventListener("click", () => {
        window.open(
          chrome.extension.getURL("/upgrade.html?ref=bwokeshop-paged")
        );
      });
    this.contentWrapper_
      .querySelector(".paged-tables-upgrade-required .cloud-cta")
      .addEventListener("click", () => {
        window.open(chrome.extension.getURL("/cloud.html?ref=bwokeshop-paged"));
      });

    if (allowPaging && this.userConfig_.useUnifiedPaging) {
      const robotWrapper = this.contentWrapper_.querySelector(
        "._tc-robot-wrapper.tc-hidden"
      );
      robotWrapper.classList.remove("tc-hidden");
      this.robot_.render(robotWrapper);
      this.robot_.addNewDataHandler(this.handleRobotData_.bind(this));
    }
  }

  handleRobotData_({ rows, cols, dataArray }) {
    this.renderTableDataPreview_({ rows, cols, dataArray });
    this.updateContentFrame_(rows, cols);
  }

  updateContentFrame_(rows, cols) {
    let message = `Rows: ${rows}, Columns: ${cols}`;
    if (this.navPagingListener_.isPaging()) {
      message += `, Pages: ${this.getPageIndex_()}`;
    }
    this.contentWrapper_.querySelector(
      "._tc-right ._tc-heading ._tc-size"
    ).innerText = message;
  }

  getPageIndex_() {
    if (this.navPagingListener_ && this.navPagingListener_.isPaging()) {
      return this.navPagingListener_.getPageCount() + 1;
    }
    return 1;
  }

  renderDataPreview_(dataArray) {
    this.contentWrapper_.classList.remove("_tc-empty");
    this.highlightElementWrapper_();

    if (!dataArray || dataArray.length === 0) {
      return Promise.reject(new Error("No data present."));
    }

    this.workshopDataManager_.setElementWrapper(this.getElementWrapper_());
    this.workshopDataManager_.setDataArray(dataArray);
    return this.renderContentFrame_().then(() => {
      const { rows, cols } = this.workshopDataManager_.getDataAttributes();

      this.updateContentFrame_(rows, cols);
      return this.renderTableDataPreview_({ rows, cols, dataArray });
    });
  }

  renderTableDataPreview_({ dataArray }) {
    this.workshopDataManager_.saveDataCopy();

    const maxRowsToShow = _TCAP_CONFIG.selectionDataMaxRows;
    const maxColsToShow = _TCAP_CONFIG.selectionDataMaxCols;

    // NOTE(gmike, 9-15-2020): Changed this because of Timothy. This might need to always be true.
    const hasMulitpleColumns =
      dataArray.some((row) => row.length > 3) &&
      !this.userConfig_.alwaysAllowColumnify;

    const headers = dataArray[0];
    const dataRows = dataArray.slice(1, maxRowsToShow);
    const lastRow = dataArray[dataArray.length - 1];
    const unrenderedRows = dataArray.length - maxRowsToShow;

    let maxCols = -1;
    dataArray.forEach((el) => {
      if (el && el.length > maxCols) {
        maxCols = el.length;
      }
    });
    const renderedCols = Math.min(maxColsToShow + 1, maxCols);

    const table = this.contentWrapper_.querySelector("._tc-right table tbody");
    table.innerHTML = "";

    this.renderTableRows_(table, [headers], maxColsToShow, renderedCols, true);
    this.renderTableRows_(table, dataRows, maxColsToShow, renderedCols, false);

    if (unrenderedRows > 0) {
      // For 2 or more unrendered, render a ... row.
      if (unrenderedRows > 1) {
        const span = document.createElement("tr");
        span.innerHTML = `<td class="_tc-ellipsis-cell" colspan="${renderedCols}"><div class="_tc-cell-inner">...</div></td>`;
        table.appendChild(span);
      }
      // Render last row
      this.renderTableRows_(table, [lastRow], maxColsToShow, renderedCols);
    }

    this.updateColumnifyButton_(hasMulitpleColumns);
    return Promise.resolve();
  }

  renderTableRows_(tableBody, rows, displayCols, renderedCols, identity) {
    if (!rows || !rows.length) {
      return;
    }

    const { identityColumns } =
      this.workshopDataManager_.getExtractionOptions();
    rows.forEach((rowData) => {
      const numCells = rowData.length;
      const tr = document.createElement("tr");
      rowData.splice(0, displayCols).forEach((cell, i) => {
        const cellInner = document.createElement("div");
        cellInner.className = "_tc-cell-inner";
        cellInner.innerText = cell === undefined || cell === null ? "" : cell;

        const td = document.createElement("td");
        td.appendChild(cellInner);
        tr.appendChild(td);
        if (identity) {
          td.classList.toggle(
            "_tc-identity-cell",
            identityColumns.hasOwnProperty(String(i))
          );
        }
      });

      if (numCells > displayCols) {
        const td = document.createElement("td");
        td.innerHTML = `<div class="_tc-cell-inner">...</div>`;
        tr.appendChild(td);
      } else if (numCells < renderedCols) {
        // Render placeholder cells.
        let i = numCells;
        while (i != renderedCols) {
          tr.appendChild(document.createElement("td"));
          i++;
        }
      }

      tableBody.appendChild(tr);
    });
  }

  renderPagingUI_() {
    this.renderSettings_();
    this.updateArbNavElements_(true, false);
    this.updateTableRecordingVisibility_(true);
    this.updateSwitchLabels_(true, false);

    this.contentWrapper_.classList.add("has-paging-data");
    this.contentWrapper_.classList.add("paging-on");
    this.contentWrapper_.querySelector(
      ".paged-recording-checkbox"
    ).checked = true;

    if (this.navPagingListener_ && this.navPagingListener_.isAutoPaging()) {
      const button = this.contentWrapper_.querySelector(".btn-auto-page");
      button.classList.add("toggled-on");
    }

    return Promise.resolve();
  }

  renderElementForm_(isTable) {
    this.renderSettings_();
    this.updateArbNavElements_(isTable, false);
  }

  updateTableRecordingVisibility_(isHidden) {
    this.contentWrapper_
      .querySelector(".table-recording")
      .classList.toggle("tc-hidden", isHidden);
  }

  updateTablePagingVisibility_(isHidden) {
    this.contentWrapper_
      .querySelector(".table-paging")
      .classList.toggle("tc-hidden", isHidden);
  }

  updateArbNavElements_(arbIsHidden, arbBeingUsed) {
    if (arbIsHidden && arbBeingUsed) {
      this.contentWrapper_
        .querySelector(".arb-nav")
        .classList.toggle("ghosted", arbIsHidden);
    } else {
      this.contentWrapper_
        .querySelector(".arb-nav")
        .classList.toggle("tc-hidden", arbIsHidden);
      this.contentWrapper_
        .querySelector(".arb-nav")
        .classList.toggle("ghosted", false);
    }

    Array.from(this.contentWrapper_.querySelectorAll(".arb-nav-only")).forEach(
      (el) => el.classList.toggle("tc-hidden", arbIsHidden && !arbBeingUsed)
    );
  }

  renderSettings_() {
    const wrapper = this.contentWrapper_.querySelector(".settings-summary");

    const renderVal = (el, val) => {
      const tag = document.createElement("span");
      tag.innerText = val;
      tag.className = "_tc-tag";
      el.appendChild(tag);
    };

    if (this.userConfig_.ignoreImages) {
      renderVal(wrapper, "Ignore images");
    } else if (this.userConfig_.extractImageSrc) {
      renderVal(wrapper, "Extract image + icon attributes");
    } else {
      renderVal(wrapper, "Ignore image + icon attributes");
    }

    this.userConfig_.getLinkUrls &&
      renderVal(wrapper, `Extract web addresses (URLs)`);
    this.userConfig_.deleteEmptyRows && renderVal(wrapper, `Delete empty rows`);
    this.userConfig_.moneyAsNumber &&
      renderVal(wrapper, `Convert money values`);
    this.userConfig_.ignoreHiddenPageElements &&
      renderVal(wrapper, `Ignore hidden elements`);
  }

  /// TOOLTIPS

  bindHoverToTooltipText_(selector, text, position) {
    if (position) {
      const el = this.contentWrapper_.querySelector(selector);
      el.setAttribute("aria-label", text);
      el.classList.add(`hint--no-arrow`);
      el.classList.add(`hint--${position}`);
    } else {
      this.contentWrapper_
        .querySelector(selector)
        .addEventListener(
          "mouseenter",
          this.displayTooltipText_.bind(this, text)
        );
      this.contentWrapper_
        .querySelector(selector)
        .addEventListener("mouseleave", this.clearTooltipText_.bind(this));
    }
  }

  clearTooltipText_() {
    if (this.tooltipTimeout_) {
      window.clearTimeout(this.tooltipTimeout_);
      this.tooltipTimeout_ = null;
    }

    if (this.clearTooltipTimeout_) {
      window.clearTimeout(this.clearTooltipTimeout_);
    }

    this.clearTooltipTimeout_ = window.setTimeout(() => {
      this.frame_.setTooltip("");
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
      this.frame_.setTooltip(text);
      this.tooltipTimeout_ = null;
    }, 100);
  }

  ////

  copySnoop_(outputFormat) {
    let tableString = TableUtil.arrayOfArraysToString(
      this.snoop_.getValues(),
      _TCAP_COPY_CONST.rowSeparator,
      _TCAP_COPY_CONST.colSeparator
    );
    tableString = TableUtil.postProcessFinalString(
      tableString,
      outputFormat,
      _TCAP_COPY_CONST,
      this.userConfig_
    );

    const params = {
      action: MessageAction.COPY_TABLE_STRING,
      tableString,
    };

    return new BrowserEnv().sendMessage(params);
  }

  handleClipData_() {
    const clipLink = this.contentWrapper_.querySelector("._tc-clip");
    if (clipLink.innerHTML.includes("View")) {
      return window.open(chrome.extension.getURL("/clips.html"));
    }

    this.frame_.setLoading(true);
    return this.getDataArray_(OutputFormat.GOOG)
      .then((data) => {
        const dataClipper = new DataClipper(this.userConfig_);
        return dataClipper.clipData(data);
      })
      .then(() => {
        clipLink.innerText = "View clips";
        this.frame_.renderSuccess("Data clipped.");
      })
      .catch((err) =>
        this.handleActionError_(err, "Unable to clip table data.")
      )
      .finally(this.frame_.setLoading(false));
  }

  handleCopyAction_() {
    this.frame_.setLoading(true);
    return this.copyToOutputFormat_(OutputFormat.CLIPBOARD)
      .then(() => this.handleCopySuccess_())
      .catch((err) =>
        this.handleActionError_(err, "Unable to capture table data.")
      )
      .finally(this.frame_.setLoading(false));
  }

  handleMarkdownAction_({ disabled }) {
    if (disabled) {
      return this.handleDisabledAction_();
    }

    this.frame_.setLoading(true);
    return this.copyToOutputFormat_(OutputFormat.MARKDOWN)
      .then(() => this.handleCopySuccess_())
      .catch((err) =>
        this.handleActionError_(err, "Unable to capture table data.")
      )
      .finally(() => this.frame_.setLoading(false));
  }

  handleEditAction_() {
    this.frame_.setLoading(true);
    return this.getPublishableMetadata_()
      .then((publicTableDef) => this.operateOnPublicTable_(publicTableDef))
      .catch((err) => this.handleActionError_(err, "Unable to edit table."))
      .finally(() => this.frame_.setLoading(false));
  }

  handleOffice365Action_({ disabled }) {
    return this.performTabOpenBasedExport_(
      disabled,
      _TCAP_CONFIG.office365Link,
      OutputFormat.OFFICE365
    );
  }

  launchBetaModal_() {
    new TCBetaModal(this.frame_, this.userConfig_, {
      loadSelectors: () => {
        const formVals = new FormData(
          document.querySelector("._tc-selector-load form")
        );
        this.handleExplicitySelectorSet_({
          table: formVals.get("table-selector"),
          // TODO(gmike): Re-enable this when the robot is ready.
          // pager: formVals.get("pager-selector"),
          scroller: formVals.get("scroller-selector"),
        });
        this.frame_.hideModal();
      },
      saveAsRecipe: () => {
        const elWrapper = this.getElementWrapper_();
        if (elWrapper) {
          const recipeDefinition = elWrapper.getRecipeDefinition();
          if (recipeDefinition) {
            const blob = btoa(JSON.stringify(recipeDefinition));
            window.open(
              chrome.extension.getURL(`/recipes.html?action=new&def=${blob}`)
            );
          } else {
            _tcPageToast("Unable to export a recipe definition.", "error");
          }
        } else {
          _tcPageToast("No Table Selected", "error");
        }
        this.frame_.hideModal();
      },
    });
  }

  launchSheetsModal_() {
    const instanceId = _tcRandString("instance_");
    new TCGoogleSheetsModal(
      this.frame_,
      this.sheetsSyncBridge_,
      this.userConfig_,
      {
        newSheet: (_, advancedOptions) => {
          this.getDataArray_(OutputFormat.GOOG)
            .then((data) => {
              return this.sheetsSyncBridge_
                .createSheet(instanceId, false, advancedOptions)
                .then(({ sheet }) =>
                  this.sheetsSyncBridge_.writeToSheet(
                    instanceId,
                    sheet.id,
                    data,
                    true,
                    advancedOptions
                  )
                );
            })
            .then(() => this.frame_.hideModal())
            .catch((err) =>
              this.handleModalError_(
                err,
                "Unable to write to new Google Sheet."
              )
            );
        },
        useSheet: (sheetId, advancedOptions) => {
          if (!sheetId) {
            return this.handleModalError_(
              new Error("Please select a sheet"),
              "No sheet was selected."
            );
          }

          this.getDataArray_(OutputFormat.GOOG)
            .then((data) =>
              this.sheetsSyncBridge_.writeToSheet(
                instanceId,
                sheetId,
                data,
                true,
                advancedOptions
              )
            )
            .then(() => this.frame_.hideModal())
            .catch((err) =>
              this.handleModalError_(err, "Unable to write to Google Sheets.")
            );
        },
      }
    );
  }

  handleSheetsAction_({ disabled }) {
    if (this.userConfig_.enableGDriveWrite) {
      return this.launchSheetsModal_();
    }

    return this.performTabOpenBasedExport_(
      disabled,
      _TCAP_CONFIG.newSheetsUrl,
      OutputFormat.GOOG
    );
  }

  performTabOpenBasedExport_(disabled, url, outputFormat) {
    if (disabled) {
      return this.handleDisabledAction_();
    }

    const params = {
      url,
      outputFormat,
      enablePastePrompt: this.userConfig_.enablePastePrompt,
    };

    this.frame_.setLoading(true);
    return this.copyToOutputFormat_(outputFormat)
      .then(() => new BrowserEnv().sendMessage(params))
      .then(() => {
        this.logWorkshopActivity_(MessageAction.COPY, outputFormat);
      })
      .catch((err) =>
        this.handleActionError_(err, "Unable to capture table data.")
      )
      .finally(() => this.frame_.setLoading(false));
  }

  logWorkshopActivity_(messageAction, outputFormat) {
    this.getPublishableMetadata_(outputFormat)
      .then((publicTableDef) => {
        const tcAction = { messageAction, outputFormat };
        _tcLogWorkshopAction(tcAction, this.userConfig_, publicTableDef);
      })
      .catch((err) =>
        _tcContentSwallowError(
          err,
          "SelectionWorkshop.js::logWorkshopActivity_()"
        )
      );
  }

  getPublishableMetadata_(outputFormat = OutputFormat.CLIPBOARD) {
    const elWrapper = this.getElementWrapper_();

    const { treatAsTable } = this.workshopDataManager_.getExtractionOptions();
    const metadata = {
      title: document.title,
      pageTitle: document.title,
      sourceUrl: window.location.href,
      pages: this.getPageIndex_(),
      paged: false,
      dynamic: false,
      treatAsTable,
    };

    if (this.navPagingListener_.isPaging()) {
      const tableDataArray = this.workshopDataManager_.getDataArray();
      return Promise.resolve({
        ...metadata,
        paged: true,
        tableDataArray,
        pagingDef: {
          ...this.navPagingListener_.getPagingDefinition(),
          treatAsTable,
        },
      });
    }

    if (this.snoop_) {
      return Promise.resolve({
        ...metadata,
        dynamic: true,
        tableDataArray: this.snoop_.getValues(),
      });
    }

    if (elWrapper) {
      return Promise.resolve({
        ...metadata,
        tableDef: elWrapper.toJSON(),
        tableDataArray: elWrapper.getAsArrays(),
      });
    }

    return Promise.reject(
      `Fall-through in get publishable metadata (${outputFormat})`
    );
  }

  operateOnPublicTable_(publicTable) {
    const params = {
      action: MessageAction.EDIT_TABLE,
      publicTable,
    };
    return new BrowserEnv().sendMessage(params);
  }

  getDataArray_(outputFormat) {
    if (this.navPagingListener_.isPaging() || this.snoop_) {
      // TODO(gmike): This isn't post-processing.
      return Promise.resolve(this.workshopDataManager_.getDataArray());
    }

    // TODO(gmike): This should be a part of the workshop data manager.
    const elWrapper = this.getElementWrapper_();
    if (elWrapper) {
      return Promise.resolve(elWrapper.getAsArrays());
    }

    return Promise.reject(
      `Fall-through in get data array in output format (${outputFormat})`
    );
  }

  copyToOutputFormat_(outputFormat) {
    // NOTE(gmike): This is kind of weird.
    if (this.navPagingListener_.isPaging()) {
      this.logWorkshopActivity_(MessageAction.COPY, outputFormat);
      const params = {
        action: MessageAction.COPY_STRING,
        stringData:
          this.workshopDataManager_.getDataArrayAsString(outputFormat),
      };
      return new BrowserEnv().sendMessage(params);
    }

    if (this.snoop_) {
      this.logWorkshopActivity_(MessageAction.COPY, outputFormat);
      return this.copySnoop_(outputFormat);
    }

    const elWrapper = this.getElementWrapper_();
    if (elWrapper) {
      // The element wrapper will handle activity logging.
      return elWrapper.copy(outputFormat);
    }

    return Promise.reject(
      `Fall-through in copy to output format (${outputFormat})`
    );
  }

  handleCsvAction_({ disabled }) {
    if (disabled) {
      return this.handleDisabledAction_();
    }

    const dataArray = this.workshopDataManager_.getDataArray();
    if (!dataArray) {
      return this.handleActionError_(
        null,
        "Unable to download table as a CSV file."
      );
    }
    const filename = this.getDownloadFilename_();
    return ExcelUtil.exportArrayOfArraysToCSVP(
      dataArray,
      "Sheet",
      filename,
      this.userConfig_.csvDelimiter
    )
      .then(() => {
        this.logWorkshopActivity_(MessageAction.CSV, OutputFormat.CSV);
      })
      .catch((err) =>
        this.handleActionError_(err, "Unable to download table as CSV file.")
      );
  }

  handleExcelAction_({ disabled }) {
    if (disabled) {
      return this.handleDisabledAction_();
    }

    const dataArray = this.workshopDataManager_.getDataArray();
    if (!dataArray) {
      return this.handleActionError_(
        null,
        "Unable to download table as an Excel spreadsheet."
      );
    }

    const sheetname = "Sheet 1 via Table Capture";
    const filename = this.getDownloadFilename_();
    return ExcelUtil.exportArrayOfArraysToExcelP(dataArray, sheetname, filename)
      .then(() => {
        this.logWorkshopActivity_(MessageAction.EXCEL, OutputFormat.EXCEL);
      })
      .catch((err) =>
        this.handleActionError_(
          err,
          "Unable to download table as an Excel spreadsheet."
        )
      );
  }

  handleScreenshotAction_({ disabled }) {
    if (disabled) {
      return this.handleDisabledAction_();
    }

    const elWrapper = this.getElementWrapper_();
    if (!elWrapper) {
      return;
    }

    this.frame_.setLoading(true);
    elWrapper
      .screenshot()
      .then(() => {
        this.frame_.renderSuccess("Table image copied to clipboard");
      })
      .catch((err) =>
        this.handleActionError_(err, "Unable to screenshot element.")
      )
      .finally(() => this.frame_.setLoading(false));
  }

  handleDisabledAction_() {
    if (this.userConfig_.paidPro) {
      this.displayTooltipText_(
        "This operation is not supported on this table."
      );
    } else {
      this.displayTooltipText_(chrome.i18n.getMessage("upgradeForFeature"));
      this.frame_.upgradeJingle();
    }
  }

  handleCloudDisabledAction_(message) {
    if (this.userConfig_.paidCloud) {
      this.displayTooltipText_(
        "This operation is not supported on this table."
      );
    } else {
      new TCCloudUpdateModal(this.frame_, message);
    }
  }

  handleSettingsEdit_() {
    window.open(chrome.extension.getURL("/options.html"));
    this.contentWrapper_
      .querySelector("._tc-settings .disclaimer")
      .classList.remove("tc-hidden");
  }

  handleDataRefetch_() {
    this.workshopDataManager_.popData();
    this.renderPagingMode(false);
  }

  handleSetDynamicTableConfig_() {
    const firstUsefulRow = _tcGetRepresentativeRow(
      this.workshopDataManager_.getDataArray()
    );
    const { identityColumns } =
      this.workshopDataManager_.getExtractionOptions();
    const values = {
      firstRow: firstUsefulRow,
      identityColumns,
    };
    new TCDynamicOptionsModal(this.frame_, this.userConfig_, values, {
      onSave: ({ identityColumns }) => {
        this.workshopDataManager_.setIdentityColumns(identityColumns);
      },
    });
  }

  handleCopySuccess_() {
    this.frame_.renderSuccess("Table copied to clipboard");
  }

  handleSelectionModeClear_() {
    this.destroy(true);
    this.renderSelectionMode();
  }

  handleRemove_() {
    this.destroy(true);
  }

  handleFrameExpandRequest_() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.body.requestFullscreen().catch((err) => {
        if (_tcIsInIframe()) {
          alert(
            `We were unable to maximize this frame, but we'll try opening it in a new tab. Try again in the new tab!`
          );
          window.open(window.location.href);
        } else {
          alert(err);
        }
      });
    }
  }

  handleSelectionChange_() {
    if (window.getSelection().toString() == "") {
      return null;
    }

    const newNode = _tcGetSelectedNodeFromSelection(this.windowFrame_);
    if (newNode) {
      if (isNodeWorkshopChild(newNode)) {
        return;
      }

      if (this.selectionNode_ == null) {
        this.selectionNode_ = newNode;
        this.renderSelectionMode();

        if (this.frame_.isMinimized()) {
          this.frame_.maximize();
        }
      }
    }
  }

  handleTableSelectorSetRequest_() {
    const tableSelector = window.prompt(
      "Please enter a CSS selector for the table you'd like to select."
    );
    if (tableSelector) {
      this.handleExplicitySelectorSet_({ table: tableSelector });
    }
  }

  handleExplicitySelectorSet_({ table, scroller, pager }) {
    let selectionUpdated = false;
    if (table) {
      const tableNode = document.querySelector(table);
      if (tableNode) {
        this.setTreatAsTable_(true);
        this.selectionNode_ = tableNode;
        selectionUpdated = true;
      }
    }

    if (scroller) {
      const scrollerNode = document.querySelector(scroller);
      if (scrollerNode) {
        this.autoScroller_.setElement(scrollerNode);
        selectionUpdated = true;
      }
    }

    /**
      // TODO(gmike): Add this once the robot exits.
      if (pager) {
        const pagerNode = document.querySelector(pager);
        if (pagerNode) {
          // TODO(gmike): This this for the robot.
          selectionUpdated = true;
        }
      }
    */

    if (selectionUpdated) {
      this.renderSelectionMode();
    }
  }

  handleChildSelect_() {
    if (!this.selectionWrapper_) {
      return this.handleActionError_(
        new Error("Selection not present"),
        `There is currently no table selection.`
      );
    }

    this.frame_.setLoading(true);
    window.setTimeout(() => {
      this.setTreatAsTable_(true);
      this.selectionWrapper_.selectPrevious();
      this.selectionNode_ = this.selectionWrapper_.getDomElement();
      this.renderSelectionMode();
    }, 50);
  }

  handleParentSelect_() {
    if (!this.selectionWrapper_) {
      return this.handleActionError_(
        new Error("Selection not present"),
        `There is currently no table selection.`
      );
    }

    this.frame_.setLoading(true);
    window.setTimeout(() => {
      this.setTreatAsTable_(true);
      this.selectionWrapper_.selectParent();
      this.selectionNode_ = this.selectionWrapper_.getDomElement();
      this.renderSelectionMode();
    }, 50);
  }

  handlePagingToggleLabelClick_() {
    const lastVal = this.contentWrapper_.querySelector(
      ".paged-recording-checkbox"
    ).checked;
    this.contentWrapper_.querySelector(".paged-recording-checkbox").checked =
      !lastVal;
    this.handlePagingToggle_();
  }

  handlePagingToggle_() {
    const pagingOn = this.isPagingToggleOn_();
    this.contentWrapper_.classList.toggle("paging-on", pagingOn);
    this.contentWrapper_.classList.remove("has-paging-data");

    if (pagingOn) {
      this.navPagingListener_.setFirstPageSize(
        this.workshopDataManager_.getRowCount(-1)
      );
      const pathToElement = this.getElementWrapper_().toJSON().pathTo;
      this.navPagingListener_.setTabAndPathToElement(
        this.tabId_,
        pathToElement
      );
      this.navPagingListener_.beginPagingListening();
    } else {
      this.navPagingListener_.stopPaging();
    }

    this.updateVisibilities_();
  }

  handleRecordingToggleLabelClick_() {
    const lastVal = this.contentWrapper_.querySelector(
      ".recording-checkbox"
    ).checked;
    this.contentWrapper_.querySelector(".recording-checkbox").checked =
      !lastVal;
    this.handleRecordingToggle_();
  }

  handleRecordingToggle_() {
    try {
      if (!this.isWrapperRecordable_()) {
        throw new Error(
          `No selection wrapper present to begin dynamic table capture.`
        );
      }

      const recordingOn = this.isRecordingToggleOn_();
      this.contentWrapper_.classList.toggle("recording-on", recordingOn);

      if (recordingOn) {
        this.navPagingListener_.stopPaging();
        // This is what will eventually render the correct data.
        this.createSnoop_();
        this.snoop_.startRecording();
      } else {
        // If you're no longer recording, stop recording. This will fire a mutation event.
        this.snoop_ && this.snoop_.stopRecording();

        // If we're scrolling, we need to stop.
        this.autoScroller_.stopScrolling();

        // If we're dynamically auto-paging or sheet-syncing, we need to stop.
        this.turnOffDynamicAutoPagingListening_();
        this.turnOffSheetSync_();
      }
    } catch (err) {
      this.handleActionError_(err);
    }

    this.updateVisibilities_();
  }

  createSnoop_() {
    if (this.snoop_) {
      this.snoop_.destroy();
      this.snoop_ = null;
    }

    this.snoop_ = _tcCreateTableSnoop(
      this.userConfig_,
      this.workshopDataManager_
    );
    // Bind to and call to immediately reflect values.
    this.snoop_.bindToChange(this.handleMutationChanges_.bind(this));
    this.snoop_.bindToError(this.handleActionError_.bind(this));
    this.snoop_.bindToStatus(this.handleMutationStatus_.bind(this));
    this.snoop_.bindToLoading(this.handleMutationLoading_.bind(this));
    this.handleMutationChanges_();
  }

  handleMutationStatus_(message) {
    this.frame_.renderStatus(message);
  }

  handleMutationLoading_(loading) {
    this.frame_.setLoading(loading);
  }

  handleMutationChanges_() {
    if (!this.snoop_) {
      return;
    }

    const previousRowCount = this.workshopDataManager_.getRowCount();
    const dataArray = this.snoop_.getValues() || [];
    this.workshopDataManager_.setDataArray(dataArray);

    const rows = dataArray.length;
    const rowDelta = rows - previousRowCount;
    const cols = _tcSmartColCount(dataArray);

    this.renderTableDataPreview_({ rows, cols, dataArray });
    this.updateContentFrame_(rows, cols);

    if (
      this.dynamicPagingListener_ &&
      this.dynamicPagingListener_.isAutoPagingOrListening()
    ) {
      // NOTE(gmike, 5/6/2022): Only advancing on row-delta.
      if (rowDelta) {
        this.dynamicPagingListener_.advanceAfterTimeout({
          delta: rowDelta,
          count: rows,
        });
      }
    }

    if (this.snoop_.isSheetSyncing()) {
      const filename = this.getDownloadFilename_();
      const sheetOptions = { sheetName: "Cloud-Synced", filename };
      const instanceId = this.snoop_.getId();

      if (this.sheetsSyncBridge_.isCreateOperationOngoing(instanceId)) {
        return;
      }

      this.sheetsSyncBridge_
        .createSheet(instanceId, true, sheetOptions)
        .then((response) => {
          const writeNow = response.created;
          return this.sheetsSyncBridge_.writeToSheet(
            instanceId,
            response.sheet.id,
            this.workshopDataManager_.getDataArray(),
            writeNow,
            sheetOptions
          );
        })
        .catch((err) =>
          this.handleActionError_(err, "Unable to sync data to Google Sheets.")
        );
    }
  }

  updateColumnifyButton_(hasMulitplColumns) {
    const { treatAsTable } = this.workshopDataManager_.getExtractionOptions();
    const showButton =
      ((!hasMulitplColumns && this.selectionWrapper_ && treatAsTable) ||
        (this.selectionWrapper_ && !treatAsTable)) &&
      !this.isOrHasEverRecorded_() &&
      !this.isPagingToggleOn_();
    this.contentWrapper_
      .querySelector("._tc-columnify")
      .classList.toggle("tc-hidden", !showButton);
  }

  toggleTableAutoPage_() {
    if (!this.userConfig_.paidProOrMore) {
      return this.handleDisabledAction_();
    }

    if (this.navPagingListener_) {
      const autoPaging = !this.navPagingListener_.isAutoPaging();
      this.navPagingListener_.setAutoPage(autoPaging, true);
      const button = this.contentWrapper_.querySelector(".btn-auto-page");
      button.classList.toggle("toggled-on", autoPaging);
    }
  }

  toggleSheetsSync_() {
    if (!this.snoop_) {
      return;
    }

    if (!this.userConfig_.paidCloud) {
      return this.handleCloudDisabledAction_(
        chrome.i18n.getMessage("upgradeCloudForFeature_SheetsSync")
      );
    }

    // Toggle the value
    const nowSheetSyncing = !this.snoop_.isSheetSyncing();
    this.contentWrapper_.classList.toggle("sheets-sync-on", nowSheetSyncing);

    if (nowSheetSyncing) {
      this.snoop_.startSheetSyncing();
      this.handleMutationChanges_();
    } else {
      this.snoop_.stopSheetSyncing();
    }

    const button = this.contentWrapper_.querySelector(".btn-sync-to-sheets");
    button.classList.toggle("toggled-on", nowSheetSyncing);
  }

  turnOffSheetSync_() {
    if (!this.snoop_) {
      return;
    }

    if (this.snoop_.isSheetSyncing()) {
      this.contentWrapper_.classList.remove("sheets-sync-on");
      this.contentWrapper_
        .querySelector(".btn-sync-to-sheets")
        .classList.remove("toggled-on");
      this.snoop_.stopSheetSyncing();
    }
  }

  turnOffDynamicAutoPagingListening_() {
    const button = this.contentWrapper_.querySelector(".btn-auto-dynpage");
    button.classList.remove("toggled-on");
    this.contentWrapper_.classList.remove("dyn-auto-paging-on");
    if (
      this.dynamicPagingListener_ &&
      this.dynamicPagingListener_.isAutoPagingOrListening()
    ) {
      this.dynamicPagingListener_.turnAutoPagingOff();
    }
    this.dynamicPagingListener_ = null;
  }

  toggleTableDynPage_() {
    if (!this.userConfig_.paidProOrMore) {
      return this.handleDisabledAction_();
    }

    if (this.dynamicPagingListener_) {
      return this.turnOffDynamicAutoPagingListening_();
    }

    const button = this.contentWrapper_.querySelector(".btn-auto-dynpage");
    button.classList.add("toggled-on");
    this.contentWrapper_.classList.add("dyn-auto-paging-on");
    this.dynamicPagingListener_ = new DynamicPagingListener(this.userConfig_);
    this.dynamicPagingListener_.setAutoPagingWarningHandler(
      (err, errorCode) => {
        this.handleDynPagerMissing_(err, errorCode, "WARNING");
      }
    );
    if (this.recipeWrapper_ && this.recipeWrapper_.hasNextPageSelector()) {
      this.dynamicPagingListener_.useRecipeNextPageSelector(
        this.recipeWrapper_.getNextPageSelector()
      );
    } else {
      this.dynamicPagingListener_.beginListeningForAdvance();
    }
  }

  toggleTableScroll_() {
    if (!this.userConfig_.paidProOrMore) {
      return this.handleDisabledAction_();
    }

    const currentlyScrolling = this.autoScroller_.isScrolling();
    this.contentWrapper_
      .querySelector(".btn-auto-scroll")
      .classList.toggle("toggled-on", !currentlyScrolling);
    if (currentlyScrolling) {
      this.autoScroller_.stopScrolling();
    } else {
      this.autoScroller_.setElementIfNotSet(
        this.getElementWrapperDomElement_()
      );
      this.autoScroller_.startScrolling();
    }
  }

  toggleColumnification_() {
    if (this.selectionWrapper_) {
      const { treatAsTable } = this.workshopDataManager_.getExtractionOptions();
      this.setTreatAsTable_(!treatAsTable);
      this.renderSelectionMode();
    }
  }

  setTreatAsTable_(treatAsTable) {
    if (this.workshopDataManager_) {
      this.workshopDataManager_.setTreatAsTable(treatAsTable);
    }
    if (this.selectionWrapper_) {
      this.selectionWrapper_.setTreatAsTable(treatAsTable);
    }
  }

  getDownloadFilename_() {
    const elWrapper = this.getElementWrapper_();
    return elWrapper && elWrapper.getFilename();
  }

  //// ERRORS

  handlePagingRenderError_(err, message) {
    console.log(`SelectionWorkshop::handleRenderError_ - ${message}`, err);
    message = _tcGetMessageFromError(err, message, true);
    this.renderPagingErrorMessage_(message);
  }

  handleSelectionRenderError_(err, message) {
    console.log(`SelectionWorkshop::handleRenderError_ - ${message}`, err);
    this.destroy(true);
    this.errorMessage_ = _tcGetMessageFromError(err, message);
    this.renderSelectionMode();
  }

  handleModalError_(err, message) {
    this.frame_.handleModalError_(err, message);
  }

  handleActionError_(err, message, errorType = "ERROR", preferDetail = false) {
    console.log(`SelectionWorkshop::handleActionError_`, message, err);
    message = _tcGetMessageFromError(err, message, preferDetail);
    if (errorType === "ERROR") {
      this.frame_.renderError(message);
    } else if (errorType === "WARNING") {
      _tcPageToast(message, "warning");
    }
  }
}

// The default actions that can be taken.
const _TC_SELWORK_FRAME_ACTIONS = [
  {
    className: "btn-copy",
    frame: true,
    src: "images/icon.clipboard.add.png",
    tooltip: chrome.i18n.getMessage("copyClipboardActionTooltip"),
  },
  {
    className: "btn-sheets",
    frame: true,
    src: "images/icon.sheets.png",
    tooltip: chrome.i18n.getMessage("googleDocActionTooltip"),
  },
  {
    className: "btn-edit",
    frame: true,
    src: "images/icon.clipboard.edit.png",
    tooltip: chrome.i18n.getMessage("editActionTooltip"),
  },
  {
    className: "btn-csv",
    frame: true,
    src: "images/icon.csv.b.png",
    tooltip: chrome.i18n.getMessage("csvActionTooltip"),
  },
  {
    className: "btn-excel",
    frame: true,
    src: "images/icon.excel.svg",
    tooltip: chrome.i18n.getMessage("excelActionTooltip"),
  },
  {
    className: "btn-o365",
    frame: false,
    src: "images/icon.o365.png",
    tooltip: chrome.i18n.getMessage("o365ActionTooltip"),
  },
  {
    className: "btn-screenshot",
    frame: false,
    src: "images/icon.screenshot.big.png",
    tooltip: chrome.i18n.getMessage("screenshotActionTooltip"),
  },
  {
    className: "btn-markdown",
    frame: false,
    src: "images/icon.markdown.png",
    tooltip: chrome.i18n.getMessage("markdownActionTooltip"),
  },
];
