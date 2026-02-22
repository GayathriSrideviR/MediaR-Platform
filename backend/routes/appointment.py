from fastapi import APIRouter
from database import appointments

router = APIRouter()

@router.post("/book")
def book_appointment(data: dict):
    appointments.insert_one({
        "patient": data["patient"],
        "doctor": data["doctor"],
        "time": data["time"],
        "status": "pending"
    })
    return {"message": "Appointment requested"}

@router.post("/update")
def update_status(id: str, status: str):
    appointments.update_one(
        {"_id": id},
        {"$set": {"status": status}}
    )
    return {"message": "Status updated"}
