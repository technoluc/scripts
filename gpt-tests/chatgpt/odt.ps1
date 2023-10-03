function RunAsAdmin {
  if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Output "OfficeUtil needs to be run as Administrator. Attempting to relaunch."
    Start-Process -Verb runas -FilePath powershell.exe -ArgumentList "iwr -useb https://raw.githubusercontent.com/technoluc/scripts/main/OfficeDeploymentTool/Install-OfficeDeployment.ps1 | iex"
    return $true
  }
  return $false
}

function CheckAndInstallODT {
  $odtPath = "C:\Program Files\OfficeDeploymentTool"
  
  if (-not (Test-Path -Path $odtPath -PathType Container)) {
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
}

function DownloadFileIfNeeded {
  param (
    [string]$filePath,
    [string]$fileUrl
  )

  if (-not (Test-Path -Path $filePath -PathType Leaf)) {
    Write-Host ("$filePath is missing in the directory " + $odtPath)

    $defaultValue = 'Y'
    if (($result = Read-Host "Do you want to download $filePath? (Y/N), default is $defaultValue").Trim().ToUpper() -eq '' -or $result -eq 'Y') {
      Write-Host ("Downloading $filePath...")
      Invoke-WebRequest -Uri $fileUrl -OutFile $filePath
    }
    else {
      Write-Host ("You chose not to download $filePath.")
    }
  }
}

# Main script
if (RunAsAdmin) {
  break
}

CheckAndInstallODT

$odtPath = "C:\Program Files\OfficeDeploymentTool"
$setupExe = "C:\Program Files\OfficeDeploymentTool\setup.exe"
$configurationXML = "C:\Program Files\OfficeDeploymentTool\config.xml"

$requiredFiles = @(
  @{ Name = "activate.cmd"; Url = "https://github.com/technoluc/winutil/raw/main-custom/office/ActivateOffice21.cmd" },
  @{ Name = "install.cmd"; Url = "https://github.com/technoluc/winutil/raw/main-custom/office/deploymentinstall.cmd" },
  @{ Name = "config.xml"; Url = "https://github.com/technoluc/winutil/raw/main-custom/office/deploymentconfig.xml" }
)

foreach ($fileInfo in $requiredFiles) {
  $filePath = Join-Path -Path $odtPath -ChildPath $fileInfo.Name
  DownloadFileIfNeeded -filePath $filePath -fileUrl $fileInfo.Url
}

Start-Process -Wait $setupExe -ArgumentList "/configure `"$configurationXML`""

Write-Host "After installation completes, execute irm https://massgrave.dev/get | iex to activate."
Write-Host "Press Enter to close..."
$null = Read-Host