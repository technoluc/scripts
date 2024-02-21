class WorkshopFrame {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.el_ = null;
    this.callbacks_ = {};

    window.addEventListener("resize", this.sizeQueen_.bind(this));
  }

  bindToEvent(event, cb) {
    if (!this.callbacks_[event]) {
      this.callbacks_[event] = [];
    }
    this.callbacks_[event].push(cb);
  }

  render() {
    const icon = chrome.extension.getURL("/") + "images/icon.png";

    let el = document.createElement("tc-workshop");
    if (document.querySelector("tc-workshop")) {
      el = document.querySelector("tc-workshop");
      el.classList.remove("dead");
    }

    el.innerHTML = `
      <div class="_tc-frame-inner">

        <!-- MODALS -->
        <div class="_tc-modal-container"></div>

        <!-- SIZE QUEEN -->
        <div class="size-queen too-small-window-message">
          This window is too small. Try making it bigger to use Table Capture.
          <div class="_tc-remove-sq">×</div>
        </div>
        <div class="size-queen too-small-frame-message">This frame is too small. <a>Click here</a> to maximize it to continue using Table Capture.</div>

        <div class="_tc-header">
          <div class="_tc-brand">
            <div class="_tc-logo-wrapper">
              <img src="${icon}" />
            </div>
            <div class="frame-title">
              <span class="frame-title-context"></span>
              <div class="lds-heart tc-hidden">
                <div></div>
              </div>
            </div>
          </div>
          <div class="_tc-actions">
            <div class="pro-cta not-tc-pro tc-hidden">
              <span>Upgrade to <span class="_tc-strong">Pro</span></span>
            </div>
          </div>
        </div>
        <div class="_tc-content"></div>
      </div>
    `;

    const dockPos = this.getDockPosition_();
    const topDocked = dockPos === "top";
    const hintPlacement = topDocked ? "hint--bottom-left" : "hint--top-left";

    const actionWrapper = el.querySelector("._tc-actions");
    this.getActions_().forEach((def) => {
      if (def.hidden) {
        return;
      }

      const action = document.createElement("div");
      action.className = `_tc-action _tc-action-${def.key} ${hintPlacement}`;
      action.setAttribute("aria-label", def.tooltip);
      action.innerHTML = `<span>${def.char}</span>`;
      action.addEventListener("click", def.handler);
      // NOTE(gmike, 2-10-2023): Disable frame tooltips in favor of the Hint ones.
      // action.addEventListener('mouseenter', this.fireFrameActionMouseOver_.bind(this, def.tooltip));
      // action.addEventListener('mouseleave', this.fireFrameActionMouseExit_.bind(this));

      actionWrapper.appendChild(action);
    });

    document.body.appendChild(el);
    this.el_ = el;

    this.el_
      .querySelector("._tc-remove-sq")
      .addEventListener("click", this.handleRemove_.bind(this));

    this.el_
      .querySelector("._tc-logo-wrapper")
      .addEventListener(
        "click",
        this.fireEvent_.bind(this, WorkshopEvent.SEARCH)
      );

    this.el_.querySelector(".pro-cta").addEventListener("click", () => {
      window.open(chrome.extension.getURL("/upgrade.html?ref=bwokeshop"));
    });
    Array.from(this.el_.querySelectorAll(".size-queen a")).forEach((a) =>
      a.addEventListener("click", this.triggerFrameExpansion_.bind(this))
    );

    if (topDocked) {
      this.dockTop();
    } else {
      this.dockBottom();
    }

    const maxMin = this.getDockMaxMin_();
    if (maxMin === "min") {
      this.minimize();
    } else {
      this.maximize();
    }

    this.sizeQueen_();
    this.iframeCheck_();

    return el.querySelector("._tc-content");
  }

  renderSuccess(message) {
    this.setTooltip(message);
    this.el_.classList.add("success");
    window.setTimeout(() => {
      this.el_.classList.remove("success");
      this.setTooltip("");
    }, 2 * 1000);
  }

  renderStatus(message) {
    this.setTooltip(message);
    this.el_.classList.add("statusy");
    window.setTimeout(() => {
      this.el_.classList.remove("statusy");
      this.setTooltip("");
    }, 5 * 1000);
  }

  renderError(message) {
    this.setTooltip(message);
    this.el_.classList.add("erroring");
    window.setTimeout(() => {
      this.el_.classList.remove("erroring");
      this.setTooltip("");
    }, 5 * 1000);
  }

  renderIFrameHint_() {
    const src = window.location.href;
    const message = `Table Capture is operating within an iFrame. You may need to scroll to the bottom to see the workshop.`;
    const hint = document.createElement("tc-iframe-hint");
    hint.innerHTML = `<div>
      <span>
        ${message}
        You can also try <a target="_blank" href="${src}">opening the frame</a> in its own tab and trying again.
      </span>
    </div>`;
    hint.addEventListener("click", () => {
      hint.remove();
    });
    document.body.appendChild(hint);
  }

  upgradeJingle() {
    const cta = this.el_.querySelector(".pro-cta");
    cta.classList.add("jingle");
    window.setTimeout(() => {
      cta.classList.remove("jingle");
    }, 2 * 1000);
  }

  setTooltip(text) {
    this.el_.querySelector(".frame-title-context").innerHTML = text;
  }

  setLoading(loading) {
    this.el_
      .querySelector(".lds-heart")
      .classList.toggle("tc-hidden", !loading);
    this.el_.classList.toggle("tc-loading", loading);
  }

  dockTop() {
    this.el_.classList.remove("dock-bottom");
    this.el_.classList.remove("dock-full");
    this.el_.classList.add("dock-top");

    this.setDockPosition_("top");
  }

  dockBottom() {
    this.el_.classList.add("dock-bottom");
    this.el_.classList.remove("dock-full");
    this.el_.classList.remove("dock-top");

    this.setDockPosition_("bottom");
  }

  goFull() {
    this.el_.classList.remove("dock-bottom");
    this.el_.classList.remove("dock-top");
    this.el_.classList.add("dock-full");
  }

  isMinimized() {
    return this.el_ && this.el_.classList.contains("minimized");
  }

  minimize() {
    this.el_.classList.add("minimized");
    this.el_.classList.remove("maximized");

    this.setDockMaxMin_("min");
  }

  maximize() {
    this.el_.classList.remove("minimized");
    this.el_.classList.add("maximized");

    this.setDockMaxMin_("max");
  }

  remove() {
    this.el_.classList.add("dead");
    this.setDockMaxMin_("max");
  }

  //// LAZY STATE MEM

  getDockMaxMin_() {
    const key = this.getDockMaxMinKey_();
    return window.localStorage[key] || "max";
  }

  setDockMaxMin_(maxMin) {
    const key = this.getDockMaxMinKey_();
    window.localStorage[key] = maxMin;
  }

  getDockMaxMinKey_() {
    let key = window.location.hostname.replace(/\./g, "_");
    return "_tc-workshop-dock-maxmin-" + key;
  }

  isDockedTop() {
    return this.getDockPosition_() === "top";
  }

  getDockPosition_() {
    const key = this.getDockPositionKey_();
    return window.localStorage[key] || "bottom";
  }

  setDockPosition_(pos) {
    const key = this.getDockPositionKey_();
    window.localStorage[key] = pos;
  }

  getDockPositionKey_() {
    let key = window.location.hostname.replace(/\./g, "_");
    return "_tc-workshop-dock-pos-" + key;
  }

  //// MODALS

  addModal(id, modal) {
    // TODO(gmike): Consider using the ID to not rerender every time.
    const container = document.querySelector(
      "tc-workshop ._tc-modal-container"
    );
    container.innerHTML = "";
    container.appendChild(modal);
  }

  showModal() {
    const el = document.querySelector("tc-workshop ._tc-modal-container");
    el.classList.add("_tc-modal-shown");
    window.setTimeout(() => {
      el.classList.add("_tc-modal-notinvisible");
    }, 100);
  }

  hideModal() {
    const el = document.querySelector("tc-workshop ._tc-modal-container");
    el.classList.remove("_tc-modal-notinvisible");
    window.setTimeout(() => {
      el.classList.remove("_tc-modal-shown");
    }, 150);
  }

  handleModalError_(err, message) {
    const detailedMessage =
      err && err.message
        ? err.message
        : typeof err === "string"
        ? err
        : "Unknown error";

    const el = document.querySelector("tc-workshop ._tc-modal-error-wrapper");
    el.innerHTML = `<div class="_tc-modal-error">
      <div>${message}</div>
      <div>${detailedMessage}</div>
    </div>`;
    el.addEventListener("click", () => {
      el.innerHTML = "";
    });
  }

  ////

  fireEvent_(event) {
    if (this.callbacks_[event]) {
      this.callbacks_[event].forEach((cb) => cb());
    }
  }

  fireFrameActionMouseOver_(tooltip) {
    (this.callbacks_[WorkshopEvent.TOOLTIP_SHOW] || []).forEach((cb) =>
      cb(tooltip)
    );
  }

  fireFrameActionMouseExit_() {
    (this.callbacks_[WorkshopEvent.TOOLTIP_CLEAR] || []).forEach((cb) => cb());
  }

  handleTopDock_() {
    this.dockTop();
    Array.from(
      document.querySelectorAll("tc-workshop ._tc-header .hint--top-left")
    ).forEach((el) => {
      el.classList.remove("hint--top-left");
      el.classList.add("hint--bottom-left");
    });
  }

  handleBottomDock_() {
    this.dockBottom();
    // Swap positioning of tooltips.
    Array.from(
      document.querySelectorAll("tc-workshop ._tc-header .hint--bottom-left")
    ).forEach((el) => {
      el.classList.remove("hint--bottom-left");
      el.classList.add("hint--top-left");
    });
  }

  handleBeta_() {
    this.fireEvent_(WorkshopEvent.BETA);
  }

  handleMaximize_() {
    this.fireEvent_(WorkshopEvent.MAXIMIZE);
    this.maximize();
  }

  handleMinimize_() {
    this.fireEvent_(WorkshopEvent.MINIMIZE);
    this.minimize();
  }

  handleClear_() {
    this.fireEvent_(WorkshopEvent.CLEAR);
  }

  handleRemove_() {
    this.fireEvent_(WorkshopEvent.REMOVE);
    this.remove();
  }

  handleSupport_() {
    const data = {
      url: window.location.href,
      pro: this.userConfig_.paidPro,
      licenseCode:
        this.userConfig_.licenseCode || this.userConfig_.cloudLicenseCode,
    };

    let url = _TCAP_CONFIG.reportPageUrl;
    url = url.replace("$DATA", btoa(JSON.stringify(data)));
    window.open(url);
  }

  triggerFrameExpansion_() {
    this.fireEvent_(WorkshopEvent.FRAME_EXPAND);
  }

  isTooFuckingSmall_() {
    return window.innerHeight < 500 || window.innerWidth < 768;
  }

  iframeCheck_() {
    if (window !== top) {
      window.setTimeout(() => {
        let bound = this.el_.getBoundingClientRect();
        let winHeight = window.outerHeight;
        if (bound.bottom > winHeight * 2) {
          this.renderIFrameHint_();
        }
      }, 500);
    }
  }

  sizeQueen_() {
    const topWindow = window == top;
    const tooSmall = this.isTooFuckingSmall_();

    this.el_.classList.toggle("too-small-window", topWindow && tooSmall);
    this.el_.classList.toggle("too-small-frame", !topWindow && tooSmall);
  }

  getActions_() {
    const actions = [
      {
        title: "Support",
        key: "bugreport",
        handler: this.handleSupport_.bind(this),
        char: "?",
        tooltip: chrome.i18n.getMessage("workshopFrameSupportTooltip"),
      },
      {
        title: "Beta",
        key: "beta",
        handler: this.handleBeta_.bind(this),
        char: "✲",
        tooltip: chrome.i18n.getMessage("workshopFrameBetaTooltip"),
        hidden: !this.userConfig_.showDeveloperOptions,
      },
      {
        title: "Clear",
        key: "clear",
        handler: this.handleClear_.bind(this),
        char: "⌫",
        tooltip: chrome.i18n.getMessage("workshopFrameClearTooltip"),
      },
      {
        title: "Dock Top",
        key: "topdock",
        handler: this.handleTopDock_.bind(this),
        char: "↑",
        tooltip: chrome.i18n.getMessage("workshopFrameTopDockTooltip"),
      },
      {
        title: "Dock Bottom",
        key: "bottomdock",
        handler: this.handleBottomDock_.bind(this),
        char: "↓",
        tooltip: chrome.i18n.getMessage("workshopFrameBottomDockTooltip"),
      },
      {
        title: "Minimize",
        key: "minimize",
        handler: this.handleMinimize_.bind(this),
        char: "_",
        tooltip: chrome.i18n.getMessage("workshopFrameMinimizeTooltip"),
      },
      {
        title: "Maximize",
        key: "maximize",
        handler: this.handleMaximize_.bind(this),
        char: "☐",
        tooltip: chrome.i18n.getMessage("workshopFrameMaximizeTooltip"),
      },
      {
        title: "Remove",
        key: "remove",
        handler: this.handleRemove_.bind(this),
        char: "×",
        tooltip: chrome.i18n.getMessage("workshopFrameRemoveTooltip"),
      },
    ];
    return actions;
  }
}
