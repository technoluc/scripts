Add-Type -AssemblyName PresentationCore, PresentationFramework

# Define actual values for variables used in XAML
$MainBackgroundColor = "LightGray"  # Replace with your desired color
$ButtonInstallBackgroundColor = "Green"
$ButtonInstallForegroundColor = "Yellow"
# XAML definition for the window
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
Title="WPF UI Example" Width="800" Height="600">
<Grid>
<Grid.RowDefinitions>
    <RowDefinition Height=".1*"/>
    <RowDefinition Height=".9*"/>
</Grid.RowDefinitions>
<Grid.ColumnDefinitions>
    <ColumnDefinition Width="*"/>
</Grid.ColumnDefinitions>

<!-- Row 0: DockPanel with Image and TabItems -->
<DockPanel SnapsToDevicePixels="True" Grid.Row="0" Width="1100">
    <Image Source="logo.png" Width="50" Height="50"/>
    <TabControl DockPanel.Dock="Top">
        <TabItem Header="Tab 1">
            <Button Content="Button 1" HorizontalAlignment="Left" Height="40" Width="100" Background="$ButtonInstallBackgroundColor" Foreground="$ButtonInstallForegroundColor" FontWeight="Bold" Name="WPFTab1BT"/>
        </TabItem>
        <TabItem Header="Tab 2">
            <Button Content="Button 2"/>
        </TabItem>
        <TabItem Header="Tab 3">
            <Button Content="Button 3"/>
        </TabItem>
        <TabItem Header="Tab 4">
            <Button Content="Button 4"/>
        </TabItem>
    </TabControl>
</DockPanel>

<!-- Row 1: TabControl with TabItems and Grids -->
<TabControl Grid.Row="1">
    <TabItem Header="Updates" Visibility="Collapsed">
        <Grid Background="#555555">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            <StackPanel Background="$MainBackgroundColor" SnapsToDevicePixels="True" Grid.Column="0" Margin="10,5">
                <Button Name="WPFUpdatesdefault" FontSize="16" Content="Default (Out of Box) Settings" Margin="20,4,20,10" Padding="10"/>
                <TextBlock Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300">This is the default settings that come with Windows. No modifications are made and will remove any custom windows update settings.</TextBlock>
            </StackPanel>
            <StackPanel Background="$MainBackgroundColor" SnapsToDevicePixels="True" Grid.Column="1" Margin="10,5">
                <Button Name="WPFUpdatessecurity" FontSize="16" Content="Security (Recommended) Settings" Margin="20,4,20,10" Padding="10"/>
                <TextBlock Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300">This is my recommended setting I use on all computers. It will delay feature updates by 2 years and will install security updates 4 days after release.</TextBlock>
            </StackPanel>
            <StackPanel Background="$MainBackgroundColor" SnapsToDevicePixels="True" Grid.Column="2" Margin="10,5">
                <Button Name="WPFUpdatesdisable" FontSize="16" Content="Disable ALL Updates (NOT RECOMMENDED!)" Margin="20,4,20,10" Padding="10,10,10,10"/>
                <TextBlock Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300">This completely disables ALL Windows Updates and is NOT RECOMMENDED. However, it can be suitable if you use your system for a select purpose and do not actively browse the internet.</TextBlock>
                <TextBlock Text=" " Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300"/>
            </StackPanel>
        </Grid>
    </TabItem>
    <!-- Add more TabItems as needed -->
</TabControl>
</Grid>
</Window>
"@

# Load XAML
$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader] $xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

# Show the window
$window.ShowDialog() | Out-Null
