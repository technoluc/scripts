function Show-MainMenu {
  Clear-Host
  Invoke-WPFFormVariables
  Write-Host "                                Hoofdmenu" -ForegroundColor Green
  Write-Host ""
  Write-Host "1. Install Microsoft Office"
  Write-Host "2. Microsoft Office Deployment Tool"
  Write-Host "3. ................"
  Write-Host "4. Office Removal Tool"
  Write-Host "5. Run OfficeScrubber"
  Write-Host "6. ................"
  Write-Host "7. Optie 7"
  Write-Host "8. Optie 8"
  Write-Host "9. Microsoft Activation Scripts"
  Write-Host "0. Afsluiten"
  Write-Host ""
  $choice = Read-Host "Selecteer een optie (0-9)"
  Process-MainMenu-Choice $choice
}
