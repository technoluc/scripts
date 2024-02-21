function writeBadError(err) {
  document.body.innerHTML = `
    <div class="alert alert-danger" style="margin: 16px;">
      Please close this tab and reopen it before using <strong>Table Capture</strong< on it.
    </div>
  `;
}

function initializePopup(userConfig) {
  const actions = [
    {
      key: "workshop",
      pretty: chrome.i18n.getMessage("openWorkshopAction"),
      tooltip: chrome.i18n.getMessage("openWorkshopAction"),
      icon: "images/icon.menu.png",
      disabled: false,
    },
    {
      key: "goog",
      pretty: chrome.i18n.getMessage("googleDocAction"),
      tooltip: chrome.i18n.getMessage("googleDocActionTooltip"),
      icon: "images/icon.sheets.png",
      disabled: false,
    },
    {
      key: "copy",
      pretty: chrome.i18n.getMessage("copyClipboardAction"),
      tooltip: chrome.i18n.getMessage("copyClipboardActionTooltip"),
      icon: "images/icon.clipboard.add.png",
      disabled: false,
    },
    {
      key: "screenshot",
      pretty: chrome.i18n.getMessage("screenshotAction"),
      tooltip: chrome.i18n.getMessage("screenshotActionTooltip"),
      icon: "images/icon.screenshot.png",
      disabled: !userConfig.paidPro,
    },
    {
      key: "csv",
      pretty: chrome.i18n.getMessage("csvAction"),
      tooltip: chrome.i18n.getMessage("csvActionTooltip"),
      icon: "images/icon.csv.b.png",
      disabled: !userConfig.paidPro,
    },
    {
      key: "excel",
      pretty: chrome.i18n.getMessage("excelAction"),
      tooltip: chrome.i18n.getMessage("excelActionTooltip"),
      icon: "images/icon.excel.svg",
      disabled: !userConfig.paidPro,
    },
  ];

  try {
    new TableShow(document.body, actions, userConfig).refresh(false);
  } catch (err) {
    writeBadError(err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  getExtensionUserConfig().then(initializePopup);
});
