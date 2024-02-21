class Tile {
  constructor() {
    this.slideStack_ = document.querySelector(".slide-stack");
    this.index_ = null;
    this.hashChangeHandler_ = new HashChangeManager();
  }

  setIndex(i) {
    this.index_ = i;
  }

  getIndex() {
    return this.index_;
  }

  trianglify_() {
    // Green/Yellow/Gray
    const gradient = ["#EFEE92", "#C4DABE", "#E9E9E9", "#C4DABE", "#EFEE92"];
    trianglifyElement(document.body, gradient, true);
  }

  display(state) {
    throw new Error("Super class method not implemented");
  }

  getData() {
    throw new Error("Super class method not implemented");
  }

  getType() {
    throw new Error("Super class method not implemented");
  }

  hide() {
    document.querySelector(`.${this.getType()}`).classList.add("not-shown");
  }

  bindPageToTileState_(state) {
    const tileState = this.getData();
    if (tileState.triangles) {
      this.trianglify_();
    } else {
      clearTriangles(document.body);
    }

    this.hashChangeHandler_.setHashState(state);
    this.setPageTitle_(tileState.pageTitle || "Table Capture");
  }

  addToHash_(newState) {
    const state = this.hashChangeHandler_.getHashState();
    this.hashChangeHandler_.setHashState({
      ...state,
      ...newState,
    });
  }

  setPageTitle_(title) {
    document.title = `${title}, Tour Table Capture`;
  }
}

class GenericIntroTile extends Tile {
  constructor(onAdvance, title, subTitle) {
    super(onAdvance);
    this.title_ = title;
    this.subTitle = subTitle;
  }
}
