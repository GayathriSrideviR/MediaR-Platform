from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://127.0.0.1:27017/")

# Database name
db = client["ai_medical_db"]

# Collections
users_collection = db["users"]
appointments_collection = db["appointments"]
reports_collection = db["reports"]
