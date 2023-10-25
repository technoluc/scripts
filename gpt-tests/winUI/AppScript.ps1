# Load WPF assemblies
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# Define XAML file path
$xamlPath = ".\AppUI.xaml"

# Load XAML content
$xaml = [Windows.Markup.XamlReader]::Load([System.Xml.XmlReader]::Create($xamlPath))

# Get references to UI elements
$appLogo = $xaml.FindName("appLogo")
$appName = $xaml.FindName("appName")
$tab1Button = $xaml.FindName("tab1Button")
$tab2Button = $xaml.FindName("tab2Button")
$tab3Button = $xaml.FindName("tab3Button")
$mainContent = $xaml.FindName("mainContent")

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

# Show the UI
[Windows.Application]::Current.MainWindow.Content = $xaml

# Start the WPF application
[void][System.Windows.Application]::Run()
