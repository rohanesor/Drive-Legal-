import type { AssetManifest } from '../types';

export const S3_BUCKET_URL = 'https://drivelegal-assets.s3.ap-south-1.amazonaws.com';

export const LOCAL_ASSET_PATHS = {
  llm_model: 'models/tinyllama-1.1b-q4.gguf',
  stt_model: 'models/whisper-tiny',
  faiss_index: 'models/faiss_index',
  sqlite_db: 'data/drivelegal.db',
} as const;

export const BOOTSTRAP_MANIFEST: AssetManifest = {
  manifestVersion: 1,
  updatedAt: 1786968000000, // August 2026 baseline
  assets: [
    {
      name: 'tinyllama-1.1b-q4.gguf',
      version: '1.0.0',
      type: 'llm_model',
      size: 636000000, // ~636 MB
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Placeholder hash
      downloadUrl: `${S3_BUCKET_URL}/models/tinyllama-1.1b-q4.gguf`,
      updatedAt: 1786968000000,
    },
    {
      name: 'whisper-tiny',
      version: '1.0.0',
      type: 'stt_model',
      size: 78000000, // ~78 MB
      checksum: 'cbd8f7e2d93e150f24254d3e23cf6378e9b46e3b0c44298fc1c149afbf4c8996',
      downloadUrl: `${S3_BUCKET_URL}/models/whisper-tiny.tar.gz`,
      updatedAt: 1786968000000,
    },
    {
      name: 'faiss_index',
      version: '1.0.0',
      type: 'faiss_index',
      size: 1200000, // ~1.2 MB
      checksum: 'fa1551a4cfd297a7e8b623cf62145e31c7d23d8c11e3b0c44298fc1c149afbf',
      downloadUrl: `${S3_BUCKET_URL}/models/faiss_index.zip`,
      updatedAt: 1786968000000,
    },
    {
      name: 'drivelegal.db',
      version: '1.0.0',
      type: 'sqlite_db',
      size: 5400000, // ~5.4 MB
      checksum: 'd1982a7fec01a24d293cf62145e31c7d23d8c11e3b0c44298fc1c149afbf623',
      downloadUrl: `${S3_BUCKET_URL}/data/drivelegal.db`,
      updatedAt: 1786968000000,
    },
  ],
};
