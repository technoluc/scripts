function initializeApp(userConfig) {
  new OnboardManager(userConfig).initialize();

  updateOSVis();
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig()
    .then((userConfig) => initializeApp(userConfig))
    .catch((err) => {
      console.log(err);
      alert(err);
    });
});
