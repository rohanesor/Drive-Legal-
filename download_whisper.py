import os
from huggingface_hub import snapshot_download

save_path = "backend/src/models/whisper-tiny"
os.makedirs(save_path, exist_ok=True)
print("Downloading whisper-tiny...")
snapshot_download(repo_id="openai/whisper-tiny", local_dir=save_path, ignore_patterns=["*.msgpack", "*.h5"])
print("Whisper-tiny downloaded!")
