const _TCAP_DEFAULT_TABLE_XPATH = "//*/table";

function _tcCreateTableSnoop(userConfig, workshopDataManager) {
  const elementWrapper = workshopDataManager.getElementWrapper();
  const { treatAsTable, identityColumns } =
    workshopDataManager.getExtractionOptions();

  if (elementWrapper.isTableWrapper()) {
    const rootValueProvider = (el) =>
      TableUtil.nodeToArrays(
        el,
        _TCAP_COPY_CONST.rowSeparator,
        _TCAP_COPY_CONST.colSeparator,
        userConfig,
        true
      );
    const rowValueProvider = (el) =>
      TableUtil.trNodeToRowArray(el, _TCAP_COPY_CONST.colSeparator, userConfig);
    const snoop = new TableMutationSnoop(rootValueProvider, rowValueProvider);
    snoop.setIdentityColumns(identityColumns);
    snoop.initializeForElement(elementWrapper.getDomElement());
    return snoop;
  }

  if (elementWrapper.isSelectionWrapper()) {
    const rootValueProvider = (el) =>
      TableUtil.getArbPreAlignmentForRoot(el, userConfig);
    const rowValueProvider = (el) =>
      TableUtil.getArbPreAlignmentForNode(el, userConfig);
    const snoop = new ArbMutationSnoop(rootValueProvider, rowValueProvider);
    snoop.setIdentityColumns(identityColumns);
    snoop.initializeForElement(elementWrapper.getDomElement());
    snoop.setValuesPostProcessor((valueArray) =>
      TableUtil.arbAlign(valueArray, treatAsTable)
    );
    return snoop;
  }

  if (elementWrapper.isRecipeWrapper()) {
    return elementWrapper.snoop();
  }

  throw new Error("No dynamic table wrapper present.");
}

////

class MutationSnoop {
  constructor(rootValueProvider, rowValueProvider) {
    this.id_ = Math.random().toString(36).slice(2);

    this.el_ = null;
    this.selectorForEl_ = null;
    this.pathToEl_ = null;
    this.parentChain_ = null;

    this.rootValueProvider_ = rootValueProvider;
    this.rowValueProvider_ = rowValueProvider;
    this.identityColumnIndexes_ = [];

    this.recording_ = false;
    this.globalObserver_ = null;
    this.mutationObserver_ = null;
    this.onChangeListeners_ = [];
    this.onErrorListeners_ = [];
    this.onStatusListeners_ = [];
    this.onLoadingListeners_ = [];

    this.sheetSyncing_ = false;

    this.values_ = [];
    this.newValues_ = [];
    this.rowHashMap_ = {};

    this.postProcessor_ = null;

    this.anchorElements_ = [];
    this.anchorTimeout_ = null;

    this.batch_ = [];
    this.batchTimeout_ = null;
  }

  initializeForElement(el, selector = null) {
    this.setElement_(el);
    this.values_ = this.rootValueProvider_(el);
    this.hashAndLogValues_(this.values_);

    // This might clobber the selector we set in setElement.
    this.selectorForEl_ = selector;
  }

  getId() {
    return this.id_;
  }

  setElement_(el) {
    this.el_ = el;
    this.buildParentChain_();
    // This shouldn't change so only set it once.
    if (!this.pathToEl_) {
      this.selectorForEl_ = _tcSpecificGetSelectorForEl(el);
      this.pathToEl_ = _tcGetPathTo(el);
    }
  }

  setIdentityColumns(identityColumns) {
    this.identityColumnIndexes_ = Object.keys(identityColumns);
  }

  buildParentChain_() {
    this.parentChain_ = [this.el_];

    let parent = this.el_.parentElement;
    while (parent) {
      this.parentChain_.push(parent);
      parent = parent.parentElement;
    }
  }

  setValuesPostProcessor(postProcessor) {
    this.postProcessor_ = postProcessor;
  }

  bindToChange(listener) {
    this.onChangeListeners_.push(listener);
  }

  bindToError(listener) {
    this.onErrorListeners_.push(listener);
  }

  bindToStatus(listener) {
    this.onStatusListeners_.push(listener);
  }

  bindToLoading(listener) {
    this.onLoadingListeners_.push(listener);
  }

  isRecording() {
    return this.recording_;
  }

  destroy() {
    try {
      if (this.recording_) {
        this.stopRecording();
      }
    } catch (err) {}
  }

  killMutationObserver_() {
    if (this.mutationObserver_) {
      this.mutationObserver_.disconnect();
      this.mutationObserver_ = null;
    }
  }

  hasNewValues() {
    return this.newValues_ && this.newValues_.length != 0;
  }

  getValues() {
    const allValues = this.values_.concat(this.newValues_);
    return JSON.parse(JSON.stringify(this.postProcessValues_(allValues)));
  }

  startRecording() {
    this.recording_ = true;
    this.globalObserver_ = this.beginObserving_(
      document.body,
      this.handleGlobalMutations_.bind(this)
    );
    this.mutationObserver_ = this.beginObserving_(
      this.el_,
      this.handleMutations_.bind(this)
    );
  }

  beginObserving_(domElement, handleCb) {
    // Sanity check: https://jsfiddle.net/rhxsbjn5/2/
    const attrs = {
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
      childList: true,
      subtree: true,
    };
    const observer = new MutationObserver(handleCb);
    observer.observe(domElement, attrs);
    return observer;
  }

  stopRecording() {
    this.recording_ = false;
    if (this.globalObserver_) {
      this.globalObserver_.disconnect();
      this.globalObserver_ = null;
    }
    this.killMutationObserver_();
    this.fireOnChange_();
  }

  handleGlobalMutations_(mutations) {
    mutations
      .filter(
        (mutation) => mutation.removedNodes && mutation.removedNodes.length > 0
      )
      .forEach((mutation) => {
        const elRemoved = Array.from(mutation.removedNodes).some((el) =>
          this.parentChain_.includes(el)
        );
        if (elRemoved) {
          this.handleElSwap_();
        }
      });
  }

  handleElSwap_() {
    this.fireOnLoading_(true);
    _tcWaitForPathOrSoloSelector(this.pathToEl_, this.selectorForEl_, 5 * 1000)
      .then((el) => this.handleSwappedElFound_(el))
      .catch((err) => {
        this.fireOnLoading_(false);

        if (this.hasAlternateXPath_()) {
          this.pathToEl_ = _TCAP_DEFAULT_TABLE_XPATH;
          this.handleElSwap_();
        } else {
          this.fireOnError_(err, "Page mutation observation error.");
        }
      });
  }

  handleSwappedElFound_(el) {
    this.fireOnLoading_(false);
    this.killMutationObserver_();
    this.setElement_(el);
    this.mutationObserver_ = this.beginObserving_(
      this.el_,
      this.handleMutations_.bind(this)
    );

    const rowValues = this.rootValueProvider_(el) || [];
    rowValues.forEach((rowValue) => this.handleMaybeNewValue_(rowValue));

    this.fireOnChange_();
  }

  handleMutations_(mutations) {
    let mutated = false;
    try {
      mutations
        .filter((mutation) => {
          if (mutation.type === "attributes") {
            return (
              !mutation.attributeName.includes("aria-") &&
              // NOTE(gmike, 3-2-2022): Infinite loop: aia.org
              !mutation.attributeName.includes("data-feathr-")
            );
          }
          return true;
        })
        .forEach((mutation) => {
          mutated = true;
          if (mutation.addedNodes && mutation.addedNodes.length) {
            mutation.addedNodes.forEach((el) => this.hashAndAdd_(el));
          }
          if (mutation.removedNodes && mutation.removedNodes.length) {
            // No-op. For now at least.
          }
          if (mutation.target && mutation.type === "characterData") {
            this.handleSubMutation_(mutation.target);
          }
        });
    } catch (err) {
      console.log("MutationSnoop: Error Caught", err);
    }

    if (mutated) {
      this.fireOnChange_();
    }
  }

  handleSubMutation_(targetEl) {
    const rowEls = this.getRowIshThingsFromEl_(targetEl);

    // For each row, add it to a batch to be processed
    if (rowEls) {
      rowEls.forEach((rowEl) => this.batch_.push(rowEl));

      if (this.batchTimeout_) {
        window.clearTimeout(this.batchTimeout_);
        this.batchTimeout_ = null;
      }
      this.batchTimeout_ = window.setTimeout(
        this.processBatch_.bind(this),
        _TCAP_CONFIG.batchWait
      );
    }
  }

  processBatch_() {
    this.batch_.forEach((rowEl) => this.hashAndAdd_(rowEl));
    this.batch_ = [];
    this.batchTimeout_ = null;

    this.fireOnChange_();
  }

  processAnchors_() {
    // NOTE(gmike, 1-2-2023): Anchor elements are elements that require post-processing.
    // They are not explictly <a> tags.
    console.log(this.anchorElements_);
  }

  fireOnError_(err, message) {
    this.onErrorListeners_.forEach((listener) => listener(err, message));
  }

  fireOnStatus_(message) {
    this.onStatusListeners_.forEach((listener) => listener(message));
  }

  fireOnChange_() {
    this.onChangeListeners_.forEach((listener) => listener());
  }

  fireOnLoading_(loading) {
    this.onLoadingListeners_.forEach((listener) => listener(loading));
  }

  getRowIshThingsFromEl_(targetEl) {
    throw new Error("Not implemented in parent class");
  }

  hashAndAdd_(node) {
    if (!node) {
      return;
    }

    const els = this.getRowIshThingsFromEl_(node);
    if (els) {
      els.forEach((el) => {
        if (!el) {
          return;
        }
        if (this.isElementAnchorElement_(el)) {
          this.addAnchorEl_(el);
        }
        this.handleMaybeNewValue_(this.rowValueProvider_(el));
      });
    }
  }

  addAnchorEl_(el) {
    if (this.anchorTimeout_) {
      window.clearTimeout(this.anchorTimeout_);
      this.anchorTimeout_ = null;
    }
    this.anchorElements_.push(el);
    this.anchorTimeout_ = window.setTimeout(
      this.processAnchors_.bind(this),
      _TCAP_CONFIG.batchWait
    );
  }

  handleMaybeNewValue_(rowValue) {
    if (!rowValue) {
      return;
    }

    const hash = this.getValueHash_(rowValue);
    if (this.hasAddedRowHash_(hash)) {
      if (this.identityColumnIndexes_.length) {
        let index = this.rowHashMap_[hash];
        if (index >= this.values_.length) {
          index = index - this.values_.length;
          this.newValues_[index] = rowValue;
        } else {
          this.values_[index] = rowValue;
        }
      } else {
        // No-op.
      }
    } else {
      this.rowHashMap_[hash] = this.values_.length + this.newValues_.length;
      this.newValues_.push(rowValue);
    }
  }

  hashAndLogValues_(values) {
    if (!values || values.length === 0) {
      return;
    }
    values.forEach((value, i) => {
      const hash = this.getValueHash_(value);
      this.rowHashMap_[hash] = i;
    });
  }

  hasAddedRowHash_(hash) {
    return this.rowHashMap_.hasOwnProperty(hash);
  }

  getValueHash_(value) {
    let valueToFingerprint = value;
    if (this.identityColumnIndexes_ && this.identityColumnIndexes_.length) {
      valueToFingerprint = value.filter((_c, i) =>
        this.identityColumnIndexes_.includes(String(i))
      );
    }
    return btoa(unescape(encodeURIComponent(valueToFingerprint.join("~"))));
  }

  postProcessValues_(values) {
    if (this.postProcessor_) {
      return this.postProcessor_(values);
    }
    return values;
  }

  //// SHEET SYNCING

  isSheetSyncing() {
    return this.sheetSyncing_;
  }

  startSheetSyncing() {
    this.sheetSyncing_ = true;
  }

  stopSheetSyncing() {
    this.sheetSyncing_ = false;
  }
}

class TableMutationSnoop extends MutationSnoop {
  isElementAnchorElement_(el) {
    return el && _tcHasRowSpans(el);
  }

  getRowIshThingsFromEl_(targetEl) {
    // Ignore script and style tags
    if (_tcTagNameCompare(targetEl, ["SCRIPT", "STYLE"])) {
      return null;
    }

    let rowEl = targetEl;
    while (rowEl && rowEl.parentElement !== this.el_) {
      if (_tcTagNameCompare(rowEl, "TR")) {
        return [rowEl];
      }
      rowEl = rowEl.parentElement;
    }

    // NOTE(gmike, 2021-08-26): This was messing up Deon's namestation export.
    if (_tcTagNameCompare(rowEl, "TBODY")) {
      // NOTE(gmike, 2021-04-02): This is happening inexplicably with ebay reviews
      if (window.location.href.includes("ebay")) {
        return null;
      }

      // NOTE(gmike, 2022-12-02): PraticeFusion. Also, it's not clear when
      // this should actually return rowEl and not just null.
      if (window.location.href.includes("practicefusion.com")) {
        return null;
      }

      // NOTE(gmike, 2023-4-09): This is happening with this page:
      // https://www.trustnet.com/fund/price-performance/t/investment-trusts
      if (targetEl && "#text" === targetEl.nodeName) {
        return null;
      }

      // The idea here is that we'll return all of the rows if the TBODY itself
      // is not acting as a row.
      const parent = rowEl.parentElement;
      if (_tcTagNameCompare(parent, "TABLE")) {
        const bodies = Array.from(parent.querySelectorAll("tbody"));
        if (bodies.length === 1) {
          const trRows = Array.from(rowEl.querySelectorAll("tr"));
          if (trRows.length !== 0) {
            return trRows;
          }
        }
      }
    }

    return [rowEl];
  }

  hasAlternateXPath_() {
    return (
      this.pathToEl_ &&
      this.pathToEl_.includes("table") &&
      this.pathToEl_ !== _TCAP_DEFAULT_TABLE_XPATH
    );
  }
}

class ArbMutationSnoop extends MutationSnoop {
  isElementAnchorElement_(el) {
    return false;
  }

  getRowIshThingsFromEl_(targetEl) {
    let rowEl = targetEl;
    while (rowEl && rowEl.parentElement !== this.el_) {
      rowEl = rowEl.parentElement;
    }
    return [rowEl];
  }

  getValueHash_(preAlignedValue) {
    // preAlignedValue may be just an array of vals for recipes.
    let vals = preAlignedValue;
    if (vals.length && typeof vals[0] === "object") {
      vals = vals.map((v) => v.val);
    }

    let valueToFingerprint = vals;
    if (this.identityColumnIndexes_ && this.identityColumnIndexes_.length) {
      valueToFingerprint = vals.filter((_c, i) =>
        this.identityColumnIndexes_.includes(String(i))
      );
    }

    return btoa(unescape(encodeURIComponent(valueToFingerprint.join("~"))));
  }

  hasAlternateXPath_() {
    return false;
  }
}
