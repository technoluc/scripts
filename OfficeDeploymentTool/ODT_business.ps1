# Set variables
$setupExe = "C:\ODT\OfficeDeploymentTool.exe"
$configurationXML = "C:\ODT\Business.xml"


# Fetch URL of latest Office 365 Deployment Tool (ODT). 
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
        $ODTUri = $response.links | Where-Object {$_.outerHTML -like "*click here to download manually*"}
        Write-Output $ODTUri.href
    }
}


$URL = $(Get-ODTUri)


# Download the Office Deployment Tool (ODT)
Invoke-WebRequest -Uri $URL -OutFile $setupExe

# Create an XML configuration file
@"
<!-- This configuration file installs Office 365 Business 64-bit version -->
<Configuration>
    <!-- Set the Office client edition and update channel -->
    <Add OfficeClientEdition="64" Channel="Current">
        <!-- Specify the product to install -->
        <Product ID="O365BusinessRetail">
            <!-- Set the language of the installation to Dutch -->
            <Language ID="nl-nl" />
            <!-- Exclude unwanted apps -->
            <ExcludeApp ID="Access" />
            <ExcludeApp ID="Groove" />
            <ExcludeApp ID="InfoPath" />
            <ExcludeApp ID="Lync" />
            <ExcludeApp ID="OneNote" />
            <ExcludeApp ID="Publisher" />
        </Product>
    </Add>
    <!-- Enable updates and set the update channel -->
    <Updates Enabled="TRUE" Channel="Current" />
    <!-- Force applications to shut down during the installation process -->
    <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
    <!-- Suppress user interface display and accept the EULA automatically -->
    <Display Level="None" AcceptEULA="TRUE" />
    <!-- Set the logging level and path -->
    <Logging Level="Standard" Path="%temp%" />
    <!-- Enable shared computer activation -->
    <Property Name="SharedComputerLicensing" Value="1" />
</Configuration>
"@ | Out-File $configurationXML

# Install Office 365 Business using the ODT and configuration file
Start-Process -Wait $setupExe -ArgumentList "/configure `"$configurationXML`""

# Clean up
Remove-Item $setupExe
Remove-Item $configurationXML
