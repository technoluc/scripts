Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase


[xml]$xaml = @'
<Window
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="OfficeUtil GUI" Height="350" Width="500">
    <Grid>
        <StackPanel>
            <Button x:Name="btnInstallOffice" Content="Install Microsoft Office" Width="200" Height="30" Margin="10"/>
            <Button x:Name="btnUninstallOffice" Content="Uninstall Microsoft Office" Width="200" Height="30" Margin="10"/>
            <Button x:Name="btnActivateOffice" Content="Activate Microsoft Office / Windows" Width="200" Height="30" Margin="10"/>
            <Button x:Name="btnExit" Content="Exit" Width="200" Height="30" Margin="10"/>
        </StackPanel>
    </Grid>
</Window>
'@

# Load XAML
[Windows.Markup.XamlLoader]::Load((New-Object Windows.Markup.XmlLoader -Argument $xaml))

# Define button click actions
$btnInstallOffice = $Window.FindName('btnInstallOffice')
$btnUninstallOffice = $Window.FindName('btnUninstallOffice')
$btnActivateOffice = $Window.FindName('btnActivateOffice')
$btnExit = $Window.FindName('btnExit')

# Function to handle Install Office button click
function Install-Office {
    # Your existing Install Office code goes here
    Write-Host "Installing Microsoft Office"
}

# Function to handle Uninstall Office button click
function Uninstall-Office {
    # Your existing Uninstall Office code goes here
    Write-Host "Uninstalling Microsoft Office"
}

# Function to handle Activate Office button click
function Activate-Office {
    # Your existing Activate Office code goes here
    Write-Host "Activating Microsoft Office / Windows"
}

# Function to handle Exit button click
function Exit-App {
    $Window.Close()
}

# Assign click event handlers
$btnInstallOffice.Add_Click({ Install-Office })
$btnUninstallOffice.Add_Click({ Uninstall-Office })
$btnActivateOffice.Add_Click({ Activate-Office })
$btnExit.Add_Click({ Exit-App })

<# # Show the window
[Windows.Markup.XamlLoader]::Load((New-Object Windows.Markup.XmlLoader -Argument $xaml))
$Window.ShowDialog() #>


# Load XAML
$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader] $xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

# Show the window
$window.ShowDialog() | Out-Null