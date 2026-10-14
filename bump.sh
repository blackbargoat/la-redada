#!/bin/sh
# Stamp every local module import with a version so browsers never run stale code after a deploy.
V=$(date +%s)
sed -i '' -E "s#(from '\./[a-z]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" src/*.js
sed -i '' -E "s#src/main\.js(\?v=[0-9]+)?\"#src/main.js?v=$V\"#" index.html
echo "version $V"
