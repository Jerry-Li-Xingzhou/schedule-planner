"""Daily summary and notes routes."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DailyNote, Event
from app.schemas import DailyNoteOut, DailyNoteUpdate, TodaySummary

router = APIRouter(prefix="/api", tags=["summary"])


def _get_today_range():
    """Return (today_start, today_end) as naive datetimes."""
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    today_end = today_start + timedelta(days=1)
    return today_start, today_end


@router.get("/summary/today", response_model=TodaySummary)
def get_today_summary(db: Session = Depends(get_db)):
    """Get today's schedule overview, stats, and daily note."""
    today_start, today_end = _get_today_range()

    # Today's events
    events = (
        db.query(Event)
        .filter(Event.start_time >= today_start, Event.start_time < today_end)
        .order_by(Event.start_time)
        .all()
    )

    total = len(events)
    done = sum(1 for e in events if e.status == "done")
    in_progress = sum(1 for e in events if e.status == "in_progress")
    todo = sum(1 for e in events if e.status == "todo")
    cancelled = sum(1 for e in events if e.status == "cancelled")
    completion_rate = round((done / total * 100) if total > 0 else 0, 1)

    # Today's notes
    today_notes = db.query(DailyNote).filter(DailyNote.date == today_start).order_by(DailyNote.created_at.desc()).all()

    return TodaySummary(
        total=total,
        done=done,
        in_progress=in_progress,
        todo=todo,
        cancelled=cancelled,
        completion_rate=completion_rate,
        events=events,
        notes=[DailyNoteOut.model_validate(n) for n in today_notes],
    )


@router.get("/daily-notes/today", response_model=list[DailyNoteOut])
def get_today_notes(db: Session = Depends(get_db)):
    """Get today's notes."""
    today_start, _ = _get_today_range()
    return db.query(DailyNote).filter(DailyNote.date == today_start).order_by(DailyNote.created_at.desc()).all()


@router.put("/daily-notes/today", response_model=DailyNoteOut)
def save_today_note(data: DailyNoteUpdate, db: Session = Depends(get_db)):
    """Save a new note for today (always creates new)."""
    today_start, _ = _get_today_range()
    note = DailyNote(date=today_start, content=data.content, mood=data.mood)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/daily-notes", response_model=list[DailyNoteOut])
def list_daily_notes(db: Session = Depends(get_db)):
    """List all daily notes (with content), newest first."""
    return (
        db.query(DailyNote)
        .filter(DailyNote.content != "")
        .order_by(DailyNote.date.desc())
        .limit(90)
        .all()
    )


@router.put("/daily-notes/{note_id}", response_model=DailyNoteOut)
def update_daily_note(note_id: int, data: DailyNoteUpdate, db: Session = Depends(get_db)):
    """Update a daily note's content or mood."""
    note = db.query(DailyNote).filter(DailyNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    note.content = data.content
    note.mood = data.mood
    db.commit()
    db.refresh(note)
    return note


@router.delete("/daily-notes/{note_id}", status_code=204)
def delete_daily_note(note_id: int, db: Session = Depends(get_db)):
    """Delete a daily note by ID."""
    note = db.query(DailyNote).filter(DailyNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
