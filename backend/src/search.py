"""
Search Module - FAISS semantic search and keyword fallback

PURPOSE:
Finds the most relevant traffic laws for a user's natural language question.

HOW IT WORKS:
1. User asks: "What's the fine for speeding?"
2. The question is converted to a 384-dimensional vector (embedding)
3. The vector is compared against all law vectors in the FAISS index
4. The top 3 most similar laws are returned
5. If no good match is found (low similarity), falls back to keyword search

EMBEDDING MODEL:
- Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
- Exported to ONNX format for lighter memory footprint
- Pre-loaded on app startup for fast query responses

FAISS INDEX:
- Pre-computed during data ingestion (not on device)
- Bundled with the app as binary files
- Uses inner product similarity (IndexFlatIP) with normalized vectors

KEYWORD FALLBACK:
When semantic search confidence is too low, uses SQL LIKE queries
to match keywords against law titles and descriptions.
"""

import os
import numpy as np
from typing import List, Dict
import sqlite3

# Try to import FAISS (may not be available during desktop development)
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

# Try to import ONNX runtime (for embedding model inference)
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

from database import get_connection

# File paths for models and index
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'all-MiniLM-L6-v2.onnx')
INDEX_PATH = os.path.join(os.path.dirname(__file__), 'models', 'faiss_index')
INDEX_FILE = os.path.join(INDEX_PATH, 'index.faiss')
METADATA_FILE = os.path.join(INDEX_PATH, 'index.pkl')

# Global caches for loaded models (loaded once, reused across queries)
_model = None
_index = None
_metadata = None


def _load_embedding_model():
    """
    Load the ONNX embedding model (lazy-loaded on first use).
    
    The model converts text into a 384-dimensional vector that captures
    semantic meaning. Similar questions produce similar vectors.
    """
    global _model
    if _model is None and ONNX_AVAILABLE and os.path.exists(MODEL_PATH):
        _model = ort.InferenceSession(MODEL_PATH)
    return _model


def _load_faiss_index():
    """
    Load the pre-computed FAISS index (lazy-loaded on first use).
    
    The index contains vectors for all laws in the database.
    Each vector represents the semantic meaning of a law's description.
    """
    global _index, _metadata
    if _index is None and FAISS_AVAILABLE and os.path.exists(INDEX_FILE):
        _index = faiss.read_index(INDEX_FILE)
        # Load the mapping from index positions to law IDs
        import pickle
        if os.path.exists(METADATA_FILE):
            with open(METADATA_FILE, 'rb') as f:
                _metadata = pickle.load(f)
    return _index


def embed_query(text: str) -> np.ndarray:
    """
    Convert a text query into a 384-dimensional embedding vector.
    
    The embedding captures the semantic meaning of the text,
    so "What's the speeding fine?" and "Penalty for overspeeding"
    produce similar vectors.
    
    Args:
        text: The user's question
    
    Returns:
        numpy array of shape (384,) - the embedding vector
    """
    model = _load_embedding_model()
    if model is None:
        return np.zeros(384)  # Return zero vector if model unavailable

    # Run inference through ONNX model
    inputs = {model.get_inputs()[0].name: [text]}
    outputs = model.run(None, inputs)
    embedding = outputs[0][0]
    # Normalize to unit length (required for inner product similarity)
    embedding = embedding / np.linalg.norm(embedding)
    return embedding.astype(np.float32)


def search(query: str, top_k: int = 3, state: str = None) -> List[Dict]:
    """
    Search for laws semantically similar to the user's query.
    
    PROCESS:
    1. Embed the query text into a vector
    2. Search FAISS index for top_k most similar law vectors
    3. Fetch full law details from SQLite
    4. If no results found, fall back to keyword search
    
    Args:
        query: User's natural language question
        top_k: Number of results to return (default 3)
        state: User's state for filtering (optional)
    
    Returns:
        List of law dictionaries with similarity scores
    """
    index = _load_faiss_index()
    if index is None:
        # FAISS not available, use keyword fallback directly
        return keyword_fallback(query, state)

    # Convert query to vector
    embedding = embed_query(query)
    embedding = embedding.reshape(1, -1)  # FAISS expects 2D array

    # Search for most similar vectors
    distances, indices = index.search(embedding, top_k)

    # Fetch full law details from SQLite
    results = []
    conn = get_connection()
    cursor = conn.cursor()

    for i, idx in enumerate(indices[0]):
        if idx == -1:  # FAISS returns -1 for empty slots
            continue
        if _metadata and idx < len(_metadata):
            law_id = _metadata[idx]
            cursor.execute("SELECT * FROM laws WHERE id = ?", [law_id])
            row = cursor.fetchone()
            if row:
                result = dict(row)
                # Convert distance to similarity score (0-1)
                result['similarity'] = max(0.0, float(1 - distances[0][i]))
                results.append(result)

    conn.close()

    # Fall back to keyword search if no semantic results
    if not results:
        return keyword_fallback(query, state)

    return results


def keyword_fallback(query: str, state: str = None) -> List[Dict]:
    """
    Fallback search using SQL LIKE when semantic search fails.
    
    Splits the query into words and searches for each word
    in law titles, descriptions, and sections.
    
    This is less accurate than semantic search but guarantees
    some results even for unusual queries.
    
    Args:
        query: User's question
        state: User's state (optional)
    
    Returns:
        List of matching law dictionaries
    """
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
            result['similarity'] = 0.3  # Low confidence for keyword matches
            result['fallback'] = True
            results.append(result)

    conn.close()

    # Remove duplicates (same law matched by multiple keywords)
    seen = set()
    unique_results = []
    for r in results:
        if r['id'] not in seen:
            seen.add(r['id'])
            unique_results.append(r)

    return unique_results[:5]
