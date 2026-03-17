"""Initial MVP tables: users, clients, appointments, visits, vision_tests

Revision ID: 0001_initial_mvp
Revises: 
Create Date: 2026-03-17 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_mvp"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=50), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
    )
    op.create_index("ix_clients_phone", "clients", ["phone"])

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service", sa.String(length=255), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
        sa.Column("comment", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_appointments_client_id", "appointments", ["client_id"])
    op.create_index("ix_appointments_starts_at", "appointments", ["starts_at"])

    op.create_table(
        "visits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("visited_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("comment", sa.String(length=1000), nullable=True),
    )
    op.create_index("ix_visits_client_id", "visits", ["client_id"])

    op.create_table(
        "vision_tests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("od_sph", sa.String(length=16), nullable=True),
        sa.Column("od_cyl", sa.String(length=16), nullable=True),
        sa.Column("od_axis", sa.String(length=16), nullable=True),
        sa.Column("os_sph", sa.String(length=16), nullable=True),
        sa.Column("os_cyl", sa.String(length=16), nullable=True),
        sa.Column("os_axis", sa.String(length=16), nullable=True),
        sa.Column("pd", sa.String(length=16), nullable=True),
        sa.Column("comment", sa.String(length=1000), nullable=True),
    )
    op.create_index("ix_vision_tests_client_id", "vision_tests", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_vision_tests_client_id", table_name="vision_tests")
    op.drop_table("vision_tests")

    op.drop_index("ix_visits_client_id", table_name="visits")
    op.drop_table("visits")

    op.drop_index("ix_appointments_starts_at", table_name="appointments")
    op.drop_index("ix_appointments_client_id", table_name="appointments")
    op.drop_table("appointments")

    op.drop_index("ix_clients_phone", table_name="clients")
    op.drop_table("clients")

    op.drop_table("users")

