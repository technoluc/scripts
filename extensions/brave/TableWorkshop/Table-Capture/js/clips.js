function initializeApp(userConfig) {
  new OptionsChrome();

  const manager = new ClipManager(userConfig);
  const collectionId = window.location.search.includes("?id=")
    ? window.location.search.split("?id=")[1]
    : null;
  manager.initialize(collectionId);
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then((userConfig) => initializeApp(userConfig))
    .catch((err) => {
      console.log(err);
    });
});
