Start-Transcript $ENV:TEMP\testmenu.log -Append

#Load DLLs
Add-Type -AssemblyName System.Windows.Forms


$sync.PSScriptRoot = $PSScriptRoot
$sync.version = "#{replaceme}"

