function _tcRenderListenerStatus(key, status, text) {
  const loadingIcon = `<div class="lds-ripple w24"><div></div><div></div></div>`;
  const successIcon = `<div class="lds-ripple w24 success"><div></div><div></div></div>`;

  const getIcon = (status, loadingIcon) => {
    if (status === "loading") {
      return loadingIcon;
    }
    if (status === "success") {
      return successIcon;
    }
    if (status === "error") {
      return "✗";
    }
    return "";
  };
  const wrapper = document.createElement("div");
  wrapper.classList.add("_tc-robot-status");
  wrapper.classList.add(`_tc-robot-status-${key}`);
  wrapper.innerHTML = `
    <div class="_tc-icon-wrapper">${getIcon(status, loadingIcon)}</div>
    <div class="_tc-status-text">${text}</div>
  `;

  const onUpdateStatus = (status, text) => {
    wrapper.querySelector("._tc-icon-wrapper").innerHTML = getIcon(
      status,
      loadingIcon
    );
    wrapper.querySelector("._tc-status-text").innerHTML = text;
  };
  return { wrapper, onUpdateStatus };
}

////

class Robot {
  constructor(userConfig, frame, workshopDataManager) {
    this.userConfig_ = userConfig;
    this.frame_ = frame;
    this.workshopDataManager_ = workshopDataManager;

    this.updateMutationListenStatus_ = null;
    this.updateNavListenStatus_ = null;
    this.updateNextPageElementListenStatus_ = null;

    this.snoop_ = null;
    this.dataHandlers_ = [];
    this.dynamicPagingListener_ = null;

    this.autoScroller_ = new AutoScroller();

    // TODO(gmike): Move this into messages.json
    this.strings_ = {
      heading: "Paged &amp; Dynamic Tables",
      autoPageTooltip: `Once enabled, Table Capture will keep track of the button you press to advace to the next page.`,
      autoPageOnStatus: "Auto-Paging On",
      autoPageBegin: "Begin Auto-Paging",
      autoScrollOnStatus: "Auto-Scrolling On",
      autoScrollBegin: "Begin Auto-Scrolling",
      on: "On",
      beginCapture: "Begin Capture",
    };
  }

  addNewDataHandler(handler) {
    this.dataHandlers_.push(handler);
  }

  render(wrapper) {
    this.wrapper_ = wrapper;

    // Renders a toggle
    const renderToggle = (prefix) => {
      return `
        <div class="_tc-switch-wrapper ${prefix}-switch-wrapper">
          <label class="_tc-switch">
            <input type="checkbox" class="${prefix}-checkbox" />
            <span class="tc-slider"></span>
          </label>
          <span class="tc-slider-label"></span>
        </div>
      `;
    };

    const {
      wrapper: mutationListenStatus,
      onUpdateStatus: updateMutationListenStatus,
    } = _tcRenderListenerStatus(
      "mutation",
      "loading",
      "Listening for table changes"
    );
    this.updateMutationListenStatus_ = updateMutationListenStatus;

    const { wrapper: navListenStatus, onUpdateStatus: updateNavListenStatus } =
      _tcRenderListenerStatus("nav", "loading", "Waiting for page navigation");
    this.updateNavListenStatus_ = updateNavListenStatus;

    const {
      wrapper: nextPageElementListenStatus,
      onUpdateStatus: updateNextPageElementListenStatus,
    } = _tcRenderListenerStatus(
      "nav",
      "loading",
      "Waiting for next page button click"
    );
    this.updateNextPageElementListenStatus_ = updateNextPageElementListenStatus;

    this.wrapper_.innerHTML = `
      <div class="_tc-heading">
        ${this.strings_.heading}
      </div>
      ${renderToggle("_tc-listen")}
      <div class="_tc-statuses _tc-listen-statuses tc-hidden"></div>
      ${renderToggle("_tc-autopage")}
      <div class="_tc-statuses _tc-autopage-statuses tc-hidden"></div>
      ${renderToggle("_tc-autoscroll")}
    `;

    this.wrapper_
      .querySelector("._tc-listen-statuses")
      .appendChild(mutationListenStatus);
    this.wrapper_
      .querySelector("._tc-listen-statuses")
      .appendChild(navListenStatus);
    this.wrapper_
      .querySelector("._tc-autopage-statuses")
      .appendChild(nextPageElementListenStatus);

    this.bindToggleEvents_();
    this.updateToggleVisibility_();
    this.updateSwitchLabels_();
  }

  getToggles_() {
    return {
      listenStatusWrapper: this.wrapper_.querySelector("._tc-listen-statuses"),
      autoPageStatusWrapper: this.wrapper_.querySelector(
        "._tc-autopage-statuses"
      ),
      listenToggle: {
        wrapper: this.wrapper_.querySelector("._tc-listen-switch-wrapper"),
        label: this.wrapper_.querySelector(
          "._tc-listen-switch-wrapper .tc-slider-label"
        ),
        checkbox: this.wrapper_.querySelector("._tc-listen-checkbox"),
      },
      autoPageToggle: {
        wrapper: this.wrapper_.querySelector("._tc-autopage-switch-wrapper"),
        label: this.wrapper_.querySelector(
          "._tc-autopage-switch-wrapper .tc-slider-label"
        ),
        checkbox: this.wrapper_.querySelector("._tc-autopage-checkbox"),
      },
      autoScrollToggle: {
        wrapper: this.wrapper_.querySelector("._tc-autoscroll-switch-wrapper"),
        label: this.wrapper_.querySelector(
          "._tc-autoscroll-switch-wrapper .tc-slider-label"
        ),
        checkbox: this.wrapper_.querySelector("._tc-autoscroll-checkbox"),
      },
    };
  }

  bindToggleEvents_() {
    const { listenToggle, autoPageToggle, autoScrollToggle } =
      this.getToggles_();
    listenToggle.label.addEventListener("click", () => {
      listenToggle.checkbox.checked = !listenToggle.checkbox.checked;
      this.handleListenToggle_();
    });
    listenToggle.checkbox.addEventListener(
      "change",
      this.handleListenToggle_.bind(this)
    );
    autoPageToggle.label.addEventListener("click", () => {
      autoPageToggle.checkbox.checked = !autoPageToggle.checkbox.checked;
      this.handleAutoPageToggle_();
    });
    autoPageToggle.checkbox.addEventListener(
      "click",
      this.handleAutoPageToggle_.bind(this)
    );
    autoScrollToggle.label.addEventListener("click", () => {
      autoScrollToggle.checkbox.checked = !autoScrollToggle.checkbox.checked;
      this.handleAutoScrollToggle_();
    });
    autoScrollToggle.checkbox.addEventListener(
      "click",
      this.handleAutoScrollToggle_.bind(this)
    );
  }

  handleAutoScrollToggle_() {
    const { autoScrollToggle } = this.getToggles_();

    if (autoScrollToggle.checkbox.checked) {
      const domElement = this.workshopDataManager_
        .getElementWrapper()
        .getDomElement();
      this.autoScroller_.setElementIfNotSet(domElement);
      this.autoScroller_.startScrolling();
    } else {
      this.autoScroller_.stopScrolling();
    }

    this.updateToggleVisibility_();
    this.updateSwitchLabels_();
  }

  handleAutoPageToggle_() {
    /*
    // Dynamic 
    this.dynamicPagingListener_ = new AutoPager();
    this.dynamicPagingListener_.setAutoPagingWarningHandler((err, errorCode) => {
      this.handleDynPagerMissing_(err, errorCode, "WARNING");
    });
    
    if (this.elementWrapper_ && this.elementWrapper_.isRecipeWrapper() && this.elementWrapper_.hasNextPageSelector()) {
      this.dynamicPagingListener_.useRecipeNextPageSelector(this.elementWrapper_.getNextPageSelector());
    } else {
      this.dynamicPagingListener_.beginListeningForAdvance();
    }
    */

    this.updateToggleVisibility_();
    this.updateSwitchLabels_();
  }

  handleListenToggle_() {
    const listening = this.isListenToggleOn_();
    if (listening) {
      this.beginListening_();
    } else {
      this.stopListening_();
    }

    this.updateToggleVisibility_();
    this.updateSwitchLabels_();
  }

  isListenToggleOn_() {
    return this.getToggleState_().listening;
  }

  isAutoPageToggleOn_() {
    return this.getToggleState_().autoPaging;
  }

  getToggleState_() {
    const { listenToggle, autoPageToggle, autoScrollToggle } =
      this.getToggles_();
    return {
      listening: listenToggle.checkbox.checked,
      autoPaging: autoPageToggle.checkbox.checked,
      autoScrolling: autoScrollToggle.checkbox.checked,
    };
  }

  beginListening_() {
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
    this.snoop_.bindToStatus((message) => {
      this.frame_.renderStatus(message);
    });
    this.snoop_.bindToLoading((loading) => {
      this.frame_.setLoading(loading);
    });
    this.handleMutationChanges_();
  }

  handleMutationChanges_() {
    if (!this.snoop_) {
      return;
    }

    const previousRowCount = this.workshopDataManager_.getRowCount();
    const dataArray = this.snoop_.getValues() || [];
    const rows = dataArray.length;
    const rowDelta = rows - previousRowCount;
    const cols = _tcSmartColCount(dataArray);

    if (rowDelta) {
      this.updateMutationListenStatus_("success", "Table changes detected");
    }

    this.handleDataChanges_({ dataArray, rows, cols, rowDelta });
  }

  stopListening_() {
    if (
      this.dynamicPagingListener_ &&
      this.dynamicPagingListener_.isAutoPagingOrListening()
    ) {
      this.dynamicPagingListener_.turnAutoPagingOff();
    }
    this.dynamicPagingListener_ = null;
  }

  updateToggleVisibility_() {
    const {
      autoPageToggle,
      autoScrollToggle,
      listenStatusWrapper,
      autoPageStatusWrapper,
    } = this.getToggles_();

    const { listening, autoPaging } = this.getToggleState_();
    autoPageToggle.wrapper.classList.toggle("tc-hidden", !listening);
    autoScrollToggle.wrapper.classList.toggle("tc-hidden", !listening);
    listenStatusWrapper.classList.toggle("tc-hidden", !listening);
    autoPageStatusWrapper.classList.toggle(
      "tc-hidden",
      !listening || !autoPaging
    );
  }

  updateSwitchLabels_() {
    const { listenToggle, autoPageToggle, autoScrollToggle } =
      this.getToggles_();

    const { listening, autoPaging, autoScrolling } = this.getToggleState_();
    listenToggle.label.innerText = listening
      ? this.strings_.on
      : this.strings_.beginCapture;
    autoPageToggle.label.innerHTML =
      listening && autoPaging
        ? this.strings_.autoPageOnStatus
        : this.strings_.autoPageBegin;
    autoScrollToggle.label.innerText =
      listening && autoScrolling
        ? this.strings_.autoScrollOnStatus
        : this.strings_.autoScrollBegin;
  }

  handleDataChanges_({ dataArray, rows, cols, rowDelta }) {
    this.dataHandlers_.forEach((handler) =>
      handler({ dataArray, rows, cols, rowDelta })
    );

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

    if (this.snoop_ && this.snoop_.isSheetSyncing()) {
      // TODO(gmike): Port this over.
    }
  }

  handleActionError_(err, message, errorType = "ERROR") {
    console.log(`Robot::handleActionError_ - ${message}`, err);
    message = _tcGetMessageFromError(err, message);
    if (errorType === "ERROR") {
      this.frame_.renderError(message);
    } else if (errorType === "WARNING") {
      _tcPageToast(message, "warning");
    }
  }
}
