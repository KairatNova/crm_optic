"""deleted_at, cancellation_reason, appointment_audit

Revision ID: 0009_soft_delete_cancel_audit
Revises: 0008_ensure_appointments_source
Create Date: 2026-03-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_soft_delete_cancel_audit"
down_revision: Union[str, None] = "0008_ensure_appointments_source"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("cancellation_reason", sa.String(length=255), nullable=True))
    op.create_table(
        "appointment_audit",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("field_name", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointment_audit_appointment_id"), "appointment_audit", ["appointment_id"], unique=False)
    op.create_index(op.f("ix_appointment_audit_id"), "appointment_audit", ["id"], unique=False)
    op.create_index(op.f("ix_appointment_audit_user_id"), "appointment_audit", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_appointment_audit_user_id"), table_name="appointment_audit")
    op.drop_index(op.f("ix_appointment_audit_id"), table_name="appointment_audit")
    op.drop_index(op.f("ix_appointment_audit_appointment_id"), table_name="appointment_audit")
    op.drop_table("appointment_audit")
    op.drop_column("appointments", "cancellation_reason")
    op.drop_column("appointments", "deleted_at")
    op.drop_column("clients", "deleted_at")
