"""landing_locale_content

Revision ID: 0011_landing_locale_content
Revises: 0010_client_created_at
Create Date: 2026-03-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_landing_locale_content"
down_revision: Union[str, None] = "0010_client_created_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "landing_locale_content",
        sa.Column("locale", sa.String(length=5), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("locale"),
    )


def downgrade() -> None:
    op.drop_table("landing_locale_content")
