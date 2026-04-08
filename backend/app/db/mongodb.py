"""
MongoDB async connection using Motor.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv

load_dotenv()

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            os.getenv("MONGODB_URL", "mongodb://localhost:27017"),
            serverSelectionTimeoutMS=5000,
        )
    return _client


async def connect_db():
    """Initialize MongoDB connection."""
    get_client()


async def get_db() -> AsyncIOMotorDatabase:
    client = get_client()
    db_name = os.getenv("MONGODB_DB", "ecosentinel")
    return client[db_name]


async def close_db():
    global _client
    if _client:
        _client.close()
        _client = None
