function Show-Menu {
    param (
        [string]$title,
        [string[]]$options
    )
    
    Invoke-Logo
    Write-Host $title -ForegroundColor Green
    Write-Host ""
    
    for ($i = 0; $i -lt $options.Count; $i++) {
        Write-Host "$($i + 1). $($options[$i])"
    }
    
    Write-Host "0. Main Menu"
    Write-Host "Q. Quit" -ForegroundColor Red
    Write-Host ""
    
    Write-Host -NoNewline "Select option: "
    $choice = [System.Console]::ReadKey().KeyChar
    Write-Host ""
    
    return $choice
}

function Show-OfficeInstallMenu {
    $title = "Install Microsoft Office"
    $options = @(
        "Microsoft Office Deployment Tool",
        "Microsoft Office 365 Business",
        "Microsoft Office 2021 Pro Plus"
    )
    
    $choice = Show-Menu -title $title -options $options
    
    switch ($choice) {
        '1' {
            Write-Host "Installing Microsoft Office Deployment Tool" -ForegroundColor Green
            Install-OdtIfNeeded
        }
        '2' {
            Write-Host "Installing Microsoft Office 365 Business" -ForegroundColor Green
            if (-not (Test-OfficeInstalled)) {
                Install-Office -product "Office 365 Business"
            }
        }
        '3' {
            Write-Host "Installing Microsoft Office 2021 Pro Plus" -ForegroundColor Green
            if (-not (Test-OfficeInstalled)) {
                Install-Office -product "Office 2021 Pro Plus"
            }
        }
    }
    
    if ($choice -ne '0') {
        Write-Host -NoNewLine "Press any key to continue... "
        $x = [System.Console]::ReadKey().KeyChar
        Show-OfficeInstallMenu
    }
}

function Show-OfficeMainMenu {
    $title = "Main Menu"
    $options = @(
        "Install Microsoft Office",
        "Uninstall Microsoft Office",
        "Activate Microsoft Office / Windows"
    )
    
    $choice = Show-Menu -title $title -options $options
    
    switch ($choice) {
        '1' {
            Show-OfficeInstallMenu
        }
        '2' {
            Show-OfficeRemoveMenu
        }
        '3' {
            Invoke-Logo
            Write-Host "Running Massgrave.dev Microsoft Activation Scripts" -ForegroundColor Cyan 
            Invoke-MAS
        }
    }
    
    if ($choice -ne '0') {
        Write-Host -NoNewLine "Press any key to continue... "
        $x = [System.Console]::ReadKey().KeyChar
        Show-OfficeMainMenu
    }
}

function Show-OfficeRemoveMenu {
    $title = "Uninstall Microsoft Office"
    $options = @(
        "Run Office Removal Tool with SaRa",
        "Run Office Removal Tool with Office365 Setup",
        "Run Office Scrubber"
    )
    
    $choice = Show-Menu -title $title -options $options
    
    switch ($choice) {
        '1' {
            Write-Host "Running Office Removal Tool with SaRa" -ForegroundColor Cyan
            Invoke-OfficeRemovalTool
        }
        '2' {
            Write-Host "Running Office Removal Tool with Office365 Setup" -ForegroundColor Cyan
            Invoke-OfficeRemovalTool -UseSetupRemoval
        }
        '3' {
            Write-Host "Running Office Scrubber" -ForegroundColor Cyan
            Install-7ZipIfNeeded
            Invoke-OfficeScrubber
        }
    }
    
    if ($choice -ne '0') {
        Write-Host -NoNewLine "Press any key to continue... "
        $x = [System.Console]::ReadKey().KeyChar
        Show-OfficeRemoveMenu
    }
}

function Show-TLMainMenu {
    $title = "Main Menu"
    $options = @(
        "Winutil: Install and Tweak Utility",
        "BinUtil: Recycle Bin Themes",
        "OfficeUtil: Install/Remove/Activate Office & Windows"
    )
    
    $choice = Show-Menu -title $title -options $options
    
    switch ($choice) {
        '1' {
            Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "Invoke-RestMethod `"$WinUtilUrl`" | Invoke-Expression" -Wait
        }
        '2' {
            # Check if script was run as Administrator, relaunch if not
            if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
                Clear-Host
                Start-Process -FilePath powershell.exe -ArgumentList "Invoke-RestMethod `"$BinUtilUrl`" | Invoke-Expression" -Wait -NoNewWindow
            }
            else {
                Write-Host "BinUtil can't be run as Administrator..."
                Write-Host "Re-run this command in a non-admin PowerShell window..."
                Write-Host " irm `"$ScriptUrl`" | iex " -ForegroundColor Yellow
                Read-Host "Press Enter to Exit..."
            }
        }
        '3' {
            # Check if script was run as Administrator, relaunch if not
            if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
                Write-Output "OfficeUtil needs to be run as Administrator. Attempting to relaunch."
                Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "Invoke-RestMethod `"$ScriptUrl`" | Invoke-Expression"
            }
        }
    }
    }