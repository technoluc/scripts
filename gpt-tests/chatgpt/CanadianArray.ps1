$canadarray = @("buddy", "friend", "guy")
$i = 0
$j = 1

while ($true) {
    if ($i -ge $canadarray.Length) { $i = 0 }
    if ($j -ge $canadarray.Length) { $j = 0 }

    $message = "I'm not your $($canadarray[$i]), $($canadarray[$j])!"
    
    # Create an ANSI escape code to clear the line and move the cursor to the beginning
    $clearLine = [char]27 + "[2K" + [char]13
    
    Write-Host -NoNewline $clearLine$message
    Start-Sleep -Seconds 1
    
    $i++
    $j++
  }