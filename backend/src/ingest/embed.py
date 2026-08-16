"""
Embedding generation script.
Generates embeddings for all laws and builds FAISS index.

Note: Requires sentence-transformers and faiss-cpu.
Run this on a desktop/laptop, then bundle the index with the app.
"""

import os
import json
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import get_connection

FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'faiss_index')
EMBEDDING_DIM = 384


def generate_embeddings():
    """Generate embeddings for all laws and build FAISS index."""
    print("Embedding generation stub.")
    print("Run on desktop with: pip install sentence-transformers faiss-cpu")
    print("Then: python ingest/embed.py")

    try:
        from sentence_transformers import SentenceTransformer
        import faiss
        import pickle
    except ImportError:
        print("Missing dependencies. Install with:")
        print("  pip install sentence-transformers faiss-cpu")
        return

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, description FROM laws")
    laws = cursor.fetchall()
    conn.close()

    if not laws:
        print("No laws found in database. Run seed.py first.")
        return

    print(f"Generating embeddings for {len(laws)} laws...")

    model = SentenceTransformer('all-MiniLM-L6-v2')
    descriptions = [law[1] for law in laws]
    law_ids = [law[0] for law in laws]

    embeddings = model.encode(descriptions, show_progress_bar=True)
    embeddings = embeddings.astype(np.float32)

    for i, emb in enumerate(embeddings):
        norm = np.linalg.norm(emb)
        if norm > 0:
            embeddings[i] = emb / norm

    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(embeddings)

    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    faiss.write_index(index, os.path.join(FAISS_INDEX_PATH, 'index.faiss'))

    with open(os.path.join(FAISS_INDEX_PATH, 'index.pkl'), 'wb') as f:
        pickle.dump(law_ids, f)

    print(f"FAISS index saved to {FAISS_INDEX_PATH}")
    print(f"Index size: {index.ntotal} vectors, {EMBEDDING_DIM} dimensions")


if __name__ == '__main__':
    generate_embeddings()
