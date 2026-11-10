from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from decimal import Decimal
from app.db.session import get_db
from app.db.models.product import Product
from app.db.models.stock_movement import StockMovement
from app.db.models.audit import AuditLog
from app.db.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, RestockRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/products", tags=["products"])

def enrich_product(p: Product) -> ProductResponse:
    qty = Decimal(str(p.qty_on_hand))
    low_stock = Decimal(str(p.low_stock_level))
    if qty <= 0:
        stock_status = "OUT OF STOCK"
    elif qty <= low_stock:
        stock_status = "LOW STOCK"
    else:
        stock_status = "IN STOCK"

    return ProductResponse(
        id=p.id,
        name=p.name,
        category=p.category,
        base_unit=p.base_unit,
        pack_size=p.pack_size,
        price_per_unit=p.price_per_unit,
        selling_price=p.price_per_unit,
        price_per_pack=p.price_per_pack,
        cost_price=p.cost_price,
        qty_on_hand=p.qty_on_hand,
        low_stock_level=p.low_stock_level,
        status=p.status,
        stock_status=stock_status,
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(Product.name.ilike(s), Product.category.ilike(s)))
    if category and category != "All":
        query = query.filter(Product.category.ilike(category))
    if status:
        query = query.filter(Product.status == status)

    products = query.order_by(Product.name.asc()).all()
    return [enrich_product(p) for p in products]

@router.post("", response_model=ProductResponse)
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    selling_price = req.selling_price if req.selling_price is not None else req.price_per_unit
    if selling_price is None:
        raise HTTPException(status_code=422, detail="A selling price is required")
    product = Product(
        name=req.name.strip(),
        category=req.category.strip(),
        base_unit=req.base_unit.strip(),
        pack_size=req.pack_size,
        price_per_unit=selling_price,
        price_per_pack=req.price_per_pack or selling_price,
        cost_price=req.cost_price,
        qty_on_hand=req.qty_on_hand or Decimal("0"),
        low_stock_level=req.low_stock_level or Decimal("5"),
        status=req.status or "active"
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Initial stock movement if > 0
    if product.qty_on_hand > 0:
        mov = StockMovement(
            product_id=product.id,
            type="opening",
            qty_change=product.qty_on_hand,
            qty_after=product.qty_on_hand,
            cost_price=product.cost_price,
            reason="Initial stock",
            created_by=current_user.id
        )
        db.add(mov)
        db.commit()

    return enrich_product(product)

@router.get("/{id}")
def get_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    movements = db.query(StockMovement).filter(StockMovement.product_id == id).order_by(StockMovement.created_at.desc()).limit(20).all()
    return {
        "product": enrich_product(product),
        "movements": [
            {
                "id": m.id,
                "type": m.type,
                "qty_change": float(m.qty_change),
                "qty_after": float(m.qty_after),
                "reason": m.reason,
                "created_at": m.created_at
            }
            for m in movements
        ]
    }

@router.put("/{id}", response_model=ProductResponse)
def update_product(
    id: int,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    previous_status = product.status
    if req.name is not None:
        product.name = req.name.strip()
    if req.category is not None:
        product.category = req.category.strip()
    if req.base_unit is not None:
        product.base_unit = req.base_unit.strip()
    if req.pack_size is not None:
        product.pack_size = req.pack_size
    if req.price_per_unit is not None:
        product.price_per_unit = req.price_per_unit
    elif req.selling_price is not None:
        product.price_per_unit = req.selling_price
    if req.cost_price is not None:
        product.cost_price = req.cost_price
    if req.price_per_pack is not None:
        product.price_per_pack = req.price_per_pack
    if req.qty_on_hand is not None:
        product.qty_on_hand = req.qty_on_hand
    if req.low_stock_level is not None:
        product.low_stock_level = req.low_stock_level
    if req.status is not None:
        product.status = req.status

    if product.status != previous_status:
        db.add(AuditLog(
            user_id=current_user.id,
            action="change_product_status",
            entity="product",
            entity_id=str(product.id),
            before_data={"status": previous_status},
            after_data={"status": product.status},
        ))
    db.commit()
    db.refresh(product)
    return enrich_product(product)

@router.delete("/{id}")
def deactivate_product(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status == "inactive":
        return {"message": "Product is already inactive", "status": product.status}

    previous_status = product.status
    product.status = "inactive"
    db.add(AuditLog(
        user_id=current_user.id,
        action="deactivate_product",
        entity="product",
        entity_id=str(product.id),
        before_data={"status": previous_status},
        after_data={"status": product.status},
    ))
    db.commit()
    return {"message": "Product marked as inactive", "status": product.status}

@router.post("/{id}/restock", response_model=ProductResponse)
def restock_product(
    id: int,
    req: RestockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status != "active":
        raise HTTPException(status_code=400, detail="Inactive products cannot be restocked.")

    if req.qty <= 0:
        raise HTTPException(status_code=400, detail="Restock quantity must be positive")
    if req.cost_price < 0:
        raise HTTPException(status_code=400, detail="Cost price cannot be negative")

    product.qty_on_hand += req.qty
    product.cost_price = req.cost_price
    mov = StockMovement(
        product_id=product.id,
        type="stock_in",
        qty_change=req.qty,
        qty_after=product.qty_on_hand,
        cost_price=req.cost_price,
        reason=req.reason or "Restock shipment",
        created_by=current_user.id
    )
    db.add(mov)
    db.commit()
    db.refresh(product)
    return enrich_product(product)
