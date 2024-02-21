function getSlideTypeText(usageType) {
  if (usageType === "type-academic") {
    return {
      short: "Acadamic usage",
      long: "You plan on using Table Capture in academia.",
    };
  }
  if (usageType === "type-business") {
    return {
      short: "Business usage",
      long: "You plan on using Table Capture professionally.",
    };
  }
  if (usageType === "type-personal") {
    return {
      short: "Personal usage",
      long: "You plan on using Table Capture for your own personal fun.",
    };
  }
  return { short: "", long: "" };
}

class UserTypeTile extends Tile {
  constructor(state, onAdvance) {
    super();
    this.onAdvance_ = onAdvance;
    this.selection_ = null;
    this.bindFromState_(state);
  }

  getData() {
    return {
      userType: this.selection_,
      prettyUserType: getSlideTypeText(this.selection_),
      triangles: true,
      pageTitle: "Usage Type",
    };
  }

  getType() {
    return SlideTypes.USER_TYPE;
  }

  bindFromState_(state) {
    this.selection_ = state.userType;
  }

  display(state) {
    this.bindFromState_(state);
    this.bindPageToTileState_(state);

    const existingSlide = document.querySelector(`.${SlideTypes.USER_TYPE}`);
    if (existingSlide) {
      existingSlide.classList.remove("not-shown");
      existingSlide.classList.add("shown");
      return;
    }

    const slide = document.createElement("div");
    slide.className = `slide padded-slide ${SlideTypes.USER_TYPE}`;
    slide.innerHTML = `
      <div class="big-text">How do you plan on using Table Capture?</div>
      <div class="sub-text">This will help  us customize your experience.</div>
      <div class="type-cards">
        <div class="type" data-value="type-personal">
          <div class="card-heading">Personal</div>
          <div class="card-body">
            I'll be using <span class="tc">Table Capture</span> for my own personal data needs.
          </div>
        </div>
        <div class="type" data-value="type-academic">
          <div class="card-heading">Academia</div>
          <div class="card-body">
            I'll be using <span class="tc">Table Capture</span> in academia.
          </div>
        </div>
        <div class="type" data-value="type-business">
          <div class="card-heading">Business</div>
          <div class="card-body">
            I'll be using <span class="tc">Table Capture</span> for work.
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
