function Invoke-Cmd {
  param (
    [string]$Url
  )

  # Tijdelijk pad voor het opslaan van het CMD-bestand
  $tempFile = [System.IO.Path]::GetTempFileName() + ".cmd"

  try {
    # Download het CMD-bestand naar het tijdelijke bestand
    Invoke-WebRequest -Uri $Url -OutFile $tempFile

    # Voer het tijdelijke CMD-bestand uit
    Start-Process -Verb runas -FilePath "cmd.exe" -ArgumentList "/C $tempFile"

    # Wacht tot het proces is voltooid
    Wait-Process -Name cmd
  }
  finally {
    # Verwijder het tijdelijke bestand
    Remove-Item -Path $tempFile -Force
  }
}