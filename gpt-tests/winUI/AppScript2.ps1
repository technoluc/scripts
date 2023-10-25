# Load WPF assemblies
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# Define XAML file path
$xamlPath = ".\AppUI.xaml"

# Create a WPF window
$window = New-Object Windows.Window

# Load XAML content into a Grid
$xamlReader = [xml](Get-Content -Raw -Path $xamlPath)
$xamlContent = [Windows.Markup.XamlReader]::Load((New-Object Windows.Markup.XamlReader).ReadNode((New-Object System.Xml.XmlNodeReader $xamlReader)))

# Set the content of the window to the loaded XAML content
$window.Content = $xamlContent

# Get references to UI elements
$appLogo = $window.FindName("appLogo")
$appName = $window.FindName("appName")
$tab1Button = $window.FindName("tab1Button")
$tab2Button = $window.FindName("tab2Button")
$tab3Button = $window.FindName("tab3Button")
$mainContent = $window.FindName("mainContent")

# Define the functionality for each tab
function ShowTab1 {
    $mainContent.Text = "Content for Tab 1"
}

function ShowTab2 {
    $mainContent.Text = "Content for Tab 2"
}

function ShowTab3 {
    $mainContent.Text = "Content for Tab 3"
}

# Set event handlers for tab buttons
$tab1Button.Add_Click({ ShowTab1 })
$tab2Button.Add_Click({ ShowTab2 })
$tab3Button.Add_Click({ ShowTab3 })

# Start the WPF application
$window.ShowDialog() | Out-Null
