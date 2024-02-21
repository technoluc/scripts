const USER_QUERY_SELECTOR_PAGED_ELEMENT_KEY =
  "_tc-workshop-user-paged-element-query-selector";

class PagingListener {
  constructor(userConfig, workshopDataManager) {
    this.userConfig_ = userConfig;
    this.workshopDataManager_ = workshopDataManager;

    this.nextButtonListener_ = new NextButtonListener();
    this.autoPagingOn_ = false;

    // Selectors and elements
    this.pathToElement_ = null;
    this.userProvidedElementSelector_ = null;
    this.pagingElement_ = null;
    this.pathToPagingElement_ = null;
    this.userProvidedPagingElementSelector_ = null;

    // Error and retry handlers, timeouts
    this.onAutoPagingWarning_ = null;
    this.advanceTimeout_ = null;

    this.tabId_ = null;
    this.pageCount_ = 0;
    this.firstPageSize_ = -1;
    this.pageSizeRetryThreshold_ = 90;

    // These settings will eventually be configurable.
    this.pagingWaitDuration_ =
      userConfig.autoPageWait || _TCAP_CONFIG.autoPageWait;
    this.pagingRetryWaitDuration_ = _TCAP_CONFIG.pagingRetryDelay;
    this.maxPagingRetries_ = _TCAP_CONFIG.numPagingRetries;
  }

  isAutoPaging() {
    return this.autoPagingOn_;
  }

  isAutoPagingOrListening() {
    return this.autoPagingOn_ || this.nextButtonListener_.isProcessingClicks();
  }

  setPageCount(pageCount) {
    this.pageCount_ = pageCount;
  }

  getPageCount() {
    return this.pageCount_;
  }

  getFirstPageSize() {
    return this.firstPageSize_;
  }

  setFirstPageSize(firstPageSize) {
    this.firstPageSize_ = firstPageSize;
  }

  savePagedElementUserQuerySelector(selector) {
    window.localStorage[USER_QUERY_SELECTOR_PAGED_ELEMENT_KEY] = selector;
  }

  getPagedElementUserQuerySelector() {
    return window.localStorage[USER_QUERY_SELECTOR_PAGED_ELEMENT_KEY] || null;
  }

  setTabAndPathToElement(tabId, pathToElement) {
    this.tabId_ = tabId;
    this.pathToElement_ = pathToElement;
  }

  recordPagingElement_(
    pagingElement,
    userProvidedPagingElementSelector = null
  ) {
    this.pagingElement_ = pagingElement;
    if (userProvidedPagingElementSelector) {
      this.userProvidedPagingElementSelector_ =
        userProvidedPagingElementSelector;
    }
  }

  tryToUseSelector_(selector) {
    const { element: pagingElement, count } =
      _tcGetSingleElementBySelector(selector);
    if (pagingElement) {
      this.recordPagingElement_(pagingElement, selector);
      _tcDoClick(pagingElement);
      return Promise.resolve();
    }

    if (count === 0) {
      return Promise.reject(
        new Error(
          chrome.i18n.getMessage("errorUsingNextPageButtonSelectorTooFew")
        )
      );
    } else if (count > 1) {
      return Promise.reject(
        new Error(
          chrome.i18n.getMessage("errorUsingNextPageButtonSelectorTooMany")
        )
      );
    } else {
      return Promise.reject(
        new Error(chrome.i18n.getMessage("errorUsingNextPageButtonSelector"))
      );
    }
  }

  useRecipeNextPageSelector(selector) {
    return this.tryToUseSelector_(selector);
  }

  useUserQuerySelectorForPagingElement(selector) {
    return this.tryToUseSelector_(selector);
  }

  // Attempts to find a connected paging element.
  maybeUpdatePagingElement_() {
    if (!this.pagingElement_) {
      return;
    }

    if (this.pagingElement_.id) {
      const selector = `#${this.pagingElement_.id}`;
      const newEl = document.querySelector(selector);
      if (newEl) {
        this.pagingElement_ = newEl;
        return;
      }
    }

    if (this.pagingElement_.className) {
      // SVGs have className that isn't a string.
      if (typeof this.pagingElement_.className === "string") {
        const selector =
          "." + this.pagingElement_.className.split(" ").join(".");
        const { element: newPagingEl } = _tcGetSingleElementBySelector(
          selector,
          this.pagingElement_.innerText
        );
        if (newPagingEl) {
          this.pagingElement_ = newPagingEl;
          return;
        }
      }
    }
  }

  setAutoPagingWarningHandler(onAutoPagingWarning) {
    this.onAutoPagingWarning_ = onAutoPagingWarning;
  }

  clearAdvanceTimeout_() {
    if (this.advanceTimeout_) {
      window.clearTimeout(this.advanceTimeout_);
      this.advanceTimeout_ = null;
    }
  }

  handleCountdown_(duration, type) {
    // TODO(gmike): Implement this.
  }
}
