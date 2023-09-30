function Show-SubMenu1 {
  Clear-Host
  Invoke-WPFFormVariables
  Write-Host "Install Microsoft Office" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "1. Microsoft Office 365 Business"
  Write-Host "2. Microsoft Office 2021 Pro Plus"
  Write-Host "0. Terug naar hoofdmenu"
  Write-Host ""
  $choice = Read-Host "Selecteer een optie (0-2)"
  Process-SubMenu1-Choice $choice
}
