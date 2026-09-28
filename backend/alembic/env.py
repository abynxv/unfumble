"""
Alembic environment configuration.

HOW ALEMBIC WORKS:
Alembic is the database migration tool for SQLAlchemy. It tracks changes
to your ORM models and generates migration scripts to update the database
schema accordingly.

KEY CONCEPTS:
- target_metadata: Alembic compares this against the actual database schema
  to detect what needs to change.
- run_migrations_online: Runs migrations against a live database connection.
- We import our Base and all models so Alembic can see them.

IMPORTANT: We convert the async database URL to a sync URL for Alembic,
because Alembic itself doesn't support async operations.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings

# Import Base and ALL models so Alembic can detect them.
# If you add a new model file, import it here too.
from app.core.database import Base
from app.models.generation import Generation  # noqa: F401 — needed for Alembic detection

# Alembic Config object — provides access to alembic.ini values
config = context.config

# Set up Python logging from the alembic.ini file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tell Alembic about our models' metadata so it can auto-generate migrations
target_metadata = Base.metadata

# Get the database URL from our app config and convert async → sync
settings = get_settings()
# Alembic runs synchronously, so we need to replace asyncpg with psycopg2
sync_database_url = settings.database_url.replace(
    "postgresql+asyncpg://", "postgresql://"
)
config.set_main_option("sqlalchemy.url", sync_database_url)


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode — generates SQL without connecting to the DB.
    Useful for generating migration SQL scripts to run manually.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode — connects to the database and applies changes.
    This is the normal mode used during development and deployment.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
