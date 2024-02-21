chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "customLink",
    title: "Search for '%s' on Drimble",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "customLink") {
    const selectedText = info.selectionText;
    
    // Remove spaces from the selected text
    const sanitizedText = selectedText.replace(/\s/g, "");
    
    const customLink = "https://drimble.nl/postcode/" + sanitizedText;
    chrome.tabs.create({ url: customLink });
  }
});
