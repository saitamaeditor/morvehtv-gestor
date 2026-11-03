#!/bin/sh
# Publica el gestor en GitHub Pages con una versión nueva: la página la compara al abrirse y, si
# el navegador tenía guardada una anterior, se recarga sola con los archivos nuevos.
# Uso: sh publicar.sh "mensaje del cambio"
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M%S)
sed -i -E "s/data-version=\"[^\"]*\"/data-version=\"$V\"/; s/\?v=[0-9A-Za-z.]+\"/?v=$V\"/g" index.html
printf '%s\n' "$V" > version.txt
git add -A
git commit -q -m "${1:-Actualizar el gestor}"
git push -q
echo "Publicada la versión $V"
