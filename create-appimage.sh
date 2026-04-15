#!/bin/bash

# Configuration
APP_NAME="AnimationFrameBuilder"
ORIGINAL_EXE="animation-frame-builder"
SRC_DIR="dist/${ORIGINAL_EXE}/linux64"
APPDIR="dist/AppDir"
ICON_FILE="icon.png"  # Placez votre icône 256x256 dans le dossier racine

echo "=== Création de l'AppImage pour ${APP_NAME} ==="

# 1. Nettoyer l'ancien AppDir
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"

# 2. Copier les fichiers de l'application
echo "[1/5] Copie des fichiers..."
cp -r "$SRC_DIR"/* "$APPDIR/"

# 3. Renommer l'exécutable NW.js
echo "[2/5] Configuration de l'exécutable..."
if [ -f "$APPDIR/${ORIGINAL_EXE}" ]; then
    chmod +x "$APPDIR/${ORIGINAL_EXE}"
    if [ "${ORIGINAL_EXE}" != "${APP_NAME}" ]; then
        mv "$APPDIR/${ORIGINAL_EXE}" "$APPDIR/$APP_NAME"
    fi
else
    echo "Erreur: Exécutable NW.js non trouvé (${ORIGINAL_EXE})!"
    exit 1
fi

# 4. Créer le fichier AppRun
echo "[3/5] Création du fichier AppRun..."
cat > "$APPDIR/AppRun" <<APPRUNEOF
#!/bin/bash
HERE="\$(dirname "\$(readlink -f "\${0}")")"
export LD_LIBRARY_PATH="\${HERE}/lib:\${HERE}/lib/x86_64-linux-gnu:\${LD_LIBRARY_PATH}"
exec "\${HERE}/${APP_NAME}" "\$@"
APPRUNEOF
chmod +x "$APPDIR/AppRun"

# 4. Créer le fichier .desktop
echo "[4/5] Création du fichier .desktop..."
cat > "$APPDIR/$APP_NAME.desktop" <<EOF
[Desktop Entry]
Name=$APP_NAME
Exec=$APP_NAME %U
Icon=$APP_NAME
Type=Application
Categories=Development;
StartupNotify=true
EOF

# 5. Copier l'icône (si présente)
if [ -f "$ICON_FILE" ]; then
    # Get the extension of the icon file
    ICON_EXT="${ICON_FILE##*.}"
    cp "$ICON_FILE" "$APPDIR/usr/share/icons/hicolor/256x256/apps/$APP_NAME.$ICON_EXT"
    cp "$ICON_FILE" "$APPDIR/$APP_NAME.$ICON_EXT"
    cp "$ICON_FILE" "$APPDIR/.DirIcon"
    echo "   Icône copiée avec succès"
else
    echo "   Attention: Aucune icône trouvée ($ICON_FILE)"
fi

# 6. Télécharger appimagetool si nécessaire
if [ ! -f "appimagetool" ]; then
    echo "[5/5] Téléchargement de appimagetool..."
    wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" -O appimagetool
    chmod +x appimagetool
else
    echo "[5/5] appimagetool déjà présent"
fi

# 7. Créer l'AppImage et la copier dans dist/output
echo "=== Génération de l'AppImage ==="
ARCH=x86_64 ./appimagetool "$APPDIR" "${APP_NAME}-x86_64.AppImage"
mkdir -p dist/output
cp "${APP_NAME}-x86_64.AppImage" dist/output/

# 8. Renommer le dossier dist/animation-frame-builder/win64 en animation-frame-builder_win64
echo "[8] Renommage du dossier win64..."
if [ -d "dist/${ORIGINAL_EXE}/win64" ]; then
    mv "dist/${ORIGINAL_EXE}/win64" "dist/${ORIGINAL_EXE}_win64"
fi

# 9. Zipper le dossier animation-frame-builder_win64 et copier le zip dans output
echo "[9] Création de l'archive ZIP pour Windows..."
if [ -d "dist/${ORIGINAL_EXE}_win64" ]; then
    (cd dist && zip -q -r "output/${APP_NAME}_win64.zip" "${ORIGINAL_EXE}_win64")
    echo "   Archive ZIP créée dans dist/output/"
fi

echo ""
echo "✅ AppImage créée avec succès!"
echo "📁 Fichier: ${APP_NAME}-x86_64.AppImage"
echo ""