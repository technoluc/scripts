document.addEventListener("DOMContentLoaded", function () {
  const copyTableButton = document.getElementById("copyTableButton");

  copyTableButton.addEventListener("click", () => {
    // Hier moet je de gemarkeerde tabel vanuit de achtergrond ophalen
    chrome.runtime.sendMessage({ action: "getMarkedTable" }, (response) => {
      if (response.table) {
        copyTableToClipboard(response.table);
      }
    });
  });
});

function copyTableToClipboard(tableHTML) {
  // Voeg hier logica toe om de tabel naar het klembord te kopiëren
  // Dit kan met behulp van het Clipboard API of een externe bibliotheek.
  // Zorg ervoor dat de benodigde toestemmingen in manifest.json zijn ingesteld.
}
