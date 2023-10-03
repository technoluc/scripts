function Display-Message($message, $color) {
    Invoke-Logo
    Write-Host $message -ForegroundColor $color
}

function Wait-For-KeyPress() {
    Write-Host -NoNewLine "Press any key to continue... "
    $x = [System.Console]::ReadKey().KeyChar
    Write-Host ""
}

