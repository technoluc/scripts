function initializePage(userConfig) {
  new OptionsChrome();

  const optionsManager = new OptionsManager();
  const upgradeManager = new UpgradeManager(optionsManager, userConfig);
  upgradeManager.initializeForUpgrade();
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then((userConfig) => initializePage(userConfig))
    .catch((err) => {
      console.log(err);
    });
});
