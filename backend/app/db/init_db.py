from decimal import Decimal
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.db.base import Base, engine, SessionLocal
from app.db.models.user import User
from app.db.models.customer import Customer
from app.db.models.product import Product
from app.db.models.invoice import Invoice
from app.db.models.invoice_line import InvoiceLine
from app.db.models.stock_movement import StockMovement
from app.db.models.payment import Payment
from app.db.models.otp_challenge import OTPChallenge
from app.core.config import settings

def init_db(db: Session) -> None:
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)

    # 1. Seed or update Admin User
    admin_email = "knjeru13@gmail.com"
    admin = db.query(User).filter(User.email.ilike(admin_email)).first()
    if not admin:
        print("Initial admin not created: run `python scripts/create_admin.py`.")
        return
    else:
        admin.name = "Eng. Njeru"
        db.commit()

    # 2. Seed Products if none
    if db.query(Product).count() == 0:
        products = [
            Product(
                name="Dairy Meal High Yield 50kg",
                category="Animal Feeds",
                base_unit="Bags",
                pack_size=Decimal("50"),
                price_per_unit=Decimal("3100.00"),
                price_per_pack=Decimal("3100.00"),
                qty_on_hand=Decimal("45"),
                low_stock_level=Decimal("10"),
                status="active"
            ),
            Product(
                name="Poultry Mash 20kg",
                category="Animal Feeds",
                base_unit="Bags",
                pack_size=Decimal("20"),
                price_per_unit=Decimal("2600.00"),
                price_per_pack=Decimal("2600.00"),
                qty_on_hand=Decimal("8"),
                low_stock_level=Decimal("10"),
                status="active"
            ),
            Product(
                name="Mineral Salt Block 5kg",
                category="Mineral Salts",
                base_unit="Blocks",
                pack_size=Decimal("5"),
                price_per_unit=Decimal("850.00"),
                price_per_pack=Decimal("850.00"),
                qty_on_hand=Decimal("30"),
                low_stock_level=Decimal("5"),
                status="active"
            ),
            Product(
                name="Custom Cattle Feed (per Kg)",
                category="Bulk Feeds",
                base_unit="Kgs",
                pack_size=Decimal("1"),
                price_per_unit=Decimal("65.00"),
                price_per_pack=Decimal("65.00"),
                qty_on_hand=Decimal("450"),
                low_stock_level=Decimal("100"),
                status="active"
            ),
            Product(
                name="High Phosphorous Booster 10kg",
                category="Supplements",
                base_unit="Bags",
                pack_size=Decimal("10"),
                price_per_unit=Decimal("1950.00"),
                price_per_pack=Decimal("1950.00"),
                qty_on_hand=Decimal("15"),
                low_stock_level=Decimal("5"),
                status="active"
            ),
        ]
        db.add_all(products)
        db.commit()

    # 3. Seed Customers if none
    if db.query(Customer).count() == 0:
        c1 = Customer(
            name="Karuri Dairy Farm",
            phone="+254 722 123 456",
            location="Ruiru Bypass",
            email="karuri@dairyfarm.co.ke",
            status="active",
            created_by=admin.id
        )
        c2 = Customer(
            name="David Mutuma",
            phone="+254 710 987 654",
            location="Kihunguro, Ruiru",
            email="david.mutuma@gmail.com",
            status="active",
            created_by=admin.id
        )
        c3 = Customer(
            name="Ruiru Dairy Farmers Co-op",
            phone="+254 701 555 222",
            location="Ruiru Town",
            email="info@ruirudairy.co.ke",
            status="active",
            created_by=admin.id
        )
        db.add_all([c1, c2, c3])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)
        db.refresh(c3)

        # 4. Seed Invoices matching the exact records from UI
        prod1 = db.query(Product).filter(Product.name.like("%Dairy Meal%")).first()
        prod3 = db.query(Product).filter(Product.name.like("%Mineral Salt%")).first()

        # INV-606
        inv606 = Invoice(
            invoice_no="INV-606",
            kind="sale",
            customer_id=c1.id,
            invoice_date=date(2026, 10, 1),
            subtotal=Decimal("18050.00"),
            discount=Decimal("0.00"),
            total=Decimal("18050.00"),
            amount_paid=Decimal("16300.00"),
            balance=Decimal("1750.00"),
            status="arrears",
            created_by=admin.id
        )
        db.add(inv606)
        db.commit()
        db.refresh(inv606)

        line1 = InvoiceLine(
            invoice_id=inv606.id,
            product_id=prod1.id if prod1 else 1,
            description="Dairy Meal High Yield 50kg",
            sell_unit="Bags",
            qty_entered=Decimal("5"),
            base_qty=Decimal("5"),
            unit_price=Decimal("3100.00"),
            list_price=Decimal("3100.00"),
            line_amount=Decimal("15500.00")
        )
        line2 = InvoiceLine(
            invoice_id=inv606.id,
            product_id=prod3.id if prod3 else 3,
            description="Mineral Salt Block 5kg",
            sell_unit="Blocks",
            qty_entered=Decimal("3"),
            base_qty=Decimal("3"),
            unit_price=Decimal("850.00"),
            list_price=Decimal("850.00"),
            line_amount=Decimal("2550.00")
        )
        db.add_all([line1, line2])

        # Add initial payment & receipt for inv606
        pmt606 = Payment(
            receipt_no="RCT-606",
            customer_id=c1.id,
            invoice_id=inv606.id,
            payment_date=date(2026, 10, 1),
            amount=Decimal("16300.00"),
            payment_method="M-Pesa",
            reference_code="QJA8839KD1",
            notes="Deposit via Paybill 247247",
            posted_by=admin.id
        )
        db.add(pmt606)

        # INV-605
        inv605 = Invoice(
            invoice_no="INV-605",
            kind="sale",
            customer_id=c2.id,
            invoice_date=date(2026, 9, 28),
            subtotal=Decimal("1700.00"),
            discount=Decimal("0.00"),
            total=Decimal("1700.00"),
            amount_paid=Decimal("1700.00"),
            balance=Decimal("0.00"),
            status="paid",
            created_by=admin.id
        )
        db.add(inv605)
        db.commit()
        db.refresh(inv605)

        line3 = InvoiceLine(
            invoice_id=inv605.id,
            product_id=prod3.id if prod3 else 3,
            description="Mineral Salt Block 5kg",
            sell_unit="Blocks",
            qty_entered=Decimal("2"),
            base_qty=Decimal("2"),
            unit_price=Decimal("850.00"),
            list_price=Decimal("850.00"),
            line_amount=Decimal("1700.00")
        )
        db.add(line3)

        pmt605 = Payment(
            receipt_no="RCT-605",
            customer_id=c2.id,
            invoice_id=inv605.id,
            payment_date=date(2026, 9, 28),
            amount=Decimal("1700.00"),
            payment_method="Cash",
            notes="Full cash payment at counter",
            posted_by=admin.id
        )
        db.add(pmt605)

        # INV-604 (Co-op previous purchases / balance)
        inv604 = Invoice(
            invoice_no="INV-604",
            kind="sale",
            customer_id=c3.id,
            invoice_date=date(2026, 9, 20),
            subtotal=Decimal("82000.00"),
            discount=Decimal("0.00"),
            total=Decimal("82000.00"),
            amount_paid=Decimal("66600.00"),
            balance=Decimal("15400.00"),
            status="arrears",
            created_by=admin.id
        )
        db.add(inv604)
        db.commit()
        db.refresh(inv604)

        pmt604 = Payment(
            receipt_no="RCT-604",
            customer_id=c3.id,
            invoice_id=inv604.id,
            payment_date=date(2026, 9, 20),
            amount=Decimal("66600.00"),
            payment_method="M-Pesa",
            reference_code="QHG7194LM2",
            notes="Partial bank/paybill transfer",
            posted_by=admin.id
        )
        db.add(pmt604)

        db.commit()
