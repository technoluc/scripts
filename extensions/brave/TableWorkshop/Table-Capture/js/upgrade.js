function initializePage(userConfig) {
  if (userConfig.requiresPaid && !userConfig.paidPro) {
    return (window.location = "/activate.html");
  }

  new OptionsChrome();

  const optionsManager = new OptionsManager();
  const upgradeManager = new UpgradeManager(optionsManager, userConfig);
  upgradeManager.initializeForUpgrade();

  if (window.location.hash.includes("activate")) {
    upgradeManager.scrollToExistingLicenseActivation();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then((userConfig) => initializePage(userConfig))
    .catch((err) => {
      console.log(err);
    });
});
