import os
import numpy as np
from typing import List, Dict
import sqlite3

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

from database import get_connection

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'all-MiniLM-L6-v2.onnx')
INDEX_PATH = os.path.join(os.path.dirname(__file__), 'models', 'faiss_index')
INDEX_FILE = os.path.join(INDEX_PATH, 'index.faiss')
METADATA_FILE = os.path.join(INDEX_PATH, 'index.pkl')

_model = None
_index = None
_metadata = None


def _load_embedding_model():
    global _model
    if _model is None and ONNX_AVAILABLE and os.path.exists(MODEL_PATH):
        _model = ort.InferenceSession(MODEL_PATH)
    return _model


def _load_faiss_index():
    global _index, _metadata
    if _index is None and FAISS_AVAILABLE and os.path.exists(INDEX_FILE):
        _index = faiss.read_index(INDEX_FILE)
        import pickle
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'rb') as f:
                _metadata = pickle.load(f)
    return _index


def embed_query(text: str) -> np.ndarray:
    model = _load_embedding_model()
    if model is None:
        return np.zeros(384)

    inputs = {model.get_inputs()[0].name: [text]}
    outputs = model.run(None, inputs)
    embedding = outputs[0][0]
    embedding = embedding / np.linalg.norm(embedding)
    return embedding.astype(np.float32)


def search(query: str, top_k: int = 3, state: str = None) -> List[Dict]:
    index = _load_faiss_index()
    if index is None:
        return keyword_fallback(query, state)

    embedding = embed_query(query)
    embedding = embedding.reshape(1, -1)

    distances, indices = index.search(embedding, top_k)

    results = []
    conn = get_connection()
    cursor = conn.cursor()

    for i, idx in enumerate(indices[0]):
        if idx == -1:
            continue
        if _metadata and idx < len(_metadata):
            law_id = _metadata[idx]
            cursor.execute("SELECT * FROM laws WHERE id = ?", [law_id])
            row = cursor.fetchone()
            if row:
                result = dict(row)
                result['similarity'] = max(0.0, float(1 - distances[0][i]))
                results.append(result)

    conn.close()

    if not results:
        return keyword_fallback(query, state)

    return results


def keyword_fallback(query: str, state: str = None) -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()

    words = query.lower().split()
    results = []

    for word in words:
        if len(word) < 3:
            continue
        if state:
            cursor.execute(
                "SELECT * FROM laws WHERE (title LIKE ? OR description LIKE ? OR section LIKE ?) AND (states IS NULL OR INSTR(states, ?))",
                [f'%{word}%', f'%{word}%', f'%{word}%', f'"{state}"']
            )
        else:
            cursor.execute(
                "SELECT * FROM laws WHERE title LIKE ? OR description LIKE ? OR section LIKE ?",
                [f'%{word}%', f'%{word}%', f'%{word}%']
            )
        rows = cursor.fetchall()
        for row in rows:
            result = dict(row)
            result['similarity'] = 0.3
            result['fallback'] = True
            results.append(result)

    conn.close()

    seen = set()
    unique_results = []
    for r in results:
        if r['id'] not in seen:
            seen.add(r['id'])
            unique_results.append(r)

    return unique_results[:5]
