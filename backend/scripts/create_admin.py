from getpass import getpass

from app.core.security import hash_password
from app.db.base import Base, engine, SessionLocal
from app.db.models.user import User


def main() -> None:
    Base.metadata.create_all(bind=engine)
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass("Admin password (minimum 12 characters): ")
    confirmation = getpass("Confirm admin password: ")

    if not name or not email:
        raise SystemExit("Name and email are required.")
    if len(password) < 12:
        raise SystemExit("Password must be at least 12 characters.")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email.ilike(email)).first():
            raise SystemExit("A user with that email already exists.")
        db.add(
            User(
                name=name,
                email=email,
                password_hash=hash_password(password),
                role="admin",
                status="active",
            )
        )
        db.commit()
    finally:
        db.close()
    print("Admin created successfully. The plaintext password was not stored.")


if __name__ == "__main__":
    main()
