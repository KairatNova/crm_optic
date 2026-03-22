"""Плейсхолдер: ревизия уже могла быть проставлена в БД без файла в репозитории.

Если `alembic upgrade` ругается на отсутствие 0007_merge_heads — этот файл восстанавливает цепочку.
Содержимое пустое: схема не меняется.

Revision ID: 0007_merge_heads
Revises: 0006_appointment_source
Create Date: 2026-03-18

"""
from typing import Sequence, Union

revision: str = "0007_merge_heads"
down_revision: Union[str, None] = "0006_appointment_source"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
