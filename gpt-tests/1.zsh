#!/bin/zsh

# Color
BLACK='\033[0;30m'
RED='\033[0;31m'
GREEN='\033[0;32m'
BROWN='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' 

# Print menu
printf "\n${BLUE}=== MacOS Defaults Write Settings ===${NC}\n"

echo "1) Change CGWindowLevel"
echo "2) Change Finder Pathbar Mode"
echo "3) Change Dock Position"
echo "4) Quit Menu"

# Get user selected options
echo -e "\n${YELLOW}Please choose an option:${NC}"
read selection

case $selection in
    1) #option 1
	printf "${YELLOW} Enter new CGWindowLevel (e.g: -2): ${NC}"
	read windowLevel
	defaults write NSGlobalDomain CGWindowLevel $windowLevel
	;;
    2) #option 2
	printf "${YELLOW} Enter new Finder Pathbar Mode (e.g: automatic): ${NC}"
	read pathbarMode
	defaults write com.apple.finder PathbarRootAtHome $pathbarMode
	;;
	3) #option 3
	printf "${YELLOW} Enter new Dock Position (e.g: bottom): ${NC}"
	read dockPosition
    defaults write com.apple.dock orientation $dockPosition
	;; 
	4) #quit
	echo -e "${RED}Quitting Menu${NC}"
	;;
	*) #default
	echo -e "${RED}Invalid selection${NC}"
	;;
esac
