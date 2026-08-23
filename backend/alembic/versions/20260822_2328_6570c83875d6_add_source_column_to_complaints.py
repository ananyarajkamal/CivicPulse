"""add_source_column_to_complaints

Revision ID: 6570c83875d6
Revises: 20260820_0001
Create Date: 2026-08-22 23:28:29.004978

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6570c83875d6"
down_revision: str | None = "20260820_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    source_enum = sa.Enum(
        "web", "whatsapp_demo", "social_demo", "municipal_demo", name="source_enum"
    )
    source_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "complaints",
        sa.Column(
            "source",
            sa.Enum(
                "web",
                "whatsapp_demo",
                "social_demo",
                "municipal_demo",
                name="source_enum",
            ),
            server_default="web",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("complaints", "source")
    source_enum = sa.Enum(
        "web", "whatsapp_demo", "social_demo", "municipal_demo", name="source_enum"
    )
    source_enum.drop(op.get_bind(), checkfirst=True)
