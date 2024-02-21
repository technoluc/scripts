function initializeApp(userConfig) {
  new OptionsChrome();

  const extractor = new PdfExtract(userConfig);
  extractor.initialize();
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then((userConfig) => initializeApp(userConfig))
    .catch((err) => {
      console.log(err);
    });
});
