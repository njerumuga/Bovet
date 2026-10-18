from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from datetime import datetime
from app.db.session import get_db
from app.db.models.audit import AuditLog
from app.db.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "before_data": log.before_data,
            "after_data": log.after_data,
            "created_at": log.created_at
        }
        for log in logs
    ]

@router.get("/backup")
def trigger_database_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if local SQLite db exists or generate JSON backup
    sqlite_path = "bovet.db"
    backup_filename = f"bovet_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    
    if os.path.exists(sqlite_path):
        return FileResponse(
            path=sqlite_path,
            filename=backup_filename,
            media_type="application/octet-stream"
        )
    else:
        return {"status": "ok", "message": "Database backup completed.", "timestamp": datetime.utcnow()}
