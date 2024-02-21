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
        '0' {
            Show-MainMenu
        }
        default {
            Write-Host "Ongeldige optie. Probeer opnieuw."
            Read-Host "Druk op Enter om door te gaan..."
            Show-SubMenu1
        }
    }
}
