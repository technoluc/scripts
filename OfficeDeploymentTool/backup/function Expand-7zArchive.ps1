function Expand-7zArchive {
    param (
        [string]$ArchiveUrl,
        [string]$ScrubberPath,
        [string]$ScrubberArchive,
        [string]$7zPath = "C:\Program Files\7-Zip\7z.exe"
    )

    # Combineer het pad naar het archief
    $ArchivePath = Join-Path -Path $ScrubberPath -ChildPath $ScrubberArchive

    # Maak de map als deze nog niet bestaat
    if (-not (Test-Path -Path $ScrubberPath -PathType Container)) {
        New-Item -Path $ScrubberPath -ItemType Directory
    }

    try {
        # Download het archief
        Invoke-WebRequest -Uri $ArchiveUrl -OutFile $ArchivePath

        # Uitpakken van het archief met het volledige pad naar 7z
        & $7zPath x $ArchivePath -o"$ScrubberPath"

        Write-Host "Het archief is succesvol gedownload en uitgepakt naar: $ScrubberPath"
    }
    catch {
        Write-Host "Er is een fout opgetreden bij het downloaden en uitpakken van het archief: $_"
    }
    finally {
        # Opruimen: Verwijder het gedownloade archief
        Remove-Item -Path $ArchivePath -Force
    }
}

# Voorbeeldgebruik van de functie
$ArchiveUrl = "https://github.com/abbodi1406/WHD/raw/master/scripts/OfficeScrubber_11.7z"
$ScrubberPath = "C:\OfficeScrubber"
$ScrubberArchive = "OfficeScrubber_11.7z"

Expand-7zArchive -ArchiveUrl $ArchiveUrl -ScrubberPath $ScrubberPath -ScrubberArchive $ScrubberArchive
