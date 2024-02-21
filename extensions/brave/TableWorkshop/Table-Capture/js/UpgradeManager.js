class UpgradeManager {
  constructor(optionsManager, { licenseCode, paidCloud }) {
    this.browserEnv_ = new BrowserEnv();
    this.optionsManager_ = optionsManager;
    this.licenseCode_ = licenseCode;
    this.paid_ = null;
    this.paidCloud_ = paidCloud;

    this.paymentsManager_ = new GMikePaymentsManager(
      this.optionsManager_,
      this.licenseCode_,
      this.handleError_.bind(this)
    );
  }

  updateTrialVisibility() {
    const hasTrial = !isUserInChina();
    Array.from(document.querySelectorAll(".has-trial")).forEach((el) =>
      el.classList.toggle("hidden", !hasTrial)
    );
    Array.from(document.querySelectorAll(".no-trial")).forEach((el) =>
      el.classList.toggle("hidden", hasTrial)
    );
  }

  scrollToExistingLicenseActivation() {
    this.paymentsManager_.scrollToExistingLicenseActivation();
  }

  checkLicense() {
    return this.paymentsManager_
      .getPurchases()
      .then((activePurchases) => {
        this.paid_ =
          (activePurchases && activePurchases.length) ||
          _TCAP_CONFIG.devPretendPro;
        return this.optionsManager_.setValue("paidPro", this.paid_);
      })
      .then(() =>
        Promise.resolve({
          isPaidPro: this.paid_,
          isPaidCloud: this.paidCloud_,
        })
      );
  }

  checkSetGMikeLicenseCode(code) {
    const paymentsManager = new GMikePaymentsManager(
      this.optionsManager_,
      code,
      this.handleError_.bind(this)
    );
    return paymentsManager.checkSetLicenseCode(code);
  }

  initializeForUpgrade() {
    this.updateTrialVisibility();

    this.paymentsManager_
      .initialize()
      .then(() => {
        const api = new GMikeAPI();
        return api.checkApiAvailability();
      })
      .then((availabilty) => {
        if (!availabilty) {
          this.displayAlert_(
            "FYI: The licensing server appears to be blocked. Please reach out to George: g@georgemike.com"
          );
        }
      })
      .catch((err) => this.handleError_(err, "Upgrade error."));

    Array.from(document.querySelectorAll(".btn-buy")).forEach((el) =>
      el.addEventListener("click", this.handleBuyButtonPress_.bind(this))
    );

    Array.from(document.querySelectorAll(".support-cloud-only")).forEach((el) =>
      el.classList.toggle("hidden", !_TCAP_CONFIG.supportsCloud)
    );

    this.checkLicense()
      .then(({ isPaidPro, isPaidCloud }) => {
        if (isPaidCloud) {
          this.displayAlert_("FYI - You have already upgraded to Cloud.");
        } else if (isPaidPro) {
          this.displayAlert_("FYI - You have already upgraded to Pro.");
        }
      })
      .catch((err) => this.handleError_(err, "Unable to verify license."));
  }

  handleBuyButtonPress_() {
    this.paymentsManager_.handleBuyButton();
  }

  isEdgeBrowser_() {
    return window.navigator.userAgent.toLowerCase().includes("edg");
  }

  //// ALERTS AND ERRORS

  createAlert_(message, reportable, additionalInfo) {
    const alert = document.createElement("div");
    alert.innerHTML = `<span class="tc-alert-message">${message}</span><div class="additional-info hidden"></div>`;

    if (additionalInfo) {
      alert.querySelector(".additional-info").classList.remove("hidden");
      alert.querySelector(".additional-info").innerText = additionalInfo;
    }

    if (reportable) {
      const reportWrapper = document.createElement("div");
      reportWrapper.className = "error-report-wrapper";
      reportWrapper.innerHTML = `
        <hr />
        <a class="btn btn-default btn-report-error">Report the above error</a>
        <a class="btn btn-default close-button">Dismiss</a>
      `;
      reportWrapper
        .querySelector(".close-button")
        .addEventListener("click", () => {
          alert.classList.add("hidden");
        });
      alert.appendChild(reportWrapper);
    } else {
      alert.addEventListener("click", () => {
        alert.classList.add("hidden");
      });
    }

    return alert;
  }

  displayAlert_(message) {
    const alert = this.createAlert_(message);
    alert.className = "alert alert-warning";

    const errorWrapper = document.querySelector(".global-errors");
    errorWrapper.appendChild(alert);
  }

  handleError_(err, defaultMessage) {
    console.log("UpgradeManager - error caught", err, defaultMessage);

    const errrorContext = {
      err,
      defaultMessage,
      ver: _TCAP_CONFIG.versionText,
    };
    if (err && err.stack) {
      errrorContext.errStack = err.stack;
    }

    let prettyMessage = null;
    if (err.message && defaultMessage && err.message !== defaultMessage) {
      prettyMessage = `${defaultMessage} ${err.message}`;
    } else if (err.message) {
      prettyMessage = err.message;
    } else if (defaultMessage) {
      prettyMessage = defaultMessage;
    } else if (err) {
      prettyMessage = err + "";
    } else {
      prettyMessage = "Unknown upgrade error.";
    }

    const reportable = err && err.reportable;
    const helpText = err && err.helpText;
    const errorElement = this.createAlert_(prettyMessage, reportable, helpText);
    errorElement.className = "alert alert-danger";
    if (reportable) {
      errorElement
        .querySelector(".btn-report-error")
        .addEventListener(
          "click",
          this.handleErrorReport_.bind(this, errrorContext)
        );
    }

    const errorWrapper = document.querySelector(".global-errors");
    errorWrapper.appendChild(errorElement);
    errorWrapper.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "start",
    });
  }

  handleErrorReport_(errrorContext) {
    let url = _TCAP_CONFIG.reportErrorUrl;
    url = url.replace("$ERROR", btoa(JSON.stringify(errrorContext)));

    this.browserEnv_.createTab({ url });
  }
}
