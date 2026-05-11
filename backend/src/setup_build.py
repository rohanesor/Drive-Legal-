"""
Build Setup Script - Prepares Python files for Chaquopy bundling

PURPOSE:
Copies backend Python source files into the Chaquopy python directory
so they get bundled into the Android APK.

This needs to be run BEFORE building the APK.

USAGE:
  python backend/src/setup_build.py
"""

import os
import shutil
import sys

# Get the project root (parent of backend/)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))  # backend/src/
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)  # backend/
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)  # project root

PYTHON_DIR = os.path.join(PROJECT_ROOT, 'frontend', 'android', 'app', 'src', 'main', 'python')

# Files to copy from backend/src/ to the Chaquopy python directory
PYTHON_FILES = [
    'src/main.py',
    'src/database.py',
    'src/search.py',
    'src/zones.py',
    'src/stt.py',
    'src/tts.py',
    'src/llm.py',
]

# Directories to copy (for models and data)
PYTHON_DIRS = [
    ('src/data', 'data'),  # SQLite database
    ('src/models', 'models'),  # ML models
]


def setup_build():
    """Copy backend Python files to Chaquopy python directory."""
    print(f"Setting up Chaquopy python directory: {PYTHON_DIR}")
    
    # Create the python directory if it doesn't exist
    os.makedirs(PYTHON_DIR, exist_ok=True)
    
    # Copy Python source files
    for src_file in PYTHON_FILES:
        src_path = os.path.join(BACKEND_DIR, src_file)
        dst_path = os.path.join(PYTHON_DIR, os.path.basename(src_file))
        
        if os.path.exists(src_path):
            shutil.copy2(src_path, dst_path)
            print(f"  Copied: {os.path.basename(src_file)}")
        else:
            print(f"  WARNING: {src_path} not found")
    
    # Copy data directories
    for src_dir, dst_name in PYTHON_DIRS:
        src_path = os.path.join(BACKEND_DIR, src_dir)
        dst_path = os.path.join(PYTHON_DIR, dst_name)
        
        if os.path.exists(src_path):
            if os.path.exists(dst_path):
                shutil.rmtree(dst_path)
            shutil.copytree(src_path, dst_path)
            print(f"  Copied directory: {dst_name}/")
        else:
            print(f"  WARNING: {src_path} not found")
    
    print(f"\nDone! Python files are ready for Chaquopy bundling.")
    print(f"Next step: cd frontend && npx react-native run-android")


if __name__ == '__main__':
    setup_build()
