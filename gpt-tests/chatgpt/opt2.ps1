Om een grid van 9 knoppen te maken in een Windows Presentation Foundation (WPF) toepassing met PowerShell (PS1-script), waarbij elke knop zijn eigen naam heeft ("Display Name") en dezelfde functie aanroept met de "theme-name" als variabele, kun je de volgende stappen volgen:

1. Voeg een Grid-element toe aan je XAML-bestand, zoals eerder beschreven:

```xml
<Grid Name="buttonGrid">
    <!-- Hier worden de knoppen toegevoegd -->
</Grid>
```

2. In je PowerShell-script, kun je een for-lus gebruiken om de knoppen aan de Grid toe te voegen en hun eigenschappen in te stellen:

```powershell
# Functie die wordt aangeroepen wanneer een knop wordt geklikt
function ButtonClick($themeName) {
    Write-Host "Button with theme name $themeName is geklikt!"
}

# Associatieve array met knopnamen als sleutels en thema-namen als waarden
$buttonThemes = @{
    "Button1 Display Name" = "button1-theme-name"
    "Button2 Display Name" = "button2-theme-name"
    "Button3 Display Name" = "button3-theme-name"
    "Button4 Display Name" = "button4-theme-name"
    "Button5 Display Name" = "button5-theme-name"
    "Button6 Display Name" = "button6-theme-name"
    "Button7 Display Name" = "button7-theme-name"
    "Button8 Display Name" = "button8-theme-name"
    "Button9 Display Name" = "button9-theme-name"
}

# Loop door de associatieve array en voeg knoppen toe aan de Grid
foreach ($displayName in $buttonThemes.Keys) {
    $themeName = $buttonThemes[$displayName]
    
    $button = New-Object Windows.Controls.Button
    $button.Content = $displayName
    $button.Name = $themeName
    $button.Add_Click({ ButtonClick $themeName })
    $buttonGrid.Children.Add($button)
}
```

Dit script maakt een associatieve array (`$buttonThemes`) waarin de "Display Name" als sleutel wordt gebruikt en de "theme-name" als waarde. Vervolgens worden de knoppen aan de Grid toegevoegd met de juiste namen en klikgebeurtenissen die de `ButtonClick`-functie aanroepen met de "theme-name" als parameter.

Zorg ervoor dat je de juiste verwijzingen hebt naar de WPF-bibliotheek in je PowerShell-script, en dat je de functie `ButtonClick` definieert om de gewenste actie uit te voeren wanneer een knop wordt geklikt.