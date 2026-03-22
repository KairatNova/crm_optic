"""appointments.source: landing | crm

Revision ID: 0006_appointment_source
Revises: bc3feb762a30
Create Date: 2026-03-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_appointment_source"
down_revision: Union[str, None] = "bc3feb762a30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("source", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "source")
