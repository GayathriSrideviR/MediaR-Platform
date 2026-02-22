from fastapi import APIRouter, HTTPException
from database import users_collection
from auth import hash_password, verify_password
from pydantic import BaseModel
from bson import ObjectId

router = APIRouter()

# ==========================
# MODELS
# ==========================

class User(BaseModel):
    name: str
    email: str
    password: str
    role: str
    specialization: str | None = None


class LoginUser(BaseModel):
    email: str
    password: str


# ==========================
# REGISTER
# ==========================

@router.post("/register")
def register(user: User):

    existing_user = users_collection.find_one({"email": user.email})

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": user.role,
        "specialization": user.specialization if user.role == "doctor" else None
    }

    result = users_collection.insert_one(new_user)

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }


# ==========================
# LOGIN
# ==========================

@router.post("/login")
def login(user: LoginUser):

    db_user = users_collection.find_one({"email": user.email})

    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid password")

    return {
        "message": "Login successful",
        "user_id": str(db_user["_id"]),
        "role": db_user["role"],
        "name": db_user["name"]
    }
