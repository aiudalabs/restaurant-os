from google.cloud.firestore_v1 import Client, WriteBatch
from google.cloud.firestore_v1.base_query import BaseQuery

from app.core.firebase import get_firestore

# Collection names — mirror of FIREBASE_SCHEMA.md / FirestorePaths
ORGANIZATIONS = "organizations"
BRANCHES      = "branches"
MENUS         = "menus"
CATEGORIES    = "categories"
PRODUCTS      = "products"
TABLES        = "tables"
STATIONS      = "stations"
ORDERS        = "orders"
ORDER_ITEMS   = "order_items"
USERS         = "users"
INTEGRATIONS  = "integrations"


def db() -> Client:
    return get_firestore()


def batch_write(documents: list[tuple[str, str, dict]]) -> int:
    """Batch-write a list of (collection, doc_id, data) tuples.
    Returns the count of documents written.
    Splits into chunks of 500 (Firestore limit).
    """
    client = db()
    chunk_size = 500
    written = 0
    for i in range(0, len(documents), chunk_size):
        chunk = documents[i : i + chunk_size]
        batch: WriteBatch = client.batch()
        for col, doc_id, data in chunk:
            ref = client.collection(col).document(doc_id)
            batch.set(ref, data, merge=True)
        batch.commit()
        written += len(chunk)
    return written
