# SPDX-License-Identifier: MIT

#Configure max thread count for RunspacePool.
$maxthreads = [int]$env:NUMBER_OF_PROCESSORS

#Create a new session state for parsing variables ie hashtable into our runspace.
$hashVars = New-object System.Management.Automation.Runspaces.SessionStateVariableEntry -ArgumentList 'sync',$sync,$Null
$InitialSessionState = [System.Management.Automation.Runspaces.InitialSessionState]::CreateDefault()

#Add the variable to the RunspacePool sessionstate
$InitialSessionState.Variables.Add($hashVars)

#Add functions
$functions = Get-ChildItem function:\ | Where-Object {$_.name -like "*winutil*" -or $_.name -like "*WPF*"}
foreach ($function in $functions){
    $functionDefinition = Get-Content function:\$($function.name)
    $functionEntry = New-Object System.Management.Automation.Runspaces.SessionStateFunctionEntry -ArgumentList $($function.name), $functionDefinition
    
    # And add it to the iss object
    $initialSessionState.Commands.Add($functionEntry)
}

#Create our runspace pool. We are entering three parameters here min thread count, max thread count and host machine of where these runspaces should be made.
$sync.runspace = [runspacefactory]::CreateRunspacePool(1,$maxthreads,$InitialSessionState, $Host)

#Open a RunspacePool instance.
$sync.runspace.Open()

#===========================================================================
# Setup background config
#===========================================================================

#Load information in the background
Invoke-WPFRunspace -ScriptBlock {
    $sync.ConfigLoaded = $False

    $sync.ComputerInfo = Get-ComputerInfo

    $sync.ConfigLoaded = $True
} | Out-Null

#===========================================================================
# Shows the form
#===========================================================================

Invoke-WPFFormVariables

$sync["Form"].title = $sync["Form"].title + " " + $sync.version
$sync["Form"].Add_Closing({
    $sync.runspace.Dispose()
    $sync.runspace.Close()
    [System.GC]::Collect()
})

$sync["Form"].ShowDialog() | out-null
Stop-Transcript
