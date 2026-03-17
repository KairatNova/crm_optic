"""Add user role, client gender, vision extras

Revision ID: 0002_fields
Revises: 0001_initial_mvp
Create Date: 2026-03-17 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_fields"
down_revision: Union[str, None] = "0001_initial_mvp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("role", sa.String(length=32), nullable=False, server_default="admin"))
    op.add_column("clients", sa.Column("gender", sa.String(length=16), nullable=True))

    op.add_column("vision_tests", sa.Column("va_r", sa.String(length=16), nullable=True))
    op.add_column("vision_tests", sa.Column("va_l", sa.String(length=16), nullable=True))
    op.add_column("vision_tests", sa.Column("lens_type", sa.String(length=64), nullable=True))
    op.add_column("vision_tests", sa.Column("frame_model", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("vision_tests", "frame_model")
    op.drop_column("vision_tests", "lens_type")
    op.drop_column("vision_tests", "va_l")
    op.drop_column("vision_tests", "va_r")

    op.drop_column("clients", "gender")
    op.drop_column("users", "role")

