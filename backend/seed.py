from app.db.base import SessionLocal
from app.db.init_db import init_db

if __name__ == "__main__":
    print("Seeding Bovet Agri Ventures Database...")
    db = SessionLocal()
    try:
        init_db(db)
        print("Database initialized & seeded successfully!")
        print("Admin user: knjeru13@gmail.com")
        print("Password:   Admin@123")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
