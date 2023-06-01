#!/bin/bash

# Download de nieuwste versie van Office 365 Business
/usr/bin/curl --location --silent "https://go.microsoft.com/fwlink/?linkid=2009112" -o "O365BusinessPro.pkg"

# Installeer Office 365 Business
/usr/sbin/installer -pkg "O365BusinessPro.pkg" -target /

# Controleer of de installatie is geslaagd
if [ $? -eq 0 ]; then
    echo "Office 365 Business is succesvol geïnstalleerd."
else
    echo "Er is een fout opgetreden tijdens de installatie van Office 365 Business."
fi

# Verwijder het installatiepakket
rm "O365BusinessPro.pkg"
