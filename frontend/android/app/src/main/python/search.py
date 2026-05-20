"""
Search Module - Keyword search for traffic law lookup

PURPOSE:
Finds the most relevant traffic laws for a user's question using SQL keyword matching.
"""

import sqlite3
from typing import List, Dict

from database import get_connection


def search(query: str, top_k: int = 3, state: str = None) -> List[Dict]:
    """
    Search for laws matching the user's query using keyword matching.

    Falls back to text search since embedding models are not available on-device.

    Args:
        query: User's natural language question
        top_k: Number of results to return (default 3, unused in keyword mode)
        state: User's state for filtering (optional)

    Returns:
        List of matching law dictionaries
    """
    return keyword_fallback(query, state)


def keyword_fallback(query: str, state: str = None) -> List[Dict]:
    """
    Search using SQL LIKE keyword matching.

    Splits the query into words and searches for each word
    in law titles, descriptions, and sections.

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
