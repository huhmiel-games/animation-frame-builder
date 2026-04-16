#!/bin/bash

# Configuration
APP_NAME="AnimationFrameBuilder"
ORIGINAL_EXE="animation-frame-builder"
SRC_DIR="dist/${ORIGINAL_EXE}/linux64"
APPDIR="dist/AppDir"
ICON_FILE="icon.png"  # Place your 256x256 icon in the root folder

# Variables
IS_APPIMAGE_GENERATED=0
IS_ZIP_GENERATED=0


# // BUILD LINUX
echo "=== Creating AppImage for ${APP_NAME} ==="

# 1. Clean old AppDir
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"

# 2. Copy application files
echo "[1/5] Copying files..."
cp -r "$SRC_DIR"/* "$APPDIR/"

# 3. Rename NW.js executable
echo "[2/5] Configuring executable..."
if [ -f "$APPDIR/${ORIGINAL_EXE}" ]; then
    chmod +x "$APPDIR/${ORIGINAL_EXE}"
    if [ "${ORIGINAL_EXE}" != "${APP_NAME}" ]; then
        mv "$APPDIR/${ORIGINAL_EXE}" "$APPDIR/$APP_NAME"
    fi
else
    echo "Error: NW.js executable not found (${ORIGINAL_EXE})!"
    exit 1
fi

# 4. Create AppRun file
echo "[3/5] Creating AppRun file..."
cat > "$APPDIR/AppRun" <<APPRUNEOF
#!/bin/bash
HERE="\$(dirname "\$(readlink -f "\${0}")")"
export LD_LIBRARY_PATH="\${HERE}/lib:\${HERE}/lib/x86_64-linux-gnu:\${LD_LIBRARY_PATH}"
exec "\${HERE}/${APP_NAME}" "\$@"
APPRUNEOF
chmod +x "$APPDIR/AppRun"

# 4. Create .desktop file
echo "[4/5] Creating .desktop file..."
cat > "$APPDIR/$APP_NAME.desktop" <<EOF
[Desktop Entry]
Name=$APP_NAME
Exec=$APP_NAME %U
Icon=$APP_NAME
Type=Application
Categories=Development;
StartupNotify=true
EOF

# 5. Copy icon (if present)
if [ -f "$ICON_FILE" ]; then
    # Get the extension of the icon file
    ICON_EXT="${ICON_FILE##*.}"
    cp "$ICON_FILE" "$APPDIR/usr/share/icons/hicolor/256x256/apps/$APP_NAME.$ICON_EXT"
    cp "$ICON_FILE" "$APPDIR/$APP_NAME.$ICON_EXT"
    cp "$ICON_FILE" "$APPDIR/.DirIcon"
    echo "   Icon copied successfully"
else
    echo "   Warning: No icon found ($ICON_FILE)"
fi

# 6. Download appimagetool if necessary
if [ ! -f "appimagetool" ]; then
    echo "[5/5] Downloading appimagetool..."
    wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" -O appimagetool
    chmod +x appimagetool
else
    echo "[5/5] appimagetool already present"
fi

# 7. Create AppImage and copy to dist/output
echo "=== Generating AppImage ==="
ARCH=x86_64 ./appimagetool "$APPDIR" "${APP_NAME}-x86_64.AppImage"
mkdir -p dist/output
mv "${APP_NAME}-x86_64.AppImage" dist/output/

if [ -f "dist/output/${APP_NAME}-x86_64.AppImage" ]; then
    echo "   AppImage created successfully"
    IS_APPIMAGE_GENERATED=1
else
    echo "Error: AppImage not created!"
fi

# // BUILD WINDOWS
# 8. Remove animation-frame-builder_win64 folder
echo "[8] Removing animation-frame-builder_win64 folder..."
if [ -d "dist/${ORIGINAL_EXE}_win64" ]; then
    rm -rf "dist/${ORIGINAL_EXE}_win64"
fi

# 9. Rename dist/animation-frame-builder/win64 folder to animation-frame-builder_win64
echo "[8] Renaming win64 folder..."
if [ -d "dist/${ORIGINAL_EXE}/win64" ]; then
    mv "dist/${ORIGINAL_EXE}/win64" "dist/${ORIGINAL_EXE}_win64"
fi

# 10. Zip animation-frame-builder_win64 folder and copy zip to output
echo "[9] Creating ZIP archive for Windows..."
if [ -d "dist/${ORIGINAL_EXE}_win64" ]; then
    (cd dist && zip -q -r "output/${APP_NAME}_win64.zip" "${ORIGINAL_EXE}_win64")
fi

if [ -f "dist/output/${APP_NAME}_win64.zip" ]; then
    IS_ZIP_GENERATED=1
else
    echo "Error: ZIP archive not created!"
fi

echo ""
echo ""
echo ""

if [ "$IS_APPIMAGE_GENERATED" -eq 1 ]; then
echo "✅ AppImage created successfully!"
echo "📁 File: dist/output/${APP_NAME}-x86_64.AppImage"
fi

if [ "$IS_ZIP_GENERATED" -eq 1 ]; then
echo "✅ ZIP archive created successfully!"
echo "📁 File: dist/output/${APP_NAME}_win64.zip"
fi

echo ""