"""Reminder routes."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Reminder
from app.schemas import ReminderCreate, ReminderOut

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("", response_model=List[ReminderOut])
def list_reminders(db: Session = Depends(get_db)):
    return db.query(Reminder).order_by(Reminder.remind_at).all()


@router.post("", response_model=ReminderOut, status_code=201)
def create_reminder(data: ReminderCreate, db: Session = Depends(get_db)):
    reminder = Reminder(**data.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/pending", response_model=List[ReminderOut])
def get_pending_reminders(db: Session = Depends(get_db)):
    """Return reminders that are due but not yet triggered."""
    now = datetime.utcnow()
    return (
        db.query(Reminder)
        .filter(Reminder.remind_at <= now, Reminder.is_triggered == False)
        .order_by(Reminder.remind_at)
        .all()
    )


@router.put("/{reminder_id}/dismiss", response_model=ReminderOut)
def dismiss_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Mark a reminder as triggered/dismissed."""
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_triggered = True
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", status_code=204)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
