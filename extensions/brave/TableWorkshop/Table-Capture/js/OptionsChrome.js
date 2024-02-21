class OptionsChrome {
  constructor(activeElement) {
    this.updateFooterLinks_();
    this.updateOtherLinks_();

    if (activeElement) {
      // Activate the appropriate nav component.
      document
        .querySelector(`.navbar-nav .${activeElement}`)
        .classList.add("active");
    }

    // Support for bootstrap tooltips.
    $('[data-toggle="tooltip"]').tooltip();
  }

  updateOtherLinks_() {
    Array.from(document.querySelectorAll(".link-recipes-doc")).forEach(
      (link) => (link.href = _TCAP_CONFIG.recipesDocUrl)
    );
  }

  updateFooterLinks_() {
    Array.from(document.querySelectorAll(".link-review")).forEach(
      (link) => (link.href = _TCAP_CONFIG.reviewLink)
    );
    Array.from(document.querySelectorAll(".link-email")).forEach(
      (link) => (link.href = _TCAP_CONFIG.supportMailTo)
    );
    Array.from(document.querySelectorAll(".link-discord")).forEach(
      (link) => (link.href = _TCAP_CONFIG.discordInvite)
    );
    Array.from(document.querySelectorAll(".link-newsletter")).forEach(
      (link) => (link.href = _TCAP_CONFIG.newsletterUrl)
    );
    Array.from(document.querySelectorAll(".link-roadmap")).forEach(
      (link) => (link.href = _TCAP_CONFIG.roadmapUrl)
    );
    Array.from(document.querySelectorAll(".text-tc-version")).forEach(
      (link) =>
        (link.innerText = `${_TCAP_CONFIG.versionText} - ${_TCAP_CONFIG.releaseName}`)
    );
  }
}
