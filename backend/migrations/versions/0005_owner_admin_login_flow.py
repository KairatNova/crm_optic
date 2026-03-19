"""Owner/admin login flow tables and user fields

Revision ID: 0005_owner_admin_flow
Revises: 0004_telegram
Create Date: 2026-03-18
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0005_owner_admin_flow"
down_revision: Union[str, None] = "0004_telegram"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "username", existing_type=sa.String(length=50), nullable=True)
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("telegram_username", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True))
    op.add_column(
        "users",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "users",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.add_column(
        "users",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_index("ix_users_phone", "users", ["phone"], unique=True)
    op.create_index("ix_users_telegram_chat_id", "users", ["telegram_chat_id"], unique=True)
    op.create_check_constraint("ck_users_username_or_phone", "users", "username IS NOT NULL OR phone IS NOT NULL")

    op.create_table(
        "login_verification_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_login_verification_codes_user_id", "login_verification_codes", ["user_id"])
    op.create_index("ix_login_verification_codes_expires_at", "login_verification_codes", ["expires_at"])
    op.create_index("ix_login_verification_codes_consumed_at", "login_verification_codes", ["consumed_at"])

    op.create_table(
        "telegram_pending_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("start_token", sa.String(length=255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_telegram_pending_links_user_id", "telegram_pending_links", ["user_id"])
    op.create_index("ix_telegram_pending_links_start_token", "telegram_pending_links", ["start_token"], unique=True)
    op.create_index("ix_telegram_pending_links_expires_at", "telegram_pending_links", ["expires_at"])
    op.create_index("ix_telegram_pending_links_used_at", "telegram_pending_links", ["used_at"])


def downgrade() -> None:
    op.drop_index("ix_telegram_pending_links_used_at", table_name="telegram_pending_links")
    op.drop_index("ix_telegram_pending_links_expires_at", table_name="telegram_pending_links")
    op.drop_index("ix_telegram_pending_links_start_token", table_name="telegram_pending_links")
    op.drop_index("ix_telegram_pending_links_user_id", table_name="telegram_pending_links")
    op.drop_table("telegram_pending_links")

    op.drop_index("ix_login_verification_codes_consumed_at", table_name="login_verification_codes")
    op.drop_index("ix_login_verification_codes_expires_at", table_name="login_verification_codes")
    op.drop_index("ix_login_verification_codes_user_id", table_name="login_verification_codes")
    op.drop_table("login_verification_codes")

    op.drop_constraint("ck_users_username_or_phone", "users", type_="check")
    op.drop_index("ix_users_telegram_chat_id", table_name="users")
    op.drop_index("ix_users_phone", table_name="users")

    op.drop_column("users", "updated_at")
    op.drop_column("users", "created_at")
    op.drop_column("users", "is_verified")
    op.drop_column("users", "telegram_chat_id")
    op.drop_column("users", "telegram_username")
    op.drop_column("users", "phone")
    op.alter_column("users", "username", existing_type=sa.String(length=50), nullable=False)

