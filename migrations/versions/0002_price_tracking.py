"""price tracking: products, store_listings, price_points, price_alerts

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-14
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)
    op.create_index(op.f("ix_products_category"), "products", ["category"], unique=False)

    op.create_table(
        "store_listings",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("store", sa.String(length=100), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("current_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("in_stock", sa.Boolean(), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("url", name="uq_store_listings_url"),
    )
    op.create_index(op.f("ix_store_listings_product_id"), "store_listings", ["product_id"], unique=False)
    op.create_index(op.f("ix_store_listings_last_checked_at"), "store_listings", ["last_checked_at"], unique=False)

    op.create_table(
        "price_points",
        sa.Column("listing_id", sa.UUID(), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["listing_id"], ["store_listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_price_points_listing_id"), "price_points", ["listing_id"], unique=False)
    op.create_index(op.f("ix_price_points_checked_at"), "price_points", ["checked_at"], unique=False)

    op.create_table(
        "price_alerts",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("target_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "channels",
            sa.JSON(),
            nullable=False,
            comment='e.g. [{"type": "email"}, {"type": "telegram", "chat_id": "123"}]',
        ),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_price_alerts_user_id"), "price_alerts", ["user_id"], unique=False)
    op.create_index(op.f("ix_price_alerts_product_id"), "price_alerts", ["product_id"], unique=False)


def downgrade() -> None:
    op.drop_table("price_alerts")
    op.drop_table("price_points")
    op.drop_table("store_listings")
    op.drop_table("products")
