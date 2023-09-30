<#
.SYNOPSIS
A script to download, install and activate Microsoft Office.

.DESCRIPTION
This script checks if the "C:\Program Files\OfficeDeploymentTool" directory exists and if the "setup.exe" file is present. 
If not, the user is prompted to download and install Microsoft OfficeDeploymentTool. 
Then it checks if the "config21.xml," and "config365.xml" files are present. 
If they are missing, the user is prompted to download them.

.NOTES
File Name: Install-OfficeDeployment.ps1
Author: TechnoLuc
Version: 2.0
Last Updated: 09/30/2023

#>

##################################################
#                 SET VARIABLES                  #
##################################################
$ScriptUrl = "https://raw.githubusercontent.com/technoluc/scripts/main/OfficeDeploymentTool/Install-OfficeDeployment-complete.ps1"
$odtPath = "C:\Program Files\OfficeDeploymentTool"
$OfficeUtilPath = "C:\OfficeUtil"
$odtInstaller = "C:\OfficeUtil\odtInstaller.exe"
$setupExe = "C:\Program Files\OfficeDeploymentTool\setup.exe"
$configuration21XML = "C:\Program Files\OfficeDeploymentTool\config21.xml"
$configuration365XML = "C:\Program Files\OfficeDeploymentTool\config365.xml"
$UnattendedArgs21 = "/configure `"$configuration21XML`""
$UnattendedArgs365 = "/configure `"$configuration365XML`""
$odtInstallerArgs = "/extract:`"c:\Program Files\OfficeDeploymentTool`" /quiet"
$ArchiveUrl = "https://github.com/abbodi1406/WHD/raw/master/scripts/OfficeScrubber_11.7z"
$ScrubberPath = "C:\OfficeUtil\OfficeScrubber"
$ScrubberArchive = "OfficeScrubber_11.7z"
$ScrubberCmd = "OfficeScrubber.cmd"
$ScrubberFullPath = Join-Path -Path $ScrubberPath -ChildPath $ScrubberCmd
$OfficeRemovalToolUrl = "https://raw.githubusercontent.com/technoluc/msoffice-removal-tool/main/msoffice-removal-tool.ps1"
$OfficeRemovalTool = "msoffice-removal-tool.ps1"
$OfficeRemovalToolPath = Join-Path -Path $OfficeUtilPath -ChildPath $OfficeRemovalTool

# Check if script was run as Administrator, relaunch if not
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Output "OfficeUtil needs to be run as Administrator. Attempting to relaunch."
  Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "Invoke-WebRequest -UseBasicParsing `"$ScriptUrl`" | Invoke-Expression"
  break
}

##################################################
#                   FUNCTIONS                    #
##################################################

function ScriptMenu {
  Write-Host "1. Microsoft Activation Scripts"
  Write-Host "2. OfficeRemovalTool SaRa Method"
  Write-Host "3. OfficeRemovalTool SetupRemoval Method"
  Write-Host "4. OfficeScrubber"
  Write-Host "Q. Exit" -ForegroundColor Red
  $key = $host.UI.RawUI.ReadKey("IncludeKeyDown,NoEcho")

  # Controleer de ingevoerde toets
  switch ($key.Character) {
    '1' {
      Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "Invoke-WebRequest -useb https://massgrave.dev/get | Invoke-Expression" -Wait
    }
    '2' {
      if (-not (Test-Path -Path $OfficeUtilPath -PathType Container)) {
        New-Item -Path $OfficeUtilPath -ItemType Directory ;
      }    
      Start-Process -FilePath powershell.exe -ArgumentList "Invoke-WebRequest $OfficeRemovalToolUrl -OutFile $OfficeRemovalToolPath; powershell -ExecutionPolicy Bypass $OfficeRemovalToolPath -SuppressReboot" -Wait
    }
    '3' {
      if (-not (Test-Path -Path $OfficeUtilPath -PathType Container)) {
        New-Item -Path $OfficeUtilPath -ItemType Directory ;
      }    
      Start-Process -FilePath powershell.exe -ArgumentList "Invoke-WebRequest $OfficeRemovalToolUrl -OutFile $OfficeRemovalToolPath; powershell -ExecutionPolicy Bypass $OfficeRemovalToolPath -SuppressReboot -UseSetupRemoval" -Wait
    }
    '4' {
      Write-Host "Select [R] Remove all Licenses option in OfficeScrubber." -ForegroundColor Yellow
      Expand-7zArchive -ArchiveUrl $ArchiveUrl -ScrubberPath $ScrubberPath -ScrubberArchive $ScrubberArchive
      Start-Process -Verb runas -FilePath "cmd.exe" -ArgumentList "/C $ScrubberFullPath "
    }
    'q' {
      Write-Host "Script afgesloten."
      return
    }
    default {
      ScriptMenu
      Write-Host "Ongeldige invoer. Probeer opnieuw"
    }
  }

}
function Get-ODTUri {
  <#
      .SYNOPSIS
          Get Download URL of latest Office 365 Deployment Tool (ODT).
      .NOTES
          Author: Bronson Magnan
          Twitter: @cit_bronson
          Modified by: Marco Hofmann
          Twitter: @xenadmin
      .LINK
          https://www.meinekleinefarm.net/
  #>
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
    $ODTUri = $response.links | Where-Object { $_.outerHTML -like "*click here to download manually*" }
    Write-Output $ODTUri.href
  }
}

function Expand-7zArchive {
  param (
    [string]$ArchiveUrl,
    [string]$ScrubberPath,
    [string]$ScrubberArchive,
    [string]$7zPath = "C:\Program Files\7-Zip\7z.exe"
  )

  # Combineer het pad naar het archief
  $ArchivePath = Join-Path -Path $ScrubberPath -ChildPath $ScrubberArchive

  # Maak de map als deze nog niet bestaat
  if (-not (Test-Path -Path $ScrubberPath -PathType Container)) {
    New-Item -Path $ScrubberPath -ItemType Directory ;
  }

  try {
    # Download het archief
    Invoke-WebRequest -Uri $ArchiveUrl -OutFile $ArchivePath

    # Uitpakken van het archief met het volledige pad naar 7z
    & $7zPath x $ArchivePath -o"$ScrubberPath"

    Write-Host "Het archief is succesvol gedownload en uitgepakt naar: $ScrubberPath"
  }
  catch {
    Write-Host "Er is een fout opgetreden bij het downloaden en uitpakken van het archief: $_"
  }
  finally {
    # Opruimen: Verwijder het gedownloade archief
    Remove-Item -Path $ArchivePath -Force
  }
}


##################################################
#                  SCRIPT START                  #
##################################################
# Step 1: Check if OfficeDeploymentTool is installed

if (Test-Path -Path $setupExe -PathType Leaf) {
  Write-Host "Microsoft OfficeDeploymentTool is already installed." -ForegroundColor Green
}
else {
  Write-Host "Microsoft OfficeDeploymentTool is not installed." -ForegroundColor Yellow
  Write-Host "Do you want to install Microsoft OfficeDeploymentTool?" -ForegroundColor Yellow
  $confirmation = Read-Host "Y/N, press Enter for Yes"
  if ($confirmation -eq 'Y' -or $confirmation -eq 'y' -or $confirmation -eq '') {
  
    Write-Host "Installing Microsoft OfficeDeploymentTool..."
    # Use Winget (problematic)
    # winget install -h Microsoft.OfficeDeploymentTool

    # Use Get-ODTUri function
    New-Item -Path $odtPath -ItemType Directory -Force ;
    New-Item -Path $OfficeUtilPath -ItemType Directory -Force ;
    $URL = $(Get-ODTUri)
    # $URL = "https://officecdn.microsoft.com/pr/wsus/setup.exe"
    Invoke-WebRequest -Uri $URL -OutFile $odtInstaller
    Start-Process -Wait $odtInstaller -ArgumentList $odtInstallerArgs
  }
  else {
    Write-Host "You chose not to install Microsoft OfficeDeploymentTool. Proceed to step 2."
  }
}

# Step 2: Check if required files are present
$requiredFiles = @(
  @{
    Name       = "config365.xml";
    PrettyName = "Office 365 Business Configuration File";
    Url        = "https://github.com/technoluc/winutil/raw/main-custom/office/config365.xml"
  },
  @{
    Name       = "config21.xml";
    PrettyName = "Office 21 Pro Plus Configuration File";
    Url        = "https://github.com/technoluc/winutil/raw/main-custom/office/config21.xml"
  }
)

# Step 3: Get the full path of the required files
foreach ($fileInfo in $requiredFiles) {
  $filePath = Join-Path -Path $odtPath -ChildPath $fileInfo.Name
  
  #Step 4: Test full path of the required files
  if (-not (Test-Path -Path $filePath -PathType Leaf)) {
    # Remove-Item -Force "$($filePath)" Doens't make sense here but WIP
    $confirmation = Read-Host "Do you want to download $($fileInfo.PrettyName)? (Y/N, press Enter for Yes)"
    if ($confirmation -eq 'Y' -or $confirmation -eq 'y' -or $confirmation -eq '') {
      if (-not (Test-Path -Path $odtPath -PathType Container)) {
          New-Item -Path $odtPath -ItemType Directory | Out-Null ;
      Write-Host ("Downloading $($fileInfo.PrettyName)...") -ForegroundColor Cyan
      $downloadUrl = $fileInfo.Url
      Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath
    }
    else {
      Write-Host ("You chose not to download $($fileInfo.PrettyName).") -ForegroundColor Red
    }
  }
  else {
    Write-Host ("$($fileInfo.PrettyName) is already present.") -ForegroundColor Green
  }
}


# Controleer of Office al is geïnstalleerd
if (Test-Path "C:\Program Files\Microsoft Office") {
  Write-Host "Microsoft Office is already installed." -ForegroundColor Green
  $confirmation = Read-Host "Do you want to run Microsoft Activation Scripts (MAS), OfficeRemovalTool or OfficeScrubber? (Y/N, press Enter for Yes)"
  if ($confirmation -eq 'Y' -or $confirmation -eq 'y' -or $confirmation -eq '') {
    ScriptMenu
    # Start-Process -FilePath powershell.exe -ArgumentList "Invoke-WebRequest $OfficeRemovalToolUrl -OutFile $OfficeRemovalToolPath; powershell -ExecutionPolicy Bypass $OfficeRemovalToolPath"
    # Read-Host "Pressop Enter to continue..."
    # Write-Host "Select [R] Remove all Licenses option in OfficeScrubber." -ForegroundColor Yellow
    # Expand-7zArchive -ArchiveUrl $ArchiveUrl -ScrubberPath $ScrubberPath -ScrubberArchive $ScrubberArchive
    # Start-Process -Verb runas -FilePath "cmd.exe" -ArgumentList "/C $ScrubberFullPath "
    # break
  }
  else {
    Write-Host "No Actions ." -ForegroundColor Red
    return
  }
}
else {
  # Vraag de gebruiker om bevestiging voordat de configuratie wordt uitgevoerd
  $confirmation = Read-Host "Microsoft Office is not installed. Do you want to install and configure it now? (Y/N, press Enter for Yes)"
  if ($confirmation -eq 'Y' -or $confirmation -eq 'y' -or $confirmation -eq '') {
    Write-Host "Druk op 'b' voor Office365 Business of 'c' voor Office21ProPlus."
    $key = $host.UI.RawUI.ReadKey("IncludeKeyDown,NoEcho")

    # Controleer de ingevoerde toets
    switch ($key.Character) {
      'b' {
        Start-Process -Wait $setupExe -ArgumentList "$UnattendedArgs365"
        Write-Host "Installation completed." -ForegroundColor Green
      }
      'c' {
        Start-Process -Wait $setupExe -ArgumentList "$UnattendedArgs21"
        Write-Host "Installation completed." -ForegroundColor Green
      }
      default {
        Write-Host "Ongeldige invoer." -ForegroundColor Red
      }
    }
  }
  else {
    Write-Host "You chose not to install and configure Microsoft Office. Exiting." -ForegroundColor Red
  }
}

$confirmation = Read-Host "Do you want to run Microsoft Activation Scripts (MAS), OfficeRemovalTool or OfficeScrubber? (Y/N, press Enter for Yes)"
if ($confirmation -eq 'Y' -or $confirmation -eq 'y' -or $confirmation -eq '') {
  ScriptMenu
}
else {
}




# Wait for user input before closing the script
Write-Host "Press Enter to close..."
$null = Read-Host

Remove-Item -Path $ArchivePath -Force
Remove-Item -Path $configuration21XML -Force
Remove-Item -Path $configuration365XML -Force
Remove-Item -Path $OfficeRemovalToolPath -Force
Remove-Item -Path $ScrubberFullPath -Force
