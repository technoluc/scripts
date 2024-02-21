chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "kvkSearch",
      title: "Search for '%s' on KVK",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "kvkSearch" && info.selectionText) {
      const query = encodeURIComponent(info.selectionText);
      const url = `https://www.kvk.nl/zoeken/handelsregister/?handelsnaam=${query}&kvknummer=&straat=&postcode=&huisnummer=&plaats=&hoofdvestiging=1&rechtspersoon=1&nevenvestiging=1&zoekvervallen=1&zoekuitgeschreven=1&start=0`;
      chrome.tabs.create({ url: url });
    }
  });
  