#!/bin/bash
set -e
./colordef.sh
clear
echo Update dependencies
cd ../packages
find . -maxdepth 1 -mindepth 1 -type d | xargs -n1 sh -c 'cd "$0" && echo "" && echo "${_Bold}Package${_Reset} $(pwd)" && echo "" && npm update'
echo ""
