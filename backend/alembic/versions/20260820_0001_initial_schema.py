"""
Initial CivicPulse database schema (9 tables, RLS policies, spatial index).

Revision ID: 20260820_0001
Revises:
Create Date: 2026-08-20 22:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260820_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # 1. Create Enums
    # -----------------------------------------------------------------------
    status_enum = postgresql.ENUM(
        "reported", "assigned", "in_progress", "resolved", "closed", "rejected",
        name="status_enum",
        create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    priority_enum = postgresql.ENUM(
        "low", "medium", "high", "critical",
        name="priority_enum",
        create_type=False,
    )
    priority_enum.create(op.get_bind(), checkfirst=True)

    user_role_enum = postgresql.ENUM(
        "municipal_officer", "admin",
        name="user_role_enum",
        create_type=False,
    )
    user_role_enum.create(op.get_bind(), checkfirst=True)

    # -----------------------------------------------------------------------
    # 2. Table: departments
    # -----------------------------------------------------------------------
    op.create_table(
        "departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("code", sa.String(length=50), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_sla_hours", sa.Integer(), nullable=False, server_default="48"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # -----------------------------------------------------------------------
    # 3. Table: complaint_categories
    # -----------------------------------------------------------------------
    op.create_table(
        "complaint_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("default_priority", priority_enum, nullable=False, server_default="medium"),
        sa.Column("default_sla_hours", sa.Integer(), nullable=True),
        sa.Column("keywords", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # -----------------------------------------------------------------------
    # 4. Table: users (Staff & Admin only — NO citizen role)
    # -----------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("role != 'municipal_officer' OR department_id IS NOT NULL", name="ck_officer_department_required"),
    )
    op.create_index("idx_users_email", "users", ["email"])

    # -----------------------------------------------------------------------
    # 5. Table: complaints
    # -----------------------------------------------------------------------
    op.create_table(
        "complaints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tracking_id", sa.String(length=30), nullable=False, unique=True),
        sa.Column("submitter_name", sa.String(length=255), nullable=True),
        sa.Column("submitter_contact", sa.String(length=255), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaint_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("department_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("priority", priority_enum, nullable=False, server_default="medium"),
        sa.Column("status", status_enum, nullable=False, server_default="reported"),
        sa.Column("is_safety_risk", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("location_text", sa.Text(), nullable=True),
        sa.Column("location_lat", sa.Numeric(precision=10, scale=8), nullable=True),
        sa.Column("location_lng", sa.Numeric(precision=11, scale=8), nullable=True),
        sa.Column("location_address", sa.Text(), nullable=True),
        sa.Column("ward", sa.String(length=100), nullable=True),
        sa.Column("ai_classification_raw", postgresql.JSONB(), nullable=True),
        sa.Column("ai_confidence", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("priority_score", sa.Integer(), nullable=True),
        sa.Column("duplicate_of", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sla_breached", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("length(raw_text) <= 2000", name="ck_raw_text_length"),
    )
    op.create_index("idx_complaints_tracking_id", "complaints", ["tracking_id"], unique=True)
    op.create_index("idx_complaints_status", "complaints", ["status"])
    op.create_index("idx_complaints_priority", "complaints", ["priority"])
    op.create_index("idx_complaints_department", "complaints", ["department_id"])
    op.create_index("idx_complaints_assigned_to", "complaints", ["assigned_to"])
    op.create_index("idx_complaints_created_at", "complaints", [sa.text("created_at DESC")])

    # -----------------------------------------------------------------------
    # 6. Table: related_complaints
    # -----------------------------------------------------------------------
    op.create_table(
        "related_complaints",
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("related_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("similarity_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("detection_method", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # -----------------------------------------------------------------------
    # 7. Table: complaint_status_history
    # -----------------------------------------------------------------------
    op.create_table(
        "complaint_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_status", status_enum, nullable=True),
        sa.Column("to_status", status_enum, nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_status_history_complaint", "complaint_status_history", ["complaint_id"])

    # -----------------------------------------------------------------------
    # 8. Table: complaint_comments
    # -----------------------------------------------------------------------
    op.create_table(
        "complaint_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("length(content) <= 5000", name="ck_comment_content_length"),
    )
    op.create_index("idx_comments_complaint", "complaint_comments", ["complaint_id"])

    # -----------------------------------------------------------------------
    # 9. Table: ai_processing_logs
    # -----------------------------------------------------------------------
    op.create_table(
        "ai_processing_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("complaint_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False),
        sa.Column("agent_name", sa.String(length=100), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_ai_logs_complaint", "ai_processing_logs", ["complaint_id"])

    # -----------------------------------------------------------------------
    # 10. Table: refresh_tokens
    # -----------------------------------------------------------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_refresh_tokens_user", "refresh_tokens", ["user_id"])
    op.create_index("idx_refresh_tokens_hash", "refresh_tokens", ["token_hash"], unique=True)

    # -----------------------------------------------------------------------
    # 11. Enable Row Level Security (RLS) & Create Policies on Supabase PostgreSQL
    # -----------------------------------------------------------------------
    tables = [
        "departments", "complaint_categories", "users", "complaints",
        "related_complaints", "complaint_status_history", "complaint_comments",
        "ai_processing_logs", "refresh_tokens"
    ]
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")

    # 1. departments policies
    op.execute("CREATE POLICY departments_public_select ON departments FOR SELECT USING (true);")
    op.execute("CREATE POLICY departments_admin_all ON departments FOR ALL USING (auth.jwt() ->> 'role' = 'admin');")

    # 2. complaint_categories policies
    op.execute("CREATE POLICY categories_public_select ON complaint_categories FOR SELECT USING (true);")
    op.execute("CREATE POLICY categories_admin_all ON complaint_categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin');")

    # 3. users policies
    op.execute("CREATE POLICY users_self_select ON users FOR SELECT USING (id = auth.uid());")
    op.execute("CREATE POLICY users_admin_all ON users FOR ALL USING (auth.jwt() ->> 'role' = 'admin');")

    # 4. complaints policies
    op.execute("CREATE POLICY complaints_public_select ON complaints FOR SELECT USING (tracking_id IS NOT NULL);")
    op.execute(
        "CREATE POLICY complaints_officer_dept ON complaints FOR ALL USING "
        "((auth.jwt() ->> 'role' = 'municipal_officer' AND department_id::text = auth.jwt() ->> 'department_id') "
        "OR auth.jwt() ->> 'role' = 'admin');"
    )

    # 5. complaint_status_history policies
    op.execute(
        "CREATE POLICY status_history_officer_select ON complaint_status_history FOR SELECT USING "
        "(EXISTS (SELECT 1 FROM complaints c WHERE c.id = complaint_status_history.complaint_id AND "
        "((auth.jwt() ->> 'role' = 'municipal_officer' AND c.department_id::text = auth.jwt() ->> 'department_id') "
        "OR auth.jwt() ->> 'role' = 'admin')));"
    )

    # 6. complaint_comments policies
    op.execute(
        "CREATE POLICY comments_officer_access ON complaint_comments FOR ALL USING "
        "(EXISTS (SELECT 1 FROM complaints c WHERE c.id = complaint_comments.complaint_id AND "
        "((auth.jwt() ->> 'role' = 'municipal_officer' AND c.department_id::text = auth.jwt() ->> 'department_id') "
        "OR auth.jwt() ->> 'role' = 'admin')));"
    )

    # 7. ai_processing_logs policies
    op.execute("CREATE POLICY ai_logs_admin_all ON ai_processing_logs FOR ALL USING (auth.jwt() ->> 'role' = 'admin');")

    # 8. refresh_tokens policies
    op.execute("CREATE POLICY refresh_tokens_service_all ON refresh_tokens FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.jwt() ->> 'role' = 'admin');")


def downgrade() -> None:
    # Drop RLS Policies
    op.execute("DROP POLICY IF EXISTS refresh_tokens_service_all ON refresh_tokens;")
    op.execute("DROP POLICY IF EXISTS ai_logs_admin_all ON ai_processing_logs;")
    op.execute("DROP POLICY IF EXISTS comments_officer_access ON complaint_comments;")
    op.execute("DROP POLICY IF EXISTS status_history_officer_select ON complaint_status_history;")
    op.execute("DROP POLICY IF EXISTS complaints_officer_dept ON complaints;")
    op.execute("DROP POLICY IF EXISTS complaints_public_select ON complaints;")
    op.execute("DROP POLICY IF EXISTS users_admin_all ON users;")
    op.execute("DROP POLICY IF EXISTS users_self_select ON users;")
    op.execute("DROP POLICY IF EXISTS categories_admin_all ON complaint_categories;")
    op.execute("DROP POLICY IF EXISTS categories_public_select ON complaint_categories;")
    op.execute("DROP POLICY IF EXISTS departments_admin_all ON departments;")
    op.execute("DROP POLICY IF EXISTS departments_public_select ON departments;")

    tables = [
        "refresh_tokens", "ai_processing_logs", "complaint_comments",
        "complaint_status_history", "related_complaints", "complaints",
        "users", "complaint_categories", "departments"
    ]
    for table in tables:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")

    op.execute("DROP TYPE IF EXISTS user_role_enum;")
    op.execute("DROP TYPE IF EXISTS priority_enum;")
    op.execute("DROP TYPE IF EXISTS status_enum;")
