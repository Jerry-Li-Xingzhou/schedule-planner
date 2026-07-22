"""SQLAlchemy ORM models for the schedule planner."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# Many-to-many: Event <-> Tag
event_tag = Table(
    "event_tag",
    Base.metadata,
    Column("event_id", Integer, ForeignKey("events.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    location = Column(String(300), default="")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False)
    priority = Column(Integer, default=0)  # 0=none, 1=low, 2=medium, 3=high
    status = Column(String(20), default="todo")  # todo, in_progress, done, cancelled
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("Category", back_populates="events")
    tags = relationship("Tag", secondary=event_tag, back_populates="events", lazy="selectin")
    reminders = relationship("Reminder", back_populates="event", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(7), default="#3b82f6")  # hex color
    icon = Column(String(10), default="📌")

    events = relationship("Event", back_populates="category")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)

    events = relationship("Event", secondary=event_tag, back_populates="tags")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    color = Column(String(7), default="#6366f1")
    icon = Column(String(10), default="📁")
    status = Column(String(20), default="active")  # active, completed, archived
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(300), nullable=False)
    note = Column(Text, default="")
    status = Column(String(20), default="todo")  # todo, in_progress, done
    priority = Column(Integer, default=0)
    due_date = Column(DateTime, nullable=True)
    sort_order = Column(Integer, default=0)
    # Category & task type
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    task_type = Column(String(20), default="todo")  # habit, todo, goal, memo
    is_recurring = Column(Boolean, default=False)
    recurrence = Column(String(20), default="")  # daily, weekly, weekdays, monthly
    start_date = Column(DateTime, nullable=True)  # recurrence start
    last_completed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
    parent = relationship("Task", remote_side=[id], backref="children")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    remind_at = Column(DateTime, nullable=False)
    method = Column(String(20), default="notification")  # notification
    is_triggered = Column(Boolean, default=False)

    event = relationship("Event", back_populates="reminders")


class DailyNote(Base):
    __tablename__ = "daily_notes"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)  # multiple notes per day allowed
    content = Column(Text, default="")
    mood = Column(String(10), default="")  # emoji
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
