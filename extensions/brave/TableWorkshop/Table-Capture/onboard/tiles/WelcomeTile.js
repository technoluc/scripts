class WelcomeTile extends Tile {
  constructor(onAdvance) {
    super();
    this.onAdvance_ = onAdvance;
  }

  getData() {
    return { triangles: true, pageTitle: "Welcome" };
  }

  getType() {
    return SlideTypes.WELCOME;
  }

  display(state) {
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
      <div class="big-text">Welcome to Table Capture</div>
      <div class="sub-text">The next steps are (kind of) required.</div>
      <div class="sub-text">It'll only take a few minutes.</div>
      <div class="delayed">
        <button class="btn btn-default btn-lg large-cta-button">Let's get started</button>
      </div>
    `;
    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
    }, 250);

    slide
      .querySelector(".large-cta-button")
      .addEventListener("click", this.onAdvance_);
  }
}
