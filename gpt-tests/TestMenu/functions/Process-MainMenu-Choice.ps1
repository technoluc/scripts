function Process-MainMenu-Choice {
  param (
      [string]$choice
  )

  switch ($choice) {
      '0' {
          Write-Host "Afsluiten..."
          exit
      }
      '1' {
          Show-SubMenu1
      }
      '2' {
          Clear-Host
          Write-Host "Optie 2 geselecteerd"
          # Voer hier de stappen uit voor Optie 2
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '3' {
          Clear-Host
          Write-Host "Optie 3 geselecteerd"
          # Voer hier de stappen uit voor Optie 3
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '4' {
          Clear-Host
          Write-Host "Optie 4 geselecteerd"
          # Voer hier de stappen uit voor Optie 4
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '5' {
          Clear-Host
          Write-Host "Optie 5 geselecteerd"
          # Voer hier de stappen uit voor Optie 5
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '6' {
          Clear-Host
          Write-Host "Optie 6 geselecteerd"
          # Voer hier de stappen uit voor Optie 6
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '7' {
          Clear-Host
          Write-Host "Optie 7 geselecteerd"
          # Voer hier de stappen uit voor Optie 7
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '8' {
          Clear-Host
          Write-Host "Optie 8 geselecteerd"
          # Voer hier de stappen uit voor Optie 8
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      '9' {
          Clear-Host
          Write-Host "Optie 9 geselecteerd"
          # Voer hier de stappen uit voor Optie 9
          Read-Host "Druk op Enter om terug te gaan naar het hoofdmenu..."
          Show-MainMenu
      }
      default {
          Write-Host "Ongeldige optie. Probeer opnieuw."
          Read-Host "Druk op Enter om door te gaan..."
          Show-MainMenu
      }
  }
}
