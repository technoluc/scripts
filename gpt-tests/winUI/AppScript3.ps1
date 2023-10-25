# Load WPF assemblies
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# Define XAML file path
$xamlPath = ".\AppUI.xaml"

# Create a WPF window
$window = New-Object Windows.Window

# Load XAML content
[Windows.Markup.XamlLoader]::Load((Get-Content -Raw -Path $xamlPath))

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

# Set the content of the window
$window.Content = $xaml

# Start the WPF application
$window.ShowDialog() | Out-Null
