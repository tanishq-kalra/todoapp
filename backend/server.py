from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os
import bcrypt
import jwt
import pymongo
from pymongo.errors import DuplicateKeyError

mongo_url = os.environ['MONGO_URL']
if "localhost" in mongo_url or "127.0.0.1" in mongo_url:
    from mongomock_motor import AsyncMongoMockClient
    client = AsyncMongoMockClient()
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()

@app.on_event("startup")
async def startup_db_client():
    # Enforce unique email index
    # Since we normalize all emails to lowercase before insertion,
    # a standard unique index is sufficient and ensures find_one uses the index properly.
    try:
        await db.users.create_index("email", unique=True)
    except pymongo.errors.OperationFailure as e:
        print(f"Warning: Could not create unique index on email. {e}")
    
    await db.tasks.create_index([("user_id", pymongo.ASCENDING), ("order", pymongo.ASCENDING)])
    await db.tasks.create_index([("user_id", pymongo.ASCENDING), ("completed", pymongo.ASCENDING)])
    await db.refresh_tokens.create_index("token", unique=True)

api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

def normalize_email(email: str) -> str:
    """Normalize email to lowercase for case-insensitive operations"""
    return email.lower().strip()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    return hashed.decode()

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_access_token(user_id: str, email: str):
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str):
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    secret = os.environ.get("JWT_REFRESH_SECRET", os.environ["JWT_SECRET"])
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request):
    # Enforce HttpOnly Cookie strictly
    token = request.cookies.get("access_token")
            
    if not token or token == "undefined" or token == "null":
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None
    category: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    category: Optional[str] = None
    completed: Optional[bool] = None

class SubtaskCreate(BaseModel):
    title: str

class SubtaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    # Normalize email to prevent case-sensitive duplicates
    normalized_email = normalize_email(data.email)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed = hash_password(data.password)

    user = {
        "name": data.name,
        "email": normalized_email,  # Store normalized email
        "password_hash": hashed,
        "plan": "normal",
        "created_at": datetime.now(timezone.utc)
    }

    try:
        result = await db.users.insert_one(user)
        user_id_str = str(result.inserted_id)
    except DuplicateKeyError:
        # Race condition: User was created between check and insert
        raise HTTPException(status_code=409, detail="Email already registered")

    access_token = create_access_token(user_id_str, normalized_email)
    refresh_token = create_refresh_token(user_id_str)

    await db.refresh_tokens.insert_one({
        "user_id": user_id_str, 
        "token": refresh_token, 
        "created_at": datetime.now(timezone.utc)
    })

    response.set_cookie(key="access_token", value=access_token, httponly=True, max_age=900, samesite="lax")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=604800, samesite="lax")

    return {"token": access_token, "user": {"id": user_id_str, "name": data.name, "email": normalized_email, "plan": "normal"}}

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    # Normalize email to prevent case-sensitive mismatches
    normalized_email = normalize_email(data.email)
    
    user = await db.users.find_one({"email": normalized_email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id_str = str(user["_id"])
    
    access_token = create_access_token(user_id_str, normalized_email)
    refresh_token = create_refresh_token(user_id_str)

    await db.refresh_tokens.insert_one({
        "user_id": user_id_str, 
        "token": refresh_token, 
        "created_at": datetime.now(timezone.utc)
    })

    response.set_cookie(key="access_token", value=access_token, httponly=True, max_age=900, samesite="lax")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=604800, samesite="lax")

    return {"token": access_token, "user": {"id": user_id_str, "name": user["name"], "email": user["email"], "plan": user.get("plan", "normal")}}

class GoogleAuthRequest(BaseModel):
    credential: str

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

@api_router.post("/auth/google")
async def google_auth(data: GoogleAuthRequest, response: Response):
    try:
        # Validate Google ID token
        idinfo = id_token.verify_oauth2_token(
            data.credential, 
            google_requests.Request(), 
            "159806562421-61ndc6f2kp7lkdiuen5lv0tlajdkop6t.apps.googleusercontent.com"
        )
        
        # Normalize email to prevent duplicates with different cases
        email = normalize_email(idinfo['email'])
        name = idinfo.get('name', email.split("@")[0])
        picture = idinfo.get('picture', None)
        
        # Check if user exists - always map to same user
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Create new user for first-time Google OAuth
            new_user = {
                "name": name,
                "email": email,
                "password_hash": "",  # No password for Google OAuth users
                "plan": "normal",
                "picture": picture,  # Store Google profile picture
                "auth_method": "google",
                "created_at": datetime.now(timezone.utc)
            }
            
            try:
                result = await db.users.insert_one(new_user)
                user_id_str = str(result.inserted_id)
                user = new_user
                user["_id"] = result.inserted_id
            except DuplicateKeyError:
                # Race condition: User was created between check and insert
                # Fetch and use the existing user
                user = await db.users.find_one({"email": email})
                if not user:
                    raise HTTPException(status_code=500, detail="Database error: cannot fetch user")
                user_id_str = str(user["_id"])
        else:
            # Existing user: optionally update profile picture and name if changed
            user_id_str = str(user["_id"])
            update_fields = {}
            
            # Update name if different (user may have changed name in Google account)
            if user.get("name") != name:
                update_fields["name"] = name
            
            # Update picture if available and different
            if picture and user.get("picture") != picture:
                update_fields["picture"] = picture
            
            # Mark auth method if not set
            if not user.get("auth_method"):
                update_fields["auth_method"] = "google"
            
            # Apply updates if any changes
            if update_fields:
                update_fields["updated_at"] = datetime.now(timezone.utc)
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": update_fields}
                )
                # Refresh user object with updates
                user = await db.users.find_one({"_id": user["_id"]})

        # Generate tokens for authenticated user
        access_token = create_access_token(user_id_str, email)
        refresh_token = create_refresh_token(user_id_str)

        await db.refresh_tokens.insert_one({
            "user_id": user_id_str, 
            "token": refresh_token, 
            "created_at": datetime.now(timezone.utc)
        })

        response.set_cookie(key="access_token", value=access_token, httponly=True, max_age=900, samesite="lax")
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, max_age=604800, samesite="lax")

        # Return user info (always from same document)
        user_plan = user.get("plan", "normal")
        return {
            "token": access_token,
            "user": {
                "id": user_id_str,
                "name": user.get("name", email.split("@")[0]),
                "email": email,
                "plan": user_plan,
                "picture": user.get("picture")
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid Google token")

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    ref_token = request.cookies.get("refresh_token")
    if not ref_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    db_token = await db.refresh_tokens.find_one({"token": ref_token})
    if not db_token:
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Invalid or revoked refresh token")
        
    try:
        secret = os.environ.get("JWT_REFRESH_SECRET", os.environ["JWT_SECRET"])
        payload = jwt.decode(ref_token, secret, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        new_access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=new_access_token, httponly=True, max_age=900, samesite="lax")
        return {"message": "Token refreshed successfully", "token": new_access_token}
    except jwt.ExpiredSignatureError:
        await db.refresh_tokens.delete_one({"token": ref_token})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    ref_token = request.cookies.get("refresh_token")
    if ref_token:
        await db.refresh_tokens.delete_many({"token": ref_token})
        
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "plan": user.get("plan", "normal")}

@api_router.get("/tasks")
async def get_tasks(user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"user_id": user["_id"]}).sort("order", 1).to_list(None)
    for task in tasks:
        task["id"] = str(task["_id"])
        del task["_id"]
        task["user_id"] = str(task["user_id"])
        if task.get("due_date"):
            task["due_date"] = task["due_date"].isoformat()
        if task.get("subtasks"):
            for subtask in task["subtasks"]:
                subtask["id"] = str(subtask["_id"])
                del subtask["_id"]
    return tasks

@api_router.post("/tasks")
async def create_task(task_data: TaskCreate, user: dict = Depends(get_current_user)):
    user_plan = user.get("plan", "normal")
    if user_plan == "normal":
        total_tasks = await db.tasks.count_documents({"user_id": user["_id"]})
        if total_tasks >= 5:
            raise HTTPException(status_code=403, detail="Upgrade to Premium to add more tasks")

    # Get the highest order number
    last_task = await db.tasks.find_one({"user_id": user["_id"]}, sort=[("order", -1)])
    order = (last_task.get("order", 0) + 1) if last_task else 1
    
    task = {
        "user_id": user["_id"],
        "title": task_data.title,
        "description": task_data.description,
        "priority": task_data.priority,
        "due_date": task_data.due_date,
        "category": task_data.category,
        "completed": False,
        "order": order,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.tasks.insert_one(task)
    task["id"] = str(result.inserted_id)
    del task["_id"]
    task["user_id"] = str(task["user_id"])
    if task.get("due_date"):
        task["due_date"] = task["due_date"].isoformat()
    return task

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, task_data: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    updated_task["id"] = str(updated_task["_id"])
    del updated_task["_id"]
    updated_task["user_id"] = str(updated_task["user_id"])
    if updated_task.get("due_date"):
        updated_task["due_date"] = updated_task["due_date"].isoformat()
    if updated_task.get("subtasks"):
        for subtask in updated_task["subtasks"]:
            subtask["id"] = str(subtask["_id"])
            del subtask["_id"]
    return updated_task

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"_id": ObjectId(task_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

class ReorderRequest(BaseModel):
    new_order: int

@api_router.post("/tasks/{task_id}/reorder")
async def reorder_task(task_id: str, data: ReorderRequest, user: dict = Depends(get_current_user)):
    new_order = data.new_order
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Shift other tasks
    if new_order < task["order"]:
        await db.tasks.update_many(
            {"user_id": user["_id"], "order": {"$gte": new_order, "$lt": task["order"]}},
            {"$inc": {"order": 1}}
        )
    else:
        await db.tasks.update_many(
            {"user_id": user["_id"], "order": {"$gt": task["order"], "$lte": new_order}},
            {"$inc": {"order": -1}}
        )
    
    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": {"order": new_order}})
    return {"message": "Task reordered"}

@api_router.post("/tasks/{task_id}/subtasks")
async def create_subtask(task_id: str, subtask_data: SubtaskCreate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    subtask = {
        "_id": ObjectId(),
        "title": subtask_data.title,
        "completed": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"subtasks": subtask}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    subtask["id"] = str(subtask["_id"])
    del subtask["_id"]
    return subtask

@api_router.put("/tasks/{task_id}/subtasks/{subtask_id}")
async def update_subtask(task_id: str, subtask_id: str, subtask_data: SubtaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in subtask_data.dict().items() if v is not None}
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id), "subtasks._id": ObjectId(subtask_id)},
        {"$set": {f"subtasks.$.{k}": v for k, v in update_data.items()}}
    )
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    updated_task["id"] = str(updated_task["_id"])
    del updated_task["_id"]
    updated_task["user_id"] = str(updated_task["user_id"])
    if updated_task.get("due_date"):
        updated_task["due_date"] = updated_task["due_date"].isoformat()
    if updated_task.get("subtasks"):
        for subtask in updated_task["subtasks"]:
            subtask["id"] = str(subtask["_id"])
            del subtask["_id"]
    return updated_task

@api_router.delete("/tasks/{task_id}/subtasks/{subtask_id}")
async def delete_subtask(task_id: str, subtask_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "user_id": user["_id"]})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$pull": {"subtasks": {"_id": ObjectId(subtask_id)}}}
    )
    return {"message": "Subtask deleted"}

@api_router.get("/categories")
async def get_categories(user: dict = Depends(get_current_user)):
    # Get unique categories from user's tasks
    categories = await db.tasks.distinct("category", {"user_id": user["_id"], "category": {"$ne": None}})
    return categories

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    total = await db.tasks.count_documents({"user_id": user["_id"]})
    completed = await db.tasks.count_documents({"user_id": user["_id"], "completed": True})
    pending = total - completed
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending
    }

class PlanUpdateRequest(BaseModel):
    plan: str  # "normal" or "premium"
    # TODO: Add payment_id for Razorpay integration verification

@api_router.put("/user/plan")
async def update_user_plan(plan_data: PlanUpdateRequest, user: dict = Depends(get_current_user)):
    """
    Update user plan. This endpoint is prepared for Razorpay integration.
    In future: Verify payment_id with Razorpay before updating plan.
    """
    if plan_data.plan not in ["normal", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid plan type. Must be 'normal' or 'premium'")
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"plan": plan_data.plan, "updated_at": datetime.now(timezone.utc)}}
    )
    
    updated_user = await db.users.find_one({"_id": user["_id"]})
    return {
        "message": f"Plan updated to {plan_data.plan}",
        "plan": updated_user.get("plan", "normal"),
        "user_id": str(user["_id"])
    }

@api_router.get("/user/profile")
async def get_user_profile(user: dict = Depends(get_current_user)):
    """Get detailed user profile with plan and stats"""
    total = await db.tasks.count_documents({"user_id": user["_id"]})
    completed = await db.tasks.count_documents({"user_id": user["_id"], "completed": True})
    pending = total - completed
    
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "plan": user.get("plan", "normal"),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
        "stats": {
            "total": total,
            "completed": completed,
            "pending": pending
        }
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)