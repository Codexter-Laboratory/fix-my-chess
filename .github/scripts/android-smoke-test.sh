#!/usr/bin/env bash
# Installs the release APK on a running emulator, launches it and fails if the
# app process dies. Always leaves logcat.txt and screenshot.png for debugging.
set -uo pipefail

PKG="com.codexterlaboratory.fixmychess"
APK="$(ls -1 ./*.apk | head -n 1)"
WAIT_SECONDS=25

echo "Installing $APK"
adb install -r "$APK"

adb logcat -c
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 10

# Rotate once to force Android to recreate the activity (catches state-restore crashes).
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
sleep 5
adb shell settings put system user_rotation 0
sleep $((WAIT_SECONDS - 15))

adb logcat -d -v time > logcat.txt
adb exec-out screencap -p > screenshot.png || true

echo "---- Crash-related logcat lines ----"
grep -E "FATAL|AndroidRuntime|ReactNativeJS|ReactNative|SoLoader|libc +:|DEBUG +:|$PKG" logcat.txt | tail -n 200 || true
echo "------------------------------------"

if grep -q "FATAL EXCEPTION" logcat.txt || ! adb shell pidof "$PKG" >/dev/null; then
  echo "::error::App crashed or exited within ${WAIT_SECONDS}s of launch (see logcat above / logcat artifact)."
  exit 1
fi

echo "App is still running after ${WAIT_SECONDS}s."
