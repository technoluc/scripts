# Advanced PowerShell Script with Menu for System Troubleshooting

function Show-Menu {
    param (
        [string]$Title = 'System Troubleshooting Menu'
    )
    Clear-Host
    Write-Host "================ $Title ================"
    Write-Host "1: Run CHKDSK on the C: drive"
    Write-Host "2: Run System File Checker (SFC)"
    Write-Host "3: Run DISM Check Health"
    Write-Host "4: Run DISM Scan Health"
    Write-Host "5: Run DISM Restore Health"
    Write-Host "Q: Quit"
    Write-Host "======================================="
}

function Run-CHKDSK {
    Write-Host "Running CHKDSK on the C: drive: chkdsk C: /f /r"
    chkdsk C: /f /r
}

function Run-SFC {
    Write-Host "Running System File Checker: sfc /scannow"
    sfc /scannow
}

function Run-DISMCheckHealth {
    Write-Host "Running DISM Check Health: DISM /Online /Cleanup-Image /CheckHealth"
    DISM /Online /Cleanup-Image /CheckHealth
}

function Run-DISMScanHealth {
    Write-Host "Running DISM Scan Health: DISM /Online /Cleanup-Image /ScanHealth"
    DISM /Online /Cleanup-Image /ScanHealth
}

function Run-DISMRestoreHealth {
    Write-Host "Running DISM Restore Health: DISM /Online /Cleanup-Image /RestoreHealth"
    DISM /Online /Cleanup-Image /RestoreHealth
}

do {
    Show-Menu
    $input = Read-Host "Please select an option"
    switch ($input) {
        '1' {
            Run-CHKDSK
        }
        '2' {
            Run-SFC
        }
        '3' {
            Run-DISMCheckHealth
        }
        '4' {
            Run-DISMScanHealth
        }
        '5' {
            Run-DISMRestoreHealth
        }
        'Q' {
            return
        }
        default {
            Write-Host "Invalid option, please try again."
        }
    }
    Write-Host "Press any key to return to menu ..."
    $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
} while ($input -ne 'Q')
