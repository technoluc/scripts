function initializePage(userConfig) {
  new OptionsChrome();
  new TableEditor(userConfig).fetchAndRender();
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then(initializePage)
    .catch((err) => {
      console.log(err);
    });
});
