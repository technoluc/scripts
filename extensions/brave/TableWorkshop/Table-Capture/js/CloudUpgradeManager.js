class CloudUpgradeManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.browserEnv_ = new BrowserEnv();
    this.authWrapper_ = new AuthWrapper();
    this.api_ = new GMikeAPI();
    this.token_ = null;

    this.init_();
  }

  init_() {
    document
      .querySelector(".btn-get-started")
      .addEventListener("click", this.handleFlowStart_.bind(this));
    document
      .querySelector(".refresh-page-button")
      .addEventListener("click", () => {
        window.location.href = "/account.html";
      });
  }

  handleFlowStart_() {
    this.setLoading_(true);
    this.authWrapper_
      .requestPerms()
      .then(() => this.authWrapper_.getGoogleToken())
      .then(({ token }) => {
        this.setTokens_(token, undefined);
        return this.api_.getUserEmailWithToken(token);
      })
      .then((user) => {
        if (user) {
          this.setUser_(user);
          return this.api_.getCloudLicensesWithToken(this.token_);
        }
        throw new Error("Unable to sign in.");
      })
      .then((rawCloudLicenseResponse) =>
        this.api_.processCloudLicenseResponse(rawCloudLicenseResponse)
      )
      .then((cloudLicenseResponse) => {
        const { hasActiveCloudLicense } = cloudLicenseResponse;
        return this.updateCloudActivation_(hasActiveCloudLicense).then(() => {
          if (hasActiveCloudLicense) {
            window.location.href = "/account.html";
          } else {
            window.open(
              _TCAP_CONFIG.cloudLicensePurchaseUrl +
                `?email=${this.user_.email}&tk=${this.token_}`
            );
            this.displayTrialStartedLink_();
          }
        });
      })
      .catch((err) => this.handleError_(err))
      .finally(() => {
        this.setLoading_(false);
      });
  }

  displayTrialStartedLink_() {
    document.querySelector(".trial-started").classList.remove("hidden");
  }

  updateCloudActivation_(active) {
    return Promise.resolve();
  }

  setLoading_(loading) {
    const button = document.querySelector(".btn-get-started");
    button.disabled = loading;
  }

  setTokens_(token, refreshToken) {
    this.token_ = token;
    this.browserEnv_
      .getSyncStorageApi()
      .setP({
        googleAuthToken: token,
        googleAuthRefreshToken: refreshToken,
      })
      .catch((err) => this.handleError_(err));
  }

  setUser_(user) {
    this.user_ = user;
    this.browserEnv_
      .getSyncStorageApi()
      .setP({
        user,
      })
      .catch((err) => this.handleError_(err));
  }

  //// ALERTS AND ERRORS

  createAlert_(message) {
    const alert = document.createElement("div");
    alert.innerHTML = `<span class="tc-alert-message">${message}</span><div class="additional-info hidden"></div>`;
    alert.addEventListener("click", () => {
      alert.classList.add("hidden");
    });

    return alert;
  }

  handleError_(err, message = "") {
    if (err && err.message) {
      message = err.message;
    } else if (typeof err === "string") {
      message = err;
    } else if (typeof err === "object" && err.err) {
      message = err.err;
    }
    this.displayAlert_(message, true);
  }

  displayAlert_(message, isError = false) {
    const alert = this.createAlert_(message);
    alert.className = "alert";
    alert.classList.add(isError ? "alert-danger" : "alert-warning");

    const errorWrapper = document.querySelector(".global-errors");
    errorWrapper.appendChild(alert);
  }
}
