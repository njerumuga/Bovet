"""classify credit sales and payment transactions

Revision ID: 20261109_payment_classification
"""
from alembic import op
import sqlalchemy as sa

revision = "20261109_payment_classification"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("invoices", sa.Column("is_credit", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("payments", sa.Column("payment_type", sa.Text(), nullable=False, server_default="direct_sale"))
    op.execute("UPDATE invoices SET is_credit = CASE WHEN balance > 0 OR status IN ('arrears', 'unpaid', 'partially_paid') THEN TRUE ELSE FALSE END")
    op.execute("UPDATE payments SET payment_type = CASE WHEN notes LIKE 'Settlement for %' THEN 'credit_collection' ELSE 'direct_sale' END")

def downgrade():
    op.drop_column("payments", "payment_type")
    op.drop_column("invoices", "is_credit")
