"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ─── Category ────────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., max_length=50)
    color: str = Field(default="#3b82f6", max_length=7)
    icon: str = Field(default="📌", max_length=10)


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=10)


class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str

    model_config = {"from_attributes": True}


# ─── Tag ─────────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str = Field(..., max_length=50)


class TagOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# ─── Event ───────────────────────────────────────────────────────────────────────

class EventCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = ""
    location: str = ""
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    priority: int = Field(default=0, ge=0, le=3)
    status: str = "todo"
    category_id: Optional[int] = None
    tag_ids: List[int] = []
    # Optional: create reminders along with the event
    reminder_minutes: List[int] = []  # e.g. [5, 30] for 5min and 30min before


class EventUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=3)
    status: Optional[str] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class EventOut(BaseModel):
    id: int
    title: str
    description: str
    location: str
    start_time: datetime
    end_time: datetime
    all_day: bool
    priority: int
    status: str
    category_id: Optional[int] = None
    category: Optional[CategoryOut] = None
    tags: List[TagOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Project ────────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str = ""
    color: str = Field(default="#6366f1", max_length=7)
    icon: str = Field(default="📁", max_length=10)


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=10)
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    color: str
    icon: str
    status: str
    created_at: datetime
    task_count: int = 0
    done_count: int = 0

    model_config = {"from_attributes": True}


# ─── Task ───────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    project_id: int
    parent_id: Optional[int] = None
    title: str = Field(..., max_length=300)
    note: str = ""
    category_id: Optional[int] = None
    task_type: str = "todo"
    status: str = "todo"
    priority: int = Field(default=0, ge=0, le=3)
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    sort_order: int = 0
    is_recurring: bool = False
    recurrence: str = ""


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=300)
    note: Optional[str] = None
    category_id: Optional[int] = None
    task_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = Field(None, ge=0, le=3)
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None


class TaskOut(BaseModel):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    title: str
    note: str
    category_id: Optional[int] = None
    task_type: str = "todo"
    status: str
    priority: int
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    sort_order: int
    is_recurring: bool = False
    recurrence: str = ""
    last_completed: Optional[datetime] = None
    created_at: datetime
    children: list["TaskOut"] = []

    model_config = {"from_attributes": True}


# ─── Reminder ────────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    event_id: int
    remind_at: datetime
    method: str = "notification"


class ReminderOut(BaseModel):
    id: int
    event_id: int
    remind_at: datetime
    method: str
    is_triggered: bool

    model_config = {"from_attributes": True}


# ─── Daily Note ──────────────────────────────────────────────────────────────────

class DailyNoteUpdate(BaseModel):
    content: str = ""
    mood: str = ""


class DailyNoteOut(BaseModel):
    id: int
    date: datetime
    content: str
    mood: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Summary ─────────────────────────────────────────────────────────────────────

class TodaySummary(BaseModel):
    total: int
    done: int
    in_progress: int
    todo: int
    cancelled: int
    completion_rate: float  # 0-100
    events: List[EventOut]
    notes: List[DailyNoteOut] = []
