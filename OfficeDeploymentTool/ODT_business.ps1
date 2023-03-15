# Set variables
$setupExe = "C:\ODT\OfficeDeploymentTool.exe"
$configurationXML = "C:\ODT\Business.xml"

# Download the Office Deployment Tool (ODT)
Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/?linkid=864572" -OutFile $setupExe

# Create an XML configuration file
@"
<!-- This configuration file installs Office 365 Business 64-bit version -->
<Configuration>
    <!-- Set the Office client edition and update channel -->
    <Add OfficeClientEdition="64" Channel="Monthly">
        <!-- Specify the product to install -->
        <Product ID="O365BusinessRetail">
            <!-- Set the language of the installation to Dutch -->
            <Language ID="nl-nl" />
            <!-- Exclude unwanted apps -->
            <ExcludeApp ID="OneNote" />
            <ExcludeApp ID="Groove" />
            <ExcludeApp ID="InfoPath" />
        </Product>
    </Add>
    <!-- Enable updates and set the update channel -->
    <Updates Enabled="TRUE" Channel="Monthly" />
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
