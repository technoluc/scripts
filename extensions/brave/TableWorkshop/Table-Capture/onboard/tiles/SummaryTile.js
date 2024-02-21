class SummaryTile extends Tile {
  constructor(onProLicenseActivation, onCloudLicenseActivation) {
    super();
    this.onProLicenseActivation_ = onProLicenseActivation;
    this.onCloudLicenseActivation_ = onCloudLicenseActivation;
    this.completed_ = false;
  }

  getData() {
    return {
      summaryCompleted: this.completed_,
      triangles: true,
      pageTitle: "Summary",
    };
  }

  getType() {
    return SlideTypes.SUMMARY;
  }

  bindFromState_(state) {
    // No-op.
  }

  display(state) {
    this.bindFromState_(state);
    this.bindPageToTileState_(state);

    const slideType = this.getType();
    let slide = document.querySelector(`.${slideType}`);
    if (slide) {
      slide.classList.remove("not-shown");
      slide.classList.add("shown");
    } else {
      slide = document.createElement("div");
      slide.className = `slide padded-slide ${slideType}`;
    }

    slide.innerHTML = `
      <div class="big-text">Thank You.</div>
      <div class="sub-text">You're ready for the next step!</div>
      <section>
        <div class="tag-list"></div>
      </section>
      <section>
        <div class="sub-heading">Next steps.</div>
        <input type="button" class="btn btn-lg btn-lfg" value="Let's go" />
        <div class="next-explanation"></div>
      </section>
    `;

    slide
      .querySelector(".btn-lfg")
      .addEventListener("click", this.handleNextSteps_.bind(this, state));

    const planValue = state.existingLicense
      ? "Pre-existing License"
      : state.activationSkipped || state.cloudActivationSkipped
      ? `${state.prettyPlan.short} (Skipped)`
      : state.prettyPlan.short;

    const tags = [
      { key: "Experience", value: state.prettyExperience.short },
      { key: "Usage type", value: state.prettyUserType.short },
      {
        key: "Tutorial",
        value: state.tutorialSkipped ? "Skipped (it's okay)" : "Completed",
      },
      {
        key: "Plan",
        value: planValue,
      },
    ];

    const tagList = slide.querySelector(".tag-list");
    tags.forEach((tagDef) => {
      const el = document.createElement("div");
      el.className = "tag-thing";
      el.innerHTML = `
        <div class="prefix">${tagDef.key}</div>
        <div class="value">${tagDef.value}</div>
      `;
      tagList.appendChild(el);
    });

    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
    }, 250);

    const explanationWrapper = slide.querySelector(".next-explanation");
    if (state.activationSkipped || state.cloudActivationSkipped) {
      explanationWrapper.innerHTML = `You're finished. Enjoy Table Capture!`;
    } else if (state.plan === "free") {
      explanationWrapper.innerHTML = `You're finished with our onboarding. You can either close this tab or click the button above to customize Table Capture for your needs.`;
    } else if (state.plan === "pro") {
      explanationWrapper.innerHTML = `All that's left is to start your Table Capture Pro trial.`;
    } else if (state.plan === "cloud") {
      explanationWrapper.innerHTML = `All that's left is to start your Table Capture Cloud trial.`;
    } else {
      // Fall-through.
    }
  }

  handleNextSteps_(state) {
    if (
      state.plan === "free" ||
      state.activationSkipped ||
      state.cloudActivationSkipped
    ) {
      window.location.href = "/options.html";
    } else if (state.plan === "pro") {
      this.onProLicenseActivation_();
    } else if (state.plan === "cloud") {
      this.onCloudLicenseActivation_();
    }
  }
}
