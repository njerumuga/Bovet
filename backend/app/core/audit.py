from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, Any
from app.db.models.audit import AuditLog  # Need to create this model later

def audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity: str,
    entity_id: str,
    before_data: Optional[Any] = None,
    after_data: Optional[Any] = None,
    ip_address: Optional[str] = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        before_data=before_data,
        after_data=after_data,
        ip_address=ip_address,
        created_at=datetime.utcnow()
    )
    db.add(log)
    # The transaction commit is handled by the caller service
