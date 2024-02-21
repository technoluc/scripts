function getCurrentExtensionPageUrl() {
  try {
    if (typeof getPageUrlForActiveTab === "function") {
      return getPageUrlForActiveTab();
    }
    // NOTE(gmike): This has weird behavior.
    if (typeof chrome.extension.getBackgroundPage === "function") {
      return chrome.extension.getBackgroundPage().getPageUrlForActiveTab();
    }
    if (window.location && window.location.href) {
      return window.location.href;
    }
  } catch (e) {}
  return null;
}

function isPageOnboardingPage(url) {
  return new BrowserEnv().isPageOnboardingPage(url);
}

function getExtensionUserConfig(ignorePageUrl = false) {
  const browserEnv = new BrowserEnv();
  return browserEnv
    .getWorlds(["_recipe_world"], _TCAP_CONFIG_DEFAULTS)
    .then((values) => {
      const config = {};
      _TCAP_CONFIG_KEYS.forEach((key) => {
        config[key] = values[key];
      });

      if (_TCAP_CONFIG.devPretendPro) {
        config.paidPro = true;
      }

      if (_TCAP_CONFIG.devPretendCloud) {
        config.paidCloud = true;
      }

      const pageUrl = getCurrentExtensionPageUrl();
      if (!ignorePageUrl && isPageOnboardingPage(pageUrl)) {
        config.paidPro = true;
      }

      config.paidProOrMore = !!config.paidPro || !!config.paidCloud;

      return config;
    });
}

function _tcFormatNowDateKey(dateString) {
  if (!dateString) {
    return "N/A";
  }
  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);
  return `${month}/${day}/${year}`;
}

function _tcGetNowDateKey() {
  const date = new Date();

  let month = `${date.getMonth() + 1}`;
  let day = `${date.getDate()}`;
  const year = date.getFullYear();

  if (month.length < 2) {
    month = "0" + month;
  }

  if (day.length < 2) {
    day = "0" + day;
  }

  return `${year}${month}${day}`;
}
