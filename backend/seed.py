from app.db.base import SessionLocal
from app.db.init_db import init_db

if __name__ == "__main__":
    print("Initializing Bovet Agri Ventures Database schema...")
    db = SessionLocal()
    try:
        init_db(db)
        print("Database schema initialized successfully.")
        print("Create an administrator with: python scripts/create_admin.py")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
