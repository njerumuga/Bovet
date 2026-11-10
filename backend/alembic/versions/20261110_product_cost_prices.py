"""add product and movement cost prices

Revision ID: 20261110_product_cost_prices
Revises: 20261109_payment_classification
"""
from alembic import op
import sqlalchemy as sa

revision = "20261110_product_cost_prices"
down_revision = "20261109_payment_classification"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("cost_price", sa.Numeric(14, 2), nullable=False, server_default="0"))
    op.add_column("stock_movements", sa.Column("cost_price", sa.Numeric(14, 2), nullable=False, server_default="0"))
    op.add_column("invoice_lines", sa.Column("cost_price", sa.Numeric(14, 2), nullable=False, server_default="0"))


def downgrade():
    op.drop_column("invoice_lines", "cost_price")
    op.drop_column("stock_movements", "cost_price")
    op.drop_column("products", "cost_price")
