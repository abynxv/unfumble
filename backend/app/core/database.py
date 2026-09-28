"""
Database connection setup using SQLAlchemy 2.x async engine.

WHY async: FastAPI is an async framework. Using an async database driver (asyncpg)
with SQLAlchemy's async engine means our database queries don't block the event loop.
This lets FastAPI handle other requests while waiting for database responses.

KEY CONCEPTS:
- Engine: The connection pool manager. One engine per application.
- SessionLocal: A factory that creates new database sessions.
- Base: The declarative base class that all our ORM models inherit from.
- get_db(): A FastAPI dependency that provides a database session per request
  and ensures it's properly closed when the request finishes.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# Create the async database engine.
# pool_pre_ping=True checks connections before using them, which avoids
# errors from stale/dropped connections in the pool.
engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",  # Log SQL in development
    pool_pre_ping=True,
)

# Session factory — creates new AsyncSession instances.
# expire_on_commit=False prevents attributes from being expired after commit,
# which would cause lazy-loading issues in async context.
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    All models (like Generation) inherit from this class.
    Alembic uses this to detect schema changes for migrations.
    """
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.

    WHY a dependency: FastAPI's Depends() system injects this into route handlers.
    The 'yield' pattern ensures the session is always closed after the request,
    even if an error occurs. This prevents connection leaks.

    Usage in a route:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
