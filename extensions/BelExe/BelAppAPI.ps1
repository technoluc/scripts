Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Net.Http

# Define timer at the script level
$script:timer = $null

# Function to save the extension to a temporary file
function Save-Extension {
    param($extension)
    $tempPath = [System.IO.Path]::GetTempPath() + "extension_temp.txt"
    $extension | Out-File $tempPath
}

# Function to load the extension from a temporary file
function Load-Extension {
    $tempPath = [System.IO.Path]::GetTempPath() + "extension_temp.txt"
    if (Test-Path $tempPath) {
        $extension = Get-Content $tempPath
        $extensionTextBox.Text = $extension
    }
}

# Function to initiate a call via API
function Initiate-Call {
    try {
        # Validate extension format
        if (-not ($extensionTextBox.Text -match '^\d{3}$')) {
            [System.Windows.MessageBox]::Show("Invalid extension. Please enter three digits only.")
            return
        }

        # Validate phone number format
        if (-not ($phoneTextBox.Text -match '^\d+$')) {
            [System.Windows.MessageBox]::Show("Invalid phone number. Please enter digits only.")
            return
        }

        # Extract extension and phone number, then prepend zero to the phone number
        $extension = $extensionTextBox.Text
        $phoneNumber = '0' + ($phoneTextBox.Text -replace '[^\d]', '')  # Prepend zero and remove non-digit characters

        # Define API URL
        $apiKey = 'xxx'  # Replace with your actual API key
        $tenant = 'xxx'
        $account = "${extension}-${tenant}"
        $apiUrl = "https://pbx1.xxx.nl/pbx/proxyapi.php?key=$apiKey&reqtype=DIAL&source=$extension&dest=$phoneNumber&tenant=$tenant&account=$account"

        # Send API request
        $response = Invoke-RestMethod -Uri $apiUrl -Method Get

        if ($response -match 'Success') {
            $callButton.Dispatcher.Invoke({
                # Update the button to show success notification
                $callButton.Content = "Call Initiated"
            })
            
            # Save the extension when a call is initiated
            Save-Extension $extension
            
            # Stop and dispose existing timer before creating a new one
            if ($null -ne $script:timer) {
                $script:timer.Stop()
                $script:timer = $null  # Dispose the timer
            }

            # Initialize a new timer
            $script:timer = New-Object System.Windows.Threading.DispatcherTimer
            $script:timer.Interval = [TimeSpan]::FromSeconds(1)
            $script:timer.Add_Tick({
                $callButton.Dispatcher.Invoke({
                    $callButton.Content = "Initiate Call"
                })
                $script:timer.Stop()
                $script:timer = $null  # Reset timer after stopping
            })
            $script:timer.Start()
        }
        else {
            $callButton.Dispatcher.Invoke({
                [System.Windows.MessageBox]::Show("Failed to initiate call. Response: $response")
            })
        }
    } catch {
        [System.Windows.MessageBox]::Show("Failed to initiate call. Error: $_")
    }
}


# Create the main window
$window = New-Object System.Windows.Window
$window.Title = "Bel App"
$window.SizeToContent = 'WidthAndHeight'
$window.MinWidth = 250
$window.MinHeight = 150

# Calculate the bottom right position of the window
$screen = [System.Windows.SystemParameters]::WorkArea
$window.Left = $screen.Right - $window.minWidth
$window.Top = $screen.Bottom - $window.minHeight

# Ensure the window opens in the foreground
$window.WindowStartupLocation = [System.Windows.WindowStartupLocation]::Manual
$window.Activate()
$window.Topmost = $true  # Make window always on top to ensure it's in the foreground

# Create a grid layout for organizing UI elements
$grid = New-Object System.Windows.Controls.Grid
$column1 = New-Object System.Windows.Controls.ColumnDefinition
$column2 = New-Object System.Windows.Controls.ColumnDefinition
$grid.ColumnDefinitions.Add($column1)
$grid.ColumnDefinitions.Add($column2)

# Add rows to the grid
for ($i = 0; $i -lt 3; $i++) {
    $row = New-Object System.Windows.Controls.RowDefinition
    $grid.RowDefinitions.Add($row)
}

# Define GUI elements
$extensionLabel = New-Object System.Windows.Controls.Label
$extensionLabel.Content = "Extension:"
$phoneLabel = New-Object System.Windows.Controls.Label
$phoneLabel.Content = "Phone Number:"
$extensionTextBox = New-Object System.Windows.Controls.TextBox
$phoneTextBox = New-Object System.Windows.Controls.TextBox
$callButton = New-Object System.Windows.Controls.Button
$callButton.Content = "Initiate Call"
$callButton.Background = 'Green'
$callButton.FontWeight = 'Bold'
$callButton.Foreground = 'White'
$callButton.Height = 40  # Make the button bigger

# Arrange GUI elements in the grid
$grid.Children.Add($extensionLabel) | Out-Null
$grid.Children.Add($extensionTextBox) | Out-Null
$grid.Children.Add($phoneLabel) | Out-Null
$grid.Children.Add($phoneTextBox) | Out-Null
$grid.Children.Add($callButton) | Out-Null
$extensionLabel.SetValue([System.Windows.Controls.Grid]::RowProperty, 0)
$extensionLabel.SetValue([System.Windows.Controls.Grid]::ColumnProperty, 0)
$extensionTextBox.SetValue([System.Windows.Controls.Grid]::RowProperty, 0)
$extensionTextBox.SetValue([System.Windows.Controls.Grid]::ColumnProperty, 1)
$phoneLabel.SetValue([System.Windows.Controls.Grid]::RowProperty, 1)
$phoneLabel.SetValue([System.Windows.Controls.Grid]::ColumnProperty, 0)
$phoneTextBox.SetValue([System.Windows.Controls.Grid]::RowProperty, 1)
$phoneTextBox.SetValue([System.Windows.Controls.Grid]::ColumnProperty, 1)
$callButton.SetValue([System.Windows.Controls.Grid]::RowProperty, 2)
$callButton.SetValue([System.Windows.Controls.Grid]::ColumnProperty, 0)
$callButton.SetValue([System.Windows.Controls.Grid]::ColumnSpanProperty, 2)

# Event handler for button click to initiate call
$callButton.Add_Click({ Initiate-Call })

# Event handler for pressing Enter key in phoneTextBox to initiate call
$phoneTextBox.Add_KeyDown({
    if ($_.Key -eq 'Return') { Initiate-Call }
})

# Event handler to load the extension on window load
$window.Add_Loaded({ Load-Extension })

# Display the window
$window.Content = $grid
$window.ShowDialog()
