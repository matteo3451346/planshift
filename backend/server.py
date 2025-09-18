from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, time, date, timedelta
import hashlib
import jwt
from enum import Enum

# SQLAlchemy imports
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, Date, Time, Text, ForeignKey, Index, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.types import DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.dialects.mysql import JSON

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database configuration - SQLite Local Database
DATABASE_FILE = "/app/planshift.db"
DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

print(f"🔗 Using SQLite local database: {DATABASE_FILE}")
print(f"✅ SQLite database configured successfully")

# Database Engine Configuration for SQLite
engine = create_engine(
    DATABASE_URL, 
    echo=False,
    # SQLite-specific configurations
    connect_args={"check_same_thread": False},  # Allow SQLite to be used across threads
    pool_pre_ping=False  # Not needed for SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Create tables in database
def create_db_and_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")

# Create the main app
app = FastAPI(title="PlanShift API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# JWT Settings
JWT_SECRET = "planshift-secret-key-2024"
JWT_ALGORITHM = "HS256"

# Security
security = HTTPBearer()

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"

# SQLAlchemy Models
class UserDB(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.EMPLOYEE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class ResourceDB(Base):
    __tablename__ = "resources"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    weekly_hour_limit = Column(Integer, default=40)
    min_rest_hours = Column(Integer, default=12)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    shifts = relationship("ShiftDB", back_populates="resource")

class TimeSlotDB(Base):
    __tablename__ = "time_slots"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, index=True)
    start_time = Column(Time, nullable=False, index=True)
    end_time = Column(Time, nullable=False)
    is_custom = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    shifts = relationship("ShiftDB", back_populates="time_slot")

class ShiftDB(Base):
    __tablename__ = "shifts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resource_id = Column(String(36), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    time_slot_id = Column(String(36), ForeignKey("time_slots.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    week_number = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    hours = Column(DECIMAL(4, 2), nullable=False, default=0.00)
    overtime_hours = Column(DECIMAL(4, 2), default=0.00)
    extra_overtime_hours = Column(DECIMAL(4, 2), default=0.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    resource = relationship("ResourceDB", back_populates="shifts")
    time_slot = relationship("TimeSlotDB", back_populates="shifts")
    
    # Indexes and constraints
    __table_args__ = (
        Index('idx_shifts_resource_date', 'resource_id', 'date'),
        Index('idx_shifts_week_year', 'week_number', 'year'),
        Index('idx_shifts_date', 'date'),
        UniqueConstraint('resource_id', 'date', name='unique_resource_date'),
    )

class WeeklyPlanDB(Base):
    __tablename__ = "weekly_plans"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    week_number = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    is_published = Column(Boolean, default=False, index=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('week_number', 'year', name='unique_weekly_plan_week_year'),
        Index('idx_weekly_plans_week_year', 'week_number', 'year'),
    )

class PublicationDB(Base):
    __tablename__ = "publications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    week_number = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    published_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    published_at = Column(DateTime, default=datetime.utcnow)
    changes_log = Column(JSON, nullable=True)
    
    __table_args__ = (
        Index('idx_publications_week_year', 'week_number', 'year'),
        Index('idx_publications_published_by', 'published_by'),
    )

# Create tables if they don't exist
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified successfully")
except Exception as e:
    print(f"⚠️ Database setup warning: {e}")
    # Tables might already exist, continue anyway

# Pydantic Models (same as before)
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.EMPLOYEE
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    is_active: bool

class TimeSlot(BaseModel):
    id: str
    name: str
    start_time: str
    end_time: str
    is_custom: bool = False
    created_at: datetime

class TimeSlotCreate(BaseModel):
    name: str
    start_time: str
    end_time: str
    is_custom: bool = False

class Resource(BaseModel):
    id: str
    name: str
    email: str
    weekly_hour_limit: int = 40
    min_rest_hours: int = 12
    is_active: bool = True
    created_at: datetime

class ResourceCreate(BaseModel):
    name: str
    email: str
    weekly_hour_limit: int = 40
    min_rest_hours: int = 12

class Shift(BaseModel):
    id: str
    resource_id: str
    time_slot_id: str
    date: str
    week_number: int
    year: int
    hours: float
    overtime_hours: float = 0.0
    extra_overtime_hours: float = 0.0
    created_at: datetime

class ShiftCreate(BaseModel):
    resource_id: str
    time_slot_id: str
    date: str
    week_number: int
    year: int
    extra_overtime_hours: float = 0.0

class WeeklyPlan(BaseModel):
    id: str
    week_number: int
    year: int
    is_published: bool = False
    published_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class Publication(BaseModel):
    id: str
    week_number: int
    year: int
    published_by: str
    published_at: datetime
    changes_log: List[str] = []

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper Functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_jwt_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "role": user_data["role"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user = db.query(UserDB).filter(UserDB.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return User(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at,
        is_active=user.is_active
    )

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def calculate_week_number(date_str: str) -> tuple:
    """Calculate ISO week number and year"""
    date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    iso_year, iso_week, _ = date_obj.isocalendar()
    return iso_week, iso_year

def calculate_shift_hours(start_time: str, end_time: str) -> float:
    """Calculate hours between start and end time"""
    start = datetime.strptime(start_time, "%H:%M").time()
    end = datetime.strptime(end_time, "%H:%M").time()
    
    start_minutes = start.hour * 60 + start.minute
    end_minutes = end.hour * 60 + end.minute
    
    # Handle overnight shifts
    if end_minutes <= start_minutes:
        end_minutes += 24 * 60
    
    duration_minutes = end_minutes - start_minutes
    return duration_minutes / 60.0

async def check_minimum_rest_hours(shift_data: ShiftCreate, resource: dict, time_slot: dict, db: Session) -> Optional[str]:
    """Check if minimum rest hours are respected between shifts"""
    min_rest_hours = resource["min_rest_hours"]
    
    # Get current shift times
    shift_date = datetime.strptime(shift_data.date, "%Y-%m-%d").date()
    shift_start_time = datetime.strptime(time_slot["start_time"], "%H:%M").time()
    shift_end_time = datetime.strptime(time_slot["end_time"], "%H:%M").time()
    
    # Create datetime objects
    shift_start = datetime.combine(shift_date, shift_start_time)
    shift_end = datetime.combine(shift_date, shift_end_time)
    
    # Handle overnight shifts
    if shift_end <= shift_start:
        shift_end += timedelta(days=1)
    
    # Check for conflicting shifts within 48 hours
    check_start = shift_date - timedelta(days=2)
    check_end = shift_date + timedelta(days=2)
    
    existing_shifts = db.query(ShiftDB).filter(
        ShiftDB.resource_id == shift_data.resource_id,
        ShiftDB.date >= check_start,
        ShiftDB.date <= check_end,
        ShiftDB.date != shift_data.date
    ).all()
    
    for existing_shift in existing_shifts:
        existing_time_slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == existing_shift.time_slot_id).first()
        if not existing_time_slot:
            continue
            
        existing_start = datetime.combine(existing_shift.date, existing_time_slot.start_time)
        existing_end = datetime.combine(existing_shift.date, existing_time_slot.end_time)
        
        # Handle overnight shifts
        if existing_end <= existing_start:
            existing_end += timedelta(days=1)
        
        # Calculate time between shifts
        time_between_1 = abs((shift_start - existing_end).total_seconds() / 3600)
        time_between_2 = abs((existing_start - shift_end).total_seconds() / 3600)
        min_time_between = min(time_between_1, time_between_2)
        
        if 0 < min_time_between < min_rest_hours:
            return f"Violazione ore di riposo minime: sono necessarie almeno {min_rest_hours}h tra i turni (trovate solo {min_time_between:.1f}h)"
    
    return None

# Authentication Endpoints
@api_router.post("/auth/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(UserDB).filter(
        (UserDB.username == user_data.username) | (UserDB.email == user_data.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user = UserDB(
        username=user_data.username,
        email=user_data.email,
        password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate token
    token = create_jwt_token({
        "id": user.id,
        "username": user.username,
        "role": user.role.value
    })
    
    return {"token": token, "user": User(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at,
        is_active=user.is_active
    )}

@api_router.post("/auth/login")
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account deactivated")
    
    token = create_jwt_token({
        "id": user.id,
        "username": user.username,
        "role": user.role.value
    })
    
    return {"token": token, "user": User(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        created_at=user.created_at,
        is_active=user.is_active
    )}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Time Slots Endpoints
@api_router.get("/timeslots", response_model=List[TimeSlot])
async def get_time_slots(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    slots = db.query(TimeSlotDB).all()
    return [TimeSlot(
        id=slot.id,
        name=slot.name,
        start_time=slot.start_time.strftime("%H:%M"),
        end_time=slot.end_time.strftime("%H:%M"),
        is_custom=slot.is_custom,
        created_at=slot.created_at
    ) for slot in slots]

@api_router.post("/timeslots", response_model=TimeSlot)
async def create_time_slot(slot_data: TimeSlotCreate, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Validate time format
    try:
        start = datetime.strptime(slot_data.start_time, "%H:%M").time()
        end = datetime.strptime(slot_data.end_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    
    # Check for overlaps
    existing_slots = db.query(TimeSlotDB).all()
    for existing in existing_slots:
        if not (end <= existing.start_time or start >= existing.end_time):
            raise HTTPException(status_code=400, detail=f"Time slot overlaps with existing slot: {existing.name}")
    
    slot = TimeSlotDB(
        name=slot_data.name,
        start_time=start,
        end_time=end,
        is_custom=slot_data.is_custom
    )
    
    db.add(slot)
    db.commit()
    db.refresh(slot)
    
    return TimeSlot(
        id=slot.id,
        name=slot.name,
        start_time=slot.start_time.strftime("%H:%M"),
        end_time=slot.end_time.strftime("%H:%M"),
        is_custom=slot.is_custom,
        created_at=slot.created_at
    )

@api_router.put("/timeslots/{slot_id}")
async def update_time_slot(slot_id: str, slot_data: TimeSlotCreate, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    
    # Validate time format
    try:
        start = datetime.strptime(slot_data.start_time, "%H:%M").time()
        end = datetime.strptime(slot_data.end_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    
    slot.name = slot_data.name
    slot.start_time = start
    slot.end_time = end
    slot.is_custom = slot_data.is_custom
    
    db.commit()
    db.refresh(slot)
    
    return TimeSlot(
        id=slot.id,
        name=slot.name,
        start_time=slot.start_time.strftime("%H:%M"),
        end_time=slot.end_time.strftime("%H:%M"),
        is_custom=slot.is_custom,
        created_at=slot.created_at
    )

@api_router.delete("/timeslots/{slot_id}")
async def delete_time_slot(slot_id: str, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Check if slot is used in any shifts
    shifts_using_slot = db.query(ShiftDB).filter(ShiftDB.time_slot_id == slot_id).first()
    if shifts_using_slot:
        raise HTTPException(status_code=400, detail="Cannot delete time slot that is being used in shifts")
    
    slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    
    db.delete(slot)
    db.commit()
    
    return {"message": "Time slot deleted successfully"}

# Resources Endpoints
@api_router.get("/resources", response_model=List[Resource])
async def get_resources(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resources = db.query(ResourceDB).filter(ResourceDB.is_active == True).all()
    return [Resource(
        id=resource.id,
        name=resource.name,
        email=resource.email,
        weekly_hour_limit=resource.weekly_hour_limit,
        min_rest_hours=resource.min_rest_hours,
        is_active=resource.is_active,
        created_at=resource.created_at
    ) for resource in resources]

@api_router.post("/resources", response_model=Resource)
async def create_resource(resource_data: ResourceCreate, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Check if resource with same email exists
    existing = db.query(ResourceDB).filter(ResourceDB.email == resource_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Resource with this email already exists")
    
    resource = ResourceDB(
        name=resource_data.name,
        email=resource_data.email,
        weekly_hour_limit=resource_data.weekly_hour_limit,
        min_rest_hours=resource_data.min_rest_hours
    )
    
    db.add(resource)
    db.commit()
    db.refresh(resource)
    
    return Resource(
        id=resource.id,
        name=resource.name,
        email=resource.email,
        weekly_hour_limit=resource.weekly_hour_limit,
        min_rest_hours=resource.min_rest_hours,
        is_active=resource.is_active,
        created_at=resource.created_at
    )

@api_router.put("/resources/{resource_id}")
async def update_resource(resource_id: str, resource_data: ResourceCreate, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    resource = db.query(ResourceDB).filter(ResourceDB.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    resource.name = resource_data.name
    resource.email = resource_data.email
    resource.weekly_hour_limit = resource_data.weekly_hour_limit
    resource.min_rest_hours = resource_data.min_rest_hours
    
    db.commit()
    db.refresh(resource)
    
    return Resource(
        id=resource.id,
        name=resource.name,
        email=resource.email,
        weekly_hour_limit=resource.weekly_hour_limit,
        min_rest_hours=resource.min_rest_hours,
        is_active=resource.is_active,
        created_at=resource.created_at
    )

@api_router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Delete a resource and all associated shifts (cascade delete)"""
    resource = db.query(ResourceDB).filter(ResourceDB.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Get all associated shifts for counting and manual deletion
    associated_shifts = db.query(ShiftDB).filter(ShiftDB.resource_id == resource_id).all()
    shift_count = len(associated_shifts)
    
    # Manually delete all associated shifts first (SQLite CASCADE workaround)
    for shift in associated_shifts:
        db.delete(shift)
    
    # Now delete the resource
    db.delete(resource)
    db.commit()
    
    return {
        "message": f"Resource '{resource.name}' deleted successfully",
        "deleted_shifts_count": shift_count
    }

# Password Management Models
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class AdminChangePasswordRequest(BaseModel):
    user_id: str
    new_password: str
    confirm_password: str

@api_router.post("/auth/change-password")
async def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Allow user to change their own password"""
    
    # Validate passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    
    # Validate password length
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Get user from database
    user = db.query(UserDB).filter(UserDB.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(request.current_password, user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update password
    user.password = hash_password(request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@api_router.post("/admin/change-user-password")
async def admin_change_user_password(request: AdminChangePasswordRequest, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Allow admin to change any user's password"""
    
    # Validate passwords match
    if request.new_password != request.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    
    # Validate password length
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
    # Get target user from database
    user = db.query(UserDB).filter(UserDB.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    user.password = hash_password(request.new_password)
    db.commit()
    
    return {
        "message": f"Password changed successfully for user: {user.full_name}",
        "user_email": user.email
    }

# Shifts Endpoints
@api_router.get("/shifts")
async def get_shifts(week: Optional[int] = None, year: Optional[int] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ShiftDB)
    if week and year:
        query = query.filter(ShiftDB.week_number == week, ShiftDB.year == year)
    
    shifts = query.all()
    
    # Enrich with resource and time slot data
    result = []
    for shift in shifts:
        resource = db.query(ResourceDB).filter(ResourceDB.id == shift.resource_id).first()
        time_slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == shift.time_slot_id).first()
        
        shift_dict = {
            "id": shift.id,
            "resource_id": shift.resource_id,
            "time_slot_id": shift.time_slot_id,
            "date": shift.date.strftime("%Y-%m-%d"),
            "week_number": shift.week_number,
            "year": shift.year,
            "hours": float(shift.hours),
            "overtime_hours": float(shift.overtime_hours),
            "extra_overtime_hours": float(shift.extra_overtime_hours),
            "created_at": shift.created_at,
            "resource": {
                "id": resource.id,
                "name": resource.name,
                "email": resource.email
            } if resource else None,
            "time_slot": {
                "id": time_slot.id,
                "name": time_slot.name,
                "start_time": time_slot.start_time.strftime("%H:%M"),
                "end_time": time_slot.end_time.strftime("%H:%M")
            } if time_slot else None
        }
        result.append(shift_dict)
    
    return result

@api_router.post("/shifts", response_model=Shift)
async def create_shift(shift_data: ShiftCreate, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Validate resource exists
    resource = db.query(ResourceDB).filter(ResourceDB.id == shift_data.resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Validate time slot exists
    time_slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == shift_data.time_slot_id).first()
    if not time_slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    
    # Check for conflicts (same resource, same date)
    conflict = db.query(ShiftDB).filter(
        ShiftDB.resource_id == shift_data.resource_id,
        ShiftDB.date == shift_data.date
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="La risorsa ha già un turno assegnato in questa data")
    
    # Check minimum rest hours
    rest_violation = await check_minimum_rest_hours(shift_data, {
        "min_rest_hours": resource.min_rest_hours
    }, {
        "start_time": time_slot.start_time.strftime("%H:%M"),
        "end_time": time_slot.end_time.strftime("%H:%M")
    }, db)
    if rest_violation:
        raise HTTPException(status_code=400, detail=rest_violation)
    
    # Calculate hours
    hours = calculate_shift_hours(
        time_slot.start_time.strftime("%H:%M"),
        time_slot.end_time.strftime("%H:%M")
    )
    
    # Check weekly hour limits and calculate overtime
    existing_shifts = db.query(ShiftDB).filter(
        ShiftDB.resource_id == shift_data.resource_id,
        ShiftDB.week_number == shift_data.week_number,
        ShiftDB.year == shift_data.year
    ).all()
    
    total_hours = sum(float(s.hours) for s in existing_shifts) + hours
    
    # Calculate automatic overtime (from weekly limit)
    if total_hours > resource.weekly_hour_limit:
        automatic_overtime = total_hours - resource.weekly_hour_limit
    else:
        automatic_overtime = 0.0
    
    # Total overtime = automatic + extra (manual)
    total_overtime = automatic_overtime + (shift_data.extra_overtime_hours or 0.0)
    
    shift = ShiftDB(
        resource_id=shift_data.resource_id,
        time_slot_id=shift_data.time_slot_id,
        date=datetime.strptime(shift_data.date, "%Y-%m-%d").date(),
        week_number=shift_data.week_number,
        year=shift_data.year,
        hours=hours,
        overtime_hours=total_overtime,
        extra_overtime_hours=shift_data.extra_overtime_hours or 0.0
    )
    
    db.add(shift)
    db.commit()
    db.refresh(shift)
    
    return Shift(
        id=shift.id,
        resource_id=shift.resource_id,
        time_slot_id=shift.time_slot_id,
        date=shift.date.strftime("%Y-%m-%d"),
        week_number=shift.week_number,
        year=shift.year,
        hours=float(shift.hours),
        overtime_hours=float(shift.overtime_hours),
        extra_overtime_hours=float(shift.extra_overtime_hours),
        created_at=shift.created_at
    )

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    shift = db.query(ShiftDB).filter(ShiftDB.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    db.delete(shift)
    db.commit()
    
    return {"message": "Shift deleted successfully"}

# Weekly Plans Endpoints
@api_router.get("/weekly-plans")
async def get_weekly_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(WeeklyPlanDB).all()
    return [{
        "id": plan.id,
        "week_number": plan.week_number,
        "year": plan.year,
        "is_published": plan.is_published,
        "published_at": plan.published_at,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at
    } for plan in plans]

@api_router.post("/weekly-plans/publish")
async def publish_weekly_plan(week_number: int, year: int, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Create or update weekly plan
    existing_plan = db.query(WeeklyPlanDB).filter(
        WeeklyPlanDB.week_number == week_number,
        WeeklyPlanDB.year == year
    ).first()
    
    if existing_plan:
        existing_plan.is_published = True
        existing_plan.published_at = datetime.now(timezone.utc)
        existing_plan.updated_at = datetime.now(timezone.utc)
    else:
        plan = WeeklyPlanDB(
            week_number=week_number,
            year=year,
            is_published=True,
            published_at=datetime.now(timezone.utc)
        )
        db.add(plan)
    
    # Log publication
    publication = PublicationDB(
        week_number=week_number,
        year=year,
        published_by=admin_user.id,
        changes_log=[f"Weekly plan published by {admin_user.full_name}"]
    )
    db.add(publication)
    
    db.commit()
    
    return {"message": "Weekly plan published successfully"}

# Employee Dashboard Endpoints
@api_router.get("/employee/shifts")
async def get_employee_shifts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get only published shifts - TUTTI i turni pubblicati, non solo quelli dell'utente
    published_plans = db.query(WeeklyPlanDB).filter(WeeklyPlanDB.is_published == True).all()
    published_weeks = [(plan.week_number, plan.year) for plan in published_plans]
    
    shifts = []
    for week_num, year in published_weeks:
        # Ottieni TUTTI i turni pubblicati della settimana, non solo quelli dell'utente
        week_shifts = db.query(ShiftDB).filter(
            ShiftDB.week_number == week_num,
            ShiftDB.year == year
        ).all()
        
        for shift in week_shifts:
            time_slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == shift.time_slot_id).first()
            resource = db.query(ResourceDB).filter(ResourceDB.id == shift.resource_id).first()
            
            shift_dict = {
                "id": shift.id,
                "resource_id": shift.resource_id,
                "time_slot_id": shift.time_slot_id,
                "date": shift.date.strftime("%Y-%m-%d"),
                "week_number": shift.week_number,
                "year": shift.year,
                "hours": float(shift.hours),
                "overtime_hours": float(shift.overtime_hours),
                "extra_overtime_hours": float(shift.extra_overtime_hours),
                "created_at": shift.created_at,
                "resource": {
                    "id": resource.id,
                    "name": resource.name,
                    "email": resource.email
                } if resource else None,
                "time_slot": {
                    "id": time_slot.id,
                    "name": time_slot.name,
                    "start_time": time_slot.start_time.strftime("%H:%M"),
                    "end_time": time_slot.end_time.strftime("%H:%M")
                } if time_slot else None
            }
            shifts.append(shift_dict)
    
    return shifts

# Reports Endpoints
@api_router.get("/reports/weekly/{week_number}/{year}")
async def get_weekly_report(week_number: int, year: int, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    shifts = db.query(ShiftDB).filter(
        ShiftDB.week_number == week_number,
        ShiftDB.year == year
    ).all()
    
    # Calculate statistics
    total_shifts = len(shifts)
    total_hours = sum(float(s.hours) for s in shifts)
    total_overtime = sum(float(s.overtime_hours) for s in shifts)
    
    # Resource utilization
    resource_stats = {}
    for shift in shifts:
        resource_id = shift.resource_id
        if resource_id not in resource_stats:
            resource = db.query(ResourceDB).filter(ResourceDB.id == resource_id).first()
            resource_stats[resource_id] = {
                "name": resource.name,
                "hours": 0,
                "overtime": 0,
                "shifts": 0,
                "limit": resource.weekly_hour_limit
            }
        
        resource_stats[resource_id]["hours"] += float(shift.hours)
        resource_stats[resource_id]["overtime"] += float(shift.overtime_hours)
        resource_stats[resource_id]["shifts"] += 1
    
    return {
        "week_number": week_number,
        "year": year,
        "total_shifts": total_shifts,
        "total_hours": total_hours,
        "total_overtime": total_overtime,
        "resource_utilization": list(resource_stats.values()),
        "shifts": [{
            "id": shift.id,
            "resource_id": shift.resource_id,
            "time_slot_id": shift.time_slot_id,
            "date": shift.date.strftime("%Y-%m-%d"),
            "hours": float(shift.hours),
            "overtime_hours": float(shift.overtime_hours)
        } for shift in shifts]
    }

@api_router.get("/reports/overview")
async def get_reports_overview(admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Get comprehensive overview for reports dashboard"""
    
    # Get current week
    current_date = datetime.now(timezone.utc)
    current_week = current_date.isocalendar()[1]
    current_year = current_date.year
    
    # Get data for last 4 weeks
    weekly_data = []
    for i in range(4):
        week_num = current_week - i
        year = current_year
        
        if week_num <= 0:
            week_num += 52
            year -= 1
            
        shifts = db.query(ShiftDB).filter(
            ShiftDB.week_number == week_num,
            ShiftDB.year == year
        ).all()
        
        weekly_data.append({
            "week": week_num,
            "year": year,
            "total_hours": sum(float(s.hours) for s in shifts),
            "total_overtime": sum(float(s.overtime_hours) for s in shifts),
            "total_shifts": len(shifts),
            "unique_resources": len(set(s.resource_id for s in shifts))
        })
    
    # Get start of month for filtering
    start_of_month = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get all resources with their stats
    resources = db.query(ResourceDB).filter(ResourceDB.is_active == True).all()
    resource_performance = []
    
    for resource in resources:
        # Get shifts for current month
        shifts = db.query(ShiftDB).filter(
            ShiftDB.resource_id == resource.id,
            ShiftDB.date >= start_of_month.date()
        ).all()
        
        total_hours = sum(float(s.hours) for s in shifts)
        total_overtime = sum(float(s.overtime_hours) for s in shifts)
        
        resource_performance.append({
            "id": resource.id,
            "name": resource.name,
            "email": resource.email,
            "total_hours": round(total_hours, 1),
            "total_overtime": round(total_overtime, 1),
            "total_shifts": len(shifts),
            "weekly_limit": resource.weekly_hour_limit,
            "utilization_percentage": round((total_hours / (resource.weekly_hour_limit * 4)) * 100, 1) if total_hours > 0 else 0
        })
    
    # Get time slot usage
    time_slots = db.query(TimeSlotDB).all()
    time_slot_usage = []
    
    for time_slot in time_slots:
        shifts = db.query(ShiftDB).filter(
            ShiftDB.time_slot_id == time_slot.id,
            ShiftDB.date >= start_of_month.date()
        ).all()
        
        time_slot_usage.append({
            "name": time_slot.name,
            "start_time": time_slot.start_time.strftime("%H:%M"),
            "end_time": time_slot.end_time.strftime("%H:%M"),
            "usage_count": len(shifts),
            "total_hours": sum(float(s.hours) for s in shifts)
        })
    
    # Calculate daily distribution for current week
    daily_distribution = []
    days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    
    for i, day in enumerate(days):
        # Calculate date for each day of current week
        monday = current_date - timedelta(days=current_date.weekday())
        day_date = (monday + timedelta(days=i)).date()
        
        day_shifts = db.query(ShiftDB).filter(ShiftDB.date == day_date).all()
        
        daily_distribution.append({
            "day": day,
            "date": day_date.strftime("%Y-%m-%d"),
            "shifts": len(day_shifts),
            "hours": sum(float(s.hours) for s in day_shifts),
            "overtime": sum(float(s.overtime_hours) for s in day_shifts)
        })
    
    return {
        "weekly_trends": weekly_data,
        "resource_performance": resource_performance,
        "time_slot_usage": time_slot_usage,
        "daily_distribution": daily_distribution,
        "summary": {
            "total_resources": len(resources),
            "total_time_slots": len(time_slots),
            "current_week": current_week,
            "current_year": current_year
        }
    }

@api_router.get("/reports/resource/{resource_id}")
async def get_resource_report(resource_id: str, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """Get detailed report for a specific resource"""
    
    resource = db.query(ResourceDB).filter(ResourceDB.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Get shifts for last 8 weeks
    current_date = datetime.now(timezone.utc)
    eight_weeks_ago = current_date - timedelta(weeks=8)
    
    shifts = db.query(ShiftDB).filter(
        ShiftDB.resource_id == resource_id,
        ShiftDB.date >= eight_weeks_ago.date()
    ).all()
    
    # Group by week
    weekly_breakdown = {}
    for shift in shifts:
        week_key = f"{shift.year}-W{shift.week_number:02d}"
        if week_key not in weekly_breakdown:
            weekly_breakdown[week_key] = {
                "week": shift.week_number,
                "year": shift.year,
                "hours": 0,
                "overtime": 0,
                "shifts": 0
            }
        
        weekly_breakdown[week_key]["hours"] += float(shift.hours)
        weekly_breakdown[week_key]["overtime"] += float(shift.overtime_hours)
        weekly_breakdown[week_key]["shifts"] += 1
    
    # Time slot preference
    time_slot_stats = {}
    for shift in shifts:
        time_slot = db.query(TimeSlotDB).filter(TimeSlotDB.id == shift.time_slot_id).first()
        if time_slot:
            slot_name = time_slot.name
            if slot_name not in time_slot_stats:
                time_slot_stats[slot_name] = 0
            time_slot_stats[slot_name] += 1
    
    return {
        "resource": {
            "id": resource.id,
            "name": resource.name,
            "email": resource.email,
            "weekly_limit": resource.weekly_hour_limit,
            "min_rest_hours": resource.min_rest_hours
        },
        "weekly_breakdown": list(weekly_breakdown.values()),
        "time_slot_preferences": time_slot_stats,
        "totals": {
            "total_shifts": len(shifts),
            "total_hours": sum(float(s.hours) for s in shifts),
            "total_overtime": sum(float(s.overtime_hours) for s in shifts),
            "average_hours_per_week": round(sum(float(s.hours) for s in shifts) / 8, 1) if shifts else 0
        }
    }

@api_router.post("/admin/reset-all-passwords")
async def reset_all_passwords(admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    """
    🔐 ENDPOINT PER RESETTARE TUTTE LE PASSWORD ALLE DEFAULT
    Utile per aggiornare password esistenti quando cambi i valori nel codice
    """
    
    # 🔐 CONFIGURA LE PASSWORD QUI (stesso valore del codice di inizializzazione)
    ADMIN_PASSWORD = "NUOVA_PASSWORD_ADMIN"
    EMPLOYEE_PASSWORD = "NUOVA_PASSWORD_DIPENDENTI"
    
    try:
        # Aggiorna password admin
        admin_users = db.query(UserDB).filter(UserDB.role == UserRole.ADMIN).all()
        admin_count = 0
        for user in admin_users:
            user.password = hash_password(ADMIN_PASSWORD)
            admin_count += 1
        
        # Aggiorna password dipendenti
        employee_users = db.query(UserDB).filter(UserDB.role == UserRole.EMPLOYEE).all()
        employee_count = 0
        for user in employee_users:
            user.password = hash_password(EMPLOYEE_PASSWORD)
            employee_count += 1
        
        db.commit()
        
        return {
            "message": "Tutte le password sono state aggiornate con successo",
            "admin_updated": admin_count,
            "employees_updated": employee_count,
            "admin_password": ADMIN_PASSWORD,
            "employee_password": EMPLOYEE_PASSWORD
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Errore nell'aggiornamento password: {str(e)}")

# Initialize default data
@api_router.post("/admin/init-data")
async def init_default_data(db: Session = Depends(get_db)):
    # Create default admin user if not exists
    admin_exists = db.query(UserDB).filter(UserDB.role == UserRole.ADMIN).first()
    if not admin_exists:
        admin_user = UserDB(
            id="admin-001",
            username="admin",
            email="admin@planshift.com",
            password=hash_password("NUOVA_PASSWORD_ADMIN"),  # 🔐 CAMBIA QUI LA PASSWORD ADMIN
            full_name="Amministratore Sistema",
            role=UserRole.ADMIN
        )
        db.add(admin_user)
    
    # Create employee users for existing resources
    resources = db.query(ResourceDB).filter(ResourceDB.is_active == True).all()
    for resource in resources:
        # Check if employee user already exists for this resource
        existing_user = db.query(UserDB).filter(
            UserDB.email == resource.email,
            UserDB.role == UserRole.EMPLOYEE
        ).first()
        
        if not existing_user:
            # Create employee user based on resource
            employee_user = UserDB(
                username=resource.email.split('@')[0],  # Use email prefix as username
                email=resource.email,
                password=hash_password("NUOVA_PASSWORD_DIPENDENTI"),  # 🔐 CAMBIA QUI LA PASSWORD DIPENDENTI
                full_name=resource.name,
                role=UserRole.EMPLOYEE
            )
            db.add(employee_user)
    
    # Create default time slots if not exist
    time_slots_exist = db.query(TimeSlotDB).first()
    if not time_slots_exist:
        default_slots = [
            {"id": "ts-001", "name": "Mattino Presto", "start_time": "06:00", "end_time": "14:00"},
            {"id": "ts-002", "name": "Mattino", "start_time": "08:00", "end_time": "16:00"},
            {"id": "ts-003", "name": "Pomeriggio", "start_time": "14:00", "end_time": "22:00"},
            {"id": "ts-004", "name": "Sera", "start_time": "16:00", "end_time": "23:59"},
            {"id": "ts-005", "name": "Notte", "start_time": "22:00", "end_time": "06:00"}
        ]
        
        for slot_data in default_slots:
            slot = TimeSlotDB(
                id=slot_data["id"],
                name=slot_data["name"],
                start_time=datetime.strptime(slot_data["start_time"], "%H:%M").time(),
                end_time=datetime.strptime(slot_data["end_time"], "%H:%M").time()
            )
            db.add(slot)
    
    db.commit()
    return {"message": "Default data initialized with employee users"}

# Include router
app.include_router(api_router)

# Create database tables on startup
create_db_and_tables()

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)