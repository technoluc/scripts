#!/bin/zsh

# Functie om de tekst in groen te printen
print_green() {
  echo -e "\033[32m$1\033[0m"
}

# Functie om de tekst in rood te printen
print_red() {
  echo -e "\033[31m$1\033[0m"
}

# Functie om de Microsoft Office 365 Business te installeren
install_office365() {
  print_green "Microsoft Office 365 Business wordt geïnstalleerd..."
  # Voeg hier de installatielogica voor Office 365 Business toe
  sleep 2
  print_green "Microsoft Office 365 Business is succesvol geïnstalleerd."
}

# Functie om Adobe Creative Cloud te installeren
install_adobecc() {
  print_green "Adobe Creative Cloud wordt geïnstalleerd..."
  # Voeg hier de installatielogica voor Adobe Creative Cloud toe
  sleep 2
  print_green "Adobe Creative Cloud is succesvol geïnstalleerd."
}

# Functie om Handoff-functies van iCloud uit te schakelen
disable_handoff() {
  print_green "Handoff-functies van iCloud worden uitgeschakeld..."
  # Voeg hier de logica toe om Handoff-functies van iCloud uit te schakelen
  sleep 2
  print_green "Handoff-functies van iCloud zijn uitgeschakeld."
}

# Weergave van het menu
display_menu() {
  print_green "Menu:"
  print_green "1. Microsoft Office 365 Business installeren"
  print_green "2. Adobe Creative Cloud installeren"
  print_green "3. Handoff-functies van iCloud uitschakelen"
  print_red "4. Stoppen"
}

# Hoofdscript
clear

while true; do
  display_menu

  print_green "Voer de gewenste optie in: \c"
  read -r choice </dev/tty

  case $choice in
    1)
      install_office365
      ;;
    2)
      install_adobecc
      ;;
    3)
      disable_handoff
      ;;
    4)
      print_red "Het script wordt gestopt."
      break
      ;;
    *)
      if [[ $choice =~ ^[1-4]$ ]]; then
        print_red "Ongeldige optie. Probeer opnieuw."
      else
        print_red "Ongeldige invoer. Voer een nummer in van 1 tot 4."
      fi
      ;;
  esac

  sleep 1
  clear
done
