"""Event CRUD routes."""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, Reminder, Tag
from app.schemas import EventCreate, EventOut, EventUpdate

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[EventOut])
def list_events(
    start: Optional[str] = Query(None, description="Filter start (ISO datetime)"),
    end: Optional[str] = Query(None, description="Filter end (ISO datetime)"),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List all events with optional filters."""
    q = db.query(Event)
    if start:
        q = q.filter(Event.end_time >= datetime.fromisoformat(start))
    if end:
        q = q.filter(Event.start_time <= datetime.fromisoformat(end))
    if category_id is not None:
        q = q.filter(Event.category_id == category_id)
    if status:
        q = q.filter(Event.status == status)
    return q.order_by(Event.start_time).all()


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Get a single event by ID."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("", response_model=EventOut, status_code=201)
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    """Create a new event. Optionally create reminders."""
    event = Event(
        title=data.title,
        description=data.description,
        location=data.location,
        start_time=data.start_time,
        end_time=data.end_time,
        all_day=data.all_day,
        priority=data.priority,
        status=data.status,
        category_id=data.category_id,
    )

    # Attach tags
    if data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(data.tag_ids)).all()
        event.tags = tags

    db.add(event)
    db.flush()  # Get event.id

    # Create reminders
    for minutes in data.reminder_minutes:
        remind_at = data.start_time - timedelta(minutes=minutes)
        reminder = Reminder(event_id=event.id, remind_at=remind_at)
        db.add(reminder)

    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: int, data: EventUpdate, db: Session = Depends(get_db)):
    """Update an existing event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = data.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tag_ids", None)

    for key, value in update_data.items():
        setattr(event, key, value)

    if tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
        event.tags = tags

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Delete an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
