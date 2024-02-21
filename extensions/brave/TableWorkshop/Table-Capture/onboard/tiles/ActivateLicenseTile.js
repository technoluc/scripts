class ActivateLicenseTile extends Tile {
  constructor(state, { licenseCode }, onEscape) {
    super();
    this.hasExistingLicense_ = false;
    this.licenseActivationSkipped_ = false;
    this.onEscape_ = onEscape;
    this.licensePurchaseUrl_ = isUserInChina()
      ? _TCAP_CONFIG.licensePurchaseUrlStripeChina
      : _TCAP_CONFIG.licensePurchaseUrl + "&ref=onboard-activate-tile";

    this.paymentsManager_ = new GMikePaymentsManager(
      new OptionsManager(),
      licenseCode,
      this.handleError_.bind(this)
    );
    this.bindFromState_(state);
  }

  getData() {
    return {
      existingLicense: this.hasExistingLicense_,
      activationSkipped: this.licenseActivationSkipped_,
      triangles: true,
      pageTitle: "License Activation",
    };
  }

  getType() {
    return SlideTypes.ACTIVATE_LICENSE;
  }

  bindFromState_(state) {
    this.hasExistingLicense_ = state.existingLicense || false;
    this.licenseActivationSkipped_ = state.activationSkipped || false;
  }

  display(state) {
    this.bindFromState_(state);
    this.bindPageToTileState_(state);

    if (!state.plan) {
      this.hasExistingLicense_ = true;
    }

    const slideType = this.getType();
    const existingSlide = document.querySelector(`.${slideType}`);
    if (existingSlide) {
      existingSlide.classList.remove("not-shown");
      existingSlide.classList.add("shown");
      return;
    }

    const hasTrial = !isUserInChina();

    const title = this.hasExistingLicense_
      ? "Use your existing license"
      : hasTrial
      ? "Start your trial"
      : "License Activation";
    const subtitle = this.hasExistingLicense_
      ? `Reactivate Table Capture Pro below.`
      : hasTrial
      ? `In a few seconds (<span class="countdown")>5</span>), a new tab will open where you can start your Table Capture Pro trial.`
      : `In a few seconds (<span class="countdown")>5</span>), a new tab will open where you can purchase your Table Capture Pro license.`;

    const disableButtonInitially = !this.hasExistingLicense_;
    const buttonInner = this.hasExistingLicense_
      ? "Activate"
      : `Opening purchase page in <span class="countdown")>5</span>`;

    const slide = document.createElement("div");
    slide.className = `slide padded-slide ${slideType}`;
    slide.innerHTML = `
        <div class="big-text">${title}</div>
        <form class="activation-form">
          <div class="form-preface">${subtitle}</div>
          <div class="form-preface">
            To find your license code, check your inbox (and spam folder) for emails from: g@georgemike.com
          </div>

          <div class="form-heading">Activate your license</div>
          <div class="form-group form-group-lg">
            <input
                type="text"
                id="activation"
                name="activation"
                maxlength="12"
                class="form-control input-lg text-activation"
                placeholder="Paste in your license code here" />
          </div>
          <div class="form-bottom-actions">
            <button type="button" class="btn btn-success btn-lg btn-text-activation">${buttonInner}</button>
            <a class="escape-license-activation">Skip</a>
          </div>
          <div class="error-wrapper"></div>
        </form>
        <div class="scroll-anchor">Love you guys.</div>
    `;

    slide
      .querySelector(".escape-license-activation")
      .addEventListener("click", this.handleEscape_.bind(this));

    const button = slide.querySelector(".btn-text-activation");
    button.addEventListener("click", this.handleLicenseActivation_.bind(this));
    button.disabled = disableButtonInitially;

    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
    }, 250);

    if (this.hasExistingLicense_) {
    } else {
      this.startCountdown_();
    }
  }

  handleEnableActivateButton_() {
    const activateButton = document.querySelector("button.btn-text-activation");
    activateButton.disabled = false;
    activateButton.innerText = "Activate";
  }

  startCountdown_() {
    const countdownEls = Array.from(
      document.querySelectorAll("span.countdown")
    );

    let time = 5;
    let intervalId = window.setInterval(() => {
      if (intervalId && time === 0) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      countdownEls.forEach((el) => {
        el.innerText = time;
      });
      time--;
    }, 1000);
    let timeoutId = window.setTimeout(() => {
      timeoutId = null;
      window.open(this.licensePurchaseUrl_);
      this.handleEnableActivateButton_();
    }, (time + 1) * 1000);

    countdownEls.forEach((el) => {
      el.addEventListener("click", () => {
        this.handleEnableActivateButton_();

        if (intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
          countdownEls.forEach((el) => (el.innerText = "..."));
        }
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    });
  }

  handleEscape_() {
    this.licenseActivationSkipped_ = true;
    this.onEscape_();
  }

  handleLicenseActivation_() {
    const licenseCode = document.querySelector(".text-activation").value.trim();
    if (!licenseCode) {
      return this.handleError_(new Error("Please enter a license code."));
    }
    if (licenseCode.length !== 12) {
      return this.handleError_(
        new Error("Please provide a valid license code.")
      );
    }

    this.setActivating_(true);
    this.paymentsManager_
      .checkSetLicenseCode(licenseCode)
      .then(() => {
        window.location.href = "/options.html?onboarded=activated&upgraded=pro";
      })
      .catch((err) => this.handleError_(err))
      .finally(() => {
        this.setActivating_(false);
        this.licenseActivationSkipped_ = false;
      });
  }

  setActivating_(activating) {
    const button = document.querySelector("form.activation-form input.btn");
    if (!button) {
      return;
    }
    button.disabled = activating;
    button.value = activating ? "Activating..." : "Activate";
  }

  handleError_(error, message = null) {
    const el = document.createElement("div");
    el.className = "alert alert-danger";
    el.innerText = message || error.message;

    const errorWrapper = document.querySelector(".error-wrapper");
    errorWrapper.appendChild(el);

    el.addEventListener("click", () => {
      el.remove();
    });
  }
}
