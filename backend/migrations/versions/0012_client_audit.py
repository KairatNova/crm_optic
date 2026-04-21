"""client_audit table

Revision ID: 0012_client_audit
Revises: 0011_landing_locale_content
Create Date: 2026-04-20

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_client_audit"
down_revision: Union[str, None] = "0011_landing_locale_content"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "client_audit",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("field_name", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_client_audit_client_id"), "client_audit", ["client_id"], unique=False)
    op.create_index(op.f("ix_client_audit_user_id"), "client_audit", ["user_id"], unique=False)
    op.create_index(op.f("ix_client_audit_id"), "client_audit", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_client_audit_id"), table_name="client_audit")
    op.drop_index(op.f("ix_client_audit_user_id"), table_name="client_audit")
    op.drop_index(op.f("ix_client_audit_client_id"), table_name="client_audit")
    op.drop_table("client_audit")
