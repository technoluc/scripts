<#
.SYNOPSIS
This script checks if the OfficeDeploymentTool and the required files are present. 
If they are missing, the user is prompted to install or download them.

.DESCRIPTION
This script checks if the "C:\Program Files\OfficeDeploymentTool" directory exists and if the "setup.exe" file is present. 
If not, the user is prompted to install Microsoft OfficeDeploymentTool using winget. 
Then it checks if the "activate.cmd," "config.xml," and "install.cmd" files are present. 
If they are missing, the user is prompted to download them.

.NOTES
File Name: Install-OfficeDeployment.ps1
Author: TechnoLuc
Version: 1.0
Last Updated: 09/29/2023

.PARAMETER InstallODT
Enable this parameter to perform the installation of Microsoft OfficeDeploymentTool.

param (
    [switch]$InstallODT
)

#>

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Output "OfficeUtil needs to be run as Administrator. Attempting to relaunch."
  Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "iwr -useb https://raw.githubusercontent.com/technoluc/scripts/main/OfficeDeploymentTool/Install-OfficeDeployment.ps1 | iex"
  break
}

# Set variables
$odtPath = "C:\Program Files\OfficeDeploymentTool"
$setupExe = "C:\Program Files\OfficeDeploymentTool\setup.exe"
$configurationXML = "C:\Program Files\OfficeDeploymentTool\config.xml"

# Step 1: Check if OfficeDeploymentTool is installed
if (Test-Path -Path $odtPath -PathType Container) {
  Write-Host "Microsoft OfficeDeploymentTool is already installed. Proceed to step 2."
}
else {
  Write-Host "Microsoft OfficeDeploymentTool is not installed."
    
  $defaultValue = 'Y'
  if (($result = Read-Host "Do you want to install Microsoft OfficeDeploymentTool? (Y/N, default is $defaultValue)").Trim().ToUpper() -eq '' -or $result -eq 'Y') {
    Write-Host "Installing Microsoft OfficeDeploymentTool..."
    winget install -h Microsoft.OfficeDeploymentTool
  }
  else {
    Write-Host "You chose not to install Microsoft OfficeDeploymentTool. Proceed to step 2."
  }
}

# Step 2: Check if required files are present
$requiredFiles = @(
  @{
    Name = "activate.cmd";
    PrettyName = "Activate Office Script";
    Url = "https://github.com/technoluc/winutil/raw/main-custom/office/ActivateOffice21.cmd"
  },
  @{
    Name = "install.cmd";
    PrettyName = "Install Office Script";
    Url = "https://github.com/technoluc/winutil/raw/main-custom/office/deploymentinstall.cmd"
  },
  @{
    Name = "config.xml";
    PrettyName = "Office Configuration File";
    Url = "https://github.com/technoluc/winutil/raw/main-custom/office/deploymentconfig.xml"
  }
)

foreach ($fileInfo in $requiredFiles) {
  $filePath = Join-Path -Path $odtPath -ChildPath $fileInfo.Name

  if (-not (Test-Path -Path $filePath -PathType Leaf)) {
    $defaultValue = 'Y'
    $result = Read-Host -Prompt ("Do you want to download $($fileInfo.PrettyName)? (Y/N, default is $defaultValue)")

    if ($result.Trim().ToUpper() -eq '' -or $result -eq 'Y') {
      Write-Host ("Downloading $($fileInfo.PrettyName)...")
      $downloadUrl = $fileInfo.Url
      Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath
    }
    else {
      Write-Host ("You chose not to download $($fileInfo.PrettyName).")
    }
  }
  else {
    Write-Host ("$($fileInfo.PrettyName) is already present in the directory $odtPath.")
  }
}


Start-Process -Wait $setupExe -ArgumentList "/configure `"$configurationXML`""

Write-Host "After installation completes, execute irm https://massgrave.dev/get | iex to activate."
# Wait for user input before closing the script
Write-Host "Press Enter to close..."
$null = Read-Host
