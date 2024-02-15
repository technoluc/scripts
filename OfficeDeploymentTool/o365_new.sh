#!/bin/bash

# Check if the user has sudo privileges
if ! sudo -l &>/dev/null; then
    echo "This script requires sudo privileges. You are not in the sudoers file. Please contact the administrator."
    exit 1
fi

# Ask for the administrator password upfront
sudo -v

# Keep-alive: update existing `sudo` time stamp until the script has finished
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# Check if the Office 365 Business package already exists
if [ ! -f "O365BusinessPro.pkg" ]; then
    echo "Downloading Office 365 Business..."
    # Download the latest version of Office 365 Business
    if ! sudo /usr/bin/curl --location --fail --silent "https://go.microsoft.com/fwlink/?linkid=2009112" -o "O365BusinessPro.pkg"; then
        echo "Failed to download Office 365 Business. Exiting script."
        # Delete the partially downloaded file, if any, without asking
        [ -f "O365BusinessPro.pkg" ] && sudo rm "O365BusinessPro.pkg"
        exit 1
    fi
else
    echo "Office 365 Business package already exists. Skipping download."
fi

# Install Office 365 Business
echo "Installing Office 365 Business..."
if sudo /usr/sbin/installer -pkg "O365BusinessPro.pkg" -target /; then
    echo "Office 365 Business has been successfully installed."
    # Ask for confirmation before deleting the package
    read -p "Do you want to delete the installer package? (y/N) " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        sudo rm "O365BusinessPro.pkg"
        echo "Installer package deleted."
    fi
else
    echo "An error occurred during the installation of Office 365 Business."
    # If installation fails, do not delete the package automatically.
    # Here you can handle different types of errors specifically.
fi
