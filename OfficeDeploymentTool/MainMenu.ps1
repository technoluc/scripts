function Show-MainMenu {
  Clear-Host
  Write-Host "Hoofdmenu"
  Write-Host "---------"
  Write-Host "1. Install Microsoft Office"
  Write-Host "2. Microsoft Office Deployment Tool"
  Write-Host "3. ................"""
  Write-Host "4. Office Removal Tool
  Write-Host "5. Run OfficeScrubber"
  Write-Host "6. ................""
  Write-Host "7. Optie 7"
  Write-Host "8. Optie 8"
  Write-Host "9. Microsoft Activation Scripts"
  Write-Host "0. Afsluiten"
  Write-Host ""
  $choice = Read-Host "Selecteer een optie (0-9)"
  Process-Choice $choice
}

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

function Process-SubMenu1-Choice {
  param (
      [string]$choice
  )

  switch ($choice) {
      '1' {
          Clear-Host
          Write-Host "Suboptie 1.1 geselecteerd"
          # Voer hier de stappen uit voor Suboptie 1.1
          Read-Host "Druk op Enter om verder te gaan..."
          Show-SubMenu1
      }
      '2' {
          Clear-Host
          Write-Host "Suboptie 1.2 geselecteerd"
          # Voer hier de stappen uit voor Suboptie 1.2
          Read-Host "Druk op Enter om verder te gaan..."
          Show-SubMenu1
      }
      '3' {
          Show-MainMenu
      }
      default {
          Write-Host "Ongeldige optie. Probeer opnieuw."
          Read-Host "Druk op Enter om door te gaan..."
          Show-SubMenu1
      }
  }
}

function Process-Choice {
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

# Toon het hoofdmenu
Show-MainMenu
