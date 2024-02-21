function swallowCloudError(err) {
  console.log(err);
}

function renderRepro(repro) {
  if (!repro) {
    document.querySelector(".repro-summary").classList.add("hidden");
    return;
  }

  const el = document.querySelector(".repro-summary .mono");

  const lines = [];
  lines.push(summarizeRepro(repro));
  lines.push(new Date(repro.timestamp).toDateString());
  lines.push("---");
  lines.push(`URL:&nbsp;&nbsp;&nbsp;${repro.url}`);
  lines.push(`XPath: ${repro.pathTo}`);
  lines.push("---");
  lines.push("Configuration:");

  extractConfigToEnglish(repro.extractConfig).forEach((configLine) => {
    lines.push("* " + configLine);
  });

  lines.forEach((l) => {
    el.innerHTML += `<div>${l}</div>`;
  });
}

function initializePage(userConfig) {
  new OptionsChrome();
  new CloudUpgradeManager(userConfig);

  // Show onboard message.
  if (window.location.href.includes("onboarded=activated")) {
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(
      createAlertPaneWithHTML(
        "Just <strong>sign in again</strong> below to activate Table Capture Cloud.",
        "success",
        true
      )
    );
  }

  document.querySelector("form.signup-form").addEventListener("submit", (e) => {
    const email = document.querySelector(".email-addy").value.trim();
    if (email && email.includes("@") && email.length > 5) {
      const api = new GMikeAPI();
      api
        .signupForCloud({
          email,
          pro: userConfig.paidPro,
          version: _TCAP_CONFIG.versionText,
        })
        .then(() => {
          alert(`Thank you so much! We'll be in touch.`);
        })
        .catch((err) => {
          alert(`There was an issue signing up. Please try again later.`);
        });
    }

    e.preventDefault();
    return false;
  });

  new BrowserEnv()
    .getBackgroundPageP()
    .then((backgroundPage) => backgroundPage.getLocalTableForCloud())
    .then(renderRepro)
    .catch(swallowCloudError);
}

document.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig(true).then(initializePage).catch(swallowCloudError);
});
