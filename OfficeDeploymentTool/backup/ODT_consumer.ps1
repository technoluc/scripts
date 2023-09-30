function Get-ODTUri {
    [CmdletBinding()]
    [OutputType([string])]
    param ()

    $url = "https://www.microsoft.com/en-us/download/confirmation.aspx?id=49117"
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $url -ErrorAction SilentlyContinue
    }
    catch {
        Throw "Failed to connect to ODT: $url with error $_."
        Break
    }
    finally {
        $ODTUri = $response.links | Where-Object {$_.outerHTML -like "*click here to download manually*"}
        Write-Output $ODTUri.href
    }
}
$ODTURL = $(Get-ODTUri)

$ODTPath = "C:\Program Files\OfficeDeploymentTool"
$ConfigURL = "https://github.com/technoluc/winutil/raw/main/office/deploymentconfig.xml"
$InstallScriptURL = "https://github.com/technoluc/winutil/raw/main/office/deploymentinstall.cmd"
$ActivateScriptURL = "https://github.com/technoluc/winutil/raw/main/office/ActivateOffice21.cmd"

# Maak de doelmap aan
if (!(Test-Path -Path $ODTPath)) {
    New-Item -ItemType Directory -Path $ODTPath | Out-Null
}

# Download de Office Deployment Tool (ODT)
$ODTFilePath = Join-Path $ODTPath "officedeploymenttool.exe"
Invoke-WebRequest -Uri $ODTURL -OutFile $ODTFilePath
& $ODTFilePath /quiet /extract:$ODTPath


# Download en sla het configuratiebestand op als "config.xml"
$configFilePath = Join-Path $ODTPath "config.xml"
Invoke-WebRequest -Uri $ConfigURL -OutFile $configFilePath

# Download en sla het installatiescript op als "install.cmd"
$installScriptPath = Join-Path $ODTPath "install.cmd"
Invoke-WebRequest -Uri $InstallScriptURL -OutFile $installScriptPath

# Download en sla het activeerscript op als "activate.cmd"
$activateScriptPath = Join-Path $ODTPath "activate.cmd"
Invoke-WebRequest -Uri $ActivateScriptURL -OutFile $activateScriptPath

# Uitvoerbare rechten instellen voor de scripts
Set-ExecutionPolicy -Path $ODTFilePath -ExecutionPolicy Unrestricted
Set-ExecutionPolicy -Path $installScriptPath -ExecutionPolicy Unrestricted
Set-ExecutionPolicy -Path $activateScriptPath -ExecutionPolicy Unrestricted

# Uitvoeren van de installatiescript
Start-Process -FilePath $installScriptPath -Wait

# Wachten tot Office klaar is met installeren
Write-Host "Wachten tot Office installatie is voltooid..."
$officeProcess = Get-Process -Name "OfficeClickToRun"
while ($officeProcess -ne $null) {
    Start-Sleep -Seconds 5
    $officeProcess = Get-Process -Name "OfficeClickToRun" -ErrorAction SilentlyContinue
}

# Uitvoeren van het activeerscript
Start-Process -FilePath $activateScriptPath -Wait
