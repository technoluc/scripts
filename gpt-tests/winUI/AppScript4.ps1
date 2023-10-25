Add-Type -AssemblyName PresentationCore, PresentationFramework

# XAML definition for the window
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="WPF UI Example" Height="400" Width="600">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height=".1*"/>
            <RowDefinition Height=".9*"/>
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
        </Grid.ColumnDefinitions>
        
        <!-- Row 0: TabControl in a DockPanel -->
        <DockPanel Grid.Row="0">
            <TabControl Name="MyTabControl">
                <!-- TabItem 1: Updates -->
                <TabItem Header="Updates" Visibility="Collapsed" Name="WPFTab4">
                    <Grid Background="#555555">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="*"/>
                        </Grid.ColumnDefinitions>
                        <StackPanel Background="{MainBackgroundColor}" SnapsToDevicePixels="True" Grid.Column="0" Margin="10,5">
                            <Button Name="WPFUpdatesdefault" FontSize="16" Content="Default (Out of Box) Settings" Margin="20,4,20,10" Padding="10"/>
                            <TextBlock Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300">This is the default settings that come with Windows. <LineBreak/><LineBreak/> No modifications are made and will remove any custom windows update settings.<LineBreak/><LineBreak/>Note: If you still encounter update errors, reset all updates in the config tab. That will restore ALL Microsoft Update Services from their servers and reinstall them to default settings.</TextBlock>
                        </StackPanel>
                        <StackPanel Background="{MainBackgroundColor}" SnapsToDevicePixels="True" Grid.Column="1" Margin="10,5">
                            <Button Name="WPFUpdatessecurity" FontSize="16" Content="Security (Recommended) Settings" Margin="20,4,20,10" Padding="10"/>
                            <TextBlock Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300">This is my recommended setting I use on all computers.<LineBreak/><LineBreak/> It will delay feature updates by 2 years and will install security updates 4 days after release.<LineBreak/><LineBreak/>Feature Updates: Adds features and often bugs to systems when they are released. You want to delay these as long as possible.<LineBreak/><LineBreak/>Security Updates: Typically these are pressing security flaws that need to be patched quickly. You only want to delay these a couple of days just to see if they are safe and don't break other systems. You don't want to go without these for ANY extended periods of time.</TextBlock>
                        </StackPanel>
                        <StackPanel Background="{MainBackgroundColor}" SnapsToDevicePixels="True" Grid.Column="2" Margin="10,5">
                            <Button Name="WPFUpdatesdisable" FontSize="16" Content="Disable ALL Updates (NOT RECOMMENDED!)" Margin="20,4,20,10" Padding="10,10,10,10"/>
                            <TextBlock Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300">This completely disables ALL Windows Updates and is NOT RECOMMENDED.<LineBreak/><LineBreak/> However, it can be suitable if you use your system for a select purpose and do not actively browse the internet. <LineBreak/><LineBreak/>Note: Your system will be easier to hack and infect without security updates.</TextBlock>
                            <TextBlock Text=" " Margin="20,0,20,0" Padding="10" TextWrapping="WrapWithOverflow" MaxWidth="300"/>
                        </StackPanel>
                    </Grid>
                </TabItem>
                <!-- Add more TabItems here as needed -->
            </TabControl>
        </DockPanel>
        
        <!-- Row 1: Content for the second row -->
        <!-- You can add more content here if needed -->
    </Grid>
</Window>
"@

# Load XAML
$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader] $xaml)
$window = [Windows.Markup.XamlReader]::Load($reader)

# Show the window
$window.ShowDialog() | Out-Null
