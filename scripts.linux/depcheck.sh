#!/bin/bash
set -e
./colordef.sh
clear
cd ../packages
echo Dependency check
find . -maxdepth 1 -mindepth 1 -type d | xargs -n1 sh -c 'cd "$0" && echo "" && echo "${_Bold}Package${_Reset} $(pwd)" && echo "" && npx depcheck'
echo ""
