# winget install 7zip.7zip -h

# OfficeScrubber Pad
$scrubberPath = "C:\OfficeScrubber"

# Bestandsnaam voor het gedownloade archief
$archiveName = "OfficeScrubber_11.7z"

# Combineer $scrubberPath en $archiveName tot een compleet pad
$archivePath = Join-Path -Path $scrubberPath -ChildPath $archiveName

# URL van het 7z-archief
$7zUrl = "https://github.com/abbodi1406/WHD/raw/master/scripts/OfficeScrubber_11.7z"

# Bestandsnaam van OfficeScrubber.cmd
$officescrubberCmd = "OfficeScrubber.cmd"

# Combineer $tempPath en $archiveName tot een compleet pad
$officescrubberPath = Join-Path -Path $scrubberPath -ChildPath $officescrubberCmd


# De map maken als deze nog niet bestaat
if (-not (Test-Path -Path $scrubberPath -PathType Container)) {
  New-Item -Path $scrubberPath -ItemType Directory
}

try {
  # Download het archief
  Invoke-WebRequest -Uri $7zUrl -OutFile (Join-Path -Path $scrubberPath -ChildPath $archiveName)
    
  # Uitpakken van het archief met het volledige pad naar 7z
  & "C:\Program Files\7-Zip\7z.exe" x "$archivePath" -o"C:\OfficeScrubber"

  Write-Host "Het archief is succesvol gedownload en uitgepakt naar: $scrubberPath"
}
catch {
  Write-Host "Er is een fout opgetreden bij het downloaden en uitpakken van het archief: $_"
}
finally {
  # Opruimen: Verwijder het gedownloade archief
  Remove-Item -Path (Join-Path -Path $scrubberPath -ChildPath $archiveName) -Force
}

# Voer het OfficeScrubber CMD-bestand uit
Start-Process -Verb runas -FilePath "cmd.exe" -ArgumentList "/C $officescrubberPath "
