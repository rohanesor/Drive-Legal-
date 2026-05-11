import os
import json
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import initialize_database
from ingest.seed import seed_database

if __name__ == '__main__':
    initialize_database()
    seed_database()
    print("Database seeded successfully.")
