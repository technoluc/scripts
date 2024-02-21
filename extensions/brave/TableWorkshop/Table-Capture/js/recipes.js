function initializeApp(userConfig) {
  new OptionsChrome("recipes");

  const manager = new RecipeManager(userConfig);
  manager.initialize();
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true)
    .then((userConfig) => initializeApp(userConfig))
    .catch((err) => {
      console.log(err);
    });
});
