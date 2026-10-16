#!/bin/bash
# Сборка APK «Цветочки» для Android.
# 1. Временно прячет API routes (они несовместимы с Next.js static export).
# 2. Собирает Next.js как static export в /out.
# 3. Инициализирует Capacitor Android проект и синхронизирует.
# 4. Собирает debug APK через Gradle.
# 5. Копирует APK в /home/z/my-project/download/

set -e

cd /home/z/my-project

# === 1. Прячем API routes ===
if [ -d src/app/api ] && [ ! -d /tmp/cvetochki-api-backup ]; then
  echo "[1/5] Прячем API routes для static export..."
  mkdir -p /tmp/cvetochki-api-backup
  mv src/app/api /tmp/cvetochki-api-backup/api
fi

# === 2. Сборка Next.js как static export ===
echo "[2/5] Сборка Next.js (static export)..."
BUILD_TARGET=capacitor bun run build-static 2>&1 | tail -20 || true

# === 3. Capacitor sync ===
echo "[3/5] Capacitor: добавляем Android-проект и синхронизируем..."
if [ ! -d android ]; then
  bunx cap add android 2>&1 | tail -10
fi
bunx cap sync android 2>&1 | tail -10

# === 4. Сборка APK через Gradle ===
echo "[4/5] Сборка APK через Gradle..."
export ANDROID_HOME=${ANDROID_HOME:-/home/z/android-sdk}
cd android
./gradlew assembleDebug 2>&1 | tail -30
cd ..

# === 5. Копируем APK в download/ ===
echo "[5/5] Копируем APK в download/..."
mkdir -p download
APK=$(find android -name "*.apk" -path "*debug*" | head -1)
if [ -n "$APK" ]; then
  cp "$APK" download/cvetochki-debug.apk
  ls -la download/cvetochki-debug.apk
  echo "✓ APK готов: download/cvetochki-debug.apk"
else
  echo "✗ APK не найден. Проверьте сборку."
fi

# Возвращаем API routes
if [ -d /tmp/cvetochki-api-backup/api ] && [ ! -d src/app/api ]; then
  echo "[restore] Возвращаем API routes..."
  mv /tmp/cvetochki-api-backup/api src/app/api
  rmdir /tmp/cvetochki-api-backup
fi
