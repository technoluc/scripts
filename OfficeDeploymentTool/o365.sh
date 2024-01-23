#!/bin/bash

print_green() {
    echo -e "\e[32m$1\e[0m" # Print text in green
}

print_red() {
    echo -e "\e[31m$1\e[0m" # Print text in red
}

cleanup() {
    if [ -f "O365BusinessPro.pkg" ]; then
        read -p "Do you want to delete the installation package? (y/n): " answer
        if [ "$answer" == "y" ]; then
            rm "O365BusinessPro.pkg"
            print_green "Installation package deleted."
        else
            print_green "Installation package not deleted."
        fi
    fi
}

install_office365() {
    trap cleanup EXIT # Set up a trap for the EXIT signal

    print_green "Microsoft Office 365 Business wordt geïnstalleerd..."

    # Check if O365BusinessPro.pkg already exists
    if [ -f "O365BusinessPro.pkg" ]; then
        print_green "Office 365 Business installatiepakket bestaat al. Overslaan van download."
    else
        # Download de nieuwste versie van Office 365 Business
        /usr/bin/curl --location --silent "https://go.microsoft.com/fwlink/?linkid=2009112" -o "O365BusinessPro.pkg"

        # Check if download was successful
        if [ $? -eq 0 ]; then
            print_green "Download van Office 365 Business is voltooid."
        else
            print_red "Er is een fout opgetreden tijdens het downloaden van Office 365 Business."
            return 1 # Exit the function with an error code
        fi
    fi

    # Installeer Office 365 Business
    /usr/sbin/installer -pkg "O365BusinessPro.pkg" -target /
    sleep 2

    # Controleer of de installatie is geslaagd
    if [ $? -eq 0 ]; then
        print_green "Office 365 Business is succesvol geïnstalleerd."
    else
        print_red "Er is een fout opgetreden tijdens de installatie van Office 365 Business."
    fi
}

# Call the installation function
install_office365
