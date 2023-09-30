function Show-SubMenu1 {
  Clear-Host
  Write-Host "Submenu 1"
  Write-Host "---------"
  Write-Host "1. Suboptie 1.1"
  Write-Host "2. Suboptie 1.2"
  Write-Host "3. Terug naar hoofdmenu"
  Write-Host ""
  $choice = Read-Host "Selecteer een optie (1-3)"
  Process-SubMenu1-Choice $choice
}
