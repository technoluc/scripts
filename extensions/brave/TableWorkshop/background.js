chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "tableWorkshop",
    title: "Table Workshop",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "tableWorkshop") {
    // Open het venster voor de tabelworkshop hier
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: openTableWorkshop
    });
  }
});

function openTableWorkshop() {
  // Hier moet je logica toevoegen om het venster van de tabelworkshop te openen
  // Dit kan een nieuw venster of een pop-upvenster zijn.
  // Je kunt JavaScript en HTML gebruiken om dit venster weer te geven.
}
