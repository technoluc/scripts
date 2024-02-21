class DataClipper {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
  }

  clipData(dataArray) {
    const collectionName = window.location.hostname + window.location.pathname;
    const params = {
      action: MessageAction.CLIP_DATA_SAVE,
      collection: btoa(collectionName),
      collectionName,
      sourceUrl: window.location.href,
      dataArray,
    };
    return new BrowserEnv().sendMessage(params);
  }

  clipAndSaveRecipe(recipe, waitForElement = false) {
    try {
      const node = document.querySelector(recipe.selector);
      if (!node) {
        if (waitForElement) {
          // We'll wait for 10s
          return _tcWaitForElement(recipe.selector, 10 * 1000).then(() =>
            this.clipAndSaveRecipe(recipe, false)
          );
        }

        // This is esentially a no-op. Might happen because the page hasn't finished loading yet.
        return Promise.resolve({});
      }

      const windowName = _tcGetWindowName(window);
      const pageUrl = window.location.href;
      const pageTitle = document.title;
      const recipeWrapper = new RecipeTableWrapper(
        recipe,
        node,
        pageUrl,
        pageTitle,
        windowName,
        this.userConfig_
      );
      const dataArray = recipeWrapper.getAsArrays();

      const params = {
        action: MessageAction.CLIP_DATA_SAVE,
        collection: `recipe-${recipe.id}`,
        collectionName: recipe.name,
        sourceUrl: window.location.href,
        dataArray,
      };
      return new BrowserEnv().sendMessage(params);
    } catch (err) {
      _tcPageToast(`Unable to auto-clip recipe data: ${recipe.name}`, "error");
    }
  }
}
