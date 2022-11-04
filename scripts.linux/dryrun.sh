#!/bin/bash
set -e
./colordef.sh
clear
echo Publish check
cd ../packages
echo if needed type: npm adduser
echo if needed type: npm login
find . -maxdepth 1 -mindepth 1 -type d | xargs -n1 sh -c 'cd "$0" && echo "" && echo "${_Bold}Package${_Reset} $(pwd)" && echo "" && npm publish --dry-run'
echo ""
