function getTableCaptureExperienceText(experience) {
  if (experience === TableCaptureExperience.NEW_USER) {
    return {
      short: "New Table Capture User",
      long: "You've never used Table Capture before.",
    };
  }
  if (experience === TableCaptureExperience.RETURNING_USER) {
    return {
      short: "Returning Table Capture Fan",
      long: "You've used Table Capture before, you know how it goes.",
    };
  }
  return { short: "", long: "" };
}

class TableCaptureExperienceTile extends Tile {
  constructor(state, onAdvance) {
    super();
    this.onAdvance_ = onAdvance;
    this.selection_ = null;
    this.bindFromState_(state);
  }

  getData() {
    return {
      experience: this.selection_,
      prettyExperience: getTableCaptureExperienceText(this.selection_),
      triangles: true,
      pageTitle: "Experience",
    };
  }

  getType() {
    return SlideTypes.NEW_VS_RETURNING;
  }

  bindFromState_(state) {
    this.selection_ = state.experience;
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

    const slide = document.createElement("div");
    slide.className = `slide padded-slide ${slideType}`;
    slide.innerHTML = `
      <div class="big-text">Have you used <span class="tc">Table Capture</span> before?</div>
      <div class="type-cards">
        <div class="type" data-value="${TableCaptureExperience.RETURNING_USER}">
          <div class="card-heading">Yes!</div>
          <div class="card-body">
            I'm familiar with the extension.
          </div>
        </div>
        <div class="type" data-value="${TableCaptureExperience.NEW_USER}">
          <div class="card-heading">No, not really</div>
          <div class="card-body">
            This is my first time using it!
          </div>
        </div>
      </div>
    `;

    Array.from(slide.querySelectorAll(".type")).forEach((el) =>
      el.addEventListener("click", () => {
        const type = el.getAttribute("data-value");
        this.selection_ = type;
        this.onAdvance_();
      })
    );

    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
    }, 250);
  }
}
