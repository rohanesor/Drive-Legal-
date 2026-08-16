export type AssetType = 'llm_model' | 'stt_model' | 'faiss_index' | 'sqlite_db' | 'other';

export interface Asset {
  name: string;
  version: string;
  type: AssetType;
  size: number; // bytes
  checksum: string; // SHA-256 hash
  downloadUrl: string;
  updatedAt: number; // timestamp
}

export interface AssetManifest {
  manifestVersion: number;
  assets: Asset[];
  updatedAt: number;
}
