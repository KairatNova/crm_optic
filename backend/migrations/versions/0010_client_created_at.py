"""clients.created_at

Revision ID: 0010_client_created_at
Revises: 0009_soft_delete_cancel_audit
Create Date: 2026-03-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_client_created_at"
down_revision: Union[str, None] = "0009_soft_delete_cancel_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()"))
    else:
        insp = sa.inspect(bind)
        cols = [c["name"] for c in insp.get_columns("clients")]
        if "created_at" not in cols:
            op.add_column(
                "clients",
                sa.Column(
                    "created_at",
                    sa.DateTime(timezone=True),
                    nullable=False,
                    server_default=sa.text("CURRENT_TIMESTAMP"),
                ),
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE clients DROP COLUMN IF EXISTS created_at"))
    else:
        insp = sa.inspect(bind)
        cols = [c["name"] for c in insp.get_columns("clients")]
        if "created_at" in cols:
            op.drop_column("clients", "created_at")

