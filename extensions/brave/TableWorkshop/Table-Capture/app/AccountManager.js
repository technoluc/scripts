class AccountManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.authWrapper_ = new AuthWrapper();
    this.api_ = new GMikeAPI();
    this.browserEnv_ = new BrowserEnv();
  }

  initializeForAcountPage() {
    this.setLoading_(true);
    this.fetchAccountInfo_()
      .then((accountInfo) => this.render_(accountInfo))
      .catch((err) => this.handleError_(err, "Error fetching account info"))
      .finally(() => {
        this.setLoading_(false);
      });
  }

  setLoading_(loading) {
    if (loading) {
      const wrapper = document.querySelector(".main-account-info-wrapper");
      wrapper.innerHTML = `
        <div class="loading-wrapper">
          <div class="lds-heart"><div></div><div></div></div>
        </div>
      `;
    }
  }

  getSetUserWithToken_(token, existingUser = {}) {
    if (existingUser && existingUser.email) {
      return Promise.resolve(existingUser);
    }

    return this.api_.getUserEmailWithToken(token).then((user) => {
      if (user) {
        return this.browserEnv_
          .getSyncStorageApi()
          .setP({ user })
          .then(() => user);
      }
      return {};
    });
  }

  fetchAccountInfo_() {
    const accountInfo = this.api_.createStubAccountInfo({
      user: this.userConfig_.user,
      authenticated: !!this.userConfig_.user && !!this.userConfig_.user.email,
    });

    const googleAuthToken = this.userConfig_.googleAuthToken;
    if (!googleAuthToken) {
      if (this.userConfig_.paidCloud) {
        this.handleError_({
          message:
            "Please sign in again to verify your Table Capture Cloud license.",
        });
        accountInfo.requiresReauth = true;
      }

      return Promise.resolve(accountInfo);
    }

    return this.getSetUserWithToken_(googleAuthToken, this.userConfig_.user)
      .then((user) => {
        accountInfo.user = user;
        return new Promise((resolve, reject) => {
          this.api_
            .getCloudLicensesWithToken(googleAuthToken)
            .then((rawCloudLicenseResponse) =>
              this.api_.processCloudLicenseResponse(rawCloudLicenseResponse)
            )
            .then((processedCloudLicenseResponse) => {
              resolve({
                ...accountInfo,
                ...processedCloudLicenseResponse,
              });
            })
            .catch((err) => {
              if (err && err.code === 403) {
                err = { message: "Please sign in again." };
                accountInfo.requiresReauth = true;
              }

              this.handleError_(err);
              resolve(accountInfo);
            });
        });
      })
      .then((accountInfo) => {
        this.persistAccountState_(accountInfo);
        return accountInfo;
      });
  }

  retryAuthAndFetchAccountInfo_() {
    this.authWrapper_
      .requestPerms()
      // This has to be called during a user gesture
      .then(() => this.authWrapper_.getGoogleToken())
      .then(({ token }) => {
        this.userConfig_.googleAuthToken = token;
        return this.browserEnv_.getSyncStorageApi().setP({
          googleAuthToken: token,
        });
      })
      .then(() => this.fetchAccountInfo_())
      .then((accountInfo) => this.render_(accountInfo))
      .catch((err) => this.handleError_(err, "Error fetching account info"));
  }

  persistAccountState_(accountInfo) {
    const { hasActiveCloudLicense, cloudAccountMetadata, apiKeys } =
      accountInfo;
    const cloudLicenseCode =
      (cloudAccountMetadata && cloudAccountMetadata.activeLicenseCode) ||
      undefined;
    const paidPro = this.userConfig_.paidPro || hasActiveCloudLicense;
    const gptApiKey = apiKeys && apiKeys.gptApiKey ? apiKeys.gptApiKey : null;
    this.browserEnv_
      .getSyncStorageApi()
      .setP({
        paidCloud: hasActiveCloudLicense,
        cloudLicenseCode,
        paidPro,
        gptApiKey,
      })
      .catch((err) => {
        this.handleError_(err, "Error updating Table Capture Cloud status.");
      });
  }

  renderLicenseTable_(tableWrapper, licenses) {
    if (licenses.length === 0) {
      tableWrapper.innerHTML = `
        <div class="alert alert-warning" role="alert">
          You have no licenses.
        </div>
      `;
      return;
    }

    tableWrapper.innerHTML = `
      <table class="table table-bordered">
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">License Code</th>
            <th scope="col">Status</th>
            <th scope="col">Expires</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

    const tableBody = tableWrapper.querySelector("tbody");
    licenses.forEach((license) => {
      const status = this.api_.getLicenseStatusString(license);

      const productUrl =
        _TCAP_CONFIG.licensePurchaseUrlBase + btoa(license.product);
      const productLink = `<a href="${productUrl}" target="_blank">${license.productName}</a>`;

      const licenseUrl = getTableCaptureLicenseManagementUrl(license);
      const licenseLink = `<a href="${licenseUrl}" target="_blank">${license.code}</a>`;
      const expiration = license.subscriptionProduct
        ? new Date(Number(license.expiration)).toLocaleDateString()
        : "--";

      const row = document.createElement("tr");
      let statusClassname = "";
      if (status === "Active") {
        // row.className = "success";
        statusClassname = "success";
      }
      row.innerHTML = `
          <td>${productLink}</td>
          <td class="mono">${licenseLink}</td>
          <td class="${statusClassname}">${status}</td>
          <td>${expiration}</td>
        </tr>
      `;
      tableBody.appendChild(row);
    });
  }

  render_(accountInfo) {
    const {
      nonTableCaptureLicenses,
      tableCaptureLicenses,
      hasActiveCloudLicense,
      requiresReauth,
    } = accountInfo;

    const licenseType = this.getLicenseSummary_(hasActiveCloudLicense);
    const wrapper = document.querySelector(".main-account-info-wrapper");
    wrapper.innerHTML = `
      <section>
        <div class="heading thin-title">Basic Info</div>
        <div class="pairs">
          <div class="pair">
            <div class="key">Installed:</div>
            <div class="value">${_tcFormatNowDateKey(
              this.userConfig_.installDate
            )}</div>
          </div>
          <div class="pair">
            <div class="key">License:</div>
            <div class="value">${licenseType}</div>
          </div>
          <div class="manage-url hidden">
            <a target="_blank">Manage License Subscription</a>
          </div>
          <div class="not-pro-only hidden">
            <a class="sub-action ugrade-link">Learn about Table Capture Pro</a>
            <a class="sub-action activate-link">Activate an existing license</a>
          </div>
        </div>
      </section>
      <section class="cloud hidden">
        <hr />
        <div class="heading thin-title">Table Capture <span>Cloud</span></div>
        <div class="cloud-info">
          <div class="alert alert-warning">
            <a href="/cloud.html">Learn more</a> about Table Capture Cloud.
          </div>
        </div>
        <div class="cloud-auth-wrapper hidden">
          <div class="btn-get-started">
            <img
              src="/images/google/btn_google_signin_dark_normal_web@2x.png"
            />
          </div>
        </div>
      </section>
      <section class="authed-only tc-licenses-wrapper">
        <hr />
        <div class="heading thin-title">Table Capture Licenses <span class="license-count"></span></div>
        <div class="licenses-wrapper"></div>
      </section>
      <section class="authed-only gm-licenses-wrapper">
        <hr />
        <div class="heading thin-title">Other GeorgeMike.com Licenses <span class="license-count"></span></div>
        <div class="licenses-wrapper"></div>
      </section>
    `;

    if (_TCAP_CONFIG.supportsCloud) {
      wrapper.querySelector("section.cloud").classList.remove("hidden");
      if (requiresReauth) {
        document
          .querySelector(".cloud-auth-wrapper")
          .classList.remove("hidden");
      }
    }

    // Update counts
    wrapper.querySelector(
      ".tc-licenses-wrapper .license-count"
    ).innerHTML = `(${tableCaptureLicenses.length})`;
    wrapper.querySelector(
      ".gm-licenses-wrapper .license-count"
    ).innerHTML = `(${nonTableCaptureLicenses.length})`;

    const tcLicensesWrapper = wrapper.querySelector(
      ".tc-licenses-wrapper .licenses-wrapper"
    );
    this.renderLicenseTable_(tcLicensesWrapper, tableCaptureLicenses);

    const gmLicensesWrapper = wrapper.querySelector(
      ".gm-licenses-wrapper .licenses-wrapper"
    );
    this.renderLicenseTable_(
      gmLicensesWrapper,
      nonTableCaptureLicenses.sort((a, b) => (a.product < b.product ? -1 : 1))
    );

    if (!this.userConfig_.googleAuthToken) {
      Array.from(wrapper.querySelectorAll(".authed-only")).forEach((el) =>
        el.classList.add("hidden")
      );
    }

    if (hasActiveCloudLicense) {
      this.renderCloudInfo_(wrapper, accountInfo);
    } else if (this.userConfig_.paidPro) {
      const manageLinkWrapper = document.querySelector(".manage-url");
      manageLinkWrapper.classList.remove("hidden");
      manageLinkWrapper.querySelector("a").href =
        getTableCaptureLicenseManagementUrl({
          code: this.userConfig_.licenseCode,
          product: "tablecapture",
        });
    } else {
      Array.from(wrapper.querySelectorAll(".not-pro-only")).forEach((el) =>
        el.classList.remove("hidden")
      );
      const url =
        _TCAP_CONFIG.paidOnly && this.userConfig_.requiresPaid
          ? "activate.html"
          : "upgrade.html";
      wrapper.querySelector("a.ugrade-link").href = url;
      wrapper.querySelector("a.activate-link").href = url + "#activate";
    }

    document
      .querySelector(".cloud .btn-get-started")
      .addEventListener("click", this.retryAuthAndFetchAccountInfo_.bind(this));
  }

  renderCloudInfo_(wrapper, accountInfo) {
    const { hasGptEnabled, cloudAccountMetadata, localAccountMetadata } =
      accountInfo;

    const cloudInfoWrapper = wrapper.querySelector(".cloud-info");
    cloudInfoWrapper.innerHTML = `
      <div class="pairs"></div>
      <div class="manage-url">
        <a target="_blank" href="${_TCAP_CONFIG.cloudAccountUrl}">Manage Subscription</a>
      </div>
    `;

    const values = [];
    if (cloudAccountMetadata) {
      const { userEmailAddress } = cloudAccountMetadata;
      values.push({
        key: "Email",
        value: userEmailAddress,
      });
    }

    values.push({
      key: "Magic Columns",
      value: hasGptEnabled ? "Enabled" : "Disabled",
      actionText: "Update",
      actionUrl: _TCAP_CONFIG.cloudMagicColumnsUrl,
    });

    values.push({
      key: "Magic Column Tokens Used",
      value: localAccountMetadata.gptTokensConsumed,
    });

    const pairsWrapper = cloudInfoWrapper.querySelector(".pairs");
    values.forEach((entry) => {
      const clickable = !!entry.actionUrl;

      const { key, value } = entry;
      const pair = document.createElement("div");
      pair.className = "pair";
      pair.innerHTML = `
        <div class="key">${key}:</div>
        <div class="value">${value}</div>
      `;

      if (clickable) {
        pair.classList.add("clickable");
        pair.addEventListener("click", () => {
          window.open(entry.actionUrl, "_blank");
        });
      }

      pairsWrapper.appendChild(pair);
    });
  }

  getLicenseSummary_(hasActiveCloudLicense) {
    if (hasActiveCloudLicense) {
      return "Cloud";
    }

    if (this.userConfig_.paidPro) {
      return "Pro";
    }

    return "Free";
  }

  handleError_(err) {
    const message =
      err && err.message
        ? `Error: ${err.message}`
        : typeof err === "object" && err.err
        ? err.err
        : "We're having trouble right now. Please reach out to George for help.";
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(createAlertPane(message, "danger", true));
  }
}
