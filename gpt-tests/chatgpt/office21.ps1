<#
.SYNOPSIS
Download, install and activate Office on Windows.

.DESCRIPTION
Placeholder.

.NOTES
File Name      : office.ps1
Author         : TechnoLuc
GitHub Repo    : https://github.com/technoluc/$placeholderRepo
Version        : 0.1
#>

param (
    [string]$odtPath = "C:\Program Files\OfficeDeploymentTool"
    )

# Construct full file paths for the icons
$odtExe = "setup.exe"
$odtInstallcmd = "i"
$odtConfigXML =
$odtActivation =

$odt = "$odtPath\$odtExe"


# Download the config files if they don't exist locally
if (-not(Test-Path -Path $odt -PathType Leaf)) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList "-command iwr -outf 'C:\Program Files\OfficeDeploymentTool\config.xml' 'https://github.com/technoluc/winutil/raw/main/office/deploymentconfig.xml' ; iwr -outf 'C:\Program Files\OfficeDeploymentTool\install.cmd' 'https://github.com/technoluc/winutil/raw/main/office/deploymentinstall.cmd' ; iwr -outf 'C:\Program Files\OfficeDeploymentTool\activate.cmd' 'https://github.com/technoluc/winutil/raw/main/office/ActivateOffice21.cmd'" -Wait
}