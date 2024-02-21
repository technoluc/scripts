// This is an annoying global hack.
let ignoreHashChange = false;

class HashChangeManager {
  constructor() {
    this.onChange_ = null;
    this.lastHash_ = null;
  }

  setChangeHandler(onChange) {
    this.onChange_ = onChange;
    this.lastHash_ = window.location.hash;

    window.addEventListener("hashchange", () => {
      const hash = window.location.hash;
      const newHash = hash !== this.lastHash_;
      this.lastHash_ = hash;
      if (ignoreHashChange) {
        ignoreHashChange = false;
        return;
      }
      if (newHash) {
        this.onChange_();
      }
    });
  }

  setHashState(state) {
    const h = btoa(JSON.stringify(state));
    ignoreHashChange = true;
    window.location.hash = `h=${h}`;
  }

  getHashState() {
    const hash = window.location.hash;
    if (hash) {
      const h = hash.split("=")[1];
      if (h) {
        return JSON.parse(atob(h));
      }
    }
    return {};
  }

  hasHash() {
    return !!window.location.hash && window.location.hash.includes("h=");
  }
}
