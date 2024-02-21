class NavigationPagingListener extends PagingListener {
  constructor(userConfig, workshopDataManager) {
    super(userConfig, workshopDataManager);

    this.workshopDataManager_.addOnDataSetHandler(() =>
      this.handleWorkshopDataSet_()
    );

    // These are all data related and I think should be moved to a separate file.
    this.pageCount_ = 0;
    this.paging_ = false;
    this.pagingContinuationKey_ = null;
    this.lastUsedPagingElementSelector_ = null;

    this.pagerMissingHandler_ = null;
    this.nextButtonListener_.addNextButtonFoundHandler((nextButton) => {
      this.recordPagingElement_(nextButton);
    });
  }

  setPagerMissingHandler(handler) {
    this.pagerMissingHandler_ = handler;
  }

  setActivePagingDefinition({
    continuationKey,
    pathToElement,
    pathToPager,
    pagerSelector,
  }) {
    this.pagingContinuationKey_ = continuationKey;
    this.pathToElement_ = pathToElement;
    this.pathToPagingElement_ = pathToPager;
    this.lastUsedPagingElementSelector_ = pagerSelector;
  }

  getPagingDefinition() {
    return {
      pathToElement: this.pathToElement_,
      pathToPager: this.pathToPagingElement_,
      pagerSelector: this.lastUsedPagingElementSelector_,
    };
  }

  handleWorkshopDataSet_() {
    if (!this.isPaging()) {
      return;
    }

    const dataAttributes = this.workshopDataManager_.getDataAttributes();
    const params = {
      action: MessageAction.PAGING_DATA_UPDATE,
      pageCount: this.pageCount_,
      firstPageSize: this.firstPageSize_,
      dataAttributes,
    };
    new BrowserEnv()
      .sendMessage(params)
      .catch((err) =>
        _tcContentSwallowError(
          err,
          "NavigationPagingListener::handleWorkshopDataSet_()"
        )
      );
  }

  recordPagingElement_(pagingElement, pagerSelector = "") {
    if (!this.workshopDataManager_.hasData()) {
      throw new Error("Unable to begin paging");
    }

    this.pagingElement_ = pagingElement;
    this.pathToPagingElement_ = _tcExhaustiveGetPathsToPager(
      this.pagingElement_
    );

    const extractionOptions = this.workshopDataManager_.getExtractionOptions();
    const dataAttributes = this.workshopDataManager_.getDataAttributes();
    const params = {
      ...extractionOptions,
      host: window.location.host,
      tabId: this.tabId_,
      action: MessageAction.PAGING_LISTEN_START,
      pathToPager: this.pathToPagingElement_,
      pagerSelector,
      autoPageTable: this.autoPagingOn_,
      pathToElement: this.pathToElement_,
      pageCount: this.pageCount_,
      firstPageSize: this.firstPageSize_,
      dataAttributes,
    };
    new BrowserEnv()
      .sendMessage(params)
      .catch((err) =>
        _tcContentSwallowError(err, "PagingListener::recordPagingElement_()")
      );
  }

  beginPagingListening() {
    // Clear the user query selector
    window.localStorage[USER_QUERY_SELECTOR_PAGED_ELEMENT_KEY] = "";

    this.nextButtonListener_.beginListeningForAdvance();
    this.preStartPagingListen_();
  }

  destroy() {
    this.pathToElement_ = null;
    this.pagingElement_ = null;
    this.setFirstPageSize(-1);
    this.setPageCount(0);
    this.stopPaging();
    this.maybeKillAutoPage_();
  }

  maybeKillAutoPage_() {
    this.autoPagingOn_ = false;
    this.clearAdvanceTimeout_();
    this.updateAutoPageState_();
  }

  updateAutoPageState_() {
    const params = {
      action: MessageAction.AUTO_PAGING_UPDATE,
      autoPageTable: this.autoPagingOn_,
    };
    new BrowserEnv()
      .sendMessage(params)
      .catch((err) =>
        _tcContentSwallowError(err, "PagingListener::updateAutoPageState_()")
      );
  }

  setAutoPage(autoPagingOn, userInvoked = false) {
    this.autoPagingOn_ = autoPagingOn;
    if (this.autoPagingOn_) {
      this.updateAutoPageState_();

      if (userInvoked && this.userConfig_.enableUrlAutoPage) {
        this.promptUserForUrlBasedAutoPaging_();
      }
    } else {
      this.maybeKillAutoPage_();
    }
  }

  promptUserForUrlBasedAutoPaging_() {
    const pageNum = _tcGetCurrentPageNumber();
    if (pageNum === null) {
      return;
    }

    const nextPageEl = _tcGetNextPageElement(pageNum);
    const nextPageUrl = nextPageEl ? nextPageEl.href : null;

    if (!nextPageUrl) {
      return;
    }

    // NOTE(gmike): This isn't quite accurate. What is actually happening here is that we're looking for a
    // link to the next page. We ask for confirmation because we're not actually sure that the link corresponds
    // to the next page of the current dataset.
    const wantPageViaUrl = window.confirm(
      `Table Capture has detected a page number in the URL. Would you like to auto-page via URL modification? If so, you'll be advanced to ${nextPageUrl}`
    );
    if (wantPageViaUrl) {
      this.advance_();
    }
  }

  setPaging(paging) {
    this.paging_ = paging;
  }

  isPaging(key = null) {
    if (!key) {
      return this.paging_;
    }
    return this.paging_ && this.pagingContinuationKey_ === key;
  }

  stopPaging() {
    this.nextButtonListener_.stopListening();
    this.paging_ = false;
    this.pageCount_ = 0;

    const params = {
      tabId: this.tabId_,
      action: MessageAction.PAGING_LISTEN_STOP,
      host: window.location.host,
    };
    new BrowserEnv()
      .sendMessage(params)
      .catch((err) =>
        _tcContentSwallowError(err, "PagingListener::stopPaging()")
      );
  }

  preStartPagingListen_() {
    if (!this.workshopDataManager_.hasData()) {
      // NOTE(gmike): Not throwing on the pre-listen.
      return;
    }

    const extractionOptions = this.workshopDataManager_.getExtractionOptions();
    const dataAttributes = this.workshopDataManager_.getDataAttributes();
    const params = {
      ...extractionOptions,
      host: window.location.host,
      tabId: this.tabId_,
      action: MessageAction.PAGING_LISTEN_PRESTART,
      autoPageTable: this.autoPagingOn_,
      pathToElement: this.pathToElement_,
      pageCount: this.pageCount_,
      dataAttributes,
    };
    new BrowserEnv()
      .sendMessage(params)
      .catch((err) =>
        _tcContentSwallowError(err, "PagingListener::preStartPagingListen_()")
      );
  }

  advanceAfterTimeout() {
    if (!this.isAutoPaging()) {
      // No-op.
      return Promise.resolve();
    }

    return this.advance_();
  }

  getPagingElementFromDom_() {
    // Prefer a user-provided selector if possible.
    if (
      this.userProvidedPagingElementSelector_ ||
      this.lastUsedPagingElementSelector_
    ) {
      const selectorToUse =
        this.userProvidedPagingElementSelector_ ||
        this.lastUsedPagingElementSelector_;
      const { element } = _tcGetSingleElementBySelector(selectorToUse);
      if (element !== null) {
        return element;
      }
    }

    let pagingEl = null;
    const currentPageNum = _tcGetCurrentPageNumber();
    if (currentPageNum !== null) {
      pagingEl = _tcGetNextPageElement(currentPageNum);
    }
    if (pagingEl === null) {
      pagingEl = _tcGetElementByXpath(this.pathToPagingElement_);
    }

    return pagingEl;
  }

  advance_() {
    this.advanceTimeout_ = window.setTimeout(() => {
      this.advanceTimeout_ = null;
      const pagingEl = this.getPagingElementFromDom_();
      if (pagingEl) {
        _tcDoClick(pagingEl);
      } else {
        this.pagerMissingHandler_ && this.pagerMissingHandler_();
      }
    }, this.pagingWaitDuration_);
  }

  bindToElementSelectorProvideButton(provideElementSelectorButton, onUpdate) {
    // Allow users to provide a selector to target the table.
    provideElementSelectorButton.addEventListener("click", () => {
      const message = chrome.i18n.getMessage("provideCustomSelectorOrXpath");
      const val = window.prompt(message);
      if (val) {
        this.userProvidedElementSelector_ = val;
        onUpdate();
      }
    });

    // Show the button
    if (this.userConfig_.showDeveloperOptions) {
      provideElementSelectorButton.classList.remove("tc-hidden");
    }
  }

  retryElementSelection() {
    if (this.userProvidedElementSelector_) {
      const { element } = _tcGetSingleElementBySelector(
        this.userProvidedElementSelector_
      );
      if (element) {
        this.savePagedElementUserQuerySelector(
          this.userProvidedElementSelector_
        );
        return element;
      }
    }
    if (this.pathToElement_) {
      return _tcGetElementByXpath(this.pathToElement_);
    }
    return null;
  }

  isPagingWaitAndScrollNeeded(rowCount) {
    if (this.isPaging()) {
      const firstPageSize = this.getFirstPageSize();

      // This is redundant logic, but I want to be explicit about this being set
      // and above this arbitrary threshold. The reason I chose 15 is the idea that:
      // there will only be race conditions with large page sizes.
      if (firstPageSize !== -1 && firstPageSize > 15) {
        const sizePercent = Math.round((rowCount / firstPageSize) * 100);
        return sizePercent < this.pageSizeRetryThreshold_;
      }
    }

    return false;
  }
}
