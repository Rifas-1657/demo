"""add approval workflow to generated_pages

Revision ID: 001
Revises: 
Create Date: 2026-10-17 14:05:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add approval workflow columns to generated_pages table."""
    # Add new columns (all nullable for backward compatibility)
    op.add_column('generated_pages', sa.Column('rejection_reason', sa.Text(), nullable=True))
    op.add_column('generated_pages', sa.Column('approved_by', sa.String(length=36), nullable=True))
    op.add_column('generated_pages', sa.Column('approved_at', sa.DateTime(), nullable=True))
    op.add_column('generated_pages', sa.Column('rejected_by', sa.String(length=36), nullable=True))
    op.add_column('generated_pages', sa.Column('rejected_at', sa.DateTime(), nullable=True))
    op.add_column('generated_pages', sa.Column('previous_version_id', sa.String(length=36), nullable=True))
    
    # Add index on status for faster filtering
    op.create_index(op.f('ix_generated_pages_status'), 'generated_pages', ['status'], unique=False)


def downgrade() -> None:
    """Remove approval workflow columns."""
    op.drop_index(op.f('ix_generated_pages_status'), table_name='generated_pages')
    op.drop_column('generated_pages', 'previous_version_id')
    op.drop_column('generated_pages', 'rejected_at')
    op.drop_column('generated_pages', 'rejected_by')
    op.drop_column('generated_pages', 'approved_at')
    op.drop_column('generated_pages', 'approved_by')
    op.drop_column('generated_pages', 'rejection_reason')
