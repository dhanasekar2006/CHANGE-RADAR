"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-14
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('users',
    sa.Column('email', sa.String(length=320), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('is_verified', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_table('workspaces',
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('slug', sa.String(length=255), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspaces_slug'), 'workspaces', ['slug'], unique=True)
    op.create_table('channels',
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('type', sa.Enum('EMAIL', 'SLACK', 'DISCORD', 'TELEGRAM', 'WEBHOOK', name='channel_type'), nullable=False),
    sa.Column('config', sa.JSON(), nullable=False, comment='Type-specific config, e.g. webhook URL, Slack channel id'),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_channels_workspace_id'), 'channels', ['workspace_id'], unique=False)
    op.create_table('monitors',
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('url', sa.Text(), nullable=False),
    sa.Column('fetcher_type', sa.Enum('HTTP', 'BROWSER', 'FEED', name='fetcher_type'), nullable=False),
    sa.Column('extractor_type', sa.Enum('CSS', 'XPATH', 'JSONPATH', 'READABILITY', name='extractor_type'), nullable=False),
    sa.Column('selector', sa.Text(), nullable=True),
    sa.Column('ignore_rules', sa.JSON(), nullable=False),
    sa.Column('check_interval_seconds', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('ACTIVE', 'PAUSED', 'ERROR', name='monitor_status'), nullable=False),
    sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('next_check_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('channel_ids', sa.JSON(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_monitors_workspace_id'), 'monitors', ['workspace_id'], unique=False)
    op.create_table('workspace_members',
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='workspace_role'), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_user')
    )
    op.create_table('monitor_runs',
    sa.Column('monitor_id', sa.UUID(), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('success', sa.Boolean(), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['monitor_id'], ['monitors.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_monitor_runs_monitor_id'), 'monitor_runs', ['monitor_id'], unique=False)
    op.create_table('snapshots',
    sa.Column('monitor_id', sa.UUID(), nullable=False),
    sa.Column('run_id', sa.UUID(), nullable=False),
    sa.Column('storage_key', sa.String(length=512), nullable=False),
    sa.Column('content_hash', sa.String(length=64), nullable=False),
    sa.Column('content_type', sa.String(length=100), nullable=False),
    sa.Column('size_bytes', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['monitor_id'], ['monitors.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['run_id'], ['monitor_runs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_snapshots_content_hash'), 'snapshots', ['content_hash'], unique=False)
    op.create_index(op.f('ix_snapshots_monitor_id'), 'snapshots', ['monitor_id'], unique=False)
    op.create_table('changes',
    sa.Column('monitor_id', sa.UUID(), nullable=False),
    sa.Column('previous_snapshot_id', sa.UUID(), nullable=True),
    sa.Column('new_snapshot_id', sa.UUID(), nullable=False),
    sa.Column('diff_type', sa.Enum('TEXT', 'JSON', 'VISUAL', name='diff_type'), nullable=False),
    sa.Column('diff_summary', sa.Text(), nullable=True),
    sa.Column('diff_payload_key', sa.Text(), nullable=True, comment='Object storage key for the full diff payload'),
    sa.Column('similarity_score', sa.Float(), nullable=True),
    sa.Column('significance', sa.Enum('NOISE', 'MINOR', 'MODERATE', 'MAJOR', 'CRITICAL', name='change_significance'), nullable=False),
    sa.Column('ai_summary', sa.Text(), nullable=True),
    sa.Column('acknowledged', sa.Boolean(), nullable=False),
    sa.Column('notified', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['monitor_id'], ['monitors.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['new_snapshot_id'], ['snapshots.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['previous_snapshot_id'], ['snapshots.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_changes_monitor_id'), 'changes', ['monitor_id'], unique=False)
    


def downgrade() -> None:
    op.drop_index(op.f('ix_changes_monitor_id'), table_name='changes')
    op.drop_table('changes')
    op.drop_index(op.f('ix_snapshots_monitor_id'), table_name='snapshots')
    op.drop_index(op.f('ix_snapshots_content_hash'), table_name='snapshots')
    op.drop_table('snapshots')
    op.drop_index(op.f('ix_monitor_runs_monitor_id'), table_name='monitor_runs')
    op.drop_table('monitor_runs')
    op.drop_table('workspace_members')
    op.drop_index(op.f('ix_monitors_workspace_id'), table_name='monitors')
    op.drop_table('monitors')
    op.drop_index(op.f('ix_channels_workspace_id'), table_name='channels')
    op.drop_table('channels')
    op.drop_index(op.f('ix_workspaces_slug'), table_name='workspaces')
    op.drop_table('workspaces')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    
    op.execute("DROP TYPE IF EXISTS change_significance")
    op.execute("DROP TYPE IF EXISTS diff_type")
    op.execute("DROP TYPE IF EXISTS workspace_role")
    op.execute("DROP TYPE IF EXISTS monitor_status")
    op.execute("DROP TYPE IF EXISTS extractor_type")
    op.execute("DROP TYPE IF EXISTS fetcher_type")
    op.execute("DROP TYPE IF EXISTS channel_type")
