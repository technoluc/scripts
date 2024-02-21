class ActivateCloudLicenseTile extends Tile {
  constructor(state, {}, onEscape) {
    super();
    this.cloudActivationSkipped_ = false;
    this.hasExistingLicense_ = false;
    this.onEscape_ = onEscape;
    this.bindFromState_(state);
  }

  getData() {
    return {
      triangles: true,
      cloudActivationSkipped: this.cloudActivationSkipped_,
      pageTitle: "Table Capture Cloud",
    };
  }

  getType() {
    return SlideTypes.ACTIVATE_CLOUD_LICENSE;
  }

  bindFromState_(state) {
    this.cloudActivationSkipped_ = state.cloudActivationSkipped || false;
  }

  display(state) {
    this.bindFromState_(state);
    this.bindPageToTileState_(state);

    const slideType = this.getType();
    const existingSlide = document.querySelector(`.${slideType}`);
    if (existingSlide) {
      existingSlide.classList.remove("not-shown");
      existingSlide.classList.add("shown");
      return;
    }

    // TODO(gmike): Use this when Cloud has one-off purchases.
    // const hasTrial = !isUserInChina();

    const title = this.hasExistingLicense_
      ? "Use your existing license"
      : "Table Capture Cloud";
    const subtitle = this.hasExistingLicense_
      ? `Reactivate Table Capture Cloud below.`
      : `Follow the instructions below to start your trial!`;

    const buttonInner = "I've started my Cloud trial";
    // "http://localhost:8080/iframe/tablecapturecloud/checkout";
    const iframeUrl =
      "https://georgemike.com/iframe/tablecapturecloud/checkout";

    const slide = document.createElement("div");
    slide.className = `slide padded-slide ${slideType}`;
    slide.innerHTML = `
        <div class="big-text">${title}</div>
        <section>
          <div class="form-preface">${subtitle}</div>
          <div class="iframe-wrapper">
            <iframe src="${iframeUrl}" style="width: 100%; height: 100%; border: none;"></iframe>
          </div>
          <div class="form-bottom-actions">
            <button type="button" class="btn btn-success btn-lg btn-text-activation">${buttonInner}</button>
            <a class="escape-license-activation">Skip</a>
          </div>
        </section>
    `;

    slide
      .querySelector(".escape-license-activation")
      .addEventListener("click", this.handleEscape_.bind(this));

    const button = slide.querySelector(".btn-text-activation");
    button.addEventListener("click", this.handleLicenseActivation_.bind(this));

    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
    }, 250);
  }

  handleEnableActivateButton_() {
    const activateButton = document.querySelector(".btn-text-activation");
    activateButton.disabled = false;
    activateButton.innerText = "Activate";
  }

  handleEscape_() {
    this.cloudActivationSkipped_ = true;
    this.onEscape_();
  }

  handleLicenseActivation_() {
    this.setActivating_(true);
    window.location.href = "/cloud.html?onboarded=activated";
  }

  setActivating_(activating) {
    const button = document.querySelector(".btn-text-activation");
    if (!button) {
      return;
    }
    button.disabled = activating;
    button.value = activating ? "Loading..." : "Activate";
  }
}
