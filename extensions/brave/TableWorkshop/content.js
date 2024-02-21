// content.js
document.addEventListener("contextmenu", (event) => {
  const selectedTable = findParentTable(event.target);
  if (selectedTable) {
    // Hier kun je aangeven dat de tabel gemarkeerd is voor kopiëren
    event.preventDefault();
    chrome.runtime.sendMessage({ action: "markTable", table: selectedTable.outerHTML });
  }
});

function findParentTable(element) {
  // Voeg hier logica toe om het bovenliggende tabel-element te vinden
  // Gebruik recursie of een andere geschikte methode om het te identificeren.
  // Retourneer null als er geen tabel wordt gevonden.
}
