from pydantic import BaseModel
from datetime import datetime
class User(BaseModel):
    name: str
    email: str
    password: str
    role: str  # doctor / patient

class Report(BaseModel):
    patient_id: str
    prediction: str
    confidence: float
    date: datetime
    
class LoginUser(BaseModel):
    email: str
    password: str