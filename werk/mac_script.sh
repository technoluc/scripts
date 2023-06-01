#!/bin/bash

##################################################
###           GEKLEURDE ECHO-HELPERS           ###
##################################################

# Kleuren
black='\033[0;30m'
white='\033[0;37m'
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
blue='\033[0;34m'
magenta='\033[0;35m'
cyan='\033[0;36m'

ESC_SEQ="\x1b["
COL_RESET=$ESC_SEQ"39;49;00m"
COL_RED=$ESC_SEQ"31;01m"
COL_GREEN=$ESC_SEQ"32;01m"
COL_YELLOW=$ESC_SEQ"33;01m"
COL_BLUE=$ESC_SEQ"34;01m"
COL_MAGENTA=$ESC_SEQ"35;01m"
COL_CYAN=$ESC_SEQ"36;01m"

# Resets kleur
reset=`tput sgr0`

# Functies

function cecho() {
  echo "${2}${1}${reset}"
  return
}

function botc() {
    echo -e "\n$COL_GREEN\[._.]/ - ${2}${1} $COL_RESET"
}

function ok() {
    echo -e "$COL_GREEN[ok]$COL_RESET "$1
}

function bot() {
    echo -e "\n$COL_GREEN\[._.]/$COL_RESET - "$1
}


echo ""
cecho "#######################################################################" $green
cecho "#                                                                     #" $green
cecho "#                                                                     #" $green
cecho "#                    Luc's macos bootstrap script                     #" $green
cecho "#                            (Voor GP)                                #" $green
cecho "#                                                                     #" $green
cecho "#######################################################################" $green
echo ""

bot "Hoi! We gaan wat apps installeren en instellingen aanpassen..."


##################################################
###                    MENU                    ###
##################################################

while true; do
    clear
    botc "Menu:" $COL_GREEN
    botc "1. Microsoft Office 365 Business installeren" $COL_GREEN
    botc "2. Adobe Creative Cloud installeren" $COL_GREEN
    botc "3. Verschillende Handoff-functies van iCloud uitschakelen" $COL_GREEN
    botc "4. Stoppen" $COL_RED
    botc "Keuze:" $COL_RESET
    
    read -p "Keuze:" choice

    case $choice in
        1)
            bot "Microsoft Office 365 Business wordt geïnstalleerd..."
            # Download de nieuwste versie van Office 365 Business
            /usr/bin/curl --location --silent "https://go.microsoft.com/fwlink/?linkid=2009112" -o "O365BusinessPro.pkg"

            # Installeer Office 365 Business
            /usr/sbin/installer -pkg "O365BusinessPro.pkg" -target /

            # Controleer of de installatie is geslaagd
            if [ $? -eq 0 ]; then
                ok "Office 365 Business is succesvol geïnstalleerd."
            else
                cecho "Er is een fout opgetreden tijdens de installatie van Office 365 Business." $red
            fi

            # Verwijder het installatiepakket
            rm "O365BusinessPro.pkg"
            sleep 2
            ;;
        2)
            bot "Adobe Creative Cloud wordt geïnstalleerd..."
            curl -OL https://github.com/Installomator/Installomator/raw/main/Installomator.sh && sudo zsh ./Installomator.sh adobecreativeclouddesktop DEBUG=0
            
            # Controleer of de installatie is geslaagd
            if [ $? -eq 0 ]; then
                ok "Adobe Creative Cloud is succesvol geïnstalleerd."
            else
                cecho "Er is een fout opgetreden tijdens de installatie van Adobe Creative Cloud." $red
            fi
            sleep 2
            ;;
        3)
            bot "Verschillende Handoff-functies van iCloud worden uitgeschakeld..."
            # Plaats hier de code om de Handoff-functies van iCloud uit te schakelen
            ok "Verschillende Handoff-functies van iCloud zijn uitgeschakeld."
            sleep 2
            ;;
        4)
            ok "Het script wordt gestopt."
            exit 0
            ;;
        *)
            cecho "Ongeldige keuze. Probeer opnieuw." $red
            sleep 2
            ;;
    esac
done
