"""Add is_admin column to users table

Revision ID: add_admin_column
Revises: create_users_table
Create Date: 2025-01-31 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_admin_column'
down_revision = 'create_users_table'

def upgrade() -> None:
    # Add is_admin column with default value False
    op.add_column('users', 
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false')
    )

def downgrade() -> None:
    op.drop_column('users', 'is_admin')