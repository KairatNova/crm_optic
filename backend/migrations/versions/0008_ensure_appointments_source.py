"""Гарантировать колонку appointments.source (если БД без 0006 / рассинхрон).

Revision ID: 0008_ensure_appointments_source
Revises: 0007_merge_heads
Create Date: 2026-03-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_ensure_appointments_source"
down_revision: Union[str, None] = "0007_merge_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source VARCHAR(32)")
        )
    else:
        insp = sa.inspect(bind)
        cols = [c["name"] for c in insp.get_columns("appointments")]
        if "source" not in cols:
            op.add_column("appointments", sa.Column("source", sa.String(length=32), nullable=True))


def downgrade() -> None:
    pass
