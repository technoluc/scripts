
<#
.SYNOPSIS
Dit script controleert of de OfficeDeploymentTool en de vereiste bestanden aanwezig zijn. 
Als ze ontbreken, wordt de gebruiker gevraagd of ze moeten worden geïnstalleerd of gedownload.

.DESCRIPTION
Dit script controleert of de map "C:\Program Files\OfficeDeploymentTool" bestaat en of het bestand "setup.exe" aanwezig is. 
Als dat niet het geval is, wordt de gebruiker gevraagd om Microsoft OfficeDeploymentTool te installeren via winget. 
Vervolgens wordt gecontroleerd of de bestanden "activate.cmd", "config.xml" en "install.cmd" aanwezig zijn. 
Als ze ontbreken, wordt de gebruiker gevraagd of ze moeten worden gedownload.

.NOTES
Bestandsnaam: Install-OfficeDeployment.ps1
Auteur: TechnoLuc
Versie: 1.0
Laatst bijgewerkt: 29/09/2023

.PARAMETER InstallODT
Schakel deze parameter in om de installatie van Microsoft OfficeDeploymentTool uit te voeren.

param (
    [switch]$InstallODT
)

#>

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Output "Winutil needs to be run as Administrator. Attempting to relaunch."
  Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "iwr -useb https://raw.githubusercontent.com/technoluc/scripts/main/OfficeDeploymentTool/Install-OfficeDeployment.ps1 | iex"
  break
}

$odtPath = "C:\Program Files\OfficeDeploymentTool"

# Stap 1: Controleer of OfficeDeploymentTool is geïnstalleerd
if (-not (Test-Path -Path $odtPath -PathType Container)) {
  Write-Host "Microsoft OfficeDeploymentTool is niet geïnstalleerd."
    
  $defaultValue = 'Y'
  if (($result = Read-Host "Wilt u Microsoft OfficeDeploymentTool installeren? (Y/N, standaard is $defaultValue)").Trim().ToUpper() -eq '' -or $result -eq 'Y') {
    Write-Host "Installeren van Microsoft OfficeDeploymentTool..."
    winget install -h Microsoft.OfficeDeploymentTool
  }
  else {
    Write-Host "U heeft ervoor gekozen om Microsoft OfficeDeploymentTool niet te installeren. Ga naar stap 2."
  }
}

# Stap 2: Controleer of vereiste bestanden aanwezig zijn
$requiredFiles = @(
  @{ Name = "activate.cmd"; Url = "https://github.com/technoluc/winutil/raw/main-custom/office/ActivateOffice21.cmd" },
  @{ Name = "install.cmd"; Url = "https://github.com/technoluc/winutil/raw/main-custom/office/deploymentinstall.cmd" },
  @{ Name = "config.xml"; Url = "https://github.com/technoluc/winutil/raw/main-custom/office/deploymentconfig.xml" }
)

# Nu gaan we de bestanden downloaden
foreach ($fileInfo in $requiredFiles) {
  $filePath = Join-Path -Path $odtPath -ChildPath $fileInfo.Name

  if (-not (Test-Path -Path $filePath -PathType Leaf)) {
    Write-Host ($fileInfo.Name + " ontbreekt in de map " + $odtPath)

    $defaultValue = 'Y'
    if (($result = Read-Host "Wilt u " + $fileInfo.Name + " downloaden? (J/N), standaard is $defaultValue)").Trim().ToUpper() -eq '' -or $result -eq 'Y') {
      Write-Host ("Downloaden van " + $fileInfo.Name + "...")
      $downloadUrl = $fileInfo.Url
      Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath
    }
    else {
      Write-Host ("U heeft ervoor gekozen om " + $fileInfo.Name + " niet te downloaden.")
    }
  }
}

Write-Host "Please execute install.cmd as Administrator from C:\Program Files\OfficeDeploymentTool. After installation completes execute irm https://massgrave.dev/get | iex to activate ."
# Wacht op gebruikersinvoer voordat het script wordt afgesloten
Write-Host "Druk op Enter om af te sluiten..."
$null = Read-Host
