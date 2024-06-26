Add-Type -AssemblyName PresentationFramework

<# Add-Type -TypeDefinition @"
using System;
using System.Windows;
using System.Windows.Markup;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }
}
"@ #>
$xaml = @"
<Window x:Class="MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
        xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
        xmlns:local="clr-namespace:WinUtility"
        mc:Ignorable="d"
        WindowStartupLocation="CenterScreen"
        Title="WinUtil" Height="800" Width="1200">
    
    <Border Name="WPFdummy" Grid.Column="0" Grid.Row="1">
        <Viewbox Stretch="Uniform" VerticalAlignment="Top">
            <Grid Background="White" ShowGridLines="False" Name="WPFMainGrid">
                <Grid.RowDefinitions>
                    <RowDefinition Height=".1*"/>
                    <RowDefinition Height=".9*"/>
                </Grid.RowDefinitions>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                </Grid.ColumnDefinitions>
                <DockPanel Background="White" SnapsToDevicePixels="True" Grid.Row="0" Width="1100">
                    <Image Height="50" Width="50" Name="WPFIcon" SnapsToDevicePixels="True" Source="logo.png" Margin="0,10,0,10"/>
                    <Button Content="WinUtil" HorizontalAlignment="Left" Height="40" Width="100" 
                        Background="Blue" Foreground="White" FontWeight="Bold" Name="WPFTab1BT" ToolTip="WinUtil Tab"/>
                    <Button Content="BinUtil" HorizontalAlignment="Left" Height="40" Width="100" 
                        Background="Black" Foreground="Blue" FontWeight="Bold" Name="WPFTab2BT" ToolTip="BinUtil Tab"/>
                    <Button Content="OfficeUtil" HorizontalAlignment="Left" Height="40" Width="100" 
                        Background="Black" Foreground="Blue" FontWeight="Bold" Name="WPFTab3BT" ToolTip="OfficeUtil Tab"/>
                </DockPanel>
                <TabControl Grid.Row="1" Padding="-1" Name="WPFTabNav" Background="Blue">

                    <TabItem Header="WinUtil" Visibility="Visible" Name="WPFTab1">
                        <Grid Background="White">
                            <!-- Content for WinUtil tab goes here -->
                            <Label Content="WinUtil Tab Content" FontSize="16"/>
                            <!-- Add your UI elements and functionality here -->
                        </Grid>
                    </TabItem>
                    
                    <TabItem Header="BinUtil" Visibility="Collapsed" Name="WPFTab2">
                        <Grid Background="Black">
                            <!-- Content for BinUtil tab goes here -->
                            <Label Content="BinUtil Tab Content" FontSize="16"/>
                            <!-- Add your UI elements and functionality here -->
                        </Grid>
                    </TabItem>
                    
                    <TabItem Header="OfficeUtil" Visibility="Collapsed" Name="WPFTab3">
                        <Grid Background="Black">
                            <!-- Content for OfficeUtil tab goes here -->
                            <Label Content="OfficeUtil Tab Content" FontSize="16"/>
                            <!-- Add your UI elements and functionality here -->
                        </Grid>
                    </TabItem>
                    
                </TabControl>
            </Grid>
        </Viewbox>
    </Border>
</Window>
"@
<# [xml]$xaml = Get-Content -Path "AppUI.xaml" #>

$reader = [System.Xml.XmlReader]::Create([System.IO.StringReader] $xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)

$window.ShowDialog() | Out-Null

