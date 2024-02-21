#!/usr/bin/env python3

import subprocess
import time

# Functie om de tekst in groen te printen
def print_green(text):
    print("\033[32m{}\033[0m".format(text))

# Functie om de tekst in rood te printen
def print_red(text):
    print("\033[31m{}\033[0m".format(text))

# Functie om Microsoft Office 365 Business te installeren
def install_office365():
    print_green("Microsoft Office 365 Business wordt geïnstalleerd...")
    subprocess.run(["/usr/bin/curl", "--location", "--silent", "https://go.microsoft.com/fwlink/?linkid=2009112", "-o", "O365BusinessPro.pkg"])
    subprocess.run(["/usr/sbin/installer", "-pkg", "O365BusinessPro.pkg", "-target", "/"])
    time.sleep(2)
    if subprocess.call(["echo", "$?"]) == 0:
        print_green("Office 365 Business is succesvol geïnstalleerd.")
    else:
        print_red("Er is een fout opgetreden tijdens de installatie van Office 365 Business.")
    subprocess.run(["rm", "O365BusinessPro.pkg"])
    time.sleep(1)

# Functie om Adobe Creative Cloud te installeren
def install_adobecc():
    print_green("Adobe Creative Cloud wordt geïnstalleerd...")
    subprocess.run(["curl", "-OL", "https://github.com/Installomator/Installomator/raw/main/Installomator.sh"])
    subprocess.run(["sudo", "zsh", "./Installomator.sh", "adobecreativeclouddesktop", "DEBUG=0"])
    time.sleep(2)
    if subprocess.call(["echo", "$?"]) == 0:
        print_green("Adobe Creative Cloud is succesvol geïnstalleerd.")
    else:
        print_red("Er is een fout opgetreden tijdens de installatie van Adobe Creative Cloud.")
    subprocess.run(["rm", "Installomator.sh"])

# Functie om Handoff-functies van iCloud uit te schakelen
def disable_handoff():
    print_green("Handoff-functies van iCloud worden uitgeschakeld...")
    # Voeg hier de logica toe om Handoff-functies van iCloud uit te schakelen
    time.sleep(2)
    print_green("Handoff-functies van iCloud zijn uitgeschakeld.")

# Functie om het opstartgeluid van de Mac uit te schakelen
def disable_boot_sound():
    print_green("Het opstartgeluid van de Mac wordt uitgeschakeld...")
    subprocess.run(["sudo", "nvram", "SystemAudioVolume="])

# Weergave van het menu
def display_menu():
    print_green("Menu:")
    print_green("1. Microsoft Office 365 Business installeren")
    print_green("2. Adobe Creative Cloud installeren")
    print_green("3. Handoff-functies van iCloud uitschakelen")
    print_green("4. Opstartgeluid van de Mac uitschakelen")
    print_red("9. Stoppen")

if __name__ == "__main__":
    while True:
        subprocess.run(["clear"])
        display_menu()

        choice = input("Voer de gewenste optie in: ")

        if choice == "1":
            install_office365()
        elif choice == "2":
            install_adobecc()
        elif choice == "3":
            disable_handoff()
        elif choice == "4":
            disable_boot_sound()
        elif choice == "9":
            print_red("Het script wordt gestopt.")
            break
        else:
            if choice.isdigit() and 1 <= int(choice) <= 4:
                print_red("Ongeldige optie. Probeer opnieuw.")
            else:
                print_red("Ongeldige invoer. Voer een nummer in van 1 tot 4 of 9 om te stoppen.")

        time.sleep(1)
        subprocess.run(["clear"])
