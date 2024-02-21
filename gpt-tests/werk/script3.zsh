#!/bin/zsh

# Functie om de tekst in groen te printen
print_green() {
  echo -e "\033[32m$1\033[0m"
}

# Functie om de tekst in rood te printen
print_red() {
  echo -e "\033[31m$1\033[0m"
}

# Functie om de tekst in geel te printen
print_yellow() {
  echo -e "\033[33m$1\033[0m"
}

# Functie om de Microsoft Office 365 Business te installeren
install_office365() {
  print_green "Microsoft Office 365 Business wordt geïnstalleerd..."
  # Download de nieuwste versie van Office 365 Business
  /usr/bin/curl --location --silent "https://go.microsoft.com/fwlink/?linkid=2009112" -o "O365BusinessPro.pkg"
  # Installeer Office 365 Business
  /usr/sbin/installer -pkg "O365BusinessPro.pkg" -target /
  sleep 2
  # Controleer of de installatie is geslaagd
  if [ $? -eq 0 ]; then
    print_green "Office 365 Business is succesvol geïnstalleerd."
  else
    print_red "Er is een fout opgetreden tijdens de installatie van Office 365 Business."
  fi
  # Verwijder het installatiepakket
  rm "O365BusinessPro.pkg"
  sleep 1
}

# Functie om de Microsoft Office 365 Business te installeren WITHOUT ROOT ACCESS
install_office365_rootless() {
  print_green "Microsoft Office 365 Business wordt geïnstalleerd..."
  # Download de nieuwste versie van Office 365 Business
  /usr/bin/curl --location --silent "https://go.microsoft.com/fwlink/?linkid=2009112" -o "O365BusinessPro.pkg"
  # Installeer Office 365 Business
  /usr/sbin/installer -pkg "O365BusinessPro.pkg" -target CurrentUserHomeDirectory
  sleep 2
  # Controleer of de installatie is geslaagd
  if [ $? -eq 0 ]; then
    print_green "Office 365 Business is succesvol geïnstalleerd."
  else
    print_red "Er is een fout opgetreden tijdens de installatie van Office 365 Business."
  fi
  # Verwijder het installatiepakket
  rm "O365BusinessPro.pkg"
  sleep 1
}

# Functie om Adobe Creative Cloud te installeren
install_adobecc() {
  print_green "Adobe Creative Cloud wordt geïnstalleerd..."
  curl -OL https://github.com/Installomator/Installomator/raw/main/Installomator.sh && sudo zsh ./Installomator.sh adobecreativeclouddesktop DEBUG=0
  sleep 2
  if [ $? -eq 0 ]; then
    print_green "Adobe Creative Cloud is succesvol geïnstalleerd."
  else
    print_red "Er is een fout opgetreden tijdens de installatie van Adobe Creative Cloud."
  fi
}

# Functie om Handoff-functies van iCloud uit te schakelen
disable_handoff() {
  print_green "Handoff-functies van iCloud worden uitgeschakeld..."
  # Voeg hier de logica toe om Handoff-functies van iCloud uit te schakelen
  sleep 2
  print_green "Handoff-functies van iCloud zijn uitgeschakeld."
}

# Functie om het opstartgeluid van de Mac uit te schakelen
disable_boot_sound() {
  print_green "Het opstartgeluid van de Mac wordt uitgeschakeld..."
  sudo nvram SystemAudioVolume=" "
}

# Functie om te controleren of alle bestandsextensies in Finder zichtbaar zijn
show_extensions=$(defaults read NSGlobalDomain AppleShowAllExtensions)

# Functie om alle bestandsextensies in Finder te laten zien
show_all_extensions() {
  defaults write NSGlobalDomain AppleShowAllExtensions -bool true
  print_green "Alle bestandsextensies worden nu weergegeven in Finder."
}

# Functie om alle bestandsextensies in Finder te verbergen
hide_all_extensions() {
  defaults write NSGlobalDomain AppleShowAllExtensions -bool false
  print_green "Alle bestandsextensies worden nu verborgen in Finder."
}

# Weergave van het menu
display_menu() {
  print_green "Menu:"
  echo "Installatie:"
  print_green "1. Microsoft Office 365 Business installeren"
  print_green "2. Adobe Creative Cloud installeren"
  echo "Instellingen:"
  print_green "3. Handoff-functies van iCloud uitschakelen"
  print_green "4. Opstartgeluid van de Mac uitschakelen"
  show_extensions=$(defaults read NSGlobalDomain AppleShowAllExtensions)
  if [ "$show_extensions" -eq 1 ]; then
    print_green "5. Alle bestandsextensies in Finder verbergen"
  else
    print_green "5. Alle bestandsextensies in Finder weergeven"
  fi
  print_red "9. Stoppen"
}

# Hoofdscript
clear

while true; do
  display_menu

  echo -n "Voer de gewenste optie in: "
  read choice

  case $choice in
  1)
    install_office365
    ;;
  2)
    install_office365_rootless
    ;;
  3)
    install_adobecc
    ;;
  4)
    disable_handoff
    ;;
  5)
    disable_boot_sound
    ;;
  6)
    if [ "$show_extensions" -eq 1 ]; then
      hide_all_extensions
    else
      show_all_extensions
    fi
    ;;
  *)
    if [[ $choice =~ ^[1-6]$ ]]; then
      print_red "Ongeldige optie. Probeer opnieuw."
    elif [[ $choice == 9 ]]; then
      print_red "Het script wordt gestopt."
      break
    else
      print_red "Ongeldige invoer. Voer een nummer in van 1 tot 5 of 9 om te stoppen."
    fi
    ;;
  esac

  sleep 1
  clear
done
