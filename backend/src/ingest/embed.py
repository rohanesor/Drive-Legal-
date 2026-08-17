"""
Embedding generation script for Vazhi.
Generates vector embeddings for laws, penalties, procedures, and zones, building a unified FAISS index.

Note: Requires sentence-transformers and faiss-cpu.
Run with: python -m ingest.embed
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
    """Generate vector embeddings for laws, penalties, procedures, and zones."""
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

    items = []  # tuple of (item_id, item_type, text_content)

    # 1. Fetch Laws
    cursor.execute("SELECT id, title, description, states FROM laws")
    for row in cursor.fetchall():
        item_id, title, desc, states = row[0], row[1], row[2], row[3] or 'All India'
        text = f"Law in {states}: {title}. {desc}"
        items.append((item_id, 'law', text))

    # 2. Fetch Penalties
    cursor.execute("SELECT id, violation_type, section, state, first_offense, second_offense, additional_details FROM penalties")
    for row in cursor.fetchall():
        item_id, vtype, sec, state, f_fine, s_fine, details = row
        text = f"Fine/Penalty in {state} for {vtype} under section {sec}: 1st offense ₹{f_fine}, 2nd offense ₹{s_fine}. {details or ''}"
        items.append((item_id, 'penalty', text))

    # 3. Fetch Procedures
    cursor.execute("SELECT id, title, steps, documents_required FROM procedures")
    for row in cursor.fetchall():
        item_id, title, steps, docs = row
        text = f"Procedure for {title}. Steps: {steps}. Required documents: {docs}"
        items.append((item_id, 'procedure', text))

    # 4. Fetch Zones (Safety hazards)
    cursor.execute("SELECT id, name, zone_type, state, message_template FROM zones")
    for row in cursor.fetchall():
        item_id, name, ztype, state, msg = row
        text = f"Driving hazard/zone in {state} ({ztype}): {name}. {msg}"
        items.append((item_id, 'zone', text))

    conn.close()

    if not items:
        print("No items found in database. Run seed.py and csv_loader.py first.")
        return

    print(f"Generating 384-dim embeddings for {len(items)} items (laws, penalties, procedures, zones)...")

    model = SentenceTransformer('all-MiniLM-L6-v2')
    texts = [item[2] for item in items]
    metadata = [{'id': item[0], 'type': item[1], 'text': item[2]} for item in items]

    embeddings = model.encode(texts, show_progress_bar=True)
    embeddings = embeddings.astype(np.float32)

    # Normalize L2
    for i, emb in enumerate(embeddings):
        norm = np.linalg.norm(emb)
        if norm > 0:
            embeddings[i] = emb / norm

    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(embeddings)

    os.makedirs(FAISS_INDEX_PATH, exist_ok=True)
    faiss.write_index(index, os.path.join(FAISS_INDEX_PATH, 'index.faiss'))

    with open(os.path.join(FAISS_INDEX_PATH, 'index.pkl'), 'wb') as f:
        pickle.dump(metadata, f)

    print(f"FAISS index successfully saved to {FAISS_INDEX_PATH}")
    print(f"Index total: {index.ntotal} vectors across all 4 knowledge domains.")


if __name__ == '__main__':
    generate_embeddings()
