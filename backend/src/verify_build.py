"""
Build Verification Script - Checks all components are in place

PURPOSE:
Verifies that all necessary files, data, and configurations exist
before building the Android APK.

USAGE:
  python backend/src/verify_build.py
"""

import os
import sys

PASS = '\033[92mPASS\033[0m'
FAIL = '\033[91mFAIL\033[0m'

checks_passed = 0
checks_failed = 0

def check(description, condition):
    global checks_passed, checks_failed
    if condition:
        print(f"  {PASS} {description}")
        checks_passed += 1
    else:
        print(f"  {FAIL} {description}")
        checks_failed += 1

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 50)
print("DriveLegal Build Verification")
print("=" * 50)

# Database checks
print("\n[Database]")
db_path = os.path.join(BASE, 'backend', 'src', 'data', 'drivelegal.db')
check("Database file exists", os.path.exists(db_path))

if os.path.exists(db_path):
    import sqlite3
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT count(*) FROM laws")
    law_count = c.fetchone()[0]
    check(f"Laws table has entries ({law_count})", law_count > 0)
    
    c.execute("SELECT count(*) FROM penalties")
    pen_count = c.fetchone()[0]
    check(f"Penalties table has entries ({pen_count})", pen_count > 0)
    
    c.execute("SELECT count(*) FROM procedures")
    proc_count = c.fetchone()[0]
    check(f"Procedures table has entries ({proc_count})", proc_count > 0)
    
    c.execute("SELECT count(*) FROM zones")
    zone_count = c.fetchone()[0]
    check(f"Zones table has entries ({zone_count})", zone_count > 0)
    conn.close()

# Python module checks
print("\n[Python Modules]")
modules = [
    'backend/src/database.py',
    'backend/src/search.py',
    'backend/src/zones.py',
    'backend/src/stt.py',
    'backend/src/tts.py',
    'backend/src/llm.py',
    'backend/src/main.py',
    'backend/src/ingest/seed.py',
    'backend/src/ingest/embed.py',
    'backend/src/run_tests.py',
]
for mod in modules:
    path = os.path.join(BASE, mod)
    check(f"{mod} exists", os.path.exists(path))

# Frontend checks
print("\n[Frontend]")
frontend_files = [
    'frontend/src/App.tsx',
    'frontend/src/screens/ChatScreen.tsx',
    'frontend/src/screens/SettingsScreen.tsx',
    'frontend/src/screens/LocationScreen.tsx',
    'frontend/src/components/ChatMessage.tsx',
    'frontend/src/components/VoiceInput.tsx',
    'frontend/src/components/AlertBanner.tsx',
    'frontend/src/components/CitationChip.tsx',
    'frontend/src/components/ConfidenceIndicator.tsx',
    'frontend/src/services/pythonBridge.ts',
    'frontend/src/services/backgroundService.ts',
    'frontend/src/services/location.ts',
    'frontend/src/services/storage.ts',
    'frontend/src/store/index.ts',
    'frontend/src/store/chatSlice.ts',
    'frontend/src/store/settingsSlice.ts',
    'frontend/src/store/alertSlice.ts',
    'frontend/src/i18n/en.json',
    'frontend/src/i18n/ta.json',
    'frontend/src/i18n/hi.json',
    'frontend/package.json',
    'frontend/index.js',
]
for f in frontend_files:
    path = os.path.join(BASE, f)
    check(f"{f} exists", os.path.exists(path))

# Android native checks
print("\n[Android Native]")
android_files = [
    'frontend/android/app/src/main/AndroidManifest.xml',
    'frontend/android/app/build.gradle',
    'frontend/android/app/src/main/java/com/drivelegal/MainActivity.java',
    'frontend/android/app/src/main/java/com/drivelegal/MainApplication.java',
    'frontend/android/app/src/main/java/com/drivelegal/PythonBridgeModule.java',
    'frontend/android/app/src/main/java/com/drivelegal/DriveLegalPackage.java',
    'frontend/android/app/src/main/java/com/drivelegal/DriveLegalLocationService.java',
]
for f in android_files:
    path = os.path.join(BASE, f)
    check(f"{f} exists", os.path.exists(path))

# Python directory (for Chaquopy)
print("\n[Chaquopy Python Directory]")
python_dir = os.path.join(BASE, 'frontend', 'android', 'app', 'src', 'main', 'python')
check("Python directory exists", os.path.exists(python_dir))
if os.path.exists(python_dir):
    # Check if backend files are symlinked or copied
    main_py = os.path.join(python_dir, 'main.py')
    check("main.py in python dir", os.path.exists(main_py))

# Models directory
print("\n[Models]")
models_dir = os.path.join(BASE, 'backend', 'src', 'models')
check("Models directory exists", os.path.exists(models_dir))
if os.path.exists(models_dir):
    check("FAISS index directory", os.path.exists(os.path.join(models_dir, 'faiss_index')))
    # These will be downloaded separately
    check("TinyLlama model (optional)", os.path.exists(os.path.join(models_dir, 'tinyllama-1.1b-q4.gguf')))
    check("Whisper model (optional)", os.path.exists(os.path.join(models_dir, 'whisper-tiny')))

# Summary
print("\n" + "=" * 50)
print(f"Results: {checks_passed} passed, {checks_failed} failed")
if checks_failed > 0:
    print("Some checks failed. Fix before building APK.")
else:
    print("All checks passed! Ready to build APK.")
print("=" * 50)

sys.exit(1 if checks_failed > 0 else 0)
