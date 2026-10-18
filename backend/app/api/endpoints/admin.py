from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.models.user import User
from app.db.session import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "last_login_at": u.last_login_at,
        }
        for u in users
    ]


@router.get("/settings")
def get_settings(
    current_user: User = Depends(get_current_user),
):
    return {
        "business_name": "Bovet Agri Ventures",
        "currency": "KES",
        "stock_policy": "warn",
        "invoice_start_no": 607,
        "owner": current_user.name,
    }


@router.put("/settings")
def update_settings(
    payload: dict,
    current_user: User = Depends(get_current_user),
):
    return {
        "message": "Settings updated successfully.",
        "updated_by": current_user.name,
        "settings": payload,
    }
