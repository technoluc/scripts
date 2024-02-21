document.addEventListener("DOMContentLoaded", () => {
  const browserEnv = new BrowserEnv();
  new OptionsChrome("support");

  document.querySelector("a.ext-chrome-home").addEventListener("click", () => {
    browserEnv.createTab({ url: "chrome://extensions" });
  });
  document
    .querySelector("a.ext-keyboard-shortcuts")
    .addEventListener("click", () => {
      browserEnv.createTab({ url: "chrome://extensions/shortcuts" });
    });
});
