Add-Type -AssemblyName PresentationCore, PresentationFramework

# Define actual values for variables used in XAML
$MainBackgroundColor = "Black"  # Replace with your desired color
$ButtonInstallBackgroundColor = "Blue"
$ButtonInstallForegroundColor = "White"
# XAML definition for the window
$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
            Title="WPF UI Example" Width="1200" Height="800">
        <Grid>
            <Grid.RowDefinitions>
                <RowDefinition Height=".1*"/>
                <RowDefinition Height=".9*"/>
            </Grid.RowDefinitions>
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
            </Grid.ColumnDefinitions>
            
            <!-- Row 0: DockPanel with Image and TabItems -->
            <DockPanel Grid.Row="0">
                <Image Source="https://christitus.com/images/logo-full.png" Height="50" Width="50" Margin="0,10,0,10"/>
                <Button Content="Install" HorizontalAlignment="Left" Height="40" Width="100" Name="WPFTab1BT"/>
                <Button Content="Tweaks" HorizontalAlignment="Left" Height="40" Width="100" Name="WPFTab2BT"/>
                <Button Content="Config" HorizontalAlignment="Left" Height="40" Width="100" Name="WPFTab3BT"/>
                <Button Content="Updates" HorizontalAlignment="Left" Height="40" Width="100" Name="WPFTab4BT"/>
            </DockPanel>
            
            <!-- Row 1: TabControl with TabItems and Grids -->
            <TabControl Grid.Row="1" Name="WPFTabNav" Background="#222222">
                <!-- TabItem 1: Install -->
                <TabItem Header="Install" Visibility="Collapsed" Name="WPFTab1">
                    <Grid Background="#222222">
                        <Grid.ColumnDefinitions>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="*"/>
                            <ColumnDefinition Width="*"/>
                        </Grid.ColumnDefinitions>
                        <Grid.RowDefinitions>
                            <RowDefinition Height=".10*"/>
                            <RowDefinition Height=".90*"/>
                        </Grid.RowDefinitions>

                        <StackPanel Orientation="Horizontal" Grid.Row="0" HorizontalAlignment="Center" Grid.Column="0" Grid.ColumnSpan="3" Margin="10">
                            <Label Content="Winget:" FontSize="17" VerticalAlignment="Center"/>
                            <Button Name="WPFinstall" Content=" Install Selection " Margin="7"/>
                            <Button Name="WPFInstallUpgrade" Content=" Upgrade All " Margin="7"/>
                            <Button Name="WPFuninstall" Content=" Uninstall Selection " Margin="7"/>
                            <Button Name="WPFGetInstalled" Content=" Get Installed " Margin="7"/>
                            <Button Name="WPFclearWinget" Content=" Clear Selection " Margin="7"/>
                        </StackPanel>

                        <!-- Add more UI elements for TabItem 1 as needed -->

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
    
