from fastapi import APIRouter, HTTPException
from database import users_collection
from passlib.hash import bcrypt
from bson import ObjectId
from passlib.context import CryptContext
router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# REGISTER
@router.post("/register")
def register(user: dict):
    existing_user = users_collection.find_one({"email": user["email"]})

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    user["password"] = bcrypt.hash(user["password"])

    users_collection.insert_one(user)

    return {"message": "User registered successfully"}


# LOGIN
@router.post("/login")
def login(user: dict):
    db_user = users_collection.find_one({"email": user["email"]})

    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")

    if not bcrypt.verify(user["password"], db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid password")

    return {
        "message": "Login successful",
        "user_id": str(db_user["_id"]),
        "role": db_user["role"]
    }


def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)