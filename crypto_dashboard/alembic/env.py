from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

import os
import sys

CRYPTOPANIC_API_KEY="8f879ae3e7bded2246a3d183e888898975d1692a"

# Add the parent directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import models
from app.services.db import Base, CryptoPrice, News

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set MetaData object
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
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
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

# Run migrations in either offline or online mode
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
